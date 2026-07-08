using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Confluent.Kafka;
using BookingHistoryService.Data;
using BookingHistoryService.Models;
using Microsoft.EntityFrameworkCore;

namespace BookingHistoryService
{
    public class Worker : BackgroundService
    {
        private readonly ILogger<Worker> _logger;
        private readonly IServiceProvider _serviceProvider;
        private readonly IConsumer<string, string> _consumer;

        public Worker(ILogger<Worker> logger, IServiceProvider serviceProvider)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;

            var kafkaBootstrap = Environment.GetEnvironmentVariable("KAFKA_BOOTSTRAP_SERVERS") ?? "localhost:9092";

            var config = new ConsumerConfig
            {
                BootstrapServers = kafkaBootstrap,
                GroupId = "booking-history-group",
                AutoOffsetReset = AutoOffsetReset.Earliest,
                EnableAutoCommit = true
            };

            _consumer = new ConsumerBuilder<string, string>(config).Build();
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _consumer.Subscribe("bookings");
            _logger.LogInformation("Worker успешно подписался на топик 'bookings' и ожидает событий...");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var consumeResult = _consumer.Consume(stoppingToken);
                    if (consumeResult != null)
                    {
                        var rawJson = consumeResult.Message.Value;
                        _logger.LogInformation("Получено событие из Kafka: {RawJson}", rawJson);

                        // Создаем Scope для работы со Scoped-контекстом базы данных
                        await using (var scope = _serviceProvider.CreateAsyncScope())
                        {
                            var dbContext = scope.ServiceProvider.GetRequiredService<HistoryDbContext>();
                            var bookingEvent = JsonSerializer.Deserialize<HistoryBooking>(rawJson, new JsonSerializerOptions
                            {
                                PropertyNameCaseInsensitive = true
                            });

                            if (bookingEvent != null)
                            {
                                // Проверяем на дубликаты (идемпотентность consumer'а)
                                var exists = await dbContext.HistoryBookings.AnyAsync(b => b.Id == bookingEvent.Id, stoppingToken);
                                if (!exists)
                                {
                                    await dbContext.HistoryBookings.AddAsync(bookingEvent, stoppingToken);
                                    await dbContext.SaveChangesAsync(stoppingToken);
                                    _logger.LogInformation("Бонирование {BookingId} успешно сохранено в БД истории.", bookingEvent.Id);
                                }
                            }
                        }
                    }
                }
                catch (ConsumeException e)
                {
                    _logger.LogError("Ошибка чтения из Kafka: {Error}", e.Error.Reason);
                }
                catch (Exception ex)
                {
                    _logger.LogError("Непредвиденная ошибка в воркере: {Message}", ex.Message);
                }

                await Task.Delay(10, stoppingToken); // Минимальная пауза для предотвращения 100% утилизации CPU
            }
        }

        public override void Dispose()
        {
            _consumer.Close();
            _consumer.Dispose();
            base.Dispose();
        }
    }
}
