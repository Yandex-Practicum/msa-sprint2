using Microsoft.EntityFrameworkCore;

namespace Hotelio.BookingService
{
    public class HistoryDbContext : DbContext
    {
        public DbSet<DailyStatistic> DailyStatistics { get; set; }
        public DbSet<UserStatistic> UserStatistics { get; set; }
        public DbSet<HotelStatistic> HotelStatistics { get; set; }

        public HistoryDbContext(DbContextOptions<HistoryDbContext> options)
            : base(options) { 
            AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<DailyStatistic>(entity =>
            {
                entity.ToTable("dailystatistics");
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.Date).IsUnique();
                entity.Property(e => e.Date).IsRequired();
                entity.Property(e => e.BookingCount).IsRequired();
                entity.Property(e => e.TotalRevenue).HasPrecision(15, 2);
                entity.Property(e => e.AverageBookingValue).HasPrecision(10, 2);
            });

            modelBuilder.Entity<UserStatistic>(entity =>
            {
                entity.ToTable("userstatistics"); 
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.UserId).IsUnique();
                entity.Property(e => e.UserId).IsRequired();
                entity.Property(e => e.TotalSpent).HasPrecision(15, 2);
            });

            modelBuilder.Entity<HotelStatistic>(entity =>
            {
                entity.ToTable("hotelstatistics");
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.HotelId).IsUnique();
                entity.Property(e => e.HotelId).IsRequired();
                entity.Property(e => e.TotalRevenue).HasPrecision(15, 2);
                entity.Property(e => e.AverageBookingValue).HasPrecision(10, 2);
            });
        }
    }

    public class DailyStatistic
    {
        public string Id { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public int BookingCount { get; set; }
        public double TotalRevenue { get; set; }
        public double AverageBookingValue { get; set; }
    }

    public class UserStatistic
    {
        public string Id { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public int BookingCount { get; set; }
        public double TotalSpent { get; set; }
        public DateTime LastBookingDate { get; set; }
    }

    public class HotelStatistic
    {
        public string Id { get; set; } = string.Empty;
        public string HotelId { get; set; } = string.Empty;
        public int BookingCount { get; set; }
        public double TotalRevenue { get; set; }
        public double AverageBookingValue { get; set; }
    }
}