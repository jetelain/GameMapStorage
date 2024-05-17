using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;

namespace GameMapStorageWebSite.Services.Mirroring
{
    internal abstract class RemoteSyncBase<TJson, TEntity> : SyncBase<TJson, TEntity>
        where TEntity : class
        where TJson : class
    {
        private readonly JsonSerializerOptions jsonOptions = new JsonSerializerOptions() { Converters = { new JsonStringEnumConverter() } };

        protected RemoteSyncBase(SyncReport report, DbSet<TEntity> dbset, bool keepId)
            : base(report, dbset, keepId)
        {
        }

        public async Task<List<(TEntity,TJson)>> Do(HttpClient client)
        {
            var result = new List<(TEntity,TJson)>();

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
                    var sourceFull = await client.GetFromJsonAsync<TJson>(GetDetailEndpoint(sourceLight), jsonOptions);
                    if (sourceFull != null)
                    {
                        target = UpdateOrCreateEntity(sourceFull, target);
                    }
                }
                if (target != null)
                {
                    result.Add((target, sourceLight));
                    await ItemDone(target);
                }
            }
            return result;
        }

        protected abstract Task<List<TEntity>> GetTargetEntities();

        protected abstract Task ItemDone(TEntity target);

        protected abstract void UpdateLight(TJson sourceLight, TEntity target);

        protected abstract bool IsFullRequired(TJson sourceLight, TEntity target);

        protected abstract string GetDetailEndpoint(TJson sourceLight);

        protected abstract string GetListEndpoint();
    }
}
