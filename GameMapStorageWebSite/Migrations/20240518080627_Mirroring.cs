using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GameMapStorageWebSite.Migrations
{
    /// <inheritdoc />
    public partial class Mirroring : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<byte[]>(
                name: "GameMapLocationGuid",
                table: "GameMapLocation",
                type: "BLOB",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DataLastChangeUtc",
                table: "GameMapLayer",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "GameMapLayerGuid",
                table: "GameMapLayer",
                type: "BLOB",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "GameMapLocationGuid",
                table: "GameMapLocation");

            migrationBuilder.DropColumn(
                name: "DataLastChangeUtc",
                table: "GameMapLayer");

            migrationBuilder.DropColumn(
                name: "GameMapLayerGuid",
                table: "GameMapLayer");
        }
    }
}
