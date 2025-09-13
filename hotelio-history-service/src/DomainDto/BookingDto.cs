namespace HotelioHistoryService.DomainDto;

public class BookingDto
{
    public long Id { get; set; }

    public double? DiscountPrecent { get; set; }

    public string? HotelId { get; set; }

    public double Price { get; set; }

    public string? PromoCode { get; set; }

    public string? UserId { get; set; }

    public DateTime CreatedAt { get; set; }
}