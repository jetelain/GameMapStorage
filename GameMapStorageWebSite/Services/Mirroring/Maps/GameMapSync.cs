using System.Text.Json;
using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Models.Json;
using GameMapStorageWebSite.Works.MirrorLayers;
using Microsoft.EntityFrameworkCore;

namespace GameMapStorageWebSite.Services.Mirroring.Maps
{
    internal sealed class GameMapSync : RemoteSyncBase<GameMapJson, GameMap>
    {
        private readonly GameMapStorageContext context;
        private readonly GameMapLocationSync locations;
        private readonly GameMapLayerSync layers;
        private readonly Game targetGame;
        private readonly GameJson sourceGame;

        public GameMapSync(SyncReport report, GameMapStorageContext context, Game targetGame, GameJson sourceGame, bool keepId)
            : base(report, context.GameMaps, keepId)
        {
            this.context = context;
            locations = new GameMapLocationSync(report, context.GameMapLocations, keepId);
            layers = new GameMapLayerSync(report, context.GameMapLayers, keepId);
            this.targetGame = targetGame;
            this.sourceGame = sourceGame;
        }

        protected override bool Copy(GameMapJson source, GameMap target)
        {
            target.EnglishTitle = source.EnglishTitle!;
            target.AppendAttribution = source.AppendAttribution;
            target.SteamWorkshopId = source.SteamWorkshopId;
            target.OfficialSiteUri = source.OfficialSiteUri;
            target.SizeInMeters = source.SizeInMeters;
            target.LastChangeUtc = source.LastChangeUtc;
            target.Name = source.Name;
            target.Aliases = source.Aliases;

            target.Layers = layers.UpdateOrCreateEntities(source.Layers!, target.Layers!);
            target.Locations = locations.UpdateOrCreateEntities(source.Locations!, target.Locations!);

            target.CitiesCount = target.Locations.Count(l => l.Type == LocationType.City);
            return true;
        }

        protected override string GetDetailEndpoint(GameMapJson sourceLight) => $"/api/v1/games/{sourceGame.GameId}/maps/{sourceLight.GameMapId}";

        protected override string GetListEndpoint() => $"/api/v1/games/{sourceGame.GameId}/maps";

        protected override bool IsMatch(GameMapJson source, GameMap target)
        {
            if (keepId)
            {
                return source.GameMapId == target.GameMapId;
            }
            return source.Name == target.Name;
        }

        protected override async Task ItemDone(GameMap target)
        {
            await context.SaveChangesAsync();

            if (layers.LayersToDownload.Count > 0)
            {
                await ScheduleLayerDataDownload();
            }
        }

        private async Task ScheduleLayerDataDownload()
        {
            foreach (var (layer, infos) in layers.LayersToDownload)
            {
                var work = new BackgroundWork()
                {
                    CreatedUtc = DateTime.UtcNow,
                    Data = JsonSerializer.Serialize(new MirrorLayerWorkData(layer.GameMapLayerId, infos.DownloadUri!)),
                    Type = BackgroundWorkType.MirrorLayer,
                    GameMapLayerId = layer.GameMapLayerId,
                    GameMapLayer = layer,
                    State = BackgroundWorkState.Pending
                };
                context.Works.Add(work);
                report.WasRequested(work);
            }
            layers.LayersToDownload.Clear();
            await context.SaveChangesAsync();
        }

        protected override GameMap ToEntity(GameMapJson source)
        {
            var locationsEntities = locations.CreateEntities(source.Locations);
            return new GameMap()
            {
                GameMapId = keepId ? source.GameMapId : default,

                EnglishTitle = source.EnglishTitle!,
                AppendAttribution = source.AppendAttribution,
                SteamWorkshopId = source.SteamWorkshopId,
                OfficialSiteUri = source.OfficialSiteUri,
                SizeInMeters = source.SizeInMeters,
                LastChangeUtc = source.LastChangeUtc,
                Name = source.Name,
                Aliases = source.Aliases,

                Layers = layers.CreateEntities(source.Layers),
                Locations = locationsEntities,

                Game = targetGame,
                GameId = targetGame.GameId,

                CitiesCount = locationsEntities?.Count(l => l.Type == LocationType.City) ?? 0
            };
        }

        protected override void UpdateLight(GameMapJson sourceLight, GameMap target)
        {
            layers.UpdateOrCreateEntities(sourceLight.Layers!, target.Layers!);
        }

        protected override async Task<List<GameMap>> GetTargetEntities()
        {
            var localMaps = await context.GameMaps.Where(m => m.GameId == targetGame.GameId).ToListAsync();
            await context.GameMapLayers.Where(m => m.GameMap!.GameId == targetGame.GameId).ToListAsync();
            return localMaps;
        }
    }
}
