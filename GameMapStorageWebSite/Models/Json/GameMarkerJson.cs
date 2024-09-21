using Elfie.Serialization;
using GameMapStorageWebSite.Entities;

namespace GameMapStorageWebSite.Models.Json
{
    public class GameMarkerJson
    {
        public GameMarkerJson()
        {

        }

        public GameMarkerJson(GameMarker gameMarker, IDataPathBuilder pathBuilder)
        {
            GameMarkerId = gameMarker.GameMarkerId;
            EnglishTitle = gameMarker.EnglishTitle;
            Name = gameMarker.Name;
            Usage = gameMarker.Usage;
            ImagePng = pathBuilder.GetMarker(false, gameMarker);
            ImageWebp = pathBuilder.GetMarker(true, gameMarker);
            IsColorCompatible = gameMarker.IsColorCompatible;
            ImageLastChangeUtc = gameMarker.ImageLastChangeUtc;
            MilSymbolEquivalent = gameMarker.MilSymbolEquivalent;
            SteamWorkshopId = gameMarker.SteamWorkshopId;
        }

        public int GameMarkerId { get; set; }

        public string? EnglishTitle { get; set; }

        public string? Name { get; set; }

        public MarkerUsage Usage { get; set; }

        public string? ImagePng { get; set; }

        public string? ImageWebp { get; set; }

        public bool IsColorCompatible { get; set; }

        public DateTime? ImageLastChangeUtc { get; set; }

        public string? MilSymbolEquivalent { get; set; }

        public string? SteamWorkshopId { get; set; }
    }
}