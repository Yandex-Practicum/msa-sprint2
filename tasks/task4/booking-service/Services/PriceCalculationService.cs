using Hotelio.BookingService.MonolithClients;
using Hotelio.BookingService.MonolithRestClients;

namespace Hotelio.BookingService.Services
{
    public record PriceDetails(
        double BasePrice,
        double DiscountPercent,
        double DiscountAmount,
        double FinalPrice);

    public interface IPriceCalculationService
    {
        Task<PriceDetails> CalculatePrice(string userId, string hotelId, string? promoCode);
    }

    public class PriceCalculationService : IPriceCalculationService
    {
        private readonly IUserClient _userClient;
        private readonly IPromoClient _promoClient;
        private readonly ILogger<PriceCalculationService> _logger;

        public PriceCalculationService(
            IUserClient userClient,
            IPromoClient promoClient,
            ILogger<PriceCalculationService> logger)
        {
            _userClient = userClient;
            _promoClient = promoClient;
            _logger = logger;
        }

        public async Task<PriceDetails> CalculatePrice(string userId, string hotelId, string? promoCode)
        {
            // 1. Базовая цена на основе статуса пользователя
            var basePrice = await CalculateBasePrice(userId);

            // 2. Скидка по промокоду
            var discount = await CalculatePromoDiscount(promoCode, userId);

            // 3. Итоговая цена
            var finalPrice = basePrice - discount;

            var discountPercent = basePrice > 0 ? (discount / basePrice) * 100 : 0;

            _logger.LogInformation(
                "Price calculated: base={BasePrice}, discount={Discount}, final={FinalPrice}",
                basePrice, discount, finalPrice);

            return new PriceDetails(basePrice, discountPercent, discount, finalPrice);
        }

        private async Task<double> CalculateBasePrice(string userId)
        {
            var userStatus = await _userClient.GetUserStatus(userId);

            // Логика из Java монолита
            var basePrice = userStatus?.ToUpper() == "VIP" ? 80.0 : 100.0;

            _logger.LogDebug("User {UserId} has status '{Status}', base price: {BasePrice}",
                userId, userStatus, basePrice);

            return basePrice;
        }

        private async Task<double> CalculatePromoDiscount(string? promoCode, string userId)
        {
            if (string.IsNullOrEmpty(promoCode))
            {
                return 0;
            }

            try
            {
                // Валидируем промокод через монолит
                var promo = await _promoClient.ValidatePromoCode(promoCode, userId);
                if (promo == null || !promo.IsValid)
                {
                    _logger.LogInformation("Promo code '{PromoCode}' is invalid for user {UserId}",
                        promoCode, userId);
                    return 0;
                }

                var discount = promo.DiscountAmount;
                _logger.LogDebug("Promo code '{PromoCode}' applied with discount {Discount}",
                    promoCode, discount);

                return discount;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to validate promo code '{PromoCode}'", promoCode);
                return 0;
            }
        }
    }
}
