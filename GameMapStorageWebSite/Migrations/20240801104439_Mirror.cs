using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GameMapStorageWebSite.Migrations
{
    /// <inheritdoc />
    public partial class Mirror : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_BackgroundWork_GameMapLayer_GameMapLayerId",
                table: "BackgroundWork");

            migrationBuilder.AddColumn<int>(
                name: "GamePaperMapId",
                table: "BackgroundWork",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_BackgroundWork_GamePaperMapId",
                table: "BackgroundWork",
                column: "GamePaperMapId");

            migrationBuilder.AddForeignKey(
                name: "FK_BackgroundWork_GameMapLayer_GameMapLayerId",
                table: "BackgroundWork",
                column: "GameMapLayerId",
                principalTable: "GameMapLayer",
                principalColumn: "GameMapLayerId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_BackgroundWork_GamePaperMap_GamePaperMapId",
                table: "BackgroundWork",
                column: "GamePaperMapId",
                principalTable: "GamePaperMap",
                principalColumn: "GamePaperMapId",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_BackgroundWork_GameMapLayer_GameMapLayerId",
                table: "BackgroundWork");

            migrationBuilder.DropForeignKey(
                name: "FK_BackgroundWork_GamePaperMap_GamePaperMapId",
                table: "BackgroundWork");

            migrationBuilder.DropIndex(
                name: "IX_BackgroundWork_GamePaperMapId",
                table: "BackgroundWork");

            migrationBuilder.DropColumn(
                name: "GamePaperMapId",
                table: "BackgroundWork");

            migrationBuilder.AddForeignKey(
                name: "FK_BackgroundWork_GameMapLayer_GameMapLayerId",
                table: "BackgroundWork",
                column: "GameMapLayerId",
                principalTable: "GameMapLayer",
                principalColumn: "GameMapLayerId");
        }
    }
}
