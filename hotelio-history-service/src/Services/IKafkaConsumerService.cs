namespace HotelioHistoryService.Services;

public interface IKafkaConsumerService<TEntity> where TEntity : class
{
    public event EventHandler<TEntity>? OnMessageReceived;

    public void ConsumeMessages(string topic);

    public void StopConsuming();
}