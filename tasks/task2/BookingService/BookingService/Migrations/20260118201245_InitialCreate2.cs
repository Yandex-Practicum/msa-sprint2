using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookingService.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "promo_code");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "promo_code",
                columns: table => new
                {
                    code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    discount = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    expired = table.Column<bool>(type: "boolean", nullable: false),
                    max_uses = table.Column<int>(type: "integer", nullable: true),
                    min_order_amount = table.Column<decimal>(type: "numeric(10,2)", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    used_count = table.Column<int>(type: "integer", nullable: false),
                    valid_until = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    vip_only = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_promo_code", x => x.code);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PromoCode_Active",
                table: "promo_code",
                columns: new[] { "expired", "valid_until" });

            migrationBuilder.CreateIndex(
                name: "IX_PromoCode_VipOnly",
                table: "promo_code",
                column: "vip_only");
        }
    }
}
