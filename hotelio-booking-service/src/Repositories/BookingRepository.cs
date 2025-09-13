using HotelioBookingService.Entities;
using HotelioBookingService.EntityFramework;
using Microsoft.EntityFrameworkCore;

namespace HotelioBookingService.Repositories;

public class BookingRepository : IBookingRepository
{
    private readonly ILogger _logger;
    private readonly BookingDbContext _dbContext;


    public BookingRepository(BookingDbContext context, ILogger<BookingRepository> logger)
    {
        _dbContext = context;
        _logger = logger;
    }


    public async Task<Booking> CreateAsync(Booking entity)
    {
        var result = await _dbContext.Bookings.AddAsync(entity).ConfigureAwait(true);
        await _dbContext.SaveChangesAsync().ConfigureAwait(false);
        return result.Entity;
    }

    public async Task<IEnumerable<Booking>> GetAllUserBookingsAsync(string userId)
    {
        var result = from e in _dbContext.Bookings
            where e.UserId == userId
            select e;
        return await result.ToArrayAsync();
    }
}