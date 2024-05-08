using GameMapStorageWebSite.Entities;

namespace GameMapStorageWebSite.Services.DataPackages
{
    public sealed class PackageLocation
    {
        public PackageLocation(string englishTitle, LocationType type, double x, double y)
        {
            EnglishTitle = englishTitle;
            Type = type;
            X = x;
            Y = y;
        }

        public string EnglishTitle { get; }

        public LocationType Type { get; }

        public double X { get; }

        public double Y { get; }
    }
}