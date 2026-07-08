using BookingService.Data;
using BookingService.Services;
using Confluent.Kafka;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Принудительно отключаем дефолтные порты хостинга (8080/80), чтобы Kestrel не пытался биндиться дважды
builder.WebHost.UseUrls();

builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenAnyIP(9090, listenOptions =>
    {
        listenOptions.Protocols = Microsoft.AspNetCore.Server.Kestrel.Core.HttpProtocols.Http2;
    });
});

builder.Services.AddGrpc();

// Add DbContext
var connectionString = Environment.GetEnvironmentVariable("DB_CONNECTION_STRING")
    ?? builder.Configuration.GetConnectionString("DefaultConnection");

builder.Services.AddDbContext<BookingDbContext>(options =>
    options.UseNpgsql(connectionString));

var kafkaConfig = new ProducerConfig
{
    BootstrapServers = Environment.GetEnvironmentVariable("KAFKA_BOOTSTRAP_SERVERS") ?? "localhost:9092"
};

builder.Services.AddSingleton<IProducer<string, string>>(sp =>
    new ProducerBuilder<string, string>(kafkaConfig).Build());

// Add logging
builder.Services.AddLogging(logging =>
{
    logging.ClearProviders();
    logging.AddConsole();
});

var app = builder.Build();

app.MapGrpcService<BookingServiceImpl>();

// Apply migrations and seed data
await using (var scope = app.Services.CreateAsyncScope())
{
    var db = scope.ServiceProvider.GetRequiredService<BookingDbContext>();
    await db.Database.MigrateAsync();

    // Seed test data with promo codes
    if (!db.Bookings.Any())
    {
        var bookings = new[]
        {
            new BookingService.Models.Booking
            {
                UserId = "test-user-1",
                HotelId = "test-hotel-1",
                PromoCode = "VIP25",
                DiscountPercent = 25,
                Price = 100,
                CreatedAt = DateTime.UtcNow
            },
            new BookingService.Models.Booking
            {
                UserId = "test-user-2",
                HotelId = "test-hotel-2",
                PromoCode = "WELCOME",
                DiscountPercent = 20,
                Price = 80,
                CreatedAt = DateTime.UtcNow
            },
            new BookingService.Models.Booking
            {
                UserId = "test-user-3",
                HotelId = "test-hotel-1",
                PromoCode = "SUMMER",
                DiscountPercent = 10,
                Price = 100,
                CreatedAt = DateTime.UtcNow
            }
        };

        await db.Bookings.AddRangeAsync(bookings);
        await db.SaveChangesAsync();
    }
}

await app.RunAsync();
