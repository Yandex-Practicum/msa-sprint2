using Confluent.Kafka;
using Microsoft.Extensions.Options;

namespace Hotelio.BookingService
{
    public interface IKafkaProducer
    {
        Task ProduceAsync(string topic, string message);
    }

    public class KafkaSettings
    {
        public string BootstrapServers { get; set; } = "localhost:9092";
        public string? SchemaRegistryUrl { get; set; }
        public Dictionary<string, string> ProducerConfig { get; set; } = new();
    }

    public class KafkaProducer : IKafkaProducer, IDisposable
    {
        private readonly IProducer<Null, string> _producer;
        private readonly ILogger<KafkaProducer> _logger;

        public KafkaProducer(IOptions<KafkaSettings> kafkaSettings, ILogger<KafkaProducer> logger)
        {
            var config = new ProducerConfig
            {
                BootstrapServers = kafkaSettings.Value.BootstrapServers,
                Acks = Acks.All,
                MessageSendMaxRetries = 3,
                EnableIdempotence = true,
                LingerMs = 5
            };

            _producer = new ProducerBuilder<Null, string>(config)
                .SetErrorHandler((_, error) =>
                    logger.LogError("Kafka error: {Reason}", error.Reason))
                .Build();

            _logger = logger;
        }

        public async Task ProduceAsync(string topic, string message)
        {
            try
            {
                var kafkaMessage = new Message<Null, string>
                {
                    Value = message,
                    Headers = new Headers
                {
                    new Header("event-type", System.Text.Encoding.UTF8.GetBytes("BookingCreated")),
                    new Header("timestamp", System.Text.Encoding.UTF8.GetBytes(DateTime.UtcNow.ToString("O")))
                }
                };

                var deliveryReport = await _producer.ProduceAsync(topic, kafkaMessage);

                _logger.LogDebug(
                    "Message delivered to {Topic} [{Partition}] at offset {Offset}",
                    deliveryReport.Topic,
                    deliveryReport.Partition.Value,
                    deliveryReport.Offset.Value);
            }
            catch (ProduceException<Null, string> ex)
            {
                _logger.LogError(ex, "Failed to deliver message to Kafka topic {Topic}", topic);
                throw;
            }
        }

        public void Dispose()
        {
            _producer?.Flush(TimeSpan.FromSeconds(10));
            _producer?.Dispose();
        }
    }
}