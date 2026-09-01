using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace BookingHistoryService.DTO;

public record BookingEvent
{
    [Key]
    [JsonPropertyName("id")]
    public long? Id { get; set; } = null!;

    [JsonPropertyName("userId")]
    public string UserId { get; set; } = null!;

    [JsonPropertyName("hotelId")]
    public string HotelId { get; set; } = null!;

    [JsonPropertyName("promoCode")]
    public string PromoCode { get; set; } = null!;

    [JsonPropertyName("discountPercent")]
    public double? DiscountPercent { get; set; } = null!;

    [JsonPropertyName("price")]
    public double? Price { get; set; } = null!;

    [JsonPropertyName("createdAt")]
    public double? CreatedAt { get; set; } = null!;
}