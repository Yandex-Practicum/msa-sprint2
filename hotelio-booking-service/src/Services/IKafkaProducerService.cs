namespace HotelioBookingService.Services;

public interface IKafkaProducerService<TEntity> where TEntity : class
{
    Task SendMessageAsync(string topic, TEntity message);
}