using HotelioBookingService.Entities;

namespace HotelioBookingService.Repositories;

public interface IBookingRepository
{
    Task<Booking> CreateAsync(Booking entity);
    Task<IEnumerable<Booking>> GetAllUserBookingsAsync(string userId);
}