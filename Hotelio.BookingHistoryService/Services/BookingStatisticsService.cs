using Confluent.Kafka;
using Hotelio.BookingService;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.Text.Json;

namespace Hotelio.BookingHistoryService
{
    public class BookingStatisticsService : BackgroundService
    {
        private readonly IConsumer<Ignore, string> _consumer;
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<BookingStatisticsService> _logger;

        public BookingStatisticsService(
            IConfiguration configuration,
            IServiceProvider serviceProvider,
            ILogger<BookingStatisticsService> logger)
        {
            var config = new ConsumerConfig
            {
                BootstrapServers = configuration["Kafka:BootstrapServers"],
                GroupId = "booking-history-group",
                AutoOffsetReset = AutoOffsetReset.Earliest,
                EnableAutoCommit = false
            };

            _consumer = new ConsumerBuilder<Ignore, string>(config).Build();
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _consumer.Subscribe("booking-created");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var consumeResult = _consumer.Consume(stoppingToken);
                    await ProcessBookingEvent(consumeResult.Message.Value);
                    _consumer.Commit(consumeResult);
                }
                catch (ConsumeException ex)
                {
                    _logger.LogError(ex, "Error consuming message from Kafka");
                }
            }
        }

        private async Task ProcessBookingEvent(string eventJson)
        {
            try
            {
                _logger.LogInformation($"Incoming message: {eventJson}");

                var options = new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,  // говорит десериализатору что JSON в camelCase
                    PropertyNameCaseInsensitive = true  // делает сравнение имен нечувствительным к регистру
                };

                var bookingEvent = JsonSerializer.Deserialize<BookingCreatedEvent>(eventJson, options);

                if (bookingEvent == null)
                {
                    _logger.LogWarning("Failed to deserialize booking event");
                    return;
                }
                _logger.LogInformation($"Parsed bookingEvent: {JsonSerializer.Serialize(bookingEvent)}");
                var dateString = bookingEvent.CreatedAt.Replace("\\u002B", "+");
                _logger.LogInformation($"dateString: {dateString}");
                DateTimeOffset dateTimeOffset = DateTimeOffset.Parse(dateString, CultureInfo.InvariantCulture);
                DateTime bookingDate = dateTimeOffset.UtcDateTime;
                
                // Обновление статистики по дням
                await UpdateDailyStatistics(bookingDate, bookingEvent.Price);

                // Обновление статистики по пользователям
                await UpdateUserStatistics(bookingEvent.UserId, bookingEvent.Price);

                // Обновление статистики по отелям
                await UpdateHotelStatistics(bookingEvent.HotelId, bookingEvent.Price);

                _logger.LogInformation(
                    "Processed booking event for booking {BookingId}",
                    bookingEvent.BookingId);

            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing booking event");
            }
        }

        private async Task UpdateDailyStatistics(DateTime date, double price)
        {
            using var scope = _serviceProvider.CreateScope();
            var _dbContext = scope.ServiceProvider.GetRequiredService<HistoryDbContext>();

            var dailyStat = await _dbContext.DailyStatistics
                .FirstOrDefaultAsync(ds => ds.Date == date);

            if (dailyStat == null)
            {
                dailyStat = new DailyStatistic
                {
                    Id = Guid.NewGuid().ToString(),
                    Date = date,
                    BookingCount = 1,
                    TotalRevenue = price,
                    AverageBookingValue = price
                };
                _dbContext.DailyStatistics.Add(dailyStat);
            }
            else
            {
                dailyStat.BookingCount++;
                dailyStat.TotalRevenue += price;
                dailyStat.AverageBookingValue =
                    dailyStat.TotalRevenue / dailyStat.BookingCount;
            }

            await _dbContext.SaveChangesAsync();
        }

        private async Task UpdateUserStatistics(string userId, double price)
        {
            using var scope = _serviceProvider.CreateScope();
            var _dbContext = scope.ServiceProvider.GetRequiredService<HistoryDbContext>();

            var userStat = await _dbContext.UserStatistics
                .FirstOrDefaultAsync(us => us.UserId == userId);

            if (userStat == null)
            {
                userStat = new UserStatistic
                {
                    Id = Guid.NewGuid().ToString(),
                    UserId = userId,
                    BookingCount = 1,
                    TotalSpent = price,
                    LastBookingDate = DateTime.UtcNow
                };
                _dbContext.UserStatistics.Add(userStat);
            }
            else
            {
                userStat.BookingCount++;
                userStat.TotalSpent += price;
                userStat.LastBookingDate = DateTime.UtcNow;
            }

            await _dbContext.SaveChangesAsync();
        }

        private async Task UpdateHotelStatistics(string hotelId, double price)
        {
            using var scope = _serviceProvider.CreateScope();
            var _dbContext = scope.ServiceProvider.GetRequiredService<HistoryDbContext>();

            var hotelStat = await _dbContext.HotelStatistics
                .FirstOrDefaultAsync(hs => hs.HotelId == hotelId);

            if (hotelStat == null)
            {
                hotelStat = new HotelStatistic
                {
                    Id = Guid.NewGuid().ToString(),
                    HotelId = hotelId,
                    BookingCount = 1,
                    TotalRevenue = price,
                    AverageBookingValue = price
                };
                _dbContext.HotelStatistics.Add(hotelStat);
            }
            else
            {
                hotelStat.BookingCount++;
                hotelStat.TotalRevenue += price;
                hotelStat.AverageBookingValue =
                    hotelStat.TotalRevenue / hotelStat.BookingCount;
            }

            await _dbContext.SaveChangesAsync();
        }

        public override void Dispose()
        {
            _consumer.Close();
            _consumer.Dispose();
            base.Dispose();
        }
    }
}
