using System.ComponentModel.DataAnnotations;

namespace GameMapStorageWebSite.Entities
{
    public class Game : IGameIdentifier
    {
        public int GameId { get; set; }

        [Display(Name = "Title (English)")] 
        public required string EnglishTitle { get; set; }

        [Display(Name = "Identifier (for URLs)")] 
        public required string Name { get; set; }

        [Display(Name = "Attribution")]
        public required string Attribution { get; set; }

        [Display(Name = "Web site")]
        public string? OfficialSiteUri { get; set; }

        [Display(Name = "Steam App Id")]
        public string? SteamAppId { get; set; }

        public DateTime? LastChangeUtc { get; set; }

        public List<GameColor>? Colors { get; set; }

        public List<GameMarker>? GameMarkers { get; set; }

        public List<GameMap>? Maps { get; set; }
    }
}
