using System.Text.Json.Serialization;
using GameMapStorageWebSite.Entities;

namespace GameMapStorageWebSite.Models.Json
{
    public class GameMapLayerJson : IWithTimestamp
    {
        public static List<GameMapLayerJson> CreateList(IEnumerable<GameMapLayer>? layers, IDataPathBuilder pathBuilder)
        {
            if (layers == null)
            {
                return new List<GameMapLayerJson>();
            }
            return layers.Where(l => l.State == LayerState.Ready).Select(l => new GameMapLayerJson(l, pathBuilder)).ToList();
        }

        public GameMapLayerJson()
        {

        }

        public GameMapLayerJson(GameMapLayer gameMapLayer, IDataPathBuilder pathBuilder)
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
            DataLastChangeUtc = gameMapLayer.DataLastChangeUtc;
            GameMapLayerGuid = gameMapLayer.GameMapLayerGuid;

            DownloadUri = pathBuilder.GetDownloadUri(gameMapLayer);
            if (Format.HasPng())
            {
                PatternPng = pathBuilder.GetLayerPattern(gameMapLayer, "png");
            }
            if (Format.HasWebp())
            {
                PatternWebp = pathBuilder.GetLayerPattern(gameMapLayer, "webp");
            }
            if (Format.HasSvg())
            {
                PatternSvg = pathBuilder.GetLayerPattern(gameMapLayer, "svg");
            }
            Pattern = pathBuilder.GetLayerPattern(gameMapLayer);
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

        public DateTime? DataLastChangeUtc { get; set; }

        public Guid? GameMapLayerGuid { get; set; }

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? DownloadUri { get; set; }

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? PatternPng { get; set; }

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? PatternWebp { get; set; }

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? PatternSvg { get; }

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? Pattern { get; set; }
    }
}