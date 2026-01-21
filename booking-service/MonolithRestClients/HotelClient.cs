using System.Text.Json;

namespace Hotelio.BookingService.MonolithClients
{
    public interface IHotelClient
    {
        Task<bool> IsHotelOperational(string hotelId);
        Task<bool> IsHotelFullyBooked(string hotelId);
        Task<string?> GetHotelCity(string hotelId);
    }

    public class HotelClient : IHotelClient
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<HotelClient> _logger;

        public HotelClient(HttpClient httpClient, ILogger<HotelClient> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
        }

        public async Task<bool> IsHotelOperational(string hotelId)
        {
            try
            {
                var response = await _httpClient.GetAsync($"/api/hotels/{hotelId}/operational");
                response.EnsureSuccessStatusCode();

                var content = await response.Content.ReadAsStringAsync();
                return bool.Parse(content);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to check if hotel {HotelId} is operational", hotelId);
                throw;
            }
        }

        public async Task<bool> IsHotelFullyBooked(string hotelId)
        {
            try
            {
                var response = await _httpClient.GetAsync($"/api/hotels/{hotelId}/fully-booked");
                response.EnsureSuccessStatusCode();

                var content = await response.Content.ReadAsStringAsync();
                return bool.Parse(content);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to check if hotel {HotelId} is fully booked", hotelId);
                throw;
            }
        }

        public async Task<string?> GetHotelCity(string hotelId)
        {
            try
            {
                var response = await _httpClient.GetAsync($"/api/hotels/{hotelId}");
                response.EnsureSuccessStatusCode();

                var content = await response.Content.ReadAsStringAsync();
                var hotel = JsonSerializer.Deserialize<HotelDto>(content, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                return hotel?.City;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get city for hotel {HotelId}", hotelId);
                return null;
            }
        }

        private class HotelDto
        {
            public string? City { get; set; }
        }
    }
}