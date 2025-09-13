using Confluent.Kafka;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace HotelioHistoryService.Services;

public class KafkaConsumerService<TEntity> : IKafkaConsumerService<TEntity>, IDisposable where TEntity : class
{
    private readonly IConsumer<Null, TEntity> _consumer;
    private readonly ILogger<KafkaConsumerService<TEntity>> _logger;

    public KafkaConsumerService(IOptions<KafkaServiceSettings> settings, IDeserializer<TEntity> deserializer,
        ILogger<KafkaConsumerService<TEntity>> logger)
    {
        _logger = logger;
        var config = new ConsumerConfig
        {
            BootstrapServers = settings.Value.BootstrapServers,
            GroupId = "booking-history-service",
            AutoOffsetReset = AutoOffsetReset.Earliest
        };

        _consumer = new ConsumerBuilder<Null, TEntity>(config).SetValueDeserializer(deserializer).Build();
    }

    public event EventHandler<TEntity>? OnMessageReceived;

    public void ConsumeMessages(string topic)
    {
        _consumer.Subscribe(topic);

        try
        {
            while (true)
            {
                var consumeResult = _consumer.Consume();
                _logger.LogInformation("Consumed message: {MessageValue}", consumeResult.Message.Value);
                OnMessageReceived?.Invoke(this, consumeResult.Message.Value);
            }
        }
        catch (ConsumeException e)
        {
            _logger.LogError("Error consuming message: {ErrorReason}", e.Error.Reason);
        }
    }

    void IDisposable.Dispose() => StopConsuming();

    public void StopConsuming()
    {
        _consumer.Close();
    }
    
}