using System.Text.Json;
using System.Text.Json.Serialization;
using GameMapStorageWebSite;
using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Models.Json;
using GameMapStorageWebSite.Services.Mirroring;
using GameMapStorageWebSite.Services.Storages;
using GameMapStorageWebSite.Works;
using GameMapStorageWebSite.Works.MirrorLayers;
using Microsoft.EntityFrameworkCore;

namespace GameMapStorageStaticMirrorBuilder
{
    internal class StaticMirrorWorker : IProgress<string>
    {
        private readonly GameMapStorageContext context;
        private readonly IMirrorService mirrorService;
        private readonly IWorker<MirrorLayerWorkData> worker;
        private readonly IStorageService storage;
        private readonly JsonSerializerOptions jsonOptions = new JsonSerializerOptions() { Converters = { new JsonStringEnumConverter() }, PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

        public StaticMirrorWorker(GameMapStorageContext context, IMirrorService mirrorService, IWorker<MirrorLayerWorkData> worker, IStorageService storage)
        {
            this.context = context;
            this.mirrorService = mirrorService;
            this.worker = worker;
            this.storage = storage;
        }

        public async Task Do()
        {
            Console.WriteLine($"Migrate database");
            await context.Database.MigrateAsync();

            Console.WriteLine($"Synchronize database");
            var report = await mirrorService.UpdateMirror(this);

            await SaveJson();

            foreach (var work in await context.Works.Where(w => w.Type == BackgroundWorkType.MirrorLayer).ToListAsync())
            {
                Console.WriteLine($"Mirror Layer #{work.GameMapLayerId}");
                var data = JsonSerializer.Deserialize<MirrorLayerWorkData>(work.Data)!;
                await worker.Process(data, work, this);

                context.Remove(work);
                await context.SaveChangesAsync();
            }

            await SaveJson();

            await context.SaveChangesAsync();
        }

        private async Task SaveJson()
        {
            var pathBuilder = new StaticMirrorPathBuilder();

            await storage.StoreAsync("index.json", async stream => await JsonSerializer.SerializeAsync(stream, await context.Games.Select(g => new GameJson(g, pathBuilder)).ToListAsync(), jsonOptions));

            foreach (var game in await context.Games.ToListAsync())
            {
                var gameJson = new GameJson(game, pathBuilder);
                gameJson.Colors = (await context.GameColors.Where(c => c.GameId == game.GameId).ToListAsync()).Select(c => new GameColorJson(c)).ToList();
                gameJson.Markers = (await context.GameMarkers.Where(c => c.GameId == game.GameId).ToListAsync()).Select(c => new GameMarkerJson(c, pathBuilder)).ToList();


                var maps = await context.GameMaps.Where(c => c.GameId == game.GameId).ToListAsync();
                await context.GameMapLayers.Where(l => l.GameMap!.GameId == game.GameId && l.State == LayerState.Ready).ToListAsync();
                var mapsJson = maps.Select(m => new GameMapJson(m, pathBuilder) { Layers = GameMapLayerJson.CreateList(m.Layers, pathBuilder) }).ToList();

                await storage.StoreAsync($"{game.GameId}/index.json", async stream => await JsonSerializer.SerializeAsync(stream, gameJson, jsonOptions));
                await storage.StoreAsync($"{game.GameId}/maps/index.json", async stream => await JsonSerializer.SerializeAsync(stream, mapsJson, jsonOptions));
                await storage.StoreAsync($"{game.Name}/index.json", async stream => await JsonSerializer.SerializeAsync(stream, gameJson, jsonOptions));
                await storage.StoreAsync($"{game.Name}/maps/index.json", async stream => await JsonSerializer.SerializeAsync(stream, mapsJson, jsonOptions));
            }

            foreach (var map in await context.GameMaps.ToListAsync())
            {
                var mapJson = new GameMapJson(map, pathBuilder);
                mapJson.Attribution = MapUtils.CombineAttibutions(map.Game!.Attribution, map.AppendAttribution);
                mapJson.Layers = GameMapLayerJson.CreateList(await context.GameMapLayers.Where(l => l.GameMapId == map.GameMapId && l.State == LayerState.Ready).ToListAsync(), pathBuilder);
                mapJson.Locations = (await context.GameMapLocations.Where(l => l.GameMapId == map.GameMapId).ToListAsync()).Select(l => new GameMapLocationJson(l)).ToList();

                await storage.StoreAsync($"{map.GameId}/maps/{map.GameMapId}/index.json", async stream => await JsonSerializer.SerializeAsync(stream, mapJson, jsonOptions));
                await storage.StoreAsync($"{map.Game!.Name}/maps/{map.Name}/index.json", async stream => await JsonSerializer.SerializeAsync(stream, mapJson, jsonOptions));
            }
        }


        public void Report(string value)
        {
            Console.Write("  "); // Ident
            Console.WriteLine(value);
        }
    }
}
