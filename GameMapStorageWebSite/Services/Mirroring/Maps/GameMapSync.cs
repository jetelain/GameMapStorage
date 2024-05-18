using System.Text.Json;
using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Models.Json;
using GameMapStorageWebSite.Works.MirrorLayers;
using Microsoft.EntityFrameworkCore;
using SixLabors.ImageSharp;

namespace GameMapStorageWebSite.Services.Mirroring.Maps
{
    internal sealed class GameMapSync : RemoteSyncBase<GameMapJson, GameMap>
    {
        private readonly GameMapStorageContext context;
        private readonly GameMapLocationSync locations;
        private readonly GameMapLayerSync layers;
        private readonly Game targetGame;
        private readonly GameJson sourceGame;

        public GameMapSync(SyncReport report, GameMapStorageContext context, Game targetGame, GameJson sourceGame, List<int> alreadyScheduled, bool keepId)
            : base(report, context.GameMaps, keepId)
        {
            this.context = context;
            locations = new GameMapLocationSync(report, context.GameMapLocations, keepId);
            layers = new GameMapLayerSync(report, context.GameMapLayers, alreadyScheduled, keepId);
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

            target.UpdateCitiesCount();
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

        protected override async Task ItemDone(GameMap target, HttpClient client)
        {
            await context.SaveChangesAsync();

            if (layers.LayersToDownload.Count > 0)
            {
                await ScheduleLayerDataDownload(client.BaseAddress);
            }
        }

        private async Task ScheduleLayerDataDownload(Uri? baseAddress)
        {
            foreach (var (layer, infos) in layers.LayersToDownload)
            {
                var work = new BackgroundWork()
                {
                    CreatedUtc = DateTime.UtcNow,
                    Data = JsonSerializer.Serialize(new MirrorLayerWorkData(layer.GameMapLayerId, GetAbsoluteUri(baseAddress, infos.DownloadUri!))),
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

        private static string GetAbsoluteUri(Uri? baseAddress, string relativeUri)
        {
            if (baseAddress == null)
            {
                return relativeUri;
            }
            return new Uri(baseAddress, relativeUri).AbsoluteUri;
        }

        protected override GameMap ToEntity(GameMapJson source)
        {
            var gameMap = new GameMap()
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
                Locations = locations.CreateEntities(source.Locations),

                Game = targetGame,
                GameId = targetGame.GameId
            };
            gameMap.UpdateCitiesCount();
            return gameMap;
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

        protected override async Task DownloadImage(GameMap target, GameMapJson source, HttpClient client, IThumbnailService thumbnailService)
        {
            if (!string.IsNullOrEmpty(source.ThumbnailPng) )
            {
                var bytes = await client.GetByteArrayAsync(source.ThumbnailPng);
                using var image = Image.Load(new MemoryStream(bytes));
                await thumbnailService.SetMapThumbnail(target, image);
            }
        }
    }
}
