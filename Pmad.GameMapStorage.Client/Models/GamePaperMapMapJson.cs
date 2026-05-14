namespace Pmad.GameMapStorage.Client.Models
{
    public class GamePaperMapMapJson : GamePaperMapJson
    {
        public int GameMapId { get; init; }

        public string? EnglishTitle { get; init; }

        public string? AppendAttribution { get; init; }

        public string? MapName { get; init; }
    }
}
