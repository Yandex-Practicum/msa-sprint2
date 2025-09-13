using System.Text;
using System.Text.Json;
using Confluent.Kafka;
using Npgsql.Replication.PgOutput.Messages;

namespace HotelioHistoryService.Services;

public class KafkaMessageDeserializer<TEntity> : IDeserializer<TEntity> where TEntity : class
{
    public TEntity Deserialize(ReadOnlySpan<byte> data, bool isNull, SerializationContext context)
    {
        if (isNull)
            return null;

        string value = Encoding.UTF8.GetString(data);
        TEntity? result =
            JsonSerializer.Deserialize<TEntity>(value,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = false, IgnoreReadOnlyProperties = true, PropertyNamingPolicy = JsonNamingPolicy.CamelCase});
        return result;
    }
}