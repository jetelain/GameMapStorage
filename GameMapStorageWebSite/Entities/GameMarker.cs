namespace GameMapStorageWebSite.Entities
{
    public class GameMarker : IGameMarkerIdentifier
    {
        public int GameMarkerId { get; set; }

        public required string EnglishTitle { get; set; }

        public required string Name { get; set; }

        public MarkerUsage Usage { get; set; }

        // FK to Game
        public int GameId { get; set; }

        public Game? Game { get; set; }
    }
}
