using System.Globalization;
using System.Net;
using System.Text.RegularExpressions;
using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Services;
using Microsoft.EntityFrameworkCore;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Memory;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;

namespace GameMapStorageWebSite.Works.MigrateArma3Maps
{
    public class MigrateArma3MapWorker : LayerWorkerBase, IWorker<MigrateArma3MapWorkData>
    {
        private static readonly Regex MgrsCrsRegex = new Regex(@"MGRS_CRS\(([\-0-9\.]+), ([\-0-9\.]+), [\-0-9\.]+\)");
        private static readonly Regex AliasesRegex = new Regex(@"^Arma3Map\.Maps\.([a-z0-9_]+) =$");
        private static readonly Regex WorkshopRegex = new Regex(@"^https\://steamcommunity.com/.*/filedetails/\?id=(.*)$");

        private readonly IThumbnailService thumbnailService;
        private readonly IImageLayerService imageLayerService;
        private readonly IHttpClientFactory httpClientFactory;
        private readonly ILogger<MigrateArma3MapWorker> logger;
        private HttpClient client;

        public MigrateArma3MapWorker(GameMapStorageContext context, IThumbnailService thumbnailService, IImageLayerService imageLayerService, IHttpClientFactory httpClientFactory, ILogger<MigrateArma3MapWorker> logger)
            : base(context)
        {
            this.thumbnailService = thumbnailService;
            this.imageLayerService = imageLayerService;
            this.httpClientFactory = httpClientFactory;
            this.logger = logger;
            this.client = httpClientFactory.CreateClient("CDN");
        }

        public async Task Process(MigrateArma3MapWorkData taskData, BackgroundWork task)
        {
            var game = await context.Games.FirstOrDefaultAsync(g => g.Name == "arma3");
            if (game == null)
            {
                throw new ApplicationException("arma3 was not found.");
            }

            var layer = await GetOrCreateLayer(taskData, game);

            // Link task to layer for easy tracking
            task.GameMapLayerId = layer.GameMapLayerId;
            task.GameMapLayer = layer;

            await ImportThumbnail(taskData, layer.GameMap!);

            await ImportLayers(taskData, layer);

            await MarkLayerAsReady(layer);
        }

        private async Task<GameMapLayer> GetOrCreateLayer(MigrateArma3MapWorkData taskData, Game game)
        {
            var existingLayer = await context.GameMapLayers
                .Include(m => m.GameMap)
                .Include(m => m.GameMap!.Game)
                .Where(g => g.GameMap!.Name == taskData.MapInfos.worldName && g.IsDefault)
                .FirstOrDefaultAsync();
            if (existingLayer != null)
            {
                await MarkLayerAsProcessing(existingLayer);
                return existingLayer;
            }

            var map = PrepareMap(taskData, game);
            var layer = PrepareLayer(taskData, map);
            await ExtractJsInfos(taskData, map, layer);
            context.Add(layer);
            await context.SaveChangesAsync();
            return layer;
        }

        private async Task ImportLayers(MigrateArma3MapWorkData task, GameMapLayer layer)
        {
            for (int z = task.MapInfos.minZoom; z <= task.MapInfos.maxZoom; z++)
            {
                using var image = await ReconstructFullImage(task, layer, z);
                await imageLayerService.AddZoomLevelFromImage(layer, z, image);
            }
        }

        private async Task ImportThumbnail(MigrateArma3MapWorkData task, GameMap map)
        {
            if (!string.IsNullOrEmpty(task.MapInfos.preview))
            {
                try
                {
                    using var stream = await OpenStream(task.MapInfos.preview);
                    using var image = await Image.LoadAsync(stream);
                    await thumbnailService.SetMapThumbnail(map, image);
                }
                catch (HttpRequestException)
                {
                    // Ignore if file is no more available
                }
                catch (FileNotFoundException)
                {
                    // Ignore if file is not found
                }
                catch(UnknownImageFormatException)
                {
                    // Ignore bad image format
                }
            }
        }

        private async Task<Image<Rgba32>> ReconstructFullImage(MigrateArma3MapWorkData task, GameMapLayer layer, int z)
        {
            var configuration = Configuration.Default.Clone();
            configuration.MemoryAllocator = MemoryAllocator.Create(new MemoryAllocatorOptions()
            {
                MaximumPoolSizeMegabytes = 8192
            });

            var size = imageLayerService.GetSizeAtZoom(layer, z);
            var image = new Image<Rgba32>(configuration, size, size);
            var count = MapUtils.GetTileRowCount(z);
            var tileSize = layer.TileSize;
            for (int x = 0; x < count; x++)
            {
                for (int y = 0; y < count; y++)
                {
                    using var tile = await ReadImageAsync(task.BaseUri +
                        task.MapInfos.tilePattern?
                        .Replace("{z}", z.ToString(NumberFormatInfo.InvariantInfo))
                        .Replace("{x}", x.ToString(NumberFormatInfo.InvariantInfo))
                        .Replace("{y}", y.ToString(NumberFormatInfo.InvariantInfo)));

                    image.Mutate(p =>
                    {
                        p.DrawImage(tile, new Point((x * tileSize), (y * tileSize)), 1.0f);
                    });
                }
            }
            return image;
        }

        private async Task<Image> ReadImageAsync(string uri, int attempt = 1)
        {
            try
            {
                using var tileStream = await OpenStream(uri);
                return await Image.LoadAsync(tileStream);
            }
            catch(HttpIOException)
            {
                if (attempt >= 10)
                {
                    throw;
                }
                await Task.Delay(Random.Shared.Next(2000, 10000));
                client = httpClientFactory.CreateClient("CDN");
                return await ReadImageAsync(uri, attempt+1);
            }
        }

        private static GameMapLayer PrepareLayer(MigrateArma3MapWorkData task, GameMap map)
        {
            var layer = new GameMapLayer()
            {
                Culture = string.Empty,
                IsDefault = true,
                DefaultZoom = task.MapInfos.defaultZoom,
                MaxZoom = task.MapInfos.maxZoom,
                MinZoom = task.MapInfos.minZoom,
                Format = LayerFormat.PngAndWebp,
                GameMap = map,
                LastChangeUtc = DateTime.UtcNow,
                State = LayerState.Processing,
                Type = LayerType.Topographic,
                TileSize = task.MapInfos.tileSize
            };
            map.Layers = new List<GameMapLayer>() { layer };
            return layer;
        }

        private GameMap PrepareMap(MigrateArma3MapWorkData task, Game game)
        {
            var map = new GameMap()
            {
                EnglishTitle = task.MapInfos.title ?? "(unknown)",
                AppendAttribution = (task.MapInfos.attribution ?? "(unknown)").Replace("&copy;", "©").Replace(game.Attribution, "").Trim(' ', ','),
                Game = game,
                GameId = game.GameId,
                LastChangeUtc = DateTime.UtcNow,
                SizeInMeters = task.MapInfos.worldSize ?? 0,
                Name = task.MapInfos.worldName,
                SteamWorkshopId = GetSteamWorkshopId(task.MapInfos.steamWorkshop),
                OfficialSiteUri = task.MapInfos.dlc,
            };
            if (task.MapInfos.cities != null)
            {
                map.Locations = task.MapInfos.cities.Select(c => new GameMapLocation() { EnglishTitle = c.name ?? "(unknown)", X = c.x, Y = c.y, Type = LocationType.City, GameMap = map }).ToList();
                map.CitiesCount = task.MapInfos.cities.Count;
            }

            return map;
        }

        private async Task ExtractJsInfos(MigrateArma3MapWorkData task, GameMap map, GameMapLayer layer)
        {
            var jsLocation = task.BaseUri + task.MapInfos.tilePattern?.Replace("/{z}/{x}/{y}.png", ".js");
            using (var stream = await OpenStream(jsLocation))
            {
                var content = new StreamReader(stream).ReadToEnd();
                var match = MgrsCrsRegex.Match(content);
                if (!match.Success)
                {
                    throw new ApplicationException($"MGRS_CRS was not found in '{jsLocation}'.");
                }
                layer.FactorX = double.Parse(match.Groups[1].Value, NumberFormatInfo.InvariantInfo);
                layer.FactorY = double.Parse(match.Groups[2].Value, NumberFormatInfo.InvariantInfo);

                map.Aliases = AliasesRegex.Matches(content).Select(m => m.Groups[1].Value).ToArray();
            }
        }

        private async Task<Stream> OpenStream(string jsLocation, int attempt = 1)
        {
            if (jsLocation.StartsWith("https://"))
            {
                try
                {
                    await Task.Delay(Random.Shared.Next(5, 50));
                    return await client.GetStreamAsync(jsLocation);
                }
                catch(Exception ex)
                {
                    logger.LogWarning("Fetching '{File}' failed: {Message}", jsLocation, ex.Message);
                    if (ex is HttpRequestException http 
                        && http.StatusCode != null 
                        && http.StatusCode != HttpStatusCode.TooManyRequests
                        && http.StatusCode != HttpStatusCode.ServiceUnavailable)
                    {
                        throw;
                    }
                    if (attempt > 10)
                    {
                        throw;
                    }
                    await Task.Delay(Random.Shared.Next(2000, 10000));
                    client = httpClientFactory.CreateClient("CDN");
                    return await OpenStream(jsLocation, attempt + 1);
                }
            }
            return File.OpenRead(jsLocation);
        }

        private string? GetSteamWorkshopId(string? steamWorkshop)
        {
            if (!string.IsNullOrEmpty(steamWorkshop))
            {
                var macth = WorkshopRegex.Match(steamWorkshop);
                if (macth.Success)
                {
                    return macth.Groups[1].Value;
                }
            }
            return null;
        }
    }
}
