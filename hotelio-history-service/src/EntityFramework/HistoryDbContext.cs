using HotelioHistoryService.Domain;
using Microsoft.EntityFrameworkCore;

namespace HotelioHistoryService.EntityFramework;

public sealed class HistoryDbContext : DbContext
{
    public HistoryDbContext(DbContextOptions<HistoryDbContext> options) : base(options)
    {
        BookingHistory = Set<BookingHistory>();
    }

    public DbSet<BookingHistory> BookingHistory { get; }


    protected override void OnConfiguring(DbContextOptionsBuilder builder)
    {
        base.OnConfiguring(builder);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var booking = modelBuilder.Entity<BookingHistory>();
        booking.HasKey(x => x.Id);
        booking.UseTpcMappingStrategy();
        booking.Property(p => p.CreatedAt).HasDefaultValueSql("timezone('utc', now())");
        base.OnModelCreating(modelBuilder);
    }
}