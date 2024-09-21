using System.ComponentModel.DataAnnotations;

namespace GameMapStorageWebSite.Entities
{
    public class GameMarker : IGameMarkerIdentifier
    {
        public int GameMarkerId { get; set; }

        public required string EnglishTitle { get; set; }

        public required string Name { get; set; }

        public MarkerUsage Usage { get; set; }

        public bool IsColorCompatible { get; set; }

        [Display(Name = "APP-6D Equivalent Code")]
        public string? MilSymbolEquivalent { get; set; }

        [Display(Name = "Steam Workshop Id")]
        public string? SteamWorkshopId { get; set; }

        public DateTime? ImageLastChangeUtc { get; set; }

        // FK to Game
        public int GameId { get; set; }

        public Game? Game { get; set; }
    }
}
