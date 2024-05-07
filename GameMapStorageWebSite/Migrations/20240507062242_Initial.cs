using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GameMapStorageWebSite.Migrations
{
    /// <inheritdoc />
    public partial class Initial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Game",
                columns: table => new
                {
                    GameId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    EnglishTitle = table.Column<string>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    Attribution = table.Column<string>(type: "TEXT", nullable: false),
                    OfficialSiteUri = table.Column<string>(type: "TEXT", nullable: true),
                    SteamAppId = table.Column<string>(type: "TEXT", nullable: true),
                    LastChangeUtc = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Game", x => x.GameId);
                });

            migrationBuilder.CreateTable(
                name: "GameColor",
                columns: table => new
                {
                    GameColorId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    EnglishTitle = table.Column<string>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    Hexadecimal = table.Column<string>(type: "TEXT", nullable: false),
                    Usage = table.Column<int>(type: "INTEGER", nullable: false),
                    GameId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GameColor", x => x.GameColorId);
                    table.ForeignKey(
                        name: "FK_GameColor_Game_GameId",
                        column: x => x.GameId,
                        principalTable: "Game",
                        principalColumn: "GameId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "GameMap",
                columns: table => new
                {
                    GameMapId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    EnglishTitle = table.Column<string>(type: "TEXT", nullable: false),
                    AppendAttribution = table.Column<string>(type: "TEXT", nullable: true),
                    SteamWorkshopId = table.Column<string>(type: "TEXT", nullable: true),
                    OfficialSiteUri = table.Column<string>(type: "TEXT", nullable: true),
                    SizeInMeters = table.Column<double>(type: "REAL", nullable: false),
                    CitiesCount = table.Column<int>(type: "INTEGER", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: true),
                    Aliases = table.Column<string>(type: "TEXT", nullable: true),
                    LastChangeUtc = table.Column<DateTime>(type: "TEXT", nullable: true),
                    GameId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GameMap", x => x.GameMapId);
                    table.ForeignKey(
                        name: "FK_GameMap_Game_GameId",
                        column: x => x.GameId,
                        principalTable: "Game",
                        principalColumn: "GameId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "GameMarker",
                columns: table => new
                {
                    GameMarkerId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    EnglishTitle = table.Column<string>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    Usage = table.Column<int>(type: "INTEGER", nullable: false),
                    GameId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GameMarker", x => x.GameMarkerId);
                    table.ForeignKey(
                        name: "FK_GameMarker_Game_GameId",
                        column: x => x.GameId,
                        principalTable: "Game",
                        principalColumn: "GameId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "GameMapLayer",
                columns: table => new
                {
                    GameMapLayerId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Type = table.Column<int>(type: "INTEGER", nullable: false),
                    Format = table.Column<int>(type: "INTEGER", nullable: false),
                    State = table.Column<int>(type: "INTEGER", nullable: false),
                    MinZoom = table.Column<int>(type: "INTEGER", nullable: false),
                    MaxZoom = table.Column<int>(type: "INTEGER", nullable: false),
                    DefaultZoom = table.Column<int>(type: "INTEGER", nullable: false),
                    IsDefault = table.Column<bool>(type: "INTEGER", nullable: false),
                    TileSize = table.Column<int>(type: "INTEGER", nullable: false),
                    FactorX = table.Column<double>(type: "REAL", nullable: false),
                    FactorY = table.Column<double>(type: "REAL", nullable: false),
                    Culture = table.Column<string>(type: "TEXT", nullable: true),
                    LastChangeUtc = table.Column<DateTime>(type: "TEXT", nullable: true),
                    GameMapId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GameMapLayer", x => x.GameMapLayerId);
                    table.ForeignKey(
                        name: "FK_GameMapLayer_GameMap_GameMapId",
                        column: x => x.GameMapId,
                        principalTable: "GameMap",
                        principalColumn: "GameMapId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "GameMapLocation",
                columns: table => new
                {
                    GameMapLocationId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    EnglishTitle = table.Column<string>(type: "TEXT", nullable: false),
                    Type = table.Column<int>(type: "INTEGER", nullable: false),
                    X = table.Column<double>(type: "REAL", nullable: false),
                    Y = table.Column<double>(type: "REAL", nullable: false),
                    GameMapId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GameMapLocation", x => x.GameMapLocationId);
                    table.ForeignKey(
                        name: "FK_GameMapLocation_GameMap_GameMapId",
                        column: x => x.GameMapId,
                        principalTable: "GameMap",
                        principalColumn: "GameMapId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BackgroundWork",
                columns: table => new
                {
                    BackgroundWorkId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Type = table.Column<int>(type: "INTEGER", nullable: false),
                    State = table.Column<int>(type: "INTEGER", nullable: false),
                    Data = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    StartedUtc = table.Column<DateTime>(type: "TEXT", nullable: true),
                    FinishedUtc = table.Column<DateTime>(type: "TEXT", nullable: true),
                    Error = table.Column<string>(type: "TEXT", nullable: true),
                    GameMapLayerId = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BackgroundWork", x => x.BackgroundWorkId);
                    table.ForeignKey(
                        name: "FK_BackgroundWork_GameMapLayer_GameMapLayerId",
                        column: x => x.GameMapLayerId,
                        principalTable: "GameMapLayer",
                        principalColumn: "GameMapLayerId");
                });

            migrationBuilder.CreateIndex(
                name: "IX_BackgroundWork_GameMapLayerId",
                table: "BackgroundWork",
                column: "GameMapLayerId");

            migrationBuilder.CreateIndex(
                name: "IX_GameColor_GameId",
                table: "GameColor",
                column: "GameId");

            migrationBuilder.CreateIndex(
                name: "IX_GameMap_GameId",
                table: "GameMap",
                column: "GameId");

            migrationBuilder.CreateIndex(
                name: "IX_GameMapLayer_GameMapId",
                table: "GameMapLayer",
                column: "GameMapId");

            migrationBuilder.CreateIndex(
                name: "IX_GameMapLocation_GameMapId",
                table: "GameMapLocation",
                column: "GameMapId");

            migrationBuilder.CreateIndex(
                name: "IX_GameMarker_GameId",
                table: "GameMarker",
                column: "GameId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BackgroundWork");

            migrationBuilder.DropTable(
                name: "GameColor");

            migrationBuilder.DropTable(
                name: "GameMapLocation");

            migrationBuilder.DropTable(
                name: "GameMarker");

            migrationBuilder.DropTable(
                name: "GameMapLayer");

            migrationBuilder.DropTable(
                name: "GameMap");

            migrationBuilder.DropTable(
                name: "Game");
        }
    }
}
