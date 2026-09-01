using BookingHistoryService.Model;
using BookingHistoryService.Repository;
using BookingHistoryService.Contracts;

using Microsoft.EntityFrameworkCore;

namespace Repository
{
    public class BookingHistoryRepository: IBookingHistoryRepository
    {
        private readonly BookingHistoryDbContext _context;
        private readonly ILogger<BookingHistoryRepository> _logger;

        public BookingHistoryRepository(
            BookingHistoryDbContext context,
            ILogger<BookingHistoryRepository> logger
            )
        {
            _context = context;
            _logger = logger;
        }

        public async Task AddOrUpdateAsync(Booking newBooking)
        {
            // Для выполнения последовательности из нескольких действий обернём их в транзакцию, чтобы избежать конфликтов 
            // в случае параллельного выполнения данного метода для одного и того же newDocument.Id
            using var transaction = await _context.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);

            var existingBooking = await _context.Bookings.FindAsync(newBooking.Id);
            if (existingBooking != null)
            {
                _logger.LogWarning("Updating booking with Id {Id}", newBooking.Id);
                existingBooking.CreatedAt = newBooking.CreatedAt;
                existingBooking.UserId = newBooking.UserId;
                existingBooking.HotelId = newBooking.HotelId;
                existingBooking.DiscountPercent = newBooking.DiscountPercent;
                existingBooking.PromoCode = newBooking.PromoCode;
                existingBooking.Price = newBooking.Price;
                await _context.SaveChangesAsync();
                _logger.LogWarning("Updated booking with Id {Id}", newBooking.Id);
            }
            else
            {
                _logger.LogWarning("Adding booking with Id {Id}", newBooking.Id);
                await _context.Bookings.AddAsync(newBooking);
                await _context.SaveChangesAsync();
                _logger.LogWarning("Updated booking with Id {Id}", newBooking.Id);
            }

            await transaction.CommitAsync();
        }
    }
}
