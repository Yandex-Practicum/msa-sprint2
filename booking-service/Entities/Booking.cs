namespace Hotelio.BookingService.Entities
{
    public class Booking
    {
        public int Id { get; set; }
        public string UserId { get; set; } = string.Empty;
        public string HotelId { get; set; } = string.Empty;
        public string? PromoCode {get;set;} = string.Empty;
        public double DiscountPercent {get;set;}
        public double Price {get;set;}
        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}
