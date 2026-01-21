using Hotelio.BookingService.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hotelio.BookingService
{
    public class BookingDbContext : DbContext
    {
        public BookingDbContext(DbContextOptions<BookingDbContext> options)
            : base(options)
        {
            AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);
        }

        public DbSet<Booking> Bookings { get; set; }


        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Конфигурация моделей
            ConfigureBooking(modelBuilder);

            // Создание индексов
            modelBuilder.Entity<Booking>()
                .HasIndex(b => b.UserId);

            modelBuilder.Entity<Booking>()
                .HasIndex(b => b.HotelId);

            modelBuilder.Entity<Booking>()
                .HasIndex(b => b.CreatedAt);
        }

        private void ConfigureBooking(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Booking>(entity =>
            {
                entity.ToTable("bookings");

                entity.HasKey(e => e.Id);

                entity.Property(e => e.Id)
                    .ValueGeneratedOnAdd();

                entity.Property(e => e.UserId)
                    .IsRequired()
                    .HasMaxLength(50);

                entity.Property(e => e.HotelId)
                    .IsRequired()
                    .HasMaxLength(50);

                entity.Property(e => e.PromoCode)
                    .HasMaxLength(20);

                entity.Property(e => e.Price)
                    .HasColumnType("decimal(10,2)")
                    .IsRequired();

                entity.Property(e => e.DiscountPercent)
                    .HasColumnType("decimal(5,2)")
                    .HasDefaultValue(0);

                entity.Property(e => e.CreatedAt)
                    .IsRequired()
                    .HasDefaultValueSql("CURRENT_TIMESTAMP");

                // Составной индекс
                entity.HasIndex(e => new { e.UserId, e.CreatedAt })
                    .HasDatabaseName("ix_bookings_user_created");
            });
        }
    }
}
