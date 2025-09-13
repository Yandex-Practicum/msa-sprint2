using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HotelioBookingService.Migrations
{
    /// <inheritdoc />
    public partial class Initial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateSequence(
                name: "BookingSequence");

            migrationBuilder.CreateTable(
                name: "booking",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false, defaultValueSql: "nextval('\"BookingSequence\"')"),
                    discount_percent = table.Column<double>(type: "double precision", nullable: true),
                    hotel_id = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true),
                    price = table.Column<double>(type: "double precision", nullable: false),
                    promo_code = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true),
                    user_id = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp", nullable: false, defaultValueSql: "timezone('utc', now())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_booking", x => x.id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "booking");

            migrationBuilder.DropSequence(
                name: "BookingSequence");
        }
    }
}
