using BookingHistoryService.Model;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BookingHistoryService.Repository
{
    public class BookingConfiguration : IEntityTypeConfiguration<Booking>
    {
        public void Configure(EntityTypeBuilder<Booking> builder)
        {
            builder.ToTable("booking");

            builder.HasKey(x => x.Id);

            builder.Property(x => x.Id)
                .HasColumnName("id")
                .HasColumnType("bigint")
                .IsRequired()
                .ValueGeneratedNever();

            builder.Property(x => x.UserId)
                .HasColumnName("used_id")
                .HasColumnType("text")
                .IsRequired();

            builder.Property(x => x.PromoCode)
                .HasColumnName("promo_code")
                .HasColumnType("text");

            builder.Property(x => x.HotelId)
                .HasColumnName("hotel_id")
                .HasColumnType("text")
                .IsRequired();

            builder.Property(x => x.DiscountPercent)
                .HasColumnName("discount_percent")
                .HasColumnType("double precision")
                .IsRequired();

            builder.Property(x => x.Price)
                .HasColumnName("price")
                .HasColumnType("double precision");

            builder.Property(x => x.CreatedAt)
                .HasColumnName("created_at")
                .HasColumnType("timestamptz")
                .IsRequired();
        }
    }
}