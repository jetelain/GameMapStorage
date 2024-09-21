using System.Globalization;
using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Services.Storages;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;

namespace GameMapStorageWebSite.Services
{
    public class ImageMarkerService : IImageMarkerService
    {
        private static readonly Rgba32 White = new Rgba32(255,255,255,255);

        private readonly IStorageService storageService;
        private readonly SemaphoreSlim semaphoreSlim;

        public ImageMarkerService(IStorageService storageService)
        {
            this.storageService = storageService;
            this.semaphoreSlim = new SemaphoreSlim(1, 1);
        }

        public async Task<IStorageFile> ReadMarkerPng(IGameMarkerIdentifier marker)
        {
            return (await storageService.GetAsync(GetPath(marker) + ".png"))
                ?? new LocalStorageFile("wwwroot/img/missing/tile.png");
        }

        public async Task<IStorageFile> ReadMarkerPng(IGameMarkerIdentifier marker, Rgba32 color)
        {
            if (color == White)
            {
                return await ReadMarkerPng(marker);
            }
            return await ReadMarkerColor(marker, color, ".png");
        }

        private async Task<IStorageFile> ReadMarkerColor(IGameMarkerIdentifier marker, Rgba32 color, string extension)
        {
            var pngFile = await ReadMarkerPng(marker);
            var file = GetPath(marker, color) + extension;
            var exising = await storageService.GetAsync(file);
            if (exising == null || exising.LastModified < pngFile.LastModified)
            {
                await semaphoreSlim.WaitAsync();
                try
                {
                    await Generate(marker, color, pngFile);
                }
                finally
                {
                    semaphoreSlim.Release();
                }
                exising = await storageService.GetAsync(file);
            }
            return exising ?? new LocalStorageFile("wwwroot/img/missing/tile" + extension);
        }

        private async Task Generate(IGameMarkerIdentifier marker, Rgba32 color, IStorageFile pngFile)
        {
            using var img = await LoadMarkerImage(marker, pngFile);

            for (int x = 0; x < img.Width; ++x)
            {
                for (int y = 0; y < img.Height; ++y)
                {
                    var pixel = img[x, y];

                    img[x, y] = new Rgba32(
                        (byte)((int)pixel.R * (int)color.R / 255),
                        (byte)((int)pixel.G * (int)color.G / 255),
                        (byte)((int)pixel.B * (int)color.B / 255),
                        pixel.A);
                }
            }

            await SaveImage(img, GetPath(marker, color));
        }

        private async Task<Image<Rgba32>> LoadMarkerImage(IGameMarkerIdentifier marker, IStorageFile pngFile)
        {
            using var stream = await pngFile.OpenRead();
            return await Image.LoadAsync<Rgba32>(stream);
        }

        public async Task<IStorageFile> ReadMarkerWebp(IGameMarkerIdentifier marker)
        {
            return (await storageService.GetAsync(GetPath(marker) + ".webp"))
                ?? new LocalStorageFile("wwwroot/img/missing/tile.webp");
        }

        public async Task<IStorageFile> ReadMarkerWebp(IGameMarkerIdentifier marker, Rgba32 color)
        {
            if (color == White)
            {
                return await ReadMarkerWebp(marker);
            }
            return await ReadMarkerColor(marker, color, ".webp");
        }

        public async Task SetMarkerImage(IGameMarkerIdentifier marker, Image image)
        {
            await SaveImage(image, GetPath(marker));
        }

        private async Task SaveImage(Image image, string basePath)
        {
            await storageService.StoreAsync(basePath + ".png", stream => image.SaveAsPngAsync(stream));
            await storageService.StoreAsync(basePath + ".webp", stream => image.SaveAsWebpAsync(stream, ImageHelper.WebpEncoder90));
        }

        private string GetPath(IGameMarkerIdentifier marker)
        {
            return Path.Combine(
                marker.GameId.ToString(NumberFormatInfo.InvariantInfo),
                "markers",
                marker.GameMarkerId.ToString(NumberFormatInfo.InvariantInfo));
        }

        private string GetPath(IGameMarkerIdentifier marker, Rgba32 color)
        {
            return Path.Combine(
                marker.GameId.ToString(NumberFormatInfo.InvariantInfo),
                "markers",
                color.ToHex().ToLowerInvariant(),
                marker.GameMarkerId.ToString(NumberFormatInfo.InvariantInfo));
        }


    }
}
