using Microsoft.Extensions.Options;
using Confluent.Kafka;

namespace HotelioBookingService.Services;

public class KafkaProducerService<TEntity, TSerializer> : IKafkaProducerService<TEntity> 
    where TEntity : class
    where TSerializer :  ISerializer<TEntity> 
{
    private readonly ILogger<KafkaProducerService<TEntity, TSerializer>> _logger;
    private readonly IProducer<Null, TEntity> _producer;

    // Constructor to initialize Kafka producer with configuration
    public KafkaProducerService(IOptions<KafkaServiceSettings> producerConfig,
        ISerializer<TEntity> serializer,
        ILogger<KafkaProducerService<TEntity, TSerializer>> logger)
    {
        _logger = logger;
        var config = new ProducerConfig
        {
            BootstrapServers = producerConfig.Value.BootstrapServers, // Kafka server details (ensure this is correct)
        };

        _producer = new ProducerBuilder<Null, TEntity>(config).SetValueSerializer(serializer).Build();
    }

    // Method to send message to Kafka topic
    public async Task SendMessageAsync(string topic, TEntity message)
    {
        try
        {
            // Send message to the specified Kafka topic
            await _producer.ProduceAsync(topic, new Message<Null, TEntity> { Value = message });
            _logger.LogInformation("Message '{Message}' sent to topic '{Topic}'.", message, topic);
        }
        catch (Exception ex)
        {
            // Log any errors encountered while sending message
            _logger.LogError("Error sending message to Kafka: {ExMessage}", ex.Message);
            throw;
        }
    }
}