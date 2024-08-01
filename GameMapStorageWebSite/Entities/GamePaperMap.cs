namespace GameMapStorageWebSite.Entities
{
    public class GamePaperMap : IGameMapIdentifier, IWithTimestamp
    {
        public int GamePaperMapId { get; set; }

        public PaperFileFormat FileFormat { get; set; }

        public PaperSize PaperSize { get; set; }

        public required string Name { get; set; }

        public int FileSize { get; set; }

        public int Scale { get; set; }

        public List<GamePaperMapPage>? Pages { get; set; }

        public DateTime? LastChangeUtc { get; set; }

        // FK to GameMap
        public int GameMapId { get; set; }

        public GameMap? GameMap { get; set; }

        int IGameIdentifier.GameId => GameMap!.GameId;
    }
}
