using GameMapStorageWebSite.Entities;
using SixLabors.ImageSharp;

namespace GameMapStorageWebSite.Services
{
    public interface IImageLayerService
    {
        Task AddZoomLevelRangeFromImage(GameMapLayer layer, int minZoom, int maxZoom, Image fullImage);

        Task AddZoomLevelFromImage(GameMapLayer layer, int zoom, Image fullImage);

        Task ReadTilePng(IGameMapLayerIdentifier layer, int zoom, int x, int y, Func<Stream, Task> read);

        Task ReadTileWebp(IGameMapLayerIdentifier layer, int zoom, int x, int y, Func<Stream, Task> read);

        int GetSizeAtZoom(GameMapLayer layer, int zoom);
    }
}