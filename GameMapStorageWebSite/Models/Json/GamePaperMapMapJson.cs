using GameMapStorageWebSite.Entities;
namespace GameMapStorageWebSite.Models.Json
{
    public class GamePaperMapMapJson : GamePaperMapJson
    {
        public GamePaperMapMapJson()
        {

        }

        public GamePaperMapMapJson(GamePaperMap paper, IDataPathBuilder pathBuilder) : base(paper, pathBuilder)
        {
            GameMapId = paper.GameMap!.GameMapId;
            EnglishTitle = paper.GameMap!.EnglishTitle;
            AppendAttribution = paper.GameMap!.AppendAttribution;
            MapName = paper.GameMap!.Name;
        }

        public int GameMapId { get; set; }

        public string? EnglishTitle { get; set; }

        public string? AppendAttribution { get; set; }

        public string? MapName { get; set; }

    }
}
