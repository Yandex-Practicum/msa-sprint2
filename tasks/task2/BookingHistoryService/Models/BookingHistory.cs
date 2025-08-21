using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BookingHistoryService.Models
{
    [Table("bookingHistory")]
    public class BookingHistory
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("user_id")]
        [Required]
        public string UserId { get; set; }
        
        [Column("event_id")]
        [Required]
        public int EventId { get; set; }

        [Column("action")]
        [Required]
        public string Action { get; set; }

        //[Column("hotel_id")]
        //[Required]
        //public string HotelId { get; set; }

        //[Column("promo_code")]
        //public string PromoCode { get; set; }

        //[Column("discount_percent")]
        //public double DiscountPercent { get; set; }

        //[Required]
        //[Column("price")]
        //public double Price { get; set; }

        //[Required]
        //[Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
