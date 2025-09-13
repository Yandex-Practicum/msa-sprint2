using HotelioHistoryService.Domain;
using HotelioHistoryService.EntityFramework;
using Microsoft.Extensions.Logging;

namespace HotelioHistoryService.Repostitory;

public class BookingHistoryRepository : IBookingHistoryRepository
{
    private readonly ILogger _logger;
    private readonly HistoryDbContext _dbContext;


    public BookingHistoryRepository(HistoryDbContext context, ILogger<BookingHistoryRepository> logger)
    {
        _dbContext = context;
        _logger = logger;
    }

    public async Task<BookingHistory> CreateAsync(BookingHistory entity)
    {
        var result = await _dbContext.BookingHistory.AddAsync(entity).ConfigureAwait(true);
        await _dbContext.SaveChangesAsync().ConfigureAwait(false);
        return result.Entity;
    }
}