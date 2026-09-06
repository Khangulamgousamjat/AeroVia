-- Grant execute permission on cancel_booking to authenticated users
GRANT EXECUTE ON FUNCTION cancel_booking(UUID) TO authenticated;

-- Grant execute permission on book_seat to authenticated users (if not already granted)
GRANT EXECUTE ON FUNCTION book_seat TO authenticated;
