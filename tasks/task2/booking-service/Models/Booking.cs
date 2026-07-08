namespace BookingService.Models;

public class Booking
{
    public long Id { get; set; }
    public required string UserId { get; set; }
    public required string HotelId { get; set; }
    public string? PromoCode { get; set; }
    public double DiscountPercent { get; set; }
    public required double Price { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Booking() { }
}
