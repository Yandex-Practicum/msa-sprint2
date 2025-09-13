using HotelioHistoryService.Common;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;


namespace HotelioHistoryService.EntityFramework;

public class HistoryDbContextFactory : IDesignTimeDbContextFactory<HistoryDbContext>
{
    public HistoryDbContext CreateDbContext(params string[] args)
    {
        return new HistoryDbContext(GetOptions());
    }

    private static DbContextOptions<HistoryDbContext> GetOptions()
    {
        // https://www.npgsql.org/efcore/release-notes/6.0.html#opting-out-of-the-new-timestamp-mapping-logic
        AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

        var configuration = BuildConfiguration();
        var conString = configuration.GetConnectionString(ConnectionStringName.HistoryDbConnectionStringName);
        var builder = new DbContextOptionsBuilder<HistoryDbContext>()
            .UseNpgsql(conString);

        return builder.Options;
    }

    private static IConfigurationRoot BuildConfiguration()
    {
        var builder = new ConfigurationBuilder().SetBasePath(Directory.GetCurrentDirectory());
        var envName = Environment.GetEnvironmentVariable("DOTNET_ENVIRONMENT");
        builder
            .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
            .AddJsonFile($"appsettings.{envName}.json", true, true)
            .AddEnvironmentVariables();

        return builder.Build();
    }
}