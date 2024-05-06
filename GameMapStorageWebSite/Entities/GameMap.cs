namespace GameMapStorageWebSite.Entities
{
    public class GameMap : IGameMapIdentifier
    {
        public int GameMapId { get; set; }

        public required string EnglishTitle { get; set; }

        public string? AppendAttribution { get; set; }

        public string? SteamWorkshopId { get; set; }

        public string? OfficialSiteUri { get; set; }

        public double SizeInMeters { get; set; }

        public int CitiesCount { get; set; } // Locations.Where(l => l.Type == LocationType.Type).Count()

        /// <summary>
        /// 
        /// </summary>
        public string? Name { get; set; }

        public string[]? Aliases { get; set; }

        public DateTime? LastChangeUtc { get; set; }

        // FK to Game
        public int GameId { get; set; }

        public Game? Game { get; set; }

        public List<GameMapLayer>? Layers { get; set; }
        public List<GameMapLocation>? Locations { get; set; }


    }
}