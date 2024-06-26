﻿using System.Text.Json.Serialization;

namespace GameMapStorageWebSite.Models
{
    public class LayerDisplayOptions
    {
        [JsonPropertyName("minZoom")]
        public int MinZoom { get; set; }

        [JsonPropertyName("maxZoom")]
        public int MaxZoom { get; set; }

        [JsonPropertyName("factorX")]
        public double FactorX { get; set; }

        [JsonPropertyName("factorY")]
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

        [JsonPropertyName("originX")]
        public double OriginX { get; set; }

        [JsonPropertyName("originY")]
        public double OriginY { get; set; }

        [JsonPropertyName("sizeInMeters")]
        public required double SizeInMeters { get; set; }

        [JsonPropertyName("isSvg")]
        public required bool IsSvg { get; set; }

        [JsonPropertyName("bounds")]
        public double[][]? Bounds { get; internal set; }
    }
}
