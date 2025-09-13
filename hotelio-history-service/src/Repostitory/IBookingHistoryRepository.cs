using HotelioHistoryService.Domain;

namespace HotelioHistoryService.Repostitory;

public interface IBookingHistoryRepository
{
    Task<BookingHistory> CreateAsync(BookingHistory entity);
}