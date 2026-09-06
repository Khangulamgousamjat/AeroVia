-- Supabase Initial Flight App Migration
-- Creates flights, seats, bookings, passengers, and reschedules tables

-- =========================================================================
-- 1. Table Definitions
-- =========================================================================

-- Flights table
CREATE TABLE flights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flight_no TEXT NOT NULL,
    origin VARCHAR(100) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    departs_at TIMESTAMP WITH TIME ZONE NOT NULL,
    arrives_at TIMESTAMP WITH TIME ZONE NOT NULL,
    aircraft_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'delayed', 'cancelled', 'departed', 'arrived')),
    base_price NUMERIC(10, 2) NOT NULL CHECK (base_price >= 0.00),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_flight_times CHECK (arrives_at > departs_at)
);

-- Seats table
CREATE TABLE seats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flight_id UUID NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
    seat_number TEXT NOT NULL,
    class TEXT NOT NULL CHECK (class IN ('economy', 'business', 'first')),
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    extra_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (extra_fee >= 0.00),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_flight_seat UNIQUE (flight_id, seat_number)
);

-- Bookings table
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    flight_id UUID NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
    seat_id UUID NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'rescheduled')),
    booked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    total_price NUMERIC(10, 2) NOT NULL CHECK (total_price >= 0.00),
    pnr_code VARCHAR(6) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Passengers table
CREATE TABLE passengers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    passport_no TEXT NOT NULL,
    nationality TEXT NOT NULL,
    dob DATE NOT NULL CHECK (dob <= CURRENT_DATE),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reschedules table
CREATE TABLE reschedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    old_flight_id UUID NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
    new_flight_id UUID NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    fee_charged NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (fee_charged >= 0.00),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_different_flights CHECK (old_flight_id <> new_flight_id)
);

-- Indexes for Query Performance Optimization
CREATE INDEX idx_flights_departure ON flights(departs_at);
CREATE INDEX idx_flights_origin_dest ON flights(origin, destination);
CREATE INDEX idx_seats_flight_avail ON seats(flight_id, is_available);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_passengers_booking ON passengers(booking_id);
CREATE INDEX idx_reschedules_booking ON reschedules(booking_id);

-- =========================================================================
-- 2. Row Level Security (RLS) Configuration
-- =========================================================================

ALTER TABLE flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reschedules ENABLE ROW LEVEL SECURITY;

-- Flights RLS Policies
CREATE POLICY "Flights are publicly viewable by everyone" ON flights
    FOR SELECT USING (true);

-- Seats RLS Policies
CREATE POLICY "Seats are publicly viewable by everyone" ON seats
    FOR SELECT USING (true);

CREATE POLICY "Deny direct seat updates" ON seats
  FOR UPDATE USING (false);

CREATE POLICY "Deny direct seat deletes" ON seats
  FOR DELETE USING (false);

-- Bookings RLS Policies
CREATE POLICY "Users can view their own bookings" ON bookings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookings" ON bookings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings" ON bookings
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Passengers RLS Policies
CREATE POLICY "Users can view passengers associated with their own bookings" ON passengers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM bookings b 
            WHERE b.id = passengers.booking_id AND b.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert passengers associated with their own bookings" ON passengers
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM bookings b 
            WHERE b.id = booking_id AND b.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update passengers associated with their own bookings" ON passengers
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM bookings b 
            WHERE b.id = passengers.booking_id AND b.user_id = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM bookings b 
            WHERE b.id = booking_id AND b.user_id = auth.uid()
        )
    );

-- Reschedules RLS Policies
CREATE POLICY "Users can view reschedules associated with their own bookings" ON reschedules
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM bookings b 
            WHERE b.id = reschedules.booking_id AND b.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can request reschedules associated with their own bookings" ON reschedules
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM bookings b 
            WHERE b.id = booking_id AND b.user_id = auth.uid()
        )
    );

-- =========================================================================
-- 3. Atomic Seat-Lock RPC (PL/pgSQL Function)
-- =========================================================================

CREATE OR REPLACE FUNCTION book_seat(
    p_flight_id UUID,
    p_seat_id UUID,
    p_full_name TEXT,
    p_passport_no TEXT,
    p_nationality TEXT,
    p_dob DATE,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Elevates privileges to allow updates to seats & insert bookings/passengers
AS $$
DECLARE
    v_user_id UUID;
    v_is_available BOOLEAN;
    v_extra_fee NUMERIC(10, 2);
    v_base_price NUMERIC(10, 2);
    v_total_price NUMERIC(10, 2);
    v_pnr_code VARCHAR(6);
    v_booking_id UUID;
    v_passenger_id UUID;
    v_result JSON;
BEGIN
    -- Determine and validate user session
    v_user_id := COALESCE(p_user_id, auth.uid());
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required. No user session found.';
    END IF;

    -- Lock the seat record for update to prevent concurrent double-booking race conditions
    SELECT is_available, extra_fee INTO v_is_available, v_extra_fee
    FROM seats
    WHERE id = p_seat_id AND flight_id = p_flight_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Selected seat does not exist on this flight.';
    END IF;

    IF NOT v_is_available THEN
        RAISE EXCEPTION 'Seat is already reserved. Please select another seat.';
    END IF;

    -- Fetch flight base price
    SELECT base_price INTO v_base_price
    FROM flights
    WHERE id = p_flight_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Flight not found.';
    END IF;

    -- Calculate complete pricing
    v_total_price := v_base_price + v_extra_fee;

    -- Generate a unique 6-character PNR code (alphanumeric, uppercase)
    LOOP
        v_pnr_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
        PERFORM 1 FROM bookings WHERE pnr_code = v_pnr_code;
        EXIT WHEN NOT FOUND;
    END LOOP;

    -- Mark the seat as unavailable atomically
    UPDATE seats
    SET is_available = FALSE
    WHERE id = p_seat_id;

    -- Create flight booking
    INSERT INTO bookings (user_id, flight_id, seat_id, status, booked_at, total_price, pnr_code)
    VALUES (v_user_id, p_flight_id, p_seat_id, 'confirmed', NOW(), v_total_price, v_pnr_code)
    RETURNING id INTO v_booking_id;

    -- Insert associated passenger details
    INSERT INTO passengers (booking_id, full_name, passport_no, nationality, dob)
    VALUES (v_booking_id, p_full_name, p_passport_no, p_nationality, p_dob)
    RETURNING id INTO v_passenger_id;

    -- Return JSON payload of the success state
    v_result := JSON_BUILD_OBJECT(
        'booking_id', v_booking_id,
        'pnr_code', v_pnr_code,
        'total_price', v_total_price,
        'status', 'confirmed',
        'passenger_id', v_passenger_id
    );

    RETURN v_result;
END;
$$;

-- =========================================================================
-- 4. Cancellation & Seat Release Triggers
-- =========================================================================

-- Trigger to reject cancellation if departing in less than 2 hours
CREATE OR REPLACE FUNCTION check_booking_cancellation()
RETURNS TRIGGER AS $$
DECLARE
  v_departs_at TIMESTAMPTZ;
BEGIN
    -- Check on cancellation
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
      SELECT departs_at INTO v_departs_at FROM flights WHERE id = NEW.flight_id;
      IF v_departs_at - NOW() < INTERVAL '2 hours' THEN
        RAISE EXCEPTION 'Cannot cancel a booking within 2 hours of departure';
      END IF;
    END IF;

    -- Check on reschedule (flight_id change)
    IF NEW.flight_id IS DISTINCT FROM OLD.flight_id THEN
      SELECT departs_at INTO v_departs_at FROM flights WHERE id = NEW.flight_id;
      IF v_departs_at - NOW() < INTERVAL '2 hours' THEN
        RAISE EXCEPTION 'Cannot reschedule to a flight departing within 2 hours';
      END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_booking_cancellation
BEFORE UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION check_booking_cancellation();

-- Trigger to prevent manual hard-deletions of bookings too close to departure (optional safeguard)
CREATE OR REPLACE FUNCTION check_booking_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_departs_at TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT departs_at INTO v_departs_at
    FROM flights
    WHERE id = OLD.flight_id;

    IF FOUND AND (v_departs_at - NOW() < INTERVAL '2 hours') THEN
        RAISE EXCEPTION 'Booking deletion rejected. Flights departing in less than 2 hours cannot be altered.';
    END IF;
    RETURN OLD;
END;
$$;

CREATE TRIGGER trg_check_booking_deletion
BEFORE DELETE ON bookings
FOR EACH ROW
EXECUTE FUNCTION check_booking_deletion();

-- Trigger to release seats automatically when a booking is marked as cancelled
CREATE OR REPLACE FUNCTION handle_booking_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- If status is updated to 'cancelled', reset the seat availability
    IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
        UPDATE seats
        SET is_available = TRUE
        WHERE id = NEW.seat_id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_handle_booking_status_change
AFTER UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION handle_booking_status_change();

-- =========================================================================
-- 5. Cancel Booking RPC (Atomic Cancel + Seat Release)
-- =========================================================================

CREATE OR REPLACE FUNCTION cancel_booking(p_booking_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_seat_id UUID;
BEGIN
    -- Verify the booking belongs to the calling user
    SELECT seat_id INTO v_seat_id
    FROM bookings
    WHERE id = p_booking_id AND user_id = auth.uid();

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Booking not found or unauthorized';
    END IF;

    -- Update booking status (the 2-hour trigger will fire here and block if too close)
    UPDATE bookings SET status = 'cancelled' WHERE id = p_booking_id;

    -- Release the seat atomically in the same transaction
    UPDATE seats SET is_available = true WHERE id = v_seat_id;
END;
$$;

-- =========================================================================
-- 6. Enable Realtime Replication
-- =========================================================================

-- Enable Realtime replication for seats table
ALTER PUBLICATION supabase_realtime ADD TABLE seats;
