namespace BookingService;

public record BookingCreatedEvent(
    Guid BookingId,
    Guid UserId,
    Guid HotelId,
    DateTime CheckIn,
    DateTime CheckOut,
    decimal TotalAmount,
    string Currency);