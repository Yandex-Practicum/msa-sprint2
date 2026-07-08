using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace booking_history_service.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "HistoryBookings",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    UserId = table.Column<string>(type: "text", nullable: false),
                    HotelId = table.Column<string>(type: "text", nullable: false),
                    PromoCode = table.Column<string>(type: "text", nullable: true),
                    DiscountPercent = table.Column<double>(type: "double precision", nullable: false),
                    Price = table.Column<double>(type: "double precision", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HistoryBookings", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_HistoryBookings_CreatedAt",
                table: "HistoryBookings",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_HistoryBookings_UserId",
                table: "HistoryBookings",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "HistoryBookings");
        }
    }
}
