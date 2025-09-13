using Confluent.Kafka;
using HotelioBookingService.Entities;
using HotelioBookingService.EntityFramework;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace HotelioBookingService.Services;

public class HealthCheckService : IHealthCheck
{
    private readonly BookingDbContext _context;
    private readonly IKafkaProducerService<Booking> _service;

    public HealthCheckService(BookingDbContext context, IKafkaProducerService<Booking> service)
    {
        _context = context;
        _service = service;
    }

    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            var result = _context.Database.ExecuteSqlRaw("SELECT COUNT(1);");
        }
        catch (Exception e)
        {
            return Task.FromResult(
                new HealthCheckResult(
                    context.Registration.FailureStatus, $"An unhealthy result: {e.Message}"));
        }

        return Task.FromResult(
            HealthCheckResult.Healthy("A healthy result."));
    }
}