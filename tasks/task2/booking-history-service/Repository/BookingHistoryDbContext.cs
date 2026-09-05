using BookingHistoryService.Model;
using Microsoft.EntityFrameworkCore;

namespace BookingHistoryService.Repository
{
    public class BookingHistoryDbContext : DbContext
    {
        public BookingHistoryDbContext(DbContextOptions<BookingHistoryDbContext> options) : base(options)
        {
        }

        public DbSet<Booking> Bookings { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            modelBuilder.ApplyConfiguration(new BookingConfiguration());
        }
    }
}