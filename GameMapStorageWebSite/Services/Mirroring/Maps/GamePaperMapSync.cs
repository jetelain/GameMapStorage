using System.Text.Json;
using System.Text.Json.Serialization;
using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Models.Json;
using GameMapStorageWebSite.Works.MirrorPaperMaps;
using Microsoft.EntityFrameworkCore;

namespace GameMapStorageWebSite.Services.Mirroring.Maps
{
    internal class GamePaperMapSync : SyncBase<GamePaperMapMapJson, GamePaperMap>
    {
        private readonly GameMapStorageContext context;
        private readonly List<int> alreadyScheduledPapers;
        private readonly Game targetGame;
        private readonly GameJson sourceGame;

        private readonly List<(GamePaperMap, GamePaperMapJson)> needDownload = new List<(GamePaperMap, GamePaperMapJson)>();
        private readonly JsonSerializerOptions jsonOptions = new JsonSerializerOptions() { Converters = { new JsonStringEnumConverter() }, PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

        public GamePaperMapSync(SyncReport report, GameMapStorageContext context, Game targetGame, GameJson sourceGame, List<int> alreadyScheduledPapers, bool keepId)
            : base(report, context.GamePaperMaps, keepId)
        {
            this.targetGame = targetGame;
            this.sourceGame = sourceGame;
            this.context = context;
            this.alreadyScheduledPapers = alreadyScheduledPapers;
        }

        protected override bool Copy(GamePaperMapMapJson source, GamePaperMap target)
        {
            if (source.LastChangeUtc == target.LastChangeUtc)
            {
                return false;
            }
            target.Name = source.Name!;
            target.FileFormat = source.FileFormat;
            target.Scale = source.Scale;
            target.LastChangeUtc = source.LastChangeUtc;
            target.Pages = source.Pages;
            target.PaperSize = source.PaperSize;

            if (!alreadyScheduledPapers.Contains(target.GamePaperMapId))
            {
                needDownload.Add((target, source));
            }
            return true;
        }

        protected override bool IsMatch(GamePaperMapMapJson source, GamePaperMap target)
        {
            if (keepId)
            {
                return source.GamePaperMapId == target.GamePaperMapId;
            }
            return source.Name == target.Name
                && source.MapName == target.GameMap!.Name
                && source.FileFormat == target.FileFormat
                && source.Scale == target.Scale;
        }

        protected override GamePaperMap ToEntity(GamePaperMapMapJson source)
        {
            var target =  new GamePaperMap()
            {
                Name = source.Name!,
                FileFormat = source.FileFormat,
                Scale = source.Scale,
                LastChangeUtc = source.LastChangeUtc,
                Pages = source.Pages,
                PaperSize = source.PaperSize
            };
            if (keepId)
            {
                target.GameMap = targetGame.Maps!.First(m => m.GameMapId == source.GameMapId);
                target.GameMapId = source.GameMapId;
                target.GamePaperMapId = source.GamePaperMapId;
            }
            else
            {
                target.GameMap = targetGame.Maps!.First(m => m.Name == source.MapName);
                target.GameMapId = target.GameMap!.GameMapId;
            }
            needDownload.Add((target, source));
            return target;
        }

        private string GetListEndpoint()
            => $"/api/v1/games/{sourceGame.GameId}/papermaps";

        private async Task<List<GamePaperMap>> GetTargetEntities()
            => await context.GamePaperMaps.Include(m => m.GameMap).Where(m => m.GameMap!.GameId == targetGame.GameId).ToListAsync();

        public async Task Do(HttpClient client)
        {
            var response = await client.GetAsync(GetListEndpoint());
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                return;
            }
            response.EnsureSuccessStatusCode();
            var remoteLightList = await response.Content.ReadFromJsonAsync<List<GamePaperMapMapJson>>(jsonOptions);
            if (remoteLightList == null)
            {
                return;
            }
            if (targetGame.Maps == null)
            {
                targetGame.Maps = await context.GameMaps.Where(m => m.GameId == targetGame.GameId).ToListAsync();
            }

            UpdateOrCreateEntities(remoteLightList, await GetTargetEntities());
            await context.SaveChangesAsync();

            await ScheduleLayerDataDownload(client.BaseAddress);
        }

        private async Task ScheduleLayerDataDownload(Uri? baseAddress)
        {
            foreach (var (layer, infos) in needDownload)
            {
                var work = new BackgroundWork()
                {
                    CreatedUtc = DateTime.UtcNow,
                    Data = JsonSerializer.Serialize(new MirrorPaperMapWorkData(layer.GamePaperMapId, GetAbsoluteUri(baseAddress, infos.DownloadUri!))),
                    Type = BackgroundWorkType.MirrorPaperMap,
                    GamePaperMapId = layer.GamePaperMapId,
                    GamePaperMap = layer,
                    State = BackgroundWorkState.Pending
                };
                context.Works.Add(work);
                report.WasRequested(work);
            }
            needDownload.Clear();
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
    }
}
