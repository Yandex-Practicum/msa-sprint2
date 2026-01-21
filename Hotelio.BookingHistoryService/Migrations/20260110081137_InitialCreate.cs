using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hotelio.BookingHistoryService.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DailyStatistics",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    BookingCount = table.Column<int>(type: "integer", nullable: false),
                    TotalRevenue = table.Column<double>(type: "double precision", nullable: false),
                    AverageBookingValue = table.Column<double>(type: "double precision", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DailyStatistics", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "HotelStatistics",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    HotelId = table.Column<string>(type: "text", nullable: false),
                    BookingCount = table.Column<int>(type: "integer", nullable: false),
                    TotalRevenue = table.Column<double>(type: "double precision", nullable: false),
                    AverageBookingValue = table.Column<double>(type: "double precision", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HotelStatistics", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "UserStatistics",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    UserId = table.Column<string>(type: "text", nullable: false),
                    BookingCount = table.Column<int>(type: "integer", nullable: false),
                    TotalSpent = table.Column<double>(type: "double precision", nullable: false),
                    LastBookingDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserStatistics", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DailyStatistics_Date",
                table: "DailyStatistics",
                column: "Date",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_HotelStatistics_HotelId",
                table: "HotelStatistics",
                column: "HotelId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserStatistics_UserId",
                table: "UserStatistics",
                column: "UserId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DailyStatistics");

            migrationBuilder.DropTable(
                name: "HotelStatistics");

            migrationBuilder.DropTable(
                name: "UserStatistics");
        }
    }
}
