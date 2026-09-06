DO $$
DECLARE
    v_flight_id UUID;
    v_date DATE;
    v_flight_counter INT;

    -- Location arrays (All 10 airports from your original file)
    v_origins TEXT[] := ARRAY[
        'DEL (IGIA T3)', 'BOM (CSMIA T2)', 'BLR (KIA T2)', 'CCU (NSCBIA T2)', 'MAA (CIA Domestic)',
        'DXB (Dubai T3)', 'LHR (Heathrow T5)', 'JFK (Kennedy T8)', 'NRT (Narita T1)', 'SVO (Sheremetyevo TC)'
    ];

    v_destinations TEXT[] := v_origins; -- Same pool of airports

    -- Aircrafts pool
    v_aircrafts TEXT[] := ARRAY['Airbus A320neo', 'Boeing 787-9', 'Boeing 737 MAX 8', 'Airbus A321neo', 'Boeing 777-300ER', 'Airbus A350-900'];

    -- Variables for random assignments
    v_ori TEXT;
    v_dest TEXT;
    v_flight_no TEXT;
    v_departs TIMESTAMP WITH TIME ZONE;
    v_arrives TIMESTAMP WITH TIME ZONE;
    v_aircraft TEXT;
    v_base_price NUMERIC(10, 2);
    v_is_intl BOOLEAN;
    v_duration INTERVAL;

    -- Seat variables
    row_num INT;
    seat_let TEXT;
    seat_fee NUMERIC;
BEGIN

    -- Loop through every single day between May 20, 2026 and July 26, 2026
    FOR v_date IN SELECT generate_series('2026-05-20'::DATE, '2026-07-26'::DATE, '1 day'::INTERVAL)::DATE LOOP

        -- Loop through every origin airport
        FOREACH v_ori IN ARRAY v_origins LOOP

            -- Add 10 flights from this specific airport for the current day
            FOR v_flight_counter IN 1..10 LOOP

                -- 1. Pick a random destination that is NOT the current origin
                LOOP
                    v_dest := v_destinations[floor(random() * array_length(v_destinations, 1) + 1)];
                    EXIT WHEN v_dest <> v_ori;
                END LOOP;

                -- 2. Generate a totally random airline code and flight number
                v_flight_no := (ARRAY['AI', 'UK', '6E', 'QP', 'EK', 'JL', 'SU'])[floor(random() * 7 + 1)] || floor(random() * 899 + 100)::TEXT;

                -- 3. Determine if the route is international (if either origin or destination is not Indian)
                IF v_ori LIKE '%DEL%' OR v_ori LIKE '%BOM%' OR v_ori LIKE '%BLR%' OR v_ori LIKE '%CCU%' OR v_ori LIKE '%MAA%' THEN
                    IF v_dest LIKE '%DEL%' OR v_dest LIKE '%BOM%' OR v_dest LIKE '%BLR%' OR v_dest LIKE '%CCU%' OR v_dest LIKE '%MAA%' THEN
                        v_is_intl := FALSE;
                    ELSE
                        v_is_intl := TRUE;
                    END IF;
                ELSE
                    v_is_intl := TRUE;
                END IF;

                -- 4. Pick random aircraft and scale base price dynamically based on Domestic vs Intl
                v_aircraft := v_aircrafts[floor(random() * array_length(v_aircrafts, 1) + 1)];

                IF v_is_intl THEN
                    v_base_price := round((random() * (70000.00 - 18000.00) + 18000.00)::NUMERIC, 2);
                    v_duration := (floor(random() * (16 - 3) + 3)::TEXT || ' hours ' || floor(random() * 59)::TEXT || ' minutes')::INTERVAL;
                ELSE
                    v_base_price := round((random() * (6500.00 - 3500.00) + 3500.00)::NUMERIC, 2);
                    v_duration := (floor(random() * (3 - 1) + 1)::TEXT || ' hours ' || floor(random() * 59)::TEXT || ' minutes')::INTERVAL;
                END IF;

                -- 5. Calculate a random departure timestamp during this specific day
                v_departs := v_date::TIMESTAMP WITH TIME ZONE + (random() * INTERVAL '24 hours');
                v_arrives := v_departs + v_duration;

                -- 6. Insert flight into database and grab UUID
                INSERT INTO flights (flight_no, origin, destination, departs_at, arrives_at, aircraft_type, status, base_price)
                VALUES (v_flight_no, v_ori, v_dest, v_departs, v_arrives, v_aircraft, 'scheduled', v_base_price)
                RETURNING id INTO v_flight_id;

                -- 7. Generate full seat maps (108 seats per flight)
                -- A. First Class (Rows 1-2)
                IF v_is_intl THEN seat_fee := 10000.00; ELSE seat_fee := 1500.00; END IF;
                FOR row_num IN 1..2 LOOP
                    FOREACH seat_let IN ARRAY ARRAY['A', 'B', 'E', 'F'] LOOP
                        INSERT INTO seats (flight_id, seat_number, class, is_available, extra_fee)
                        VALUES (v_flight_id, row_num::TEXT || seat_let, 'first', TRUE, seat_fee);
                    END LOOP;
                END LOOP;

                -- B. Business Class (Rows 3-6)
                IF v_is_intl THEN seat_fee := 4000.00; ELSE seat_fee := 750.00; END IF;
                FOR row_num IN 3..6 LOOP
                    FOREACH seat_let IN ARRAY ARRAY['A', 'B', 'E', 'F'] LOOP
                        INSERT INTO seats (flight_id, seat_number, class, is_available, extra_fee)
                        VALUES (v_flight_id, row_num::TEXT || seat_let, 'business', TRUE, seat_fee);
                    END LOOP;
                END LOOP;

                -- C. Economy Class (Rows 7-20)
                FOR row_num IN 7..20 LOOP
                    FOREACH seat_let IN ARRAY ARRAY['A', 'B', 'C', 'D', 'E', 'F'] LOOP
                        INSERT INTO seats (flight_id, seat_number, class, is_available, extra_fee)
                        VALUES (v_flight_id, row_num::TEXT || seat_let, 'economy', TRUE, 0.00);
                    END LOOP;
                END LOOP;

            END LOOP;
        END LOOP;
    END LOOP;

END $$;

-- Mark one economy seat per flight as occupied for UI testing
UPDATE seats
SET is_available = false
WHERE id IN (
  SELECT DISTINCT ON (flight_id) id
  FROM seats
  WHERE class = 'economy'
  ORDER BY flight_id, seat_number ASC
);
