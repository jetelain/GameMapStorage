using System.Text.Json.Serialization;

namespace Pmad.GameMapStorage.Client.Models
{
    public class GameJsonBase
    {
        public int GameId { get; init; }

        public string? EnglishTitle { get; init; }

        public string? Name { get; init; }

        public string? Attribution { get; init; }

        public string? OfficialSiteUri { get; init; }

        public string? SteamAppId { get; init; }

        public DateTime? LastChangeUtc { get; init; }

        public string? Logo { get; init; }

        public string? LogoWebp { get; init; }

        public string? LogoPng { get; init; }
    }
}
