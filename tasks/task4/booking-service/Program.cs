using Hotelio.BookingService;
using Hotelio.BookingService.Clients;
using Hotelio.BookingService.MonolithClients;
using Hotelio.BookingService.MonolithRestClients;
using Hotelio.BookingService.Repositories;
using Hotelio.BookingService.Services;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddGrpc();

if (Environment.GetEnvironmentVariable("USE_IN_MEMORY_DB") == "true")
{
    builder.Services.AddDbContext<BookingDbContext>(options =>
        options.UseInMemoryDatabase("TestDb"));
}
else
{
    builder.Services.AddDbContext<BookingDbContext>(options =>
        options.UseNpgsql(builder.Configuration.GetConnectionString("BookingDb")));
}

builder.WebHost.UseUrls("http://*:8080");
builder.WebHost.ConfigureKestrel(options =>
{
    options.ConfigureEndpointDefaults(listenOptions =>
    {
        listenOptions.Protocols = HttpProtocols.Http1AndHttp2;  // Включаем HTTP/1.1
    });

    options.ListenAnyIP(8080);  // Слушаем на порту 8080
});

// REST Clients to Monolith
builder.Services.AddHttpClient<IUserClient, UserClient>(client =>
{
    client.BaseAddress = new Uri(builder.Configuration["Monolith:BaseUrl"] ?? "http://monolith:8084");
    client.DefaultRequestHeaders.Add("Accept", "application/json");
});

builder.Services.AddHttpClient<IHotelClient, HotelClient>(client =>
{
    client.BaseAddress = new Uri(builder.Configuration["Monolith:BaseUrl"] ?? "http://monolith:8084");
});

builder.Services.AddHttpClient<IPromoClient, PromoClient>(client =>
{
    client.BaseAddress = new Uri(builder.Configuration["Monolith:BaseUrl"] ?? "http://monolith:8084");
});

builder.Services.AddHttpClient<IReviewClient, ReviewClient>(client =>
{
    client.BaseAddress = new Uri(builder.Configuration["Monolith:BaseUrl"] ?? "http://monolith:8084");
});

builder.Services.AddScoped<IBookingRepository, BookingRepository>();
builder.Services.AddScoped<IPriceCalculationService, PriceCalculationService>();
builder.Services.AddScoped<IValidationService, ValidationService>();
builder.Services.AddScoped<IBookingService, BookingServiceImpl>();


builder.Services.Configure<KafkaSettings>(builder.Configuration.GetSection("Kafka"));
builder.Services.AddSingleton<IKafkaProducer, KafkaProducer>();
//builder.Services.AddHostedService<KafkaConsumerService>();

var app = builder.Build();

// Initialize database
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<BookingDbContext>();

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

// Configure the HTTP request pipeline.
app.MapGrpcService<BookingGrpcService>();

app.MapGet("/ping", () => {
    var version = Environment.GetEnvironmentVariable("VERSION") ?? "unknown";
    var featureEnabled = Environment.GetEnvironmentVariable("ENABLE_FEATURE_X") == "true";
    
    return $"pong (Version: {version}, FeatureX: {featureEnabled})";
});

// Фича-флаг
if (Environment.GetEnvironmentVariable("ENABLE_FEATURE_X")?.ToLower() == "true")
{
    app.MapGet("/feature-x", () => "Feature X is enabled!");
}
else
{
    app.MapGet("/feature-x", () => "Feature X is disabled");
}

app.MapGet("/version", () => {
    var version = Environment.GetEnvironmentVariable("VERSION") ?? "unknown";
    return $"Version: {version}";
});

app.MapGet("/health", () => "Healthy");

app.Run();
