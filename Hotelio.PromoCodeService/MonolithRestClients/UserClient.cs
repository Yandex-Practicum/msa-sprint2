namespace Hotelio.PromoCodeService.MonolithClients
{
    public interface IUserClient
    {
        Task<bool> IsUserActive(string userId);
        Task<bool> IsUserBlacklisted(string userId);
        Task<string?> GetUserStatus(string userId);
    }

    public class UserClient : IUserClient
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<UserClient> _logger;

        public UserClient(HttpClient httpClient, ILogger<UserClient> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
        }

        public async Task<bool> IsUserActive(string userId)
        {
            try
            {
                var response = await _httpClient.GetAsync($"/api/users/{userId}/active");
                response.EnsureSuccessStatusCode();

                var content = await response.Content.ReadAsStringAsync();
                return bool.Parse(content);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to check if user {UserId} is active", userId);
                throw;
            }
        }

        public async Task<bool> IsUserBlacklisted(string userId)
        {
            try
            {
                var response = await _httpClient.GetAsync($"/api/users/{userId}/blacklisted");
                response.EnsureSuccessStatusCode();

                var content = await response.Content.ReadAsStringAsync();
                return bool.Parse(content);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to check if user {UserId} is blacklisted", userId);
                throw;
            }
        }

        public async Task<string?> GetUserStatus(string userId)
        {
            try
            {
                return await _httpClient.GetStringAsync($"/api/users/{userId}/status");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get status for user {UserId}", userId);
                return null;
            }
        }
    }
}