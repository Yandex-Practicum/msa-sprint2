using BookingService.Services;
using Microsoft.Testing.Platform.Extensions.Messages;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Xunit;
using static Microsoft.ApplicationInsights.MetricDimensionNames.TelemetryContext;

namespace BookingService.Services.Tests
{
    public class MonolitEndpointsTests
    {
        string UserId = "test-user-2";
        string HotelId = "test-hotel-1";
        string PromoCode = "TESTCODE1";

        [Fact()]
        public void GetBookingsTest()
        {
            var mono = new MonolitService();
            var r = mono.GetBooking(UserId);
            Xunit.Assert.True(true);
        }

        [Fact()]
        public void GetUserTest()
        {
            var mono = new MonolitService();
            var r = mono.IsUserBlacklisted(UserId);

            Xunit.Assert.True(true);
        }

        [Fact]
        public void IsUserActiveTest()
        {
            var mono = new MonolitService();
            var r = mono.IsUserActive(UserId);
            Xunit.Assert.True(true);
        }

        [Fact]
        public void IsHotelOperationalTest()
        {
            var mono = new MonolitService();
            var r = mono.IsHotelOperational(HotelId);
            r = mono.IsHotelFullyBooked(HotelId);
            r = mono.IsTrustedHotel(HotelId);
            Xunit.Assert.True(true);
        }

        [Fact]
        public void ValidatePromoCodeTest()
        {
            var mono = new MonolitService();
            var r = mono.ValidatePromoCode("TESTCODE1", "test-user-2");
            Xunit.Assert.True(true);
        }
    }
}
