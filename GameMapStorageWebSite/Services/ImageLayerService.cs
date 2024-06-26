﻿using System.Globalization;
using System.IO.Compression;
using System.Text.Json;
using System.Text.Json.Serialization;
using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Services.DataPackages;
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

        public async Task<IStorageFile> ReadTileSvg(IGameMapLayerIdentifier layer, int zoom, int x, int y)
        {
            return (await storageService.GetAsync(GetBasePath(layer, zoom, x, y) + ".svg"))
                ?? new LocalStorageFile("wwwroot/img/missing/tile.svg");
        }

        public async Task WriteArchiveTo(GameMapLayer layer, Stream target, LayerStorageMode mode)
        {
            var packPng = mode.HasFlag(LayerStorageMode.PngTiles) && layer.Format.HasPng();
            var packWebp = mode.HasFlag(LayerStorageMode.WebpTiles) && layer.Format.HasWebp();
            var packSource = mode.HasFlag(LayerStorageMode.SourcePng) && layer.Format.HasSourcePng();
            var packSvg = layer.Format.HasSvg();
            ValidateLayer(layer);
            using var zip = new ZipArchive(target, ZipArchiveMode.Create);

            await AddIndexJson(layer, zip);

            for (int zoom = layer.MinZoom; zoom <= layer.MaxZoom; zoom++)
            {
                if (packSource)
                {
                    await CreateEntry(zip, $"{zoom}.png", GetBasePath(layer, zoom) + ".png");
                }
                var count = MapUtils.GetTileRowCount(zoom);
                for (int x = 0; x < count; x++)
                {
                    for (int y = 0; y < count; y++)
                    {
                        if (packPng)
                        {
                            await CreateEntry(zip, $"{zoom}/{x}/{y}.png", GetBasePath(layer, zoom, x, y) + ".png");
                        }
                        if (packWebp)
                        {
                            await CreateEntry(zip, $"{zoom}/{x}/{y}.webp", GetBasePath(layer, zoom, x, y) + ".webp");
                        }
                        if (packSvg)
                        {
                            await CreateEntry(zip, $"{zoom}/{x}/{y}.svg", GetBasePath(layer, zoom, x, y) + ".svg");
                        }
                    }
                }
            }
        }

        private static async Task AddIndexJson(GameMapLayer layer, ZipArchive zip)
        {
            if ( layer.GameMap == null || layer.GameMap.Game == null)
            {
                throw new ArgumentException();
            }
            var index = new PackageIndex()
            {
                EnglishTitle = layer.GameMap.EnglishTitle,
                MapName = layer.GameMap.Name ?? string.Empty,
                OriginX = layer.GameMap.OriginX,
                OriginY = layer.GameMap.OriginY,
                SizeInMeters = layer.GameMap.SizeInMeters,
                GameName = layer.GameMap.Game.Name,
                Culture = layer.Culture ?? string.Empty,
                DefaultZoom = layer.DefaultZoom,
                FactorX = layer.FactorX,
                FactorY = layer.FactorY,
                Format = layer.Format,
                GameMapLayerGuid = layer.GameMapLayerGuid,
                MaxZoom = layer.MaxZoom,
                MinZoom = layer.MinZoom,
                TileSize = layer.TileSize,
                Type = layer.Type,
                Locations = layer.GameMap.Locations?.Select(l => new PackageLocation(l.EnglishTitle, l.Type, l.X, l.Y))?.ToArray()
            };
            var entry = zip.CreateEntry("index.json");
            using (var entryStream = entry.Open())
            {
                await JsonSerializer.SerializeAsync(entryStream, index, new JsonSerializerOptions() { Converters = { new JsonStringEnumConverter() } });
            }
        }

        private async Task CreateEntry(ZipArchive zip, string entryName, string storageFile)
        {
            var file = await storageService.GetAsync(storageFile);
            if (file != null)
            {
                var entry = zip.CreateEntry(entryName, CompressionLevel.NoCompression);
                using var targetStream = entry.Open();
                using var sourceStream = await file.OpenRead();
                await sourceStream.CopyToAsync(targetStream);
            }
        }

        public Task<IStorageFile> GetArchive(GameMapLayer layer, LayerStorageMode mode = LayerStorageMode.Full)
        {
            ValidateLayer(layer);
            return Task.FromResult<IStorageFile>(new MemoryStorageFile(s => WriteArchiveTo(layer, s, mode), layer.LastChangeUtc));
        }

        public async Task AddLayerImagesFromArchive(GameMapLayer layer, ZipArchive archive)
        {
            var hasPng = layer.Format.HasPng();
            var hasWebp = layer.Format.HasWebp();
            var hasSvg = layer.Format.HasSvg();
            var hasSourcePng = layer.Format.HasSourcePng();

            ValidateLayer(layer);
            for (int zoom = layer.MinZoom; zoom <= layer.MaxZoom; zoom++)
            {
                if (hasSourcePng)
                {
                    await UnPack(archive, $"{zoom}.png", GetBasePath(layer, zoom) + ".png");
                }
                var count = MapUtils.GetTileRowCount(zoom);
                for (int x = 0; x < count; x++)
                {
                    for (int y = 0; y < count; y++)
                    {
                        if (hasPng)
                        {
                            await UnPack(archive, $"{zoom}/{x}/{y}.png", GetBasePath(layer, zoom, x, y) + ".png");
                        }
                        if (hasWebp)
                        {
                            await UnPack(archive, $"{zoom}/{x}/{y}.webp", GetBasePath(layer, zoom, x, y) + ".webp");
                        }
                        if (hasSvg)
                        {
                            await UnPack(archive, $"{zoom}/{x}/{y}.svg", GetBasePath(layer, zoom, x, y) + ".svg");
                        }
                    }
                }
            }
        }

        private async Task UnPack(ZipArchive zip, string entryName, string storageFile)
        {
            var entry = zip.GetEntry(entryName);
            if ( entry != null)
            {
                using var source = entry.Open();
                await storageService.StoreAsync(storageFile, source.CopyToAsync);
            }
        }
    }
}
