using System.Globalization;
using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Services.Storages;
using SixLabors.ImageSharp;

namespace GameMapStorageWebSite.Services
{
    public class ThumbnailService : IThumbnailService
    {
        private const int WantedWidth = 640;
        private const int WantedHeight = 360;

        private readonly IStorageService storageService;

        public ThumbnailService(IStorageService storageService)
        {
            this.storageService = storageService;
        }

        private string GetLogoPath(IGameIdentifier layer)
        {
            return Path.Combine(
                layer.GameId.ToString(NumberFormatInfo.InvariantInfo),
                "logo");
        }

        private string GetThumbnailPath(IGameMapIdentifier layer)
        {
            return Path.Combine(
                layer.GameId.ToString(NumberFormatInfo.InvariantInfo),
                "maps",
                layer.GameMapId.ToString(NumberFormatInfo.InvariantInfo),
                "thumbnail");
        }

        public async Task<IStorageFile> ReadGameLogoPng(IGameIdentifier game)
        {
            return (await storageService.GetAsync(GetLogoPath(game) + ".png")) 
                ?? new LocalStorageFile("wwwroot/img/missing/logo.png");
        }

        public async Task<IStorageFile> ReadGameLogoWebp(IGameIdentifier game)
        {
            return (await storageService.GetAsync(GetLogoPath(game) + ".webp")) 
                ?? new LocalStorageFile("wwwroot/img/missing/logo.webp");
        }

        public async Task<IStorageFile> ReadMapThumbnailPng(IGameMapIdentifier map)
        {
            return (await storageService.GetAsync(GetThumbnailPath(map) + ".png")) 
                ?? new LocalStorageFile("wwwroot/img/missing/thumbnail.png");
        }
        public async Task<IStorageFile> ReadMapThumbnailWebp(IGameMapIdentifier map)
        {
            return (await storageService.GetAsync(GetThumbnailPath(map) + ".webp")) 
                ?? new LocalStorageFile("wwwroot/img/missing/thumbnail.webp");
        }

        public Task SetMapThumbnail(IGameMapIdentifier layer, Image image)
        {
            return Set(GetThumbnailPath(layer), image);
        }

        public Task SetGameLogo(IGameIdentifier layer, Image image)
        {
            return Set(GetLogoPath(layer), image);
        }

        private async Task Set(string basePath, Image sourceImage)
        {
            using var image = ImageHelper.Fit(sourceImage, WantedWidth, WantedHeight);
            await storageService.StoreAsync(basePath + ".png", stream => image.SaveAsPngAsync(stream));
            await storageService.StoreAsync(basePath + ".webp", stream => image.SaveAsWebpAsync(stream, ImageHelper.WebpEncoder90));
        }


    }
}
