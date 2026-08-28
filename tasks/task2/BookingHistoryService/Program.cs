using BookingHistoryService.Kafka;
using BookingHistoryService.Models;
using Microsoft.EntityFrameworkCore;
// Включаем совместимость со старым поведением DateTime
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);
var builder = Host.CreateApplicationBuilder(args);

// EF Core + PostgreSQL
builder.Services.AddDbContext<BookingHistoryContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Kafka Consumer как BackgroundService
builder.Services.AddHostedService<BookingEventConsumer>();

var host = builder.Build();

// Создание БД при старте
using (var scope = host.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<BookingHistoryContext>();
    context.Database.EnsureCreated();
}

host.Run();
