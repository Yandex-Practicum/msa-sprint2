using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hotelio.BookingHistoryService.Migrations
{
    /// <inheritdoc />
    public partial class LowerCaseTableNames : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_UserStatistics",
                table: "UserStatistics");

            migrationBuilder.DropPrimaryKey(
                name: "PK_HotelStatistics",
                table: "HotelStatistics");

            migrationBuilder.DropPrimaryKey(
                name: "PK_DailyStatistics",
                table: "DailyStatistics");

            migrationBuilder.RenameTable(
                name: "UserStatistics",
                newName: "userstatistics");

            migrationBuilder.RenameTable(
                name: "HotelStatistics",
                newName: "hotelstatistics");

            migrationBuilder.RenameTable(
                name: "DailyStatistics",
                newName: "dailystatistics");

            migrationBuilder.RenameIndex(
                name: "IX_UserStatistics_UserId",
                table: "userstatistics",
                newName: "IX_userstatistics_UserId");

            migrationBuilder.RenameIndex(
                name: "IX_HotelStatistics_HotelId",
                table: "hotelstatistics",
                newName: "IX_hotelstatistics_HotelId");

            migrationBuilder.RenameIndex(
                name: "IX_DailyStatistics_Date",
                table: "dailystatistics",
                newName: "IX_dailystatistics_Date");

            migrationBuilder.AlterColumn<DateTime>(
                name: "LastBookingDate",
                table: "userstatistics",
                type: "timestamp without time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<DateTime>(
                name: "Date",
                table: "dailystatistics",
                type: "timestamp without time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AddPrimaryKey(
                name: "PK_userstatistics",
                table: "userstatistics",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_hotelstatistics",
                table: "hotelstatistics",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_dailystatistics",
                table: "dailystatistics",
                column: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_userstatistics",
                table: "userstatistics");

            migrationBuilder.DropPrimaryKey(
                name: "PK_hotelstatistics",
                table: "hotelstatistics");

            migrationBuilder.DropPrimaryKey(
                name: "PK_dailystatistics",
                table: "dailystatistics");

            migrationBuilder.RenameTable(
                name: "userstatistics",
                newName: "UserStatistics");

            migrationBuilder.RenameTable(
                name: "hotelstatistics",
                newName: "HotelStatistics");

            migrationBuilder.RenameTable(
                name: "dailystatistics",
                newName: "DailyStatistics");

            migrationBuilder.RenameIndex(
                name: "IX_userstatistics_UserId",
                table: "UserStatistics",
                newName: "IX_UserStatistics_UserId");

            migrationBuilder.RenameIndex(
                name: "IX_hotelstatistics_HotelId",
                table: "HotelStatistics",
                newName: "IX_HotelStatistics_HotelId");

            migrationBuilder.RenameIndex(
                name: "IX_dailystatistics_Date",
                table: "DailyStatistics",
                newName: "IX_DailyStatistics_Date");

            migrationBuilder.AlterColumn<DateTime>(
                name: "LastBookingDate",
                table: "UserStatistics",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone");

            migrationBuilder.AlterColumn<DateTime>(
                name: "Date",
                table: "DailyStatistics",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone");

            migrationBuilder.AddPrimaryKey(
                name: "PK_UserStatistics",
                table: "UserStatistics",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_HotelStatistics",
                table: "HotelStatistics",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_DailyStatistics",
                table: "DailyStatistics",
                column: "Id");
        }
    }
}
