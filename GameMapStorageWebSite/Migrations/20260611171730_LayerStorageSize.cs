using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GameMapStorageWebSite.Migrations
{
    /// <inheritdoc />
    public partial class LayerStorageSize : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "StoragePngTiles",
                table: "GameMapLayer",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "StorageSourceFiles",
                table: "GameMapLayer",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "StorageSvgTiles",
                table: "GameMapLayer",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "StorageWebpTiles",
                table: "GameMapLayer",
                type: "INTEGER",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "StoragePngTiles",
                table: "GameMapLayer");

            migrationBuilder.DropColumn(
                name: "StorageSourceFiles",
                table: "GameMapLayer");

            migrationBuilder.DropColumn(
                name: "StorageSvgTiles",
                table: "GameMapLayer");

            migrationBuilder.DropColumn(
                name: "StorageWebpTiles",
                table: "GameMapLayer");
        }
    }
}
