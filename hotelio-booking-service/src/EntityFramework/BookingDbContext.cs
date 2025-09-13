using HotelioBookingService.Entities;
using Microsoft.EntityFrameworkCore;
using Npgsql.EntityFrameworkCore.PostgreSQL.Infrastructure.Internal;

namespace HotelioBookingService.EntityFramework;

public sealed class BookingDbContext : DbContext
{
    private DbContextOptions<BookingDbContext> _options;

    public BookingDbContext(DbContextOptions<BookingDbContext> options) : base(options)
    {
        this._options = options;
        Bookings = Set<Booking>();
        // Database.EnsureDeleted();
        // Database.EnsureCreated();
    }

    public DbSet<Booking> Bookings { get; set; }


    protected override void OnConfiguring(DbContextOptionsBuilder builder)
    {
        base.OnConfiguring(builder);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var booking = modelBuilder.Entity<Booking>();
        booking.HasKey(x => x.Id);
        booking.UseTpcMappingStrategy();
        booking.Property(p => p.CreatedAt).HasDefaultValueSql("timezone('utc', now())");
        base.OnModelCreating(modelBuilder);
    }
}