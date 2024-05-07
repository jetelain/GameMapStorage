using System.Globalization;
using GameMapStorageWebSite.Entities;
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

        public async Task ReadGameLogoPng(IGameIdentifier game, Func<Stream, Task> read)
        {
            if (!await storageService.TryReadAsync(GetLogoPath(game) + ".png", read))
            {
                using var source = File.OpenRead("wwwroot/img/missing/logo.png");
                await read(source);
            }
        }
        public async Task ReadGameLogoWebp(IGameIdentifier game, Func<Stream, Task> read)
        {
            if (!await storageService.TryReadAsync(GetLogoPath(game) + ".webp", read))
            {
                using var source = File.OpenRead("wwwroot/img/missing/logo.webp");
                await read(source);
            }
        }


        public async Task ReadMapThumbnailPng(IGameMapIdentifier map, Func<Stream, Task> read)
        {
            if (!await storageService.TryReadAsync(GetThumbnailPath(map) + ".png", read))
            {
                using var source = File.OpenRead("wwwroot/img/missing/thumbnail.png");
                await read(source);
            }
        }
        public async Task ReadMapThumbnailWebp(IGameMapIdentifier map, Func<Stream, Task> read)
        {
            if (!await storageService.TryReadAsync(GetThumbnailPath(map) + ".webp", read))
            {
                using var source = File.OpenRead("wwwroot/img/missing/thumbnail.webp");
                await read(source);
            }
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
