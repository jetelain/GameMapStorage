using GameMapStorageWebSite.Entities;

namespace GameMapStorageWebSite.Models.Json
{
    public class GameMapLocationJson
    {
        public GameMapLocationJson()
        {

        }

        public GameMapLocationJson(GameMapLocation gameMapLocation)
        {
            GameMapLocationId = gameMapLocation.GameMapLocationId;
            EnglishTitle = gameMapLocation.EnglishTitle;
            Type = gameMapLocation.Type;
            X = gameMapLocation.X;
            Y = gameMapLocation.Y;
            GameMapLocationGuid = gameMapLocation.GameMapLocationGuid;
        }

        public int GameMapLocationId { get; set; }

        public string? EnglishTitle { get; set; }

        public LocationType Type { get; set; }

        public double X { get; set; }

        public double Y { get; set; }

        public Guid? GameMapLocationGuid { get; set; }
    }
}