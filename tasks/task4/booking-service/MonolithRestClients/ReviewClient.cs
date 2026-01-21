namespace Hotelio.BookingService.Clients
{
    public interface IReviewClient
    {
        Task<bool> IsHotelTrusted(string hotelId);
    }

    public class ReviewClient : IReviewClient
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<ReviewClient> _logger;

        public ReviewClient(HttpClient httpClient, ILogger<ReviewClient> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
        }

        public async Task<bool> IsHotelTrusted(string hotelId)
        {
            try
            {
                var response = await _httpClient.GetAsync($"/api/reviews/hotel/{hotelId}/trusted");
                response.EnsureSuccessStatusCode();

                var content = await response.Content.ReadAsStringAsync();
                return bool.Parse(content);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to check if hotel {HotelId} is trusted", hotelId);
                throw;
            }
        }
    }
}
