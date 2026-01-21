using Hotelio.PromoCodeService;
using Hotelio.PromoCodeService.MonolithClients;
using Hotelio.PromoCodeService.Repositories;

namespace Hotelio.Services
{
    public interface IPromoCodeServiceImpl
    {
        Task<PromoCodeDto?> GetPromoByCodeAsync(string code);
        Task<bool> IsPromoValidAsync(string code, bool isVipUser = false);
        Task<PromoCodeDto?> ValidatePromoAsync(string code, string userId);

    }

    public class PromoCodeServiceImpl : IPromoCodeServiceImpl
    {
        private readonly IUserClient _userClient;
        private readonly IPromoCodeRepository _promoCodeRepository;
        private readonly ILogger<PromoCodeServiceImpl> _logger;
        public PromoCodeServiceImpl(
            IUserClient userClient, IPromoCodeRepository promoCodeRepository, ILogger<PromoCodeServiceImpl> logger)
        {
            _userClient = userClient;
            _promoCodeRepository = promoCodeRepository;
            _logger = logger;
        }

        public async Task<PromoCodeDto?> GetPromoByCodeAsync(string code)
        {
            var promo = await _promoCodeRepository.GetByCodeAsync(code);
            return promo?.ToDto();
        }

        public async Task<bool> IsPromoValidAsync(string code, bool isVipUser = false)
        {
            var promo = await _promoCodeRepository.GetByCodeAsync(code);

            if (promo == null)
            {
                _logger.LogWarning("Promo code {Code} not found", code);
                return false;
            }

            return promo.IsValid(isVipUser);
        }

        public async Task<PromoCodeDto?> ValidatePromoAsync(string code, string userId)
        {
            try
            {
                // Получаем статус пользователя из сервиса пользователей
                var userStatus = await _userClient.GetUserStatus(userId);
                bool isVip = userStatus?.Equals("VIP", StringComparison.OrdinalIgnoreCase) ?? false;

                var promo = await _promoCodeRepository.GetByCodeAsync(code);

                if (promo?.IsValid(isVip) == true)
                {
                    _logger.LogInformation("Promo code {Code} validated successfully for user {UserId}",
                        code, userId);
                    return promo.ToDto();
                }

                _logger.LogWarning("Promo code {Code} validation failed for user {UserId}",
                    code, userId);
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating promo code {Code} for user {UserId}",
                    code, userId);
                throw new Exception("Failed to validate promo code", ex);
            }
        }

    }
}
