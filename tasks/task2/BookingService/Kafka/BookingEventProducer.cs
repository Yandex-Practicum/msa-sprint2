using Confluent.Kafka;

namespace BookingService.Kafka;

public class BookingEventProducer : IDisposable
{
    private readonly IProducer<Null, string> _producer;
    private readonly ILogger<BookingEventProducer> _logger;

    public BookingEventProducer(ILogger<BookingEventProducer> logger)
    {
        _logger = logger;

        var config = new ProducerConfig
        {
            BootstrapServers = Environment.GetEnvironmentVariable("KAFKA_BOOTSTRAP_SERVERS") ?? "kafka:9092",
            Acks = Acks.All
        };

        _producer = new ProducerBuilder<Null, string>(config).Build();
    }

    public async Task ProduceAsync(string topic, string message)
    {
        try
        {
            var result = await _producer.ProduceAsync(topic, new Message<Null, string> { Value = message });
            _logger.LogInformation("Сообщение отправлено в Kafka: Topic={Topic}, Partition={Partition}, Offset={Offset}",
                result.Topic, result.Partition.Value, result.Offset.Value);
        }
        catch (ProduceException<Null, string> ex)
        {
            _logger.LogError(ex, "Ошибка отправки сообщения в Kafka");
            throw;
        }
    }

    public void Dispose()
    {
        _producer?.Dispose();
    }
}