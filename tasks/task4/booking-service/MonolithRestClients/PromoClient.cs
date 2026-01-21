using System.Text.Json;

namespace Hotelio.BookingService.MonolithRestClients
{
    public interface IPromoClient
    {
        Task<PromoValidationResult?> ValidatePromoCode(string promoCode, string userId);
    }

    public class PromoValidationResult
    {
        public bool IsValid { get; set; }
        public double DiscountAmount { get; set; }
        public string? PromoCode { get; set; }
    }

    public class PromoClient : IPromoClient
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<PromoClient> _logger;

        public PromoClient(HttpClient httpClient, ILogger<PromoClient> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
        }

        public async Task<PromoValidationResult?> ValidatePromoCode(string promoCode, string userId)
        {
            try
            {
                var url = $"/api/promos/validate?code={Uri.EscapeDataString(promoCode)}&userId={Uri.EscapeDataString(userId)}";
                var response = await _httpClient.PostAsync(url, null);
                response.EnsureSuccessStatusCode();

                var content = await response.Content.ReadAsStringAsync();
                var promo = JsonSerializer.Deserialize<PromoDto>(content, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (promo == null) return null;

                return new PromoValidationResult
                {
                    IsValid = true,
                    DiscountAmount = promo.Discount,
                    PromoCode = promo.Code
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to validate promo code {PromoCode} for user {UserId}",
                    promoCode, userId);
                return null;
            }
        }

        private class PromoDto
        {
            public string? Code { get; set; }
            public double Discount { get; set; }
        }
    }
}
