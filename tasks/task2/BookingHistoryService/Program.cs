using BookingHistoryService;
using BookingHistoryService.Data;
using Microsoft.EntityFrameworkCore;

var builder = Host.CreateApplicationBuilder(args);
builder.Services.AddDbContext<BookingHistoryDbContext>(options =>
{
    var dbHost = Environment.GetEnvironmentVariable("POSTGRES_HOST") ?? "127.0.0.1";
    var dbPort = Environment.GetEnvironmentVariable("POSTGRES_PORT") ?? "5432";
    var dbUser = Environment.GetEnvironmentVariable("POSTGRES_USER") ?? "hotelio";
    var dbPassword = Environment.GetEnvironmentVariable("POSTGRES_PASSWORD") ?? "hotelio";
    var dbName = Environment.GetEnvironmentVariable("POSTGRES_DB") ?? "booking-history-db";
    var connectionString = $"Host={dbHost};Port={dbPort};Database={dbName};Username={dbUser};Password={dbPassword}";
    Console.WriteLine($"Connection string: {connectionString}");
    options.UseNpgsql(connectionString);

});

builder.Services.AddHostedService<Worker>();
var host = builder.Build();

using (var scope = host.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<BookingHistoryDbContext>();

    var logger = host.Services.GetService<ILogger<Worker>>();
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

host.Run();
