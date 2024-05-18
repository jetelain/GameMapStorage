using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Services.Mirroring;

namespace GameMapStorageWebSite.Models
{
    public class SyncMirrorViewModel
    {
        public SyncMirrorViewModel(SyncReport report)
        {
            Report = report;

            Items.Add(SyncEntitySummaryItem.Create<Game>(report));
            Items.Add(SyncEntitySummaryItem.Create<GameMarker>(report));
            Items.Add(SyncEntitySummaryItem.Create<GameColor>(report));
            Items.Add(SyncEntitySummaryItem.Create<GameMap>(report));
            Items.Add(SyncEntitySummaryItem.Create<GameMapLocation>(report));
            Items.Add(SyncEntitySummaryItem.Create<GameMapLayer>(report));
        }

        public List<SyncEntitySummaryItem> Items { get; set; } = new List<SyncEntitySummaryItem>();

        public SyncReport Report { get; }

        public int PendingCount { get; internal set; }

        public TimeSpan EstimatedTime => PendingCount * TimeSpan.FromSeconds(30);
    }
}
