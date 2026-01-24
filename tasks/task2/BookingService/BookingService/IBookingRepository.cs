using System.Collections.Generic;
using System.Threading.Tasks;

namespace BookingService.Data
{
    public interface IBookingRepository
    {
        Task<Booking> CreateAsync(Booking booking);
        Task<List<Booking>> GetByUserIdAsync(string userId);
    }
}