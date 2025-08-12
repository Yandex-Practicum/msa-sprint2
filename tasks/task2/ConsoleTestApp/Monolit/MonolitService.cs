using System.Threading.Tasks;

namespace BookingService.Services
{
    public class MonolitService()
    {
        private readonly MonolitEndpoints _monolit = new MonolitEndpoints(Environment.GetEnvironmentVariable("MONOLIT_HOST") ?? "http://127.0.0.1:8084");

        public string GetBooking(string userId)
        {
            return _monolit.GetBookings(userId).Result;
        }

        public string GetUserStatus(string userId)
        {
            return _monolit.IsUserVip(userId).Result == "true" ? "VIP" : "ACTIVE";
        }

        public bool IsHotelFullyBooked(string hotelId)
        {
            return _monolit.IsHotelFullybooked(hotelId).Result == "true";

        }

        public bool IsHotelOperational(string hotelId)
        {
            return _monolit.IsHotelOperational(hotelId).Result == "true";
        }

        public bool IsTrustedHotel(string hotelId)
        {
            return _monolit.IsTrustedHotel(hotelId).Result == "true";
        }

        public bool IsUserActive(string userId)
        {
            return _monolit.IsUserActive(userId).Result == "true";
        }

        public bool IsUserBlacklisted(string userId)
        {            
            return _monolit.IsUserInBlackList(userId).Result == "true";
        }

        public PromoCodeDTO? ValidatePromoCode(string promoCode, string userId)
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
    public record PromoCodeDTO(string code, double discount, bool active, bool vipOnly);
    public record BookingDTO(string bookingId, string userId, string hotelId, double discountPercent, double finalPrice, DateTime createdAt);
}
