using System.IO.Compression;
using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Services.Storages;
using Pmad.HugeImages;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;

namespace GameMapStorageWebSite.Services
{
    public interface IImageLayerService
    {
        Task AddZoomLevelRangeFromImage(GameMapLayer layer, int minZoom, int maxZoom, Image fullImage);

        Task AddZoomLevelRangeFromImage(GameMapLayer layer, int minZoom, int maxZoom, HugeImage<Rgb24> fullImage);

        Task AddZoomLevelFromImage(GameMapLayer layer, int zoom, Image fullImage, bool keepSourceImage = true);

        Task<IStorageFile> ReadTilePng(IGameMapLayerIdentifier layer, int zoom, int x, int y);

        Task<IStorageFile> ReadTileWebp(IGameMapLayerIdentifier layer, int zoom, int x, int y);

        Task<IStorageFile> ReadTileSvg(IGameMapLayerIdentifier layer, int zoom, int x, int y);

        int GetSizeAtZoom(GameMapLayer layer, int zoom);

        Task<IStorageFile> GetArchive(GameMapLayer layer, LayerStorageMode mode = LayerStorageMode.Full);

        Task AddLayerImagesFromArchive(GameMapLayer layer, ZipArchive archive);
    }
}