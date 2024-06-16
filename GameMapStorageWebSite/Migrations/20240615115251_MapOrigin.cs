using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GameMapStorageWebSite.Migrations
{
    /// <inheritdoc />
    public partial class MapOrigin : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "OriginX",
                table: "GameMap",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "OriginY",
                table: "GameMap",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "OriginX",
                table: "GameMap");

            migrationBuilder.DropColumn(
                name: "OriginY",
                table: "GameMap");
        }
    }
}
