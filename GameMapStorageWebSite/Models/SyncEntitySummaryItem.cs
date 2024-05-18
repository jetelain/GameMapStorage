using GameMapStorageWebSite.Services.Mirroring;

namespace GameMapStorageWebSite.Models
{
    public class SyncEntitySummaryItem
    {
        public SyncEntitySummaryItem(string name, int added, int updated, int upToDate)
        {
            Name = name;
            Added = added;
            Updated = updated;
            UpToDate = upToDate;
        }

        public string Name { get; }

        public int Added { get; }

        public int Updated { get; }

        public int UpToDate { get; }

        public static SyncEntitySummaryItem Create<T>(SyncReport report)
        {
            return new SyncEntitySummaryItem(
                typeof(T).Name,
                report.Added.OfType<T>().Count(),
                report.Updated.OfType<T>().Count(),
                report.UpToDate.OfType<T>().Count());
        }
    }
}