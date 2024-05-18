using System.Text.Json;
using System.Text.Json.Serialization;
using GameMapStorageWebSite.Entities;
using Microsoft.EntityFrameworkCore;

namespace GameMapStorageWebSite.Services.Mirroring
{
    internal abstract class RemoteSyncBase<TJson, TEntity> : SyncBase<TJson, TEntity>
        where TEntity : class, IWithTimestamp
        where TJson : class, IWithTimestamp
    {
        private readonly JsonSerializerOptions jsonOptions = new JsonSerializerOptions() { Converters = { new JsonStringEnumConverter() }, PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

        protected RemoteSyncBase(SyncReport report, DbSet<TEntity> dbset, bool keepId)
            : base(report, dbset, keepId)
        {
        }

        public List<(TEntity, TJson)> ImagesToDownload { get; } = new List<(TEntity, TJson)>();

        public async Task<List<(TEntity, TJson)>> Do(HttpClient client)
        {
            var result = new List<(TEntity, TJson)>();

            var remoteLightList = await client.GetFromJsonAsync<List<TJson>>(GetListEndpoint(), jsonOptions);
            if (remoteLightList == null)
            {
                return result;
            }

            var targetList = await GetTargetEntities();
            foreach (var sourceLight in remoteLightList)
            {
                var target = targetList.FirstOrDefault(e => IsMatch(sourceLight, e));
                if (target != null && !IsFullRequired(sourceLight, target))
                {
                    UpdateLight(sourceLight, target);
                    report.WasUpToDate(sourceLight, target);
                }
                else
                {
                    var fullEndpoint = GetDetailEndpoint(sourceLight);
                    var sourceFull = await client.GetFromJsonAsync<TJson>(fullEndpoint, jsonOptions);
                    if (sourceFull != null)
                    {
                        target = UpdateOrCreateEntity(sourceFull, target);
                        ImagesToDownload.Add((target, sourceFull));
                    }
                }
                if (target != null)
                {
                    result.Add((target, sourceLight));
                    await ItemDone(target, client);
                }
            }
            return result;
        }

        protected abstract Task<List<TEntity>> GetTargetEntities();

        protected abstract Task ItemDone(TEntity target, HttpClient client);

        protected abstract void UpdateLight(TJson sourceLight, TEntity target);

        protected virtual bool IsFullRequired(TJson sourceLight, TEntity target)
        {
            return sourceLight.LastChangeUtc != target.LastChangeUtc;
        }

        protected abstract string GetDetailEndpoint(TJson sourceLight);

        protected abstract string GetListEndpoint();

        public async Task DownloadImages(HttpClient client, IThumbnailService thumbnailService)
        {
            await Parallel.ForEachAsync(ImagesToDownload, async (pair, token) =>
            {
                var (target, source) = pair;
                await DownloadImage(target, source, client, thumbnailService);
            });
            ImagesToDownload.Clear();
        }

        protected abstract Task DownloadImage(TEntity target, TJson source, HttpClient client, IThumbnailService thumbnailService);
    }
}
