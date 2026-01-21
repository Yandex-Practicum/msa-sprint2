using Confluent.Kafka;
using Confluent.Kafka.Admin;
using Hotelio.BookingHistoryService;
using Hotelio.BookingService;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();

// Configure database context for statistics
builder.Services.AddDbContextFactory<HistoryDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("BookingHistoryDb")), 
    ServiceLifetime.Scoped);

builder.Services.AddDbContext<HistoryDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("BookingHistoryDb")));

// Configure Kafka consumer
builder.Services.AddSingleton<IConsumer<Ignore, string>>(serviceProvider =>
{
    var configuration = serviceProvider.GetRequiredService<IConfiguration>();

    var consumerConfig = new ConsumerConfig
    {
        BootstrapServers = configuration["Kafka:BootstrapServers"],
        GroupId = "booking-history-service-group",
        AutoOffsetReset = AutoOffsetReset.Earliest,
        EnableAutoCommit = false,
        EnablePartitionEof = true,
        AllowAutoCreateTopics = true
    };

    return new ConsumerBuilder<Ignore, string>(consumerConfig).Build();
});

// Register the background service for processing booking events
builder.Services.AddHostedService<BookingStatisticsService>();

// Register HTTP client for optional REST API calls
builder.Services.AddHttpClient();


// Configure Swagger/OpenAPI for API documentation
builder.Services.AddEndpointsApiExplorer();
//builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
   // app.UseSwagger();
    //app.UseSwaggerUI();
}

// Initialize database
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<HistoryDbContext>();

    try
    {
        dbContext.Database.Migrate();
        Console.WriteLine("Database migrated successfully");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error migrating database: {ex.Message}");
    }
}

// Map API endpoints for retrieving statistics
app.MapGet("/api/statistics/daily/{date}", async (DateTime date, HistoryDbContext dbContext) =>
{
    var dailyStats = await dbContext.DailyStatistics
        .Where(ds => ds.Date == date.Date)
        .FirstOrDefaultAsync();

    return dailyStats != null
        ? Results.Ok(dailyStats)
        : Results.NotFound(new { message = "No statistics found for this date" });
});

app.MapGet("/api/statistics/user/{userId}", async (string userId, HistoryDbContext dbContext) =>
{
    var userStats = await dbContext.UserStatistics
        .Where(us => us.UserId == userId)
        .FirstOrDefaultAsync();

    return userStats != null
        ? Results.Ok(userStats)
        : Results.NotFound(new { message = "No statistics found for this user" });
});

app.MapGet("/api/statistics/hotel/{hotelId}", async (string hotelId, HistoryDbContext dbContext) =>
{
    var hotelStats = await dbContext.HotelStatistics
        .Where(hs => hs.HotelId == hotelId)
        .FirstOrDefaultAsync();

    return hotelStats != null
        ? Results.Ok(hotelStats)
        : Results.NotFound(new { message = "No statistics found for this hotel" });
});

app.MapGet("/api/statistics/daily", async (
    [FromQuery] DateTime? startDate,
    [FromQuery] DateTime? endDate,
    HistoryDbContext dbContext) =>
{
    var query = dbContext.DailyStatistics.AsQueryable();

    if (startDate.HasValue)
        query = query.Where(ds => ds.Date >= startDate.Value.Date);

    if (endDate.HasValue)
        query = query.Where(ds => ds.Date <= endDate.Value.Date);

    var stats = await query
        .OrderBy(ds => ds.Date)
        .ToListAsync();

    return Results.Ok(stats);
});

app.MapGet("/api/statistics/top-hotels", async (
    [FromQuery] int limit,
    HistoryDbContext dbContext) =>
{
    var topHotels = await dbContext.HotelStatistics
        .OrderByDescending(hs => hs.TotalRevenue)
        .Take(limit)
        .Select(hs => new
        {
            hs.HotelId,
            hs.BookingCount,
            hs.TotalRevenue,
            hs.AverageBookingValue
        })
        .ToListAsync();

    return Results.Ok(topHotels);
});

// Kafka topic management endpoint (for development/testing)
if (app.Environment.IsDevelopment())
{
    app.MapPost("/api/kafka/create-topics", async (IConsumer<Ignore, string> consumer) =>
    {
        try
        {
            var adminClient = new AdminClientBuilder(
                (IEnumerable<KeyValuePair<string, string>>)consumer.Handle).Build();

            // Create topics if they don't exist
            var topics = new[]
            {
                new TopicSpecification
                {
                    Name = "booking-created",
                    NumPartitions = 3,
                    ReplicationFactor = 1
                }
            };

            await adminClient.CreateTopicsAsync(topics);
            return Results.Ok(new { message = "Topics created successfully" });
        }
        catch (Exception ex)
        {
            return Results.Problem($"Error creating topics: {ex.Message}");
        }
    });
}

// Start the application
try
{
    Console.WriteLine("Starting Booking History Service...");
    Console.WriteLine($"Kafka Bootstrap Servers: {builder.Configuration["Kafka:BootstrapServers"]}");
    Console.WriteLine($"Database Connection: {builder.Configuration.GetConnectionString("BookingHistoryDb")}");

    app.Run();
}
catch (Exception ex)
{
    Console.WriteLine($"Failed to start Booking History Service: {ex}");
    throw;
}

