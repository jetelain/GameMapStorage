using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GameMapStorageWebSite.Migrations
{
    /// <inheritdoc />
    public partial class MarkersMetadata : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ImageLastChangeUtc",
                table: "GameMarker",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsColorCompatible",
                table: "GameMarker",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "MilSymbolEquivalent",
                table: "GameMarker",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SteamWorkshopId",
                table: "GameMarker",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ContrastHexadecimal",
                table: "GameColor",
                type: "TEXT",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ImageLastChangeUtc",
                table: "GameMarker");

            migrationBuilder.DropColumn(
                name: "IsColorCompatible",
                table: "GameMarker");

            migrationBuilder.DropColumn(
                name: "MilSymbolEquivalent",
                table: "GameMarker");

            migrationBuilder.DropColumn(
                name: "SteamWorkshopId",
                table: "GameMarker");

            migrationBuilder.DropColumn(
                name: "ContrastHexadecimal",
                table: "GameColor");
        }
    }
}
