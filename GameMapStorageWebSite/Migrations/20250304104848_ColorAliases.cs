using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GameMapStorageWebSite.Migrations
{
    /// <inheritdoc />
    public partial class ColorAliases : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Aliases",
                table: "GameColor",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Aliases",
                table: "GameColor");
        }
    }
}
