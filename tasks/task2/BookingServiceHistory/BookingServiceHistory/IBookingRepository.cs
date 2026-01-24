namespace BookingServiceHistory;

public interface IBookingRepository
{
    Task SaveAsync(Booking booking);
}