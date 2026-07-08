using System;
using System.ComponentModel.DataAnnotations;

namespace BookingHistoryService.Models
{
    public class HistoryBooking
    {
        [Key]
        public string Id { get; set; } = null!;
        public string UserId { get; set; } = null!;
        public string HotelId { get; set; } = null!;
        public string? PromoCode { get; set; }
        public double DiscountPercent { get; set; }
        public double Price { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? Status { get; set; } = "Created";
    }
}