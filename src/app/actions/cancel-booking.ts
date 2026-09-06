'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function cancelBooking(
  bookingId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase.rpc('cancel_booking', {
    p_booking_id: bookingId,
  })

  if (error) {
    if (error.message.includes('2 hours')) {
      return { error: 'Cannot cancel a flight within 2 hours of departure.' }
    }
    return { error: error.message }
  }

  revalidatePath('/bookings')
  return { success: true }
}
