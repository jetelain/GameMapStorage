using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GameMapStorageWebSite.Migrations
{
    /// <inheritdoc />
    public partial class PaperMap : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "GamePaperMap",
                columns: table => new
                {
                    GamePaperMapId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    FileFormat = table.Column<int>(type: "INTEGER", nullable: false),
                    PaperSize = table.Column<int>(type: "INTEGER", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    FileSize = table.Column<int>(type: "INTEGER", nullable: false),
                    Scale = table.Column<int>(type: "INTEGER", nullable: false),
                    LastChangeUtc = table.Column<DateTime>(type: "TEXT", nullable: true),
                    GameMapId = table.Column<int>(type: "INTEGER", nullable: false),
                    Pages = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GamePaperMap", x => x.GamePaperMapId);
                    table.ForeignKey(
                        name: "FK_GamePaperMap_GameMap_GameMapId",
                        column: x => x.GameMapId,
                        principalTable: "GameMap",
                        principalColumn: "GameMapId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_GamePaperMap_GameMapId",
                table: "GamePaperMap",
                column: "GameMapId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GamePaperMap");
        }
    }
}
