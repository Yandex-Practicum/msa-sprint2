namespace BookingService.Services
{
    public class MonolitService()
    {
        private readonly MonolitEndpoints _monolit = new MonolitEndpoints(Environment.GetEnvironmentVariable("MONOLIT_HOST") ?? "http://127.0.0.1:8084");

        
        
        internal string GetUserStatus(string userId)
        {
            return _monolit.IsUserVip(userId).Result == "true" ? "VIP" : "ACTIVE";
        }

        internal bool IsHotelFullyBooked(string hotelId)
        {
            return _monolit.IsHotelFullybooked(hotelId).Result == "true";

        }

        internal bool IsHotelOperational(string hotelId)
        {
            return _monolit.IsHotelOperational(hotelId).Result == "true";
        }

        internal bool IsTrustedHotel(string hotelId)
        {
            return _monolit.IsTrustedHotel(hotelId).Result == "true";
        }

        internal bool IsUserActive(string userId)
        {
            return _monolit.IsUserActive(userId).Result == "true";
        }

        internal bool IsUserBlacklisted(string userId)
        {
            return _monolit.IsUserInBlackList(userId).Result == "true";
        }

        internal PromoCodeDTO? ValidatePromoCode(string promoCode, string userId)
        {
            if (_monolit.IsPromoValid(promoCode).Result == "true")
            {
                string str = _monolit.CheckUserPromo(promoCode, userId).Result;
                PromoCodeDTO? promo = Newtonsoft.Json.JsonConvert.DeserializeObject<PromoCodeDTO>(str);
                return promo;
            }
            else return null;

        }
    }
}
