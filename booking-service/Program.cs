using Hotelio.BookingService;
using Hotelio.BookingService.Clients;
using Hotelio.BookingService.MonolithClients;
using Hotelio.BookingService.MonolithRestClients;
using Hotelio.BookingService.Repositories;
using Hotelio.BookingService.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddGrpc();

builder.Services.AddDbContext<BookingDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("BookingDb")));

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
app.MapGet("/", () => "Communication with gRPC endpoints must be made through a gRPC client. To learn how to create a client, visit: https://go.microsoft.com/fwlink/?linkid=2086909");

app.Run();
