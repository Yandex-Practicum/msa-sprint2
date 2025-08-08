using BookingService;
using BookingService.Data;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion.Internal;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddGrpc();

// Настройка PostgreSQL с переменными окружения
builder.Services.AddDbContext<BookingDbContext>(options =>
{
    var dbHost = Environment.GetEnvironmentVariable("POSTGRES_HOST") ?? "192.168.0.127";
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
    var dbContext = scope.ServiceProvider.GetRequiredService<BookingDbContext>();
    //dbContext.Database.Migrate();
    if (dbContext.Database.CanConnect())
    {
        try
        {
            Console.WriteLine("Creating database and tables...");
            dbContext.Database.EnsureCreated();
            Console.WriteLine("Database created!");
        }
        catch (Exception ex)
        {
            Console.WriteLine(ex);
        }
    }
    else
        Console.WriteLine("Database not connected!");
}


// Configure the HTTP request pipeline.
app.MapGrpcService<BookingServiceImpl>().RequireHost("*:5001");

app.MapGet("/", () => message());
app.Run();

string message() { 

    return  "gRPC Booking Service is running.";

}