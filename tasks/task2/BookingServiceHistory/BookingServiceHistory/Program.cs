using BookingServiceHistory;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddGrpc();

builder.Services.AddScoped<IBookingRepository, BookingRepository>();
builder.Services.AddDbContext<BookingDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("PostgreSQL")));
builder.Services.Configure<KafkaOptions>(
    builder.Configuration.GetSection(KafkaOptions.SectionName));

// Регистрируем обработчик
builder.Services.AddScoped<IBookingEventHandler, BookingEventHandler>();

// Регистрируем фоновую службу
builder.Services.AddHostedService<KafkaEventConsumer>();

var app = builder.Build();
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<BookingDbContext>();
    dbContext.Database.Migrate();
}

// Configure the HTTP request pipeline.
app.MapGet("/",
    () =>
        "Communication with gRPC endpoints must be made through a gRPC client. To learn how to create a client, visit: https://go.microsoft.com/fwlink/?linkid=2086909");

app.Run();

public class KafkaOptions
{
    public const string SectionName = "Kafka";
    public string BootstrapServers { get; set; } = null!;
    public string GroupId { get; set; } = "default-group";
}