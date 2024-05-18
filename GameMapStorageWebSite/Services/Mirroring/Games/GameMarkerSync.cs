using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Models.Json;
using Microsoft.EntityFrameworkCore;

namespace GameMapStorageWebSite.Services.Mirroring.Games
{
    internal sealed class GameMarkerSync : SyncBase<GameMarkerJson, GameMarker>
    {
        public GameMarkerSync(SyncReport report, DbSet<GameMarker> dbset, bool keepId)
            : base(report, dbset, keepId)
        {
        }

        protected override bool Copy(GameMarkerJson source, GameMarker target)
        {
            target.Usage = source.Usage;
            target.EnglishTitle = source.EnglishTitle!;
            target.Name = source.Name!;
            return true;
        }

        protected override bool IsMatch(GameMarkerJson source, GameMarker target)
        {
            if (keepId)
            {
                return source.GameMarkerId == target.GameMarkerId;
            }
            return source.Name == target.Name;
        }

        protected override GameMarker ToEntity(GameMarkerJson source)
        {
            return new GameMarker()
            {
                EnglishTitle = source.EnglishTitle!,
                Usage = source.Usage!,
                Name = source.Name!,
                GameMarkerId = keepId ? source.GameMarkerId : default,
            };
        }
    }
}
