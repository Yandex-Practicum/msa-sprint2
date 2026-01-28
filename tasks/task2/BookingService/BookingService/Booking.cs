namespace BookingService.Data;

public class Booking
{
    public long Id { get; set; }
    public string UserId { get; set; }
    public string HotelId { get; set; }
    public string? PromoCode { get; set; }
    public decimal DiscountPercent { get; set; }
    public decimal Price { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}