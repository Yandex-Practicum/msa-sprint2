using Microsoft.EntityFrameworkCore;

namespace BookingServiceHistory;

public class BookingDbContext : DbContext
{
    public BookingDbContext(DbContextOptions<BookingDbContext> options)
        : base(options)
    {
    }

    public DbSet<Booking> Bookings { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Booking>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id)
                .UseSerialColumn();;

            entity.Property(e => e.UserId)
                .IsRequired()
                .HasMaxLength(100);

            entity.Property(e => e.HotelId)
                .IsRequired()
                .HasMaxLength(100);

            entity.Property(e => e.PromoCode)
                .HasMaxLength(50);
            
            entity.Property(e => e.Price);
            
            entity.Property(e => e.DiscountPercent);

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("NOW()");

            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.HotelId);
            entity.HasIndex(e => new { e.UserId, e.CreatedAt });
        });
    }
}