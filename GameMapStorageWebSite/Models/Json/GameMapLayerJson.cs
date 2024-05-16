using GameMapStorageWebSite.Entities;
using SixLabors.ImageSharp.Drawing.Processing;

namespace GameMapStorageWebSite.Models.Json
{
    public class GameMapLayerJson
    {
        public GameMapLayerJson()
        {

        }

        public GameMapLayerJson(GameMapLayer gameMapLayer, string basePath, bool useWebp)
        {
            GameMapLayerId = gameMapLayer.GameMapLayerId;
            Type = gameMapLayer.Type;
            Format = gameMapLayer.Format;
            MinZoom = gameMapLayer.MinZoom;
            MaxZoom = gameMapLayer.MaxZoom;
            DefaultZoom = gameMapLayer.DefaultZoom;
            IsDefault = gameMapLayer.IsDefault;
            TileSize = gameMapLayer.TileSize;
            FactorX = gameMapLayer.FactorX;
            FactorY = gameMapLayer.FactorY;
            Culture = gameMapLayer.Culture;
            LastChangeUtc = gameMapLayer.LastChangeUtc;

            var map = gameMapLayer.GameMap!;

            DownloadUri = basePath + $"/data/{map.GameId}/maps/{map.GameMapId}/{gameMapLayer.GameMapLayerId}.zip";
            PatternPng = basePath + ImagePathHelper.GetLayerPattern(false, gameMapLayer);
            PatternWebp = basePath + ImagePathHelper.GetLayerPattern(true, gameMapLayer);
            Pattern = basePath + ImagePathHelper.GetLayerPattern(useWebp, gameMapLayer);
        }

        public int GameMapLayerId { get; set; }

        public LayerType Type { get; set; }

        public LayerFormat Format { get; set; }

        public int MinZoom { get; set; }

        public int MaxZoom { get; set; }

        public int DefaultZoom { get; set; }

        public bool IsDefault { get; set; }

        public int TileSize { get; set; }

        public double FactorX { get; set; }

        public double FactorY { get; set; }

        public string? Culture { get; set; }

        public DateTime? LastChangeUtc { get; set; }

        public string? DownloadUri { get; set; }

        public string? PatternPng { get; set; }

        public string? PatternWebp { get; set; }

        public string? Pattern { get; set; }
    }
}