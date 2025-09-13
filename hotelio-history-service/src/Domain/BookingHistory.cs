using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;


namespace HotelioHistoryService.Domain;

[Table("booking_history")]
public class BookingHistory
{
    [Key]
    [Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; protected set; }
    
    [Column("booking_id")]
    [Required]
    public long BookingId { get; set; }

    [Column("discount_percent")]
    public double? DiscountPrecent { get; set; }

    [Column("hotel_id", TypeName = "varchar(255)")]
    [MaxLength(255)]
    public string? HotelId { get; set; }

    [Column("price")] 
    [Required] 
    public double Price { get; set; }

    [Column("promo_code", TypeName = "varchar(255)")]
    [MaxLength(255)]
    public string? PromoCode { get; set; }

    [Column("user_id", TypeName = "varchar(255)")]
    [MaxLength(255)]
    public string? UserId { get; set; }
    
    [Column("booking_created_at", TypeName = "timestamp")]
    public DateTime BookingDate { get; set; }

    [Column("created_at", TypeName = "timestamp")]
    public DateTime CreatedAt { get; protected set; }
}