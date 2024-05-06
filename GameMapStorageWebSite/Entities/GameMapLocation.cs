namespace GameMapStorageWebSite.Entities
{
    public class GameMapLocation
    {
        public int GameMapLocationId { get; set; }

        public required string EnglishTitle { get; set; }

        public LocationType Type { get; set; }

        public double X { get; set; }

        public double Y { get; set; }


        // FK to GameMap
        public int GameMapId { get; set; }

        public GameMap? GameMap { get; set; }

    }
}
