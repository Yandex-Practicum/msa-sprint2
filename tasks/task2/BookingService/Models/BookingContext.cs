using Microsoft.EntityFrameworkCore;

namespace BookingService.Models;

public class BookingContext : DbContext
{
    public BookingContext(DbContextOptions<BookingContext> options) : base(options) { }

    public DbSet<Booking> Bookings => Set<Booking>();
}