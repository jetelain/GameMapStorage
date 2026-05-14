using System.Text.Json.Serialization;

namespace Pmad.GameMapStorage.Client.Models
{
    public class GameMapLayerJson
    {
        public int GameMapLayerId { get; init; }

        public LayerType Type { get; init; }

        public LayerFormat Format { get; init; }

        public int MinZoom { get; init; }

        public int MaxZoom { get; init; }

        public int DefaultZoom { get; init; }

        public bool IsDefault { get; init; }

        public int TileSize { get; init; }

        public double FactorX { get; init; }

        public double FactorY { get; init; }

        public string? Culture { get; init; }

        public DateTime? LastChangeUtc { get; init; }

        public DateTime? DataLastChangeUtc { get; init; }

        public Guid? GameMapLayerGuid { get; init; }

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? DownloadUri { get; init; }

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? PatternPng { get; init; }

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? PatternWebp { get; init; }

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? PatternSvg { get; init; }

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? Pattern { get; init; }
    }
}
