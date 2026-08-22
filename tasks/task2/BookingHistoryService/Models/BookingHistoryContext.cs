using Microsoft.EntityFrameworkCore;

namespace BookingHistoryService.Models;

public class BookingHistoryContext : DbContext
{
    public BookingHistoryContext(DbContextOptions<BookingHistoryContext> options) : base(options) { }

    public DbSet<BookingHistory> BookingHistories => Set<BookingHistory>();
}