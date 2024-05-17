using System.ComponentModel.DataAnnotations;

namespace GameMapStorageWebSite.Entities
{
    public class GameMap : IGameMapIdentifier, IWithTimestamp
    {
        public int GameMapId { get; set; }

        [Display(Name = "Title (English)")]
        public required string EnglishTitle { get; set; }
        
        [Display(Name = "Attribution")]
        public string? AppendAttribution { get; set; }

        [Display(Name = "Steam Workshop Id")]
        public string? SteamWorkshopId { get; set; }

        [Display(Name = "Web site")]
        public string? OfficialSiteUri { get; set; }

        [Display(Name = "Size in meters")]
        public double SizeInMeters { get; set; }

        [Display(Name = "Cities")]
        public int CitiesCount { get; set; } // Locations.Where(l => l.Type == LocationType.Type).Count()

        [Display(Name = "Game specific identifier")]
        public string? Name { get; set; }

        [Display(Name = "Aliases")]
        public string[]? Aliases { get; set; }

        public DateTime? LastChangeUtc { get; set; }

        // FK to Game
        public int GameId { get; set; }

        public Game? Game { get; set; }

        public List<GameMapLayer>? Layers { get; set; }
        public List<GameMapLocation>? Locations { get; set; }


    }
}