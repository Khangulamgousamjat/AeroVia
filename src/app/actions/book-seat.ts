'use server'

import { createClient } from '@/utils/supabase/server'

interface BookSeatParams {
  flightId: string
  seatId: string
  fullName: string
  passportNo: string
  nationality: string
  dob: string
}

export async function bookSeat({
  flightId,
  seatId,
  fullName,
  passportNo,
  nationality,
  dob,
}: BookSeatParams): Promise<{ data?: unknown; error?: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('book_seat', {
    p_flight_id: flightId,
    p_seat_id: seatId,
    p_full_name: fullName,
    p_passport_no: passportNo,
    p_nationality: nationality,
    p_dob: dob,
  })

  if (error) {
    return { error: error.message }
  }

  return { data }
}

export interface PassengerSeatBooking {
  seatId: string
  fullName: string
  passportNo: string
  nationality: string
  dob: string
}

export interface BookSeatsParams {
  flightId: string
  bookings: PassengerSeatBooking[]
}

interface BookSeatResult {
  booking_id: string
  pnr_code: string
  total_price: number
  status: string
  passenger_id: string
}

export async function bookSeats({
  flightId,
  bookings,
}: BookSeatsParams): Promise<{ data?: BookSeatResult[]; error?: string }> {
  const supabase = await createClient()
  const successfulBookings: string[] = []
  const results: BookSeatResult[] = []

  try {
    for (const booking of bookings) {
      const { data, error } = await supabase.rpc('book_seat', {
        p_flight_id: flightId,
        p_seat_id: booking.seatId,
        p_full_name: booking.fullName,
        p_passport_no: booking.passportNo,
        p_nationality: booking.nationality,
        p_dob: booking.dob,
      })

      if (error) {
        throw new Error(error.message)
      }

      if (data && (data as BookSeatResult).booking_id) {
        successfulBookings.push((data as BookSeatResult).booking_id)
        results.push(data as BookSeatResult)
      } else {
        throw new Error("Failed to book seat.")
      }
    }

    return { data: results }
  } catch (err: unknown) {
    // Rollback: cancel all successful bookings
    for (const bookingId of successfulBookings) {
      await supabase.rpc('cancel_booking', { p_booking_id: bookingId })
    }
    const message = err instanceof Error ? err.message : "An error occurred during booking."
    return { error: message }
  }
}
