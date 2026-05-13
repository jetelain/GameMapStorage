using System.Text.Json.Serialization;

namespace Pmad.GameMapStorage.Client.Models
{
    public class GameMapJsonBase
    {
        public int GameMapId { get; set; }

        public string? EnglishTitle { get; set; }

        public string? AppendAttribution { get; set; }

        public string? SteamWorkshopId { get; set; }

        public string? OfficialSiteUri { get; set; }

        public double SizeInMeters { get; set; }

        public string? Name { get; set; }

        public string[]? Aliases { get; set; }

        public string[]? Tags { get; set; }

        public string? Thumbnail { get; set; }

        public string? ThumbnailWebp { get; set; }

        public string? ThumbnailPng { get; set; }

        public DateTime? LastChangeUtc { get; set; }

        public double OriginX { get; set; }

        public double OriginY { get; set; }

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public List<GameMapLayerJson>? Layers { get; set; }
    }
}
