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
            return true;
        }

        protected override bool IsMatch(GameMapLocationJson source, GameMapLocation target)
        {
            if (keepId)
            {
                return source.GameMapLocationId == target.GameMapLocationId;
            }
            return source.X == target.X && source.Y == target.Y; // TODO: Should use a GameMapLocationGuid
        }

        protected override GameMapLocation ToEntity(GameMapLocationJson source)
        {
            return new GameMapLocation()
            {
                GameMapLocationId = keepId ? source.GameMapLocationId : default,

                EnglishTitle = source.EnglishTitle!,
                Type = source.Type,
                X = source.X,
                Y = source.Y
            };
        }
    }
}
