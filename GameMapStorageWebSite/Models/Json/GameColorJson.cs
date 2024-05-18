using GameMapStorageWebSite.Entities;

namespace GameMapStorageWebSite.Models.Json
{
    public class GameColorJson
    {
        public GameColorJson()
        {

        }

        public GameColorJson(GameColor gameColor)
        {
            GameColorId = gameColor.GameColorId;
            EnglishTitle = gameColor.EnglishTitle;
            Name = gameColor.Name;
            Hexadecimal = gameColor.Hexadecimal;
            Usage = gameColor.Usage;
        }

        public int GameColorId { get; set; }

        public string? EnglishTitle { get; set; }

        public string? Name { get; set; }

        public string? Hexadecimal { get; set; }

        public ColorUsage Usage { get; set; }
    }
}