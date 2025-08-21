//using Confluent.Kafka;
using Newtonsoft.Json;
using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

namespace BookingService.Services
{
    public class RESTclient(string baseUrl)
    {
        private readonly HttpClient _httpClient = new HttpClient();
        private readonly string _baseUrl = baseUrl;
        // GET запрос
        public async Task<string> GetAsync(string endpoint)
        {
            try
            {
                var response = await _httpClient.GetAsync($"{_baseUrl}/{endpoint}");
                response.EnsureSuccessStatusCode();
                return await response.Content.ReadAsStringAsync();
            }
            catch (HttpRequestException ex)
            {
                Console.WriteLine($"Ошибка GET запроса: {ex.Message}");
                throw;
            }
        }

        // POST запрос
        public async Task<string> PostAsync<T>(string endpoint, T data)
        {
            try
            {
                var json = JsonConvert.SerializeObject(data);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await _httpClient.PostAsync($"{_baseUrl}/{endpoint}", content);
                response.EnsureSuccessStatusCode();

                return await response.Content.ReadAsStringAsync();
            }
            catch (HttpRequestException ex)
            {
                Console.WriteLine($"Ошибка POST запроса: {ex.Message}");
                throw;
            }
        }

        public async Task<string> PostAsync(string endpoint)
        {
            try
            {
                var response = await _httpClient.PostAsync($"{_baseUrl}/{endpoint}", null);
                response.EnsureSuccessStatusCode();

                return await response.Content.ReadAsStringAsync();
            }
            catch (HttpRequestException ex)
            {
                Console.WriteLine($"Ошибка POST запроса: {ex.Message}");
                throw;
            }
        }

        // PUT запрос
        public async Task<string> PutAsync<T>(string endpoint, T data)
        {
            try
            {
                var json = JsonConvert.SerializeObject(data);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await _httpClient.PutAsync($"{_baseUrl}/{endpoint}", content);
                response.EnsureSuccessStatusCode();

                return await response.Content.ReadAsStringAsync();
            }
            catch (HttpRequestException ex)
            {
                Console.WriteLine($"Ошибка PUT запроса: {ex.Message}");
                throw;
            }
        }

        // DELETE запрос
        public async Task<string> DeleteAsync(string endpoint)
        {
            try
            {
                var response = await _httpClient.DeleteAsync($"{_baseUrl}/{endpoint}");
                response.EnsureSuccessStatusCode();

                return await response.Content.ReadAsStringAsync();
            }
            catch (HttpRequestException ex)
            {
                Console.WriteLine($"Ошибка DELETE запроса: {ex.Message}");
                throw;
            }
        }
    }
    public class MonolitEndpoints(string baseUrl) : RESTclient(baseUrl)
    {

        public async Task<string> GetBookings(string userId)
        {
            return await GetAsync($"api/bookings?userId={userId}");
        }

        public async Task<string> GetUser(string userId)
        {
            return await GetAsync($"api/users/{userId}");
        }

        public async Task<string> GetUserStatus(string userId)
        {
            return await GetAsync($"api/users/{userId}/status");
        }

        public async Task<string> IsUserInBlackList(string userId)
        {
            return await GetAsync($"api/users/{userId}/blacklisted");
        }

        public async Task<string> IsUserActive(string userId)
        {
            return await GetAsync($"api/users/{userId}/active");
        }

        public async Task<string> IsUserAuthorized(string userId)
        {
            return await GetAsync($"api/users/{userId}/authorized");
        }

        public async Task<string> IsUserVip(string userId)
        {
            return await GetAsync($"api/users/{userId}/vip");
        }

        public async Task<string> GetHotelInfo(string hotelId)
        {
            return await GetAsync($"api/hotels/{hotelId}");
        }

        public async Task<string> IsHotelOperational(string hotelId)
        {
            return await GetAsync($"api/hotels/{hotelId}/operational");
        }

        public async Task<string> IsHotelFullybooked(string hotelId)
        {
            return await GetAsync($"api/hotels/{hotelId}/fully-booked");
        }

        public async Task<string> GetHotelsInCity(string city)
        {
            return await GetAsync($"api/hotels/by-city?city={city}");
        }

        public async Task<string> GetTopOfHotelsInCity(string city)
        {
            return await GetAsync($"api/hotels/top-rated?city={city}&limit=3");
        }

        public async Task<string> GetPromo(string code)
        {
            return await GetAsync($"api/promos/{code}");
        }

        public async Task<string> IsPromoValid(string code)
        {
            return await GetAsync($"api/promos/{code}/valid?isVipUser=true");
        }

        public async Task<string> CheckUserPromo(string code, string userId)
        {
            var postData = new { code, userId };
            return await PostAsync($"api/promos/validate?code={code}&userId={userId}");
        }

        public async Task<string> GetHotelReviews(string hotelId)
        {
            return await GetAsync($"api/reviews/hotel/{hotelId}");
        }

        public async Task<string> IsTrustedHotel(string hotelId)
        {
            return await GetAsync($"api/reviews/hotel/{hotelId}/trusted");
        }
    }
}
