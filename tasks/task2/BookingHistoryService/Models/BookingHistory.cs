namespace BookingHistoryService.Models;

public class BookingHistory
{
    public int Id { get; set; }
    public string BookingId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string HotelId { get; set; } = string.Empty;
    public string? PromoCode { get; set; }
    public decimal DiscountPercent { get; set; }
    public decimal Price { get; set; }
    public DateTime BookingCreatedAt { get; set; }
    public DateTime EventTimestamp { get; set; } = DateTime.UtcNow;
}