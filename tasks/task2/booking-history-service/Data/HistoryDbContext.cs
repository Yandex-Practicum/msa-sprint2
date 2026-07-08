using Microsoft.EntityFrameworkCore;
using BookingHistoryService.Models;

namespace BookingHistoryService.Data
{
    public class HistoryDbContext : DbContext
    {
        public HistoryDbContext(DbContextOptions<HistoryDbContext> options) : base(options) { }

        public DbSet<HistoryBooking> HistoryBookings { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // јналитикам важен поиск по пользовател€м и датам
            modelBuilder.Entity<HistoryBooking>().HasIndex(b => b.UserId);
            modelBuilder.Entity<HistoryBooking>().HasIndex(b => b.CreatedAt);
        }
    }
}
