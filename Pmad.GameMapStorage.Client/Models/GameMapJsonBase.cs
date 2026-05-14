using System.Text.Json.Serialization;

namespace Pmad.GameMapStorage.Client.Models
{
    public class GameMapJsonBase
    {
        public int GameMapId { get; init; }

        public string? EnglishTitle { get; init; }

        public string? AppendAttribution { get; init; }

        public string? SteamWorkshopId { get; init; }

        public string? OfficialSiteUri { get; init; }

        public double SizeInMeters { get; init; }

        public string? Name { get; init; }

        public string[]? Aliases { get; init; }

        public string[]? Tags { get; init; }

        public string? Thumbnail { get; init; }

        public string? ThumbnailWebp { get; init; }

        public string? ThumbnailPng { get; init; }

        public DateTime? LastChangeUtc { get; init; }

        public double OriginX { get; init; }

        public double OriginY { get; init; }

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public IReadOnlyList<GameMapLayerJson>? Layers { get; init; }
    }
}
