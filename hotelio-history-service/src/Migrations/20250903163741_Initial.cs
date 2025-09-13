using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HotelioHistoryService.Migrations
{
    /// <inheritdoc />
    public partial class Initial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateSequence(
                name: "BookingHistorySequence");

            migrationBuilder.CreateTable(
                name: "booking_history",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false, defaultValueSql: "nextval('\"BookingHistorySequence\"')"),
                    booking_id = table.Column<long>(type: "bigint", nullable: false),
                    discount_percent = table.Column<double>(type: "double precision", nullable: true),
                    hotel_id = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true),
                    price = table.Column<double>(type: "double precision", nullable: false),
                    promo_code = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true),
                    user_id = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true),
                    booking_created_at = table.Column<DateTime>(type: "timestamp", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp", nullable: false, defaultValueSql: "timezone('utc', now())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_booking_history", x => x.id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "booking_history");

            migrationBuilder.DropSequence(
                name: "BookingHistorySequence");
        }
    }
}
