using BookingHistoryService;
using BookingHistoryService.Contracts;
using BookingHistoryService.Repository;
using Confluent.Kafka;
using Microsoft.EntityFrameworkCore;
using Repository;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddDbContext<BookingHistoryDbContext>((sp, options) =>
{
    var configuration = sp.GetRequiredService<IConfiguration>();
    var connectionString = Environment.GetEnvironmentVariable("POSTGRES_CONNECTION_STRING")
        ?? builder.Configuration.GetConnectionString("PostgresConnection");
    options.UseNpgsql(connectionString);
});

// repo 
builder.Services.AddScoped<IBookingHistoryRepository, BookingHistoryRepository>();

// kafka consumer
builder.Services.AddSingleton<IConsumer<string, string>>(sp =>
{
    var configuration = sp.GetRequiredService<IConfiguration>();
    var bootstrapServers = Environment.GetEnvironmentVariable("KAFKA_BOOTSTRAP_SERVERS")
        ?? configuration["Kafka:BootstrapServers"]
        ?? "kafka:9092";
    var groupId = configuration["Kafka:GroupId"] ?? "booking-history-service";
    var autoOffsetReset = configuration["Kafka:AutoOffsetReset"] ?? "Earliest";
    var enableAutoCommit = bool.TryParse(configuration["Kafka:EnableAutoCommit"], out var autoCommit)
        ? autoCommit
        : false;

    var config = new ConsumerConfig
    {
        BootstrapServers = bootstrapServers,
        GroupId = groupId,
        AutoOffsetReset = Enum.TryParse<AutoOffsetReset>(autoOffsetReset, true, out var offsetReset)
            ? offsetReset
            : Confluent.Kafka.AutoOffsetReset.Earliest,
        EnableAutoCommit = enableAutoCommit,
        AllowAutoCreateTopics = true
    };

    return new ConsumerBuilder<string, string>(config).Build();
});

builder.Services.AddHostedService<Worker>();

var host = builder.Build();

await using (var scope = host.Services.CreateAsyncScope())
{
    var db = scope.ServiceProvider.GetRequiredService<BookingHistoryDbContext>();
    var logger = host.Services.GetRequiredService<ILogger<Program>>();
    logger.LogTrace("Calling Database.EnsureCreated");
    await db.Database.EnsureCreatedAsync();
    logger.LogTrace("Calling Database.Migrate");
    await db.Database.MigrateAsync();
    logger.LogTrace("Finished Database.Migrate");
}

await host.RunAsync();