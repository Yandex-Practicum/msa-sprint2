namespace BookingHistoryService.Model;

public class Booking
{
    public long Id { get; set; }
    public required string UserId { get; set; }
    public required string HotelId { get; set; }
    public string? PromoCode { get; set; }
    public double DiscountPercent { get; set; }
    public double? Price { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
