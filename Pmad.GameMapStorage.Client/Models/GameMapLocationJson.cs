namespace Pmad.GameMapStorage.Client.Models
{
    public class GameMapLocationJson
    {
        public int GameMapLocationId { get; init; }

        public string? EnglishTitle { get; init; }

        public LocationType Type { get; init; }

        public double X { get; init; }

        public double Y { get; init; }

        public Guid? GameMapLocationGuid { get; init; }
    }
}
