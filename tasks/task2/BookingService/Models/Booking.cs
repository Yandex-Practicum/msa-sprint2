namespace BookingService.Models;

public class Booking
{
    public long Id { get; set; }  // ← числовой ID с автоинкрементом
    public string UserId { get; set; } = string.Empty;
    public string HotelId { get; set; } = string.Empty;
    public string? PromoCode { get; set; }
    public decimal DiscountPercent { get; set; }
    public decimal Price { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}