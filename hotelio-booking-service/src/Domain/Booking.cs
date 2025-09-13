using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelioBookingService.Entities;

[Table("booking")]
public class Booking
{
    [Key]
    [Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; protected set; }

    [Column("discount_percent")] public double? DiscountPrecent { get; set; }

    [Column("hotel_id", TypeName = "varchar(255)")]
    [MaxLength(255)]
    public string? HotelId { get; set; }

    [Column("price")] [Required] public double Price { get; set; }

    [Column("promo_code", TypeName = "varchar(255)")]
    [MaxLength(255)]
    public string? PromoCode { get; set; }

    [Column("user_id", TypeName = "varchar(255)")]
    [MaxLength(255)]
    public string? UserId { get; set; }

    [Column("created_at", TypeName = "timestamp")]
    public DateTime CreatedAt { get; protected set; }
}