using System.Runtime.CompilerServices;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace HotelioBookingService.EntityFramework;

public class BookingDbContextFactory : IDesignTimeDbContextFactory<BookingDbContext>
{
    public BookingDbContext CreateDbContext(params string[] args)
    {
        return new BookingDbContext(GetOptions());
    }
    private static DbContextOptions<BookingDbContext> GetOptions()
    {
        // https://www.npgsql.org/efcore/release-notes/6.0.html#opting-out-of-the-new-timestamp-mapping-logic
        AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

        var configuration = BuildConfiguration();

        var builder = new DbContextOptionsBuilder<BookingDbContext>()
            .UseNpgsql(configuration.GetConnectionString("HotelioBookingDb"));

        return builder.Options;
    }

    private static IConfigurationRoot BuildConfiguration()
    {
        var builder = new ConfigurationBuilder().SetBasePath(Directory.GetCurrentDirectory());
        var envName = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
        builder
            .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
            .AddJsonFile($"appsettings.{envName}.json", true, true);

        return builder.Build();
    }
}