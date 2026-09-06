"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

interface RescheduleResult {
  booking_id: string;
  old_flight_id: string;
  new_flight_id: string;
  new_seat_number: string;
  new_total_price: number;
  fee_charged: number;
  new_departs_at: string;
}

export async function rescheduleBooking(
  bookingId: string,
  newFlightId: string,
  _oldFlightId: string,
): Promise<{
  success?: boolean;
  feeCharged?: number;
  newSeatNumber?: string;
  error?: string;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("reschedule_booking", {
    p_booking_id: bookingId,
    p_new_flight_id: newFlightId,
  });

  if (error) {
    if (error.message.includes("2 hours")) {
      return { error: "Cannot reschedule to a flight departing within 2 hours." };
    }
    return { error: error.message };
  }

  const result = data as RescheduleResult;

  revalidatePath("/bookings");
  return {
    success: true,
    feeCharged: result.fee_charged,
    newSeatNumber: result.new_seat_number,
  };
}
