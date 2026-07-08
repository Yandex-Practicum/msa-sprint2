using Microsoft.EntityFrameworkCore;

namespace BookingService.Data;

public class BookingDbContext : DbContext
{
    public BookingDbContext(DbContextOptions<BookingDbContext> options) : base(options)
    {
    }

    public DbSet<Models.Booking> Bookings { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Models.Booking>(entity =>
        {
            // Покрывает: поиск по UserId, а также поиск по UserId + сортировка по дате
            entity.HasIndex(e => new { e.UserId, e.CreatedAt })
                  .IsDescending(false, true);

            // Покрывает: поиск по HotelId, а также поиск по HotelId + сортировка по дате
            entity.HasIndex(e => new { e.HotelId, e.CreatedAt })
                  .IsDescending(false, true);

            // Покрывает: глобальный поиск/сортировку по времени БЕЗ привязки к юзеру/отелю
            entity.HasIndex(e => e.CreatedAt)
                  .IsDescending();

            // Индекс для поиска по промокоду
            entity.HasIndex(e => e.PromoCode)
                  .HasFilter("\"PromoCode\" IS NOT NULL");
        });        
    }
}
