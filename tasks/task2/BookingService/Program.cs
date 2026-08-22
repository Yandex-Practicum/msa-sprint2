
using BookingService.Kafka;
using BookingService.Models;
using BookingService.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddGrpc();
builder.Services.AddGrpcReflection();
// EF Core + PostgreSQL
builder.Services.AddDbContext<BookingContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Kafka Producer
builder.Services.AddSingleton<BookingEventProducer>();

// HttpClient для вызовов к монолиту
builder.Services.AddHttpClient("MonolithClient");

var app = builder.Build();

// Создание БД при старте
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<BookingContext>();
    context.Database.EnsureCreated();
}

app.MapGrpcService<BookingGrpcService>();
app.MapGrpcReflectionService();

app.MapGet("/", () => "Communication with gRPC endpoints must be made through a gRPC client. To learn how to create a client, visit: https://go.microsoft.com/fwlink/?linkid=2086909");

app.Run();
