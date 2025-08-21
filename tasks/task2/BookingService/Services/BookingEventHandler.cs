using System.Text.Json;
using Confluent.Kafka;

namespace BookingService.Services
{
    public class BookingEventHandler()
    {
        private readonly string _bootstrapServers = Environment.GetEnvironmentVariable("KAFKA_HOST") ?? "kafka:9092";
        //private readonly string _kafkaGroupId = Environment.GetEnvironmentVariable("KAFKA_GROUP") ?? "booking-history-group";
        private readonly string _kafkaTopic = Environment.GetEnvironmentVariable("KAFKA_TOPIC") ?? "booking-events";
       
        public async Task HandleAsync(BookingEvent bookingEvent, ILogger<BookingServiceImpl> logger)
        {
            var config = new ProducerConfig
            {
                BootstrapServers = _bootstrapServers,
                MessageTimeoutMs = 5000
            };

            using var producer = new ProducerBuilder<Null, string>(config).Build();

            try
            {
                var message = new Message<Null, string>
                {
                    Value = JsonSerializer.Serialize(bookingEvent)
                };

                var result = await producer.ProduceAsync(_kafkaTopic, message);
                logger.LogInformation($"Отправлено в Kafka (offset: {result.Offset})");
            }
            catch (Exception ex)
            {
                logger.LogInformation($"Ошибка Kafka: {ex.Message}");
            }
        }
    }

    public record BookingEvent(int EventId, string UserId, string Action, DateTime Timestamp);
}
