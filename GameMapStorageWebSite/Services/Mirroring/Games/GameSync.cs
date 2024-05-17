using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Models.Json;
using Microsoft.EntityFrameworkCore;

namespace GameMapStorageWebSite.Services.Mirroring.Games
{
    internal sealed class GameSync : RemoteSyncBase<GameJson, Game>
    {
        private readonly GameColorSync colors;
        private readonly GameMarkerSync markers;
        private readonly GameMapStorageContext context;

        public GameSync(SyncReport report, GameMapStorageContext context, bool keepId)
            : base(report, context.Games, keepId)
        {
            colors = new GameColorSync(report, context.GameColors, keepId);
            markers = new GameMarkerSync(report, context.GameMarkers, keepId);
            this.context = context;
        }

        protected override bool Copy(GameJson source, Game target)
        {
            target.Attribution = source.Attribution!;
            target.EnglishTitle = source.EnglishTitle!;
            target.Name = source.Name!;
            target.OfficialSiteUri = source.OfficialSiteUri;
            target.SteamAppId = source.SteamAppId;
            target.LastChangeUtc = source.LastChangeUtc;

            target.Colors = colors.UpdateOrCreateEntities(source.Colors!, target.Colors!);
            target.Markers = markers.UpdateOrCreateEntities(source.Markers!, target.Markers!);
            return true;
        }

        protected override string GetDetailEndpoint(GameJson sourceLight) => $"/api/v1/games/{sourceLight.GameId}";

        protected override string GetListEndpoint() => "/api/v1/games";

        protected override async Task<List<Game>> GetTargetEntities()
        {
            var localGames = await context.Games.ToListAsync();
            await context.GameColors.ToListAsync();
            await context.GameMarkers.ToListAsync();
            return localGames;
        }

        protected override bool IsMatch(GameJson source, Game target)
        {
            if (keepId)
            {
                return source.GameId == target.GameId;
            }
            return source.Name == target.Name;
        }

        protected override Task ItemDone(Game target)
        {
            return context.SaveChangesAsync();
        }

        protected override Game ToEntity(GameJson source)
        {
            return new Game()
            {
                GameId = keepId ? source.GameId : default,

                Attribution = source.Attribution!,
                EnglishTitle = source.EnglishTitle!,
                Name = source.Name!,
                OfficialSiteUri = source.OfficialSiteUri,
                SteamAppId = source.SteamAppId,
                LastChangeUtc = source.LastChangeUtc,

                Colors = colors.CreateEntities(source.Colors),
                Markers = markers.CreateEntities(source.Markers),
            };
        }

        protected override void UpdateLight(GameJson sourceLight, Game target)
        {
            // Nothing to do
        }
    }
}
