namespace GameMapStorageWebSite.Entities
{
    public class GameMapLayer : IGameMapLayerIdentifier, IWithTimestamp
    {
        public int GameMapLayerId { get; set; }

        public LayerType Type { get; set; }

        public LayerFormat Format { get; set; }
        public LayerState State { get; set; }

        public int MinZoom { get; set; }

        public int MaxZoom { get; set; }

        public int DefaultZoom { get; set; }

        public bool IsDefault { get; set; }

        public int TileSize { get; set; }

        public double FactorX { get; set; }

        public double FactorY { get; set; }

        public string? Culture { get; set; }

        public DateTime? LastChangeUtc { get; set; }

        // FK to GameMap
        public int GameMapId { get; set; }

        public GameMap? GameMap { get; set; }

        int IGameIdentifier.GameId => GameMap!.GameId;
    }
}
