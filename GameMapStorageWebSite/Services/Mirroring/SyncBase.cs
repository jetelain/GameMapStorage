using Microsoft.EntityFrameworkCore;

namespace GameMapStorageWebSite.Services.Mirroring
{
    internal abstract class SyncBase<TJson, TEntity>
        where TEntity : class
        where TJson : class
    {
        protected readonly DbSet<TEntity> dbset;
        protected readonly SyncReport report;
        protected readonly bool keepId;

        public SyncBase(SyncReport report, DbSet<TEntity> dbset, bool keepId)
        {
            this.dbset = dbset;
            this.report = report;
            this.keepId = keepId;
        }

        public List<TEntity> UpdateOrCreateEntities(List<TJson> sourceList, List<TEntity> targetList)
        {
            var newList = sourceList.Select(source => UpdateOrCreateEntity(source, targetList)).ToList();
            foreach(var removed in targetList.Except(newList))
            {
                Remove(removed);
            }
            return newList;
        }

        public TEntity UpdateOrCreateEntity(TJson source, List<TEntity> targetList)
        {
            return UpdateOrCreateEntity(source, targetList.FirstOrDefault(e => IsMatch(source, e)));
        }

        protected TEntity UpdateOrCreateEntity(TJson source, TEntity? target)
        {
            if (target == null)
            {
                target = ToEntity(source);
                report.WasAdded(source, target);
                dbset.Add(target);
            }
            else
            {
                if (Copy(source, target))
                {
                    report.WasUpdated(source, target);
                    dbset.Update(target);
                }
                else
                {
                    report.WasUpToDate(source, target);
                }
            }
            return target;
        }

        public List<TEntity>? CreateEntities(List<TJson>? remoteItems)
        {
            if (remoteItems == null)
            {
                return null;
            }
            return remoteItems.Select(ToEntity).ToList();
        }

        protected abstract bool IsMatch(TJson source, TEntity target);

        protected abstract bool Copy(TJson source, TEntity target);

        protected abstract TEntity ToEntity(TJson source);

        protected virtual void Remove(TEntity entity)
        {
            // Do not remove anything by default
        }
    }
}
