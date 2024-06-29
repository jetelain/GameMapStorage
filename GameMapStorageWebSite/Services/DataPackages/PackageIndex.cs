using GameMapStorageWebSite.Entities;

namespace GameMapStorageWebSite.Services.DataPackages
{
    public sealed class PackageIndex
    {
        public required string GameName { get; set; }
        public required string MapName { get; set; }
        public double SizeInMeters { get; set; }
        public required string Culture { get; set; }
        public LayerType Type { get; set; }
        public required string EnglishTitle { get; set; }
        public PackageImage[]? Images { get; set; }
        public LayerFormat? Format { get; set; }
        public int DefaultZoom { get; set; }
        public double FactorX { get; set; }
        public double FactorY { get; set; }
        public int TileSize { get; set; }
        public PackageLocation[]? Locations { get; set; }
        public double OriginX { get; set; }
        public double OriginY { get; set; }
        public int? MinZoom { get; set; }
        public int? MaxZoom { get; set; }
        public Guid? GameMapLayerGuid { get; set; }

        public int GetMaxZoom()
        {
            return MaxZoom ?? Images?.Max(i => i.MaxZoom) ?? 0;
        }
        public int GetMinZoom()
        {
            return MinZoom ?? Images?.Min(i => i.MinZoom) ?? 0;
        }
    }
}