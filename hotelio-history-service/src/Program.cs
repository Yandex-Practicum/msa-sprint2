using Confluent.Kafka;
using HotelioHistoryService.Common;
using HotelioHistoryService.DomainDto;
using HotelioHistoryService.EntityFramework;
using HotelioHistoryService.Repostitory;
using HotelioHistoryService.Services;
using HotelioHistoryService.Workers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;


var builder = Host.CreateApplicationBuilder(args);
builder.Configuration
    .SetBasePath(Directory.GetCurrentDirectory())
    .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", true, true)
    .AddEnvironmentVariables();


string bootstrapServer = builder.Configuration.GetValue<string>("KAFKA_BOOTSTRAP_SERVERS");

builder.Services.Configure<KafkaServiceSettings>(options =>
    options.BootstrapServers = bootstrapServer);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();

builder.Services.AddScoped<IDeserializer<BookingDto>, KafkaMessageDeserializer<BookingDto>>();
builder.Services.AddScoped<IKafkaConsumerService<BookingDto>, KafkaConsumerService<BookingDto>>();
builder.Services.AddScoped<IBookingHistoryRepository, BookingHistoryRepository>();
var connectionString = builder.Configuration.GetConnectionString(ConnectionStringName.HistoryDbConnectionStringName);

builder.Services.AddDbContext<HistoryDbContext>(options =>
    options.UseNpgsql(connectionString)
);


var contextBuilder = new HistoryDbContextFactory().CreateDbContext();
contextBuilder.Database.Migrate();
builder.Services.AddHostedService<BookingHistoryWorker>();


var host = builder.Build();
host.Run();