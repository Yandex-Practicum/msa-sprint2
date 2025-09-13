using System.Text;
using System.Text.Json;
using Confluent.Kafka;
using HotelioBookingService.Entities;

namespace HotelioBookingService.Services;

public class KafkaMessageSerializer : ISerializer<Booking>
{
    public byte[] Serialize(Booking data, SerializationContext context)
    {
        string serialized = JsonSerializer.Serialize(data, JsonSerializerOptions.Web);
        var result = UTF8Encoding.UTF8.GetBytes(serialized);
        return result;
    }
}