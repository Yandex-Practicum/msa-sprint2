namespace Hotelio.PromoCodeService
{
    
    public class PromoCodeDto
    {
        public string Code { get; set; } = string.Empty;
        public double Discount { get; set; }
        public bool VipOnly { get; set; }
        public DateTime ValidUntil { get; set; }
        public string Description { get; set; } = string.Empty;
    }

    
    public static class MappingExtensions
    {
        public static PromoCodeDto ToDto(this PromoCode promo)
        {
            return new PromoCodeDto
            {
                Code = promo.Code,
                Discount = (double)promo.Discount,
                VipOnly = promo.VipOnly,
                ValidUntil = promo.ValidUntil,
                Description = promo.Description
            };
        }
    }
}
