using BookingHistoryService.Model;

namespace BookingHistoryService.Contracts
{
    public interface IBookingHistoryRepository
    {
        Task AddOrUpdateAsync(Booking newBooking);
    }
}
