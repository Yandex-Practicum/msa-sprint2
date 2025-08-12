using BookingService;
using BookingService.Data;
using BookingService.Services;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion.Internal;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddGrpc();
builder.Services.AddSingleton<BookingEventHandler>();
builder.Services.AddSingleton<MonolitService>();

// Настройка PostgreSQL с переменными окружения
builder.Services.AddDbContext<BookingDbContext>(options =>
{
    var dbHost = Environment.GetEnvironmentVariable("POSTGRES_HOST") ?? "127.0.0.1";
    var dbPort = Environment.GetEnvironmentVariable("POSTGRES_PORT") ?? "5432";
    var dbUser = Environment.GetEnvironmentVariable("POSTGRES_USER") ?? "hotelio";
    var dbPassword = Environment.GetEnvironmentVariable("POSTGRES_PASSWORD") ?? "hotelio";
    var dbName = Environment.GetEnvironmentVariable("POSTGRES_DB") ?? "hotelio";
    var connectionString = $"Host={dbHost};Port={dbPort};Database={dbName};Username={dbUser};Password={dbPassword}";
    Console.WriteLine(connectionString);
    options.UseNpgsql(connectionString);
});
builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenAnyIP(5001, listenOptions =>
    {
        listenOptions.Protocols = HttpProtocols.Http2;
    });
    //options.ListenAnyIP(5001, listenOptions =>
    //{
    //    listenOptions.Protocols = HttpProtocols.Http2;
    //    listenOptions.UseHttps(); // HTTPS
    //});
});

var app = builder.Build();


using (var scope = app.Services.CreateScope())
{
    var logger = app.Services.GetService<ILogger<BookingServiceImpl>>();
    
    var dbContext = scope.ServiceProvider.GetRequiredService<BookingDbContext>();
    //dbContext.Database.Migrate();
    if (dbContext.Database.CanConnect())
    {
        try
        {
            logger?.LogInformation("Creating database and tables...");
            dbContext.Database.EnsureCreated();
            logger?.LogInformation("Database created!");
        }
        catch (Exception ex)
        {
            Console.WriteLine(ex);
        }
    }
    else
        logger?.LogInformation("Database not connected!");
}


// Configure the HTTP request pipeline.
app.MapGrpcService<BookingServiceImpl>().RequireHost("*:5001");

app.MapGet("/", () => message());
app.Run();

string message() { 

    return  "gRPC Booking Service is running.";

}