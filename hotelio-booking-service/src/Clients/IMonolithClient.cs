using HotelioBookingService.ClientContracts;
using Refit;

namespace HotelioBookingService.Clients;


public interface IMonolithClient
{
    [Get("/users/{userId}/active")]
    Task<bool> IsUserActive(string userId);

    [Get("/users/{userId}/blacklisted")]
    Task<bool> IsUserBlacklisted(string userId);
    
    [Get("/users/{userId}/status")]
    Task<string> GetUserStatus(string userId);

    [Get("/hotels/{id}/operational")]
    Task<bool> IsHotelOperational(string id);

    [Get("/hotels/{id}/fully-booked")]
    Task<bool> IsFullyBooked(string id);

    [Get("/reviews/hotel/{hotelId}/trusted")]
    Task<bool> IsHotelTrusted(string hotelId);

    [Post("/promos/validate")]
    Task<PromoCode> ValidatePromo(string code, string userId);
}