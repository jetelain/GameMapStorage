using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Services.Mirroring.Games;
using GameMapStorageWebSite.Services.Mirroring.Maps;
using Microsoft.EntityFrameworkCore;

namespace GameMapStorageWebSite.Services.Mirroring
{
    public class MirrorService : IMirrorService
    {
        private readonly GameMapStorageContext context;
        private readonly IHttpClientFactory httpClientFactory;
        private readonly IDataConfigurationService dataConfiguration;
        private readonly IThumbnailService thumbnailService;

        public MirrorService(GameMapStorageContext context, IHttpClientFactory httpClientFactory, IDataConfigurationService dataConfiguration, IThumbnailService thumbnailService)
        {
            this.context = context;
            this.httpClientFactory = httpClientFactory;
            this.dataConfiguration = dataConfiguration;
            this.thumbnailService = thumbnailService;
        }

        public async Task<SyncReport> UpdateMirror(IProgress<string>? progress = null)
        {
            if (dataConfiguration.Mode != DataMode.Mirror)
            {
                throw new ApplicationException($"Application is not in 'Mirror' mode, but in '{dataConfiguration.Mode}' mode.");
            }

            var report = new SyncReport();
            using var client = httpClientFactory.CreateClient("Mirror");

            var alreadyScheduled = await context.Works.Where(w => w.State == BackgroundWorkState.Pending && w.Type == BackgroundWorkType.MirrorLayer && w.GameMapLayerId != null).Select(w => w.GameMapLayerId!.Value).ToListAsync();

            progress?.Report($"Mirror from '{client.BaseAddress}'");
            var gamesSync = new GameSync(report, context, true);
            var results = await gamesSync.Do(client);

            progress?.Report($"Store logos ({gamesSync.ImagesToDownload.Count})");
            await gamesSync.DownloadImages(client, thumbnailService);

            foreach (var (targetGame, sourceGame) in results)
            {
                progress?.Report($"Process '{targetGame.EnglishTitle}'");
                var mapsSync = new GameMapSync(report, context, targetGame, sourceGame, alreadyScheduled, true);
                await mapsSync.Do(client);

                progress?.Report($"Store thumbnails ({mapsSync.ImagesToDownload.Count})");
                await mapsSync.DownloadImages(client, thumbnailService);
            }
            report.Done();
            return report;
        }


    }
}
