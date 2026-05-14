namespace Pmad.GameMapStorage.Client.Models
{
    public class GameMarkerJson
    {
        public int GameMarkerId { get; init; }

        public string? EnglishTitle { get; init; }

        public string? Name { get; init; }

        public MarkerUsage Usage { get; init; }

        public string? ImagePng { get; init; }

        public string? ImageWebp { get; init; }

        public bool IsColorCompatible { get; init; }

        public DateTime? ImageLastChangeUtc { get; init; }

        public string? MilSymbolEquivalent { get; init; }

        public string? SteamWorkshopId { get; init; }
    }
}
