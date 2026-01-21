using Grpc.Core;
using Hotelio.Services;

namespace Hotelio.PromoCodeService.Services
{
    public class PromoCodeGrpcService : PromoCodeService.PromoCodeServiceBase
    {
        private readonly IPromoCodeServiceImpl _promoCodeService;
        private readonly ILogger<PromoCodeGrpcService> _logger;

        public PromoCodeGrpcService(
            IPromoCodeServiceImpl promoCodeService,
            ILogger<PromoCodeGrpcService> logger)
        {
            _promoCodeService = promoCodeService;
            _logger = logger;
        }

        public override async Task<PromoCodeResponse> GetPromoByCode(
            GetPromoRequest request,
            ServerCallContext context)
        {
            try
            {
                var promo = await _promoCodeService.GetPromoByCodeAsync(request.Code);

                if (promo == null)
                {
                    return new PromoCodeResponse
                    {
                        Success = false,
                        ErrorMessage = $"Promo code '{request.Code}' not found"
                    };
                }

                return new PromoCodeResponse
                {
                    Success = true,
                    Code = promo.Code,
                    Discount = promo.Discount,
                    VipOnly = promo.VipOnly,
                    ValidUntil = promo.ValidUntil.ToString("yyyy-MM-dd"),
                    Description = promo.Description
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetPromoByCode for code {Code}", request.Code);
                return new PromoCodeResponse
                {
                    Success = false,
                    ErrorMessage = ex.Message
                };
            }
        }

        public override async Task<IsValidResponse> IsPromoValid(
            IsValidRequest request,
            ServerCallContext context)
        {
            try
            {
                var isValid = await _promoCodeService.IsPromoValidAsync(
                    request.Code,
                    request.IsVipUser);

                return new IsValidResponse { Valid = isValid };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in IsPromoValid for code {Code}", request.Code);
                return new IsValidResponse
                {
                    Valid = false,
                    ErrorMessage = ex.Message
                };
            }
        }

        public override async Task<PromoCodeResponse> ValidatePromo(
            ValidateRequest request,
            ServerCallContext context)
        {
            try
            {
                var promo = await _promoCodeService.ValidatePromoAsync(
                    request.Code,
                    request.UserId);

                if (promo == null)
                {
                    return new PromoCodeResponse
                    {
                        Success = false,
                        ErrorMessage = "Invalid promo code or user not eligible"
                    };
                }

                return new PromoCodeResponse
                {
                    Success = true,
                    Code = promo.Code,
                    Discount = promo.Discount,
                    VipOnly = promo.VipOnly,
                    ValidUntil = promo.ValidUntil.ToString("yyyy-MM-dd"),
                    Description = promo.Description
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in ValidatePromo for code {Code}, user {UserId}",
                    request.Code, request.UserId);
                return new PromoCodeResponse
                {
                    Success = false,
                    ErrorMessage = ex.Message
                };
            }
        }
    }
}