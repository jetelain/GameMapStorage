using GameMapStorageWebSite.Entities;

namespace GameMapStorageWebSite.Services.Mirroring
{
    public class SyncReport
    {
        public List<object> Added { get; } = new List<object>();

        public List<object> Updated { get; } = new List<object>();

        public List<object> UpToDate { get; } = new List<object>();

        public List<BackgroundWork> Works { get; } = new List<BackgroundWork>();

        internal void WasAdded<TJson, TEntity>(TJson source, TEntity target)
            where TJson : class
            where TEntity : class
        {
            Added.Add(target);
        }

        internal void WasRequested(BackgroundWork work)
        {
            Works.Add(work);
        }

        internal void WasUpdated<TJson, TEntity>(TJson source, TEntity target)
            where TJson : class
            where TEntity : class
        {
            Updated.Add(target);
        }

        internal void WasUpToDate<TJson, TEntity>(TJson source, TEntity target)
            where TJson : class
            where TEntity : class
        {
            UpToDate.Add(target);
        }
    }
}
