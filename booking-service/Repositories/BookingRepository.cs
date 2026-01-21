using Hotelio.BookingService.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hotelio.BookingService.Repositories
{
    public interface IBookingRepository
    {
        Task<Booking?> GetById(int id);
        Task<IEnumerable<Booking>> GetByUserId(string userId);
        Task<IEnumerable<Booking>> GetAll();
        Task<Booking> Create(Booking booking);

    }

    public class BookingRepository : IBookingRepository
    {
        private readonly BookingDbContext _context;
        private readonly ILogger<BookingRepository> _logger;

        public BookingRepository(
            BookingDbContext context,
            ILogger<BookingRepository> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<Booking?> GetById(int id)
        {
            return await _context.Bookings
                .FirstOrDefaultAsync(b => b.Id == id);
        }

        public async Task<IEnumerable<Booking>> GetByUserId(string userId)
        {
            return await _context.Bookings
                .Where(b => b.UserId == userId)
                .OrderByDescending(b => b.CreatedAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<Booking>> GetAll()
        {
            return await _context.Bookings
                .OrderByDescending(b => b.CreatedAt)
                .ToListAsync();
        }

        public async Task<Booking> Create(Booking booking)
        {
            _context.Bookings.Add(booking);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created booking {BookingId} for user {UserId}",
                booking.Id, booking.UserId);

            return booking;
        }
    }
}
