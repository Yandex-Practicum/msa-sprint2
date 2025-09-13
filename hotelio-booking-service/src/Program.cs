using System.Net;
using Confluent.Kafka;
using HotelioBookingService.Clients;
using HotelioBookingService.Entities;
using HotelioBookingService.EntityFramework;
using HotelioBookingService.Repositories;
using HotelioBookingService.Services;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.EntityFrameworkCore;
using Refit;

var builder = WebApplication.CreateBuilder(args);
builder.Configuration
    .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", true, true)
    .AddEnvironmentVariables();

var monolithHost = builder.Configuration.GetValue<string>("HOTELIO_MONOLITH_HOST");
var monolithPort = builder.Configuration.GetValue<string>("HOTELIO_MONOLITH_PORT");
builder.Services.Configure<KafkaServiceSettings>(options =>
    options.BootstrapServers = builder.Configuration.GetValue<string>("KAFKA_BOOTSTRAP_SERVERS"));

var http1Port = builder.Configuration.GetValue<int>("HOTELIO_BOOKING_SERVICE_HTTP1_PORT");
var http2Port = builder.Configuration.GetValue<int>("HOTELIO_BOOKING_SERVICE_HTTP2_PORT");

builder.Logging.ClearProviders();
builder.Logging.AddConsole();
// Add services to the container.
builder.Services.AddGrpc();

builder.Services.AddRefitClient<IMonolithClient>()
    .ConfigureHttpClient(c => c.BaseAddress = new Uri($"http://{monolithHost}:{monolithPort}/api"));

builder.Services.AddHealthChecks()
    .AddCheck<HealthCheckService>("HealthCheck");

builder.WebHost.ConfigureKestrel(options =>
    {
        options.Listen(IPAddress.Any, http2Port, o => o.Protocols = HttpProtocols.Http2);
        options.Listen(IPAddress.Any, http1Port, o => o.Protocols = HttpProtocols.Http1);
    }
);

builder.Services.AddTransient<ISerializer<Booking>, KafkaMessageSerializer>();
builder.Services.AddScoped<IKafkaProducerService<Booking>, KafkaProducerService<Booking, ISerializer<Booking>>>();
builder.Services.AddScoped<IBookingRepository, BookingRepository>();
var connectionString = builder.Configuration.GetConnectionString("HotelioBookingDb");

builder.Services.AddDbContext<BookingDbContext>(options =>
    options.UseNpgsql(connectionString)
);

var app = builder.Build();

// Configure the HTTP request pipeline.
app.MapGrpcService<BookingServiceApi>();
app.MapGet("/",
    () =>
        "Booking service API");
app.MapHealthChecks("/healthz");

var contextBuilder = new BookingDbContextFactory().CreateDbContext();
contextBuilder.Database.Migrate();

app.Run();