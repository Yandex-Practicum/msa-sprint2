using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace BookingService.Data
{
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

        public async Task<Booking> CreateAsync(Booking booking)
        {
            try
            {
                _context.Bookings.Add(booking);
                await _context.SaveChangesAsync();
                
                _logger.LogInformation("Booking {BookingId} created successfully", booking.Id);
                return booking;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating booking for user {UserId}", booking.UserId);
                throw;
            }
        }

        public async Task<List<Booking>> GetByUserIdAsync(string userId)
        {
            try
            {
                return await _context.Bookings
                    .Where(b => b.UserId == userId)
                    .OrderByDescending(b => b.CreatedAt)
                    .ToListAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting bookings for user {UserId}", userId);
                throw;
            }
        }

        public async Task<Booking> GetByIdAsync(string userId)
        {
            return await _context.Bookings
                .FirstOrDefaultAsync(b => b.UserId == userId);
        }

        public async Task<bool> ExistsAsync(string userId)
        {
            return await _context.Bookings
                .AnyAsync(b => b.UserId == userId);
        }
    }
}