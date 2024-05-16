using GameMapStorageWebSite.Entities;

namespace GameMapStorageWebSite.Models.Json
{
    public class GameMarkerJson
    {
        public GameMarkerJson()
        {

        }

        public GameMarkerJson(GameMarker gameMarker)
        {
            GameMarkerId = gameMarker.GameMarkerId;
            EnglishTitle = gameMarker.EnglishTitle;
            Name = gameMarker.Name;
            Usage = gameMarker.Usage;
        }

        public int GameMarkerId { get; set; }

        public string? EnglishTitle { get; set; }

        public string? Name { get; set; }

        public MarkerUsage Usage { get; set; }
    }
}