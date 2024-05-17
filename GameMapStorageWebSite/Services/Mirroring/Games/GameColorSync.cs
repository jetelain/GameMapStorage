using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Models.Json;
using Microsoft.EntityFrameworkCore;

namespace GameMapStorageWebSite.Services.Mirroring.Games
{
    internal sealed class GameColorSync : SyncBase<GameColorJson, GameColor>
    {
        public GameColorSync(SyncReport report, DbSet<GameColor> dbset, bool keepId)
            : base(report, dbset, keepId)
        {
        }

        protected override bool Copy(GameColorJson source, GameColor target)
        {
            target.Usage = source.Usage;
            target.EnglishTitle = source.EnglishTitle!;
            target.Hexadecimal = source.Hexadecimal!;
            target.Name = source.Name!;
            return true;
        }

        protected override bool IsMatch(GameColorJson source, GameColor target)
        {
            if (keepId)
            {
                return source.GameColorId == target.GameColorId;
            }
            return source.Name == target.Name;
        }

        protected override GameColor ToEntity(GameColorJson source)
        {
            return new GameColor()
            {
                EnglishTitle = source.EnglishTitle!,
                Hexadecimal = source.Hexadecimal!,
                Name = source.Name!,
                Usage = source.Usage,
                GameColorId = keepId ? source.GameColorId : default
            };
        }
    }
}
