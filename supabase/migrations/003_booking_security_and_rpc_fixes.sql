-- =========================================================================
-- 003: Booking Security & RPC Fixes (RLS, Cancel Locking, Atomic Reschedule)
-- =========================================================================

-- =========================================================================
-- 1. Missing RLS DELETE Policies
-- =========================================================================

-- CRITICAL FIX: Without this, any authenticated user could delete another
-- user's booking if the flight departs in > 2 hours (only the trigger guards,
-- not RLS). Adding a proper ownership check.
CREATE POLICY "Users can delete only their own bookings" ON bookings
    FOR DELETE USING (auth.uid() = user_id);

-- Also add DELETE policy on passengers for consistency
CREATE POLICY "Users can delete passengers associated with their own bookings" ON passengers
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.id = passengers.booking_id AND b.user_id = auth.uid()
        )
    );

-- =========================================================================
-- 2. Fix cancel_booking() — Add FOR UPDATE, Remove Double Seat Release
-- =========================================================================

-- The old version had two issues:
-- a) No FOR UPDATE lock on the booking row (race condition on concurrent cancels)
-- b) Double seat release (both here and in trg_handle_booking_status_change trigger)
-- We keep the trigger since it's the canonical place for this side-effect and
-- remove the manual release from the RPC.

CREATE OR REPLACE FUNCTION cancel_booking(p_booking_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_seat_id UUID;
  v_status TEXT;
BEGIN
    -- Lock the booking row to prevent concurrent cancel/reschedule
    SELECT seat_id, status INTO v_seat_id, v_status
    FROM bookings
    WHERE id = p_booking_id AND user_id = auth.uid()
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Booking not found or unauthorized';
    END IF;

    -- Prevent cancelling an already-cancelled booking
    IF v_status = 'cancelled' THEN
      RAISE EXCEPTION 'Booking is already cancelled';
    END IF;

    -- Update booking status (the BEFORE UPDATE trigger will enforce the 2-hour rule,
    -- and the AFTER UPDATE trigger will release the seat automatically)
    UPDATE bookings SET status = 'cancelled' WHERE id = p_booking_id;

    -- NOTE: Seat release is handled by trg_handle_booking_status_change trigger.
    -- No manual UPDATE seats here to avoid the double-release.
END;
$$;

-- =========================================================================
-- 3. Atomic Reschedule Booking RPC
-- =========================================================================

-- The old reschedule used 3 separate client-side operations (fetch prices,
-- insert reschedule record, update booking). If step 3 failed, step 2 left
-- an orphaned record. This new function does everything atomically.
--
-- It also properly:
-- a) Allocates a seat on the new flight (picks first available of same class)
-- b) Releases the old seat
-- c) Updates booking price
-- d) Records the reschedule history

CREATE OR REPLACE FUNCTION reschedule_booking(
    p_booking_id UUID,
    p_new_flight_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_old_flight_id UUID;
    v_old_seat_id UUID;
    v_old_seat_class TEXT;
    v_booking_status TEXT;
    v_old_base_price NUMERIC(10, 2);
    v_new_base_price NUMERIC(10, 2);
    v_new_seat_id UUID;
    v_new_seat_number TEXT;
    v_new_extra_fee NUMERIC(10, 2);
    v_new_total_price NUMERIC(10, 2);
    v_fee_charged NUMERIC(10, 2);
    v_new_departs_at TIMESTAMPTZ;
    v_result JSON;
BEGIN
    -- Authenticate
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- Lock the booking row
    SELECT flight_id, seat_id, status
    INTO v_old_flight_id, v_old_seat_id, v_booking_status
    FROM bookings
    WHERE id = p_booking_id AND user_id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found or unauthorized';
    END IF;

    IF v_booking_status = 'cancelled' THEN
        RAISE EXCEPTION 'Cannot reschedule a cancelled booking';
    END IF;

    IF v_old_flight_id = p_new_flight_id THEN
        RAISE EXCEPTION 'New flight must be different from the current flight';
    END IF;

    -- Get old seat class for matching on new flight
    SELECT class INTO v_old_seat_class
    FROM seats WHERE id = v_old_seat_id;

    -- Check new flight exists and get pricing
    SELECT base_price, departs_at INTO v_new_base_price, v_new_departs_at
    FROM flights
    WHERE id = p_new_flight_id AND status = 'scheduled';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'New flight not found or is not scheduled';
    END IF;

    -- Enforce 2-hour rule on new flight
    IF v_new_departs_at - NOW() < INTERVAL '2 hours' THEN
        RAISE EXCEPTION 'Cannot reschedule to a flight departing within 2 hours';
    END IF;

    -- Get old flight price for fee calculation
    SELECT base_price INTO v_old_base_price
    FROM flights WHERE id = v_old_flight_id;

    -- Calculate reschedule fee (price difference, minimum 0)
    v_fee_charged := GREATEST(0, v_new_base_price - v_old_base_price);

    -- Find and lock an available seat on the new flight (same class preferred)
    SELECT id, seat_number, extra_fee
    INTO v_new_seat_id, v_new_seat_number, v_new_extra_fee
    FROM seats
    WHERE flight_id = p_new_flight_id
      AND is_available = TRUE
      AND class = v_old_seat_class
    ORDER BY seat_number
    LIMIT 1
    FOR UPDATE;

    -- If no same-class seat, try any available seat
    IF NOT FOUND THEN
        SELECT id, seat_number, extra_fee
        INTO v_new_seat_id, v_new_seat_number, v_new_extra_fee
        FROM seats
        WHERE flight_id = p_new_flight_id
          AND is_available = TRUE
        ORDER BY seat_number
        LIMIT 1
        FOR UPDATE;
    END IF;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No available seats on the new flight';
    END IF;

    -- Calculate new total price
    v_new_total_price := v_new_base_price + v_new_extra_fee;

    -- Release old seat
    UPDATE seats SET is_available = TRUE WHERE id = v_old_seat_id;

    -- Lock new seat
    UPDATE seats SET is_available = FALSE WHERE id = v_new_seat_id;

    -- Update booking to new flight + seat + price
    UPDATE bookings
    SET flight_id = p_new_flight_id,
        seat_id = v_new_seat_id,
        status = 'rescheduled',
        total_price = v_new_total_price
    WHERE id = p_booking_id;

    -- Record the reschedule history
    INSERT INTO reschedules (booking_id, old_flight_id, new_flight_id, fee_charged)
    VALUES (p_booking_id, v_old_flight_id, p_new_flight_id, v_fee_charged);

    -- Build result
    v_result := JSON_BUILD_OBJECT(
        'booking_id', p_booking_id,
        'old_flight_id', v_old_flight_id,
        'new_flight_id', p_new_flight_id,
        'new_seat_number', v_new_seat_number,
        'new_total_price', v_new_total_price,
        'fee_charged', v_fee_charged,
        'new_departs_at', v_new_departs_at
    );

    RETURN v_result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION reschedule_booking(UUID, UUID) TO authenticated;
