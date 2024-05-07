using System.Text.Json.Serialization;

namespace GameMapStorageWebSite.Models
{
    public class MapInfos
    {
        [JsonPropertyName("minZoom")]
        public int MinZoom { get; set; }

        [JsonPropertyName("maxZoom")]
        public int MaxZoom { get; set; }

        [JsonPropertyName("factorx")]
        public double FactorX { get; set; }

        [JsonPropertyName("factory")]
        public double FactorY { get; set; }

        [JsonPropertyName("tileSize")]
        public int TileSize { get; set; }

        [JsonPropertyName("defaultPosition")]
        public required double[] DefaultPosition { get; set; }

        [JsonPropertyName("defaultZoom")]
        public required int DefaultZoom { get; set; }

        [JsonPropertyName("tilePattern")]
        public required string TilePattern { get; set; }

        [JsonPropertyName("attribution")]
        public required string Attribution { get; set; }
    }
}
