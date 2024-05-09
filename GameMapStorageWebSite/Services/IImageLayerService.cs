using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Services.Storages;
using SixLabors.ImageSharp;

namespace GameMapStorageWebSite.Services
{
    public interface IImageLayerService
    {
        Task AddZoomLevelRangeFromImage(GameMapLayer layer, int minZoom, int maxZoom, Image fullImage);

        Task AddZoomLevelFromImage(GameMapLayer layer, int zoom, Image fullImage);

        Task<IStorageFile> ReadTilePng(IGameMapLayerIdentifier layer, int zoom, int x, int y);

        Task<IStorageFile> ReadTileWebp(IGameMapLayerIdentifier layer, int zoom, int x, int y);

        int GetSizeAtZoom(GameMapLayer layer, int zoom);
    }
}