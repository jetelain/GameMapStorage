using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Models.Json;
using Microsoft.EntityFrameworkCore;

namespace GameMapStorageWebSite.Services.Mirroring.Maps
{
    internal sealed class GameMapLocationSync : SyncBase<GameMapLocationJson, GameMapLocation>
    {
        public GameMapLocationSync(SyncReport report, DbSet<GameMapLocation> dbset, bool keepId)
            : base(report, dbset, keepId)
        {
        }

        protected override bool Copy(GameMapLocationJson source, GameMapLocation target)
        {
            target.EnglishTitle = source.EnglishTitle!;
            target.Type = source.Type;
            target.X = source.X;
            target.Y = source.Y;
            target.GameMapLocationGuid = source.GameMapLocationGuid;
            return true;
        }

        protected override bool IsMatch(GameMapLocationJson source, GameMapLocation target)
        {
            if (keepId)
            {
                return source.GameMapLocationId == target.GameMapLocationId;
            }
            if (source.GameMapLocationGuid == null)
            {
                throw new InvalidOperationException($"GameMapLocationGuid is missing on GameMapLocationId={source.GameMapLocationId}");
            }
            return source.GameMapLocationGuid == target.GameMapLocationGuid;
        }

        protected override GameMapLocation ToEntity(GameMapLocationJson source)
        {
            return new GameMapLocation()
            {
                GameMapLocationId = keepId ? source.GameMapLocationId : default,

                EnglishTitle = source.EnglishTitle!,
                Type = source.Type,
                X = source.X,
                Y = source.Y,
                GameMapLocationGuid = source.GameMapLocationGuid
            };
        }
    }
}
