using Hotelio.PromoCodeService;
using Hotelio.PromoCodeService.MonolithClients;
using Hotelio.PromoCodeService.Repositories;
using Hotelio.PromoCodeService.Services;
using Hotelio.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();

// Add gRPC services
builder.Services.AddGrpc(options =>
{
    options.EnableDetailedErrors = builder.Environment.IsDevelopment();
    //options.Interceptors.Add<GrpcExceptionInterceptor>();
});

// Configure database context for promocodes
builder.Services.AddDbContextFactory<PromoCodeDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("PromoCodeDb")), 
    ServiceLifetime.Scoped);

// REST Clients to Monolith
builder.Services.AddHttpClient<IUserClient, UserClient>(client =>
{
    client.BaseAddress = new Uri(builder.Configuration["Monolith:BaseUrl"] ?? "http://monolith:8084");
    client.DefaultRequestHeaders.Add("Accept", "application/json");
});

// Register the services 
builder.Services.AddScoped<IPromoCodeRepository, PromoCodeRepository>();

builder.Services.AddScoped<IPromoCodeServiceImpl, PromoCodeServiceImpl>();

// Register HTTP client for optional REST API calls
builder.Services.AddHttpClient();


// Configure Swagger/OpenAPI for API documentation
builder.Services.AddEndpointsApiExplorer();
//builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
   // app.UseSwagger();
    //app.UseSwaggerUI();
}

// Initialize database
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<PromoCodeDbContext>();

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

// Map gRPC services
app.MapGrpcService<PromoCodeGrpcService>();

// GET /api/promos/{code}
app.MapGet("/api/promos/{code}", async (string code, IPromoCodeServiceImpl svc) =>
{
    var promoCode = await svc.GetPromoByCodeAsync(code);

    return promoCode != null
        ? Results.Ok(promoCode)
        : Results.NotFound(new { message = "No promocodes found for this code" });
});
// GET /api/promos/{code}/valid?isVipUser=true
app.MapGet("/api/promos/{code}/valid", async (string code, [FromQuery]bool isVipUser, IPromoCodeServiceImpl svc) =>
{
    var promo = await svc.IsPromoValidAsync(code, isVipUser);

    return Results.Ok(promo);
});
// POST /api/promos/validate
app.MapPost("/api/promos/validate", async ([FromQuery]string code, [FromQuery]string userId, IPromoCodeServiceImpl svc) =>
{
    var promo = await svc.ValidatePromoAsync(code, userId);

    return promo != null
        ? Results.Ok(promo)
        : Results.NotFound(new { message = "No promocodes found for this code" });
});


// Start the application
try
{
    Console.WriteLine("Starting PromoCode Service...");
    Console.WriteLine($"Database Connection: {builder.Configuration.GetConnectionString("PromoCodeDb")}");

    app.Run();
}
catch (Exception ex)
{
    Console.WriteLine($"Failed to start PromoCode Service: {ex}");
    throw;
}

