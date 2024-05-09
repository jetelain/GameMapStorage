using System.Globalization;
using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Services.Storages;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Drawing.Processing;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;

namespace GameMapStorageWebSite.Services
{
    public class ImageLayerService : IImageLayerService
    {
        private readonly IStorageService storageService;

        public ImageLayerService(IStorageService storageService)
        {
            this.storageService = storageService;
        }

        public async Task AddZoomLevelRangeFromImage(GameMapLayer layer, int minZoom, int maxZoom, Image fullImage)
        {
            await AddZoomLevelFromImage(layer, maxZoom, fullImage);

            for (var zoom = maxZoom - 1; zoom >= minZoom; zoom--)
            {
                var newSize = GetSizeAtZoom(layer, zoom);
                fullImage.Mutate(i => i.Resize(newSize, newSize));
                await AddZoomLevelFromImage(layer, zoom, fullImage);
            }
        }

        public async Task AddZoomLevelFromImage(GameMapLayer layer, int zoom, Image fullImage)
        {
            ValidateLayerAndImage(layer, zoom, fullImage);

            var count = MapUtils.GetTileRowCount(zoom);

            var tileSize = layer.TileSize;

            await Parallel.ForAsync(0, count, async ( x , _ ) =>
            {
                using var tile = new Image<Rgba32>(tileSize, tileSize);
                for (int y = 0; y < count; y++)
                {
                    tile.Mutate(p =>
                    {
                        p.Clear(Color.Transparent);
                        p.DrawImage(fullImage, new Point(-(x * tileSize), -(y * tileSize)), 1.0f);
                    });
                    await AddTile(layer, zoom, x, y, tile);
                }
            });

            await storageService.StoreAsync(GetBasePath(layer, zoom) + ".png", stream => fullImage.SaveAsPngAsync(stream));
        }

        private async Task AddTile(GameMapLayer layer, int z, int x, int y, Image<Rgba32> tile)
        {
            string targetBase = GetBasePath(layer, z, x, y);

            await storageService.StoreAsync(targetBase + ".png", stream => tile.SaveAsPngAsync(stream));

            if (layer.Format == LayerFormat.PngAndWebp)
            {
                await storageService.StoreAsync(targetBase + ".webp", stream => tile.SaveAsWebpAsync(stream, ImageHelper.WebpEncoder90));
            }
        }

        private static string GetBasePath(IGameMapLayerIdentifier layer, int z)
        {
            return Path.Combine(
                layer.GameId.ToString(NumberFormatInfo.InvariantInfo),
                "maps",
                layer.GameMapId.ToString(NumberFormatInfo.InvariantInfo),
                layer.GameMapLayerId.ToString(NumberFormatInfo.InvariantInfo),
                z.ToString(NumberFormatInfo.InvariantInfo));
        }

        private static string GetBasePath(IGameMapLayerIdentifier layer, int z, int x, int y)
        {
            return Path.Combine(GetBasePath(layer, z),
                x.ToString(NumberFormatInfo.InvariantInfo),
                y.ToString(NumberFormatInfo.InvariantInfo));
        }

        private void ValidateLayerAndImage(GameMapLayer layer, int zoom, Image fullImage)
        {
            ValidateLayer(layer);
            var expectedSize = GetSizeAtZoom(layer, zoom);
            if (fullImage.Width != expectedSize || fullImage.Height != expectedSize)
            {
                throw new ArgumentException($"Image size was expected to be '{expectedSize}x{expectedSize}', but it was '{fullImage.Width}x{fullImage.Height}'.");
            }
            if (layer.Format != LayerFormat.PngAndWebp)
            {
                throw new ArgumentException($"Layer format was expected to be '{LayerFormat.PngAndWebp}', but it was '{layer.Format}'.");
            }
            if ( zoom > layer.MaxZoom || zoom < layer.MinZoom)
            {
                throw new ArgumentException($"Layer zoom '{zoom}' is out of range. Should be between '{layer.MinZoom}' and '{layer.MaxZoom}' (inclusive).");
            }
        }

        private static void ValidateLayer(GameMapLayer layer)
        {
            if (layer.GameMap == null)
            {
                throw new ArgumentException("GameMap must be loaded.");
            }
            if (layer.Type == LayerType.Elevation)
            {
                throw new ArgumentException("Unsupported layer type.");
            }
        }

        public int GetSizeAtZoom(GameMapLayer layer, int zoom)
        {
            return MapUtils.GetTileRowCount(zoom) * layer.TileSize;
        }

        public async Task<IStorageFile> ReadTilePng(IGameMapLayerIdentifier layer, int zoom, int x, int y)
        {
            return (await storageService.GetAsync(GetBasePath(layer, zoom, x, y) + ".png"))
                ?? new LocalStorageFile("wwwroot/img/missing/tile.png");
        }

        public async Task<IStorageFile> ReadTileWebp(IGameMapLayerIdentifier layer, int zoom, int x, int y)
        {
            return (await storageService.GetAsync(GetBasePath(layer, zoom, x, y) + ".webp")) 
                ?? new LocalStorageFile("wwwroot/img/missing/tile.webp");
        }
    }
}
