using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Hotelio.PromoCodeService.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "promocode",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.SerialColumn),
                    Code = table.Column<string>(type: "text", nullable: false),
                    Discount = table.Column<decimal>(type: "numeric(15,2)", precision: 15, scale: 2, nullable: false),
                    VipOnly = table.Column<bool>(type: "boolean", nullable: false),
                    Expired = table.Column<bool>(type: "boolean", nullable: false),
                    ValidUntil = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_promocode", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "promocode",
                columns: new[] { "Id", "Code", "Description", "Discount", "Expired", "ValidUntil", "VipOnly" },
                values: new object[,]
                {
                    { 1, "TESTCODE1", "Обычный промокод", 10.0m, false, new DateTime(2099, 12, 31, 0, 0, 0, 0, DateTimeKind.Unspecified), false },
                    { 2, "TESTCODE-VIP", "Только для VIP", 20.0m, false, new DateTime(2099, 12, 31, 0, 0, 0, 0, DateTimeKind.Unspecified), true },
                    { 3, "TESTCODE-OLD", "Истёкший промокод", 5.0m, true, new DateTime(2000, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), false }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "promocode");
        }
    }
}
