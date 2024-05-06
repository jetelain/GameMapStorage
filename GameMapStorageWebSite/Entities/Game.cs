namespace GameMapStorageWebSite.Entities
{
    public class Game : IGameIdentifier
    {
        public int GameId { get; set; }

        public required string EnglishTitle { get; set; }

        public required string Name { get; set; }

        public required string Attribution { get; set; }

        public string? OfficialSiteUri { get; set; }

        public string? SteamAppId { get; set; }

        public DateTime? LastChangeUtc { get; set; }

        public List<GameColor>? Colors { get; set; }

        public List<GameMarker>? GameMarkers { get; set; }

        public List<GameMap>? Maps { get; set; }
    }
}
