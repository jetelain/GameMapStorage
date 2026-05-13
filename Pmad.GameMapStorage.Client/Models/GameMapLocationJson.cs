namespace Pmad.GameMapStorage.Client.Models
{
    public class GameMapLocationJson
    {
        public int GameMapLocationId { get; set; }

        public string? EnglishTitle { get; set; }

        public LocationType Type { get; set; }

        public double X { get; set; }

        public double Y { get; set; }

        public Guid? GameMapLocationGuid { get; set; }
    }
}
