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
        }

        public int GameMarkerId { get; set; }

        public string? EnglishTitle { get; set; }

        public string? Name { get; set; }

        public MarkerUsage Usage { get; set; }

        public string? ImagePng { get; set; }

        public string? ImageWebp { get; set; }
    }
}