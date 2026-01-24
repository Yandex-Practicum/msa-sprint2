using BookingService;
using BookingService.Data;
using BookingService.Services;
using Confluent.Kafka;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddGrpc();

builder.Services.Configure<BookingSettings>(
    builder.Configuration.GetSection("BookingSettings"));

// База данных
builder.Services.AddDbContext<BookingDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("PostgreSQL")));

builder.Services.Configure<KafkaOptions>(
    builder.Configuration.GetSection(KafkaOptions.SectionName));

builder.Services.AddScoped<IBookingRepository, BookingRepository>();

builder.Services.AddSingleton<IProducer<Null, string>>(sp =>
{
    var options = sp.GetRequiredService<IOptions<KafkaOptions>>().Value;
    var config = new ProducerConfig
    {
        BootstrapServers = options.BootstrapServers
    };
    return new ProducerBuilder<Null, string>(config).Build();
});

builder.Services.AddGrpcReflection();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<BookingDbContext>();
    dbContext.Database.Migrate();
}

// Configure the HTTP request pipeline.
app.MapGrpcService<BookingService.Services.BookingService>();

app.MapGrpcReflectionService();

app.Run();

public class BookingSettings
{
    public decimal MaxDiscountPercent { get; set; } = 50;
    public string DefaultCurrency { get; set; } = "RUB";
}

public class KafkaOptions
{
    public const string SectionName = "Kafka";
    public string BootstrapServers { get; set; } = null!;
}