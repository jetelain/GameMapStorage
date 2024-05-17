using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Services.Mirroring.Games;
using GameMapStorageWebSite.Services.Mirroring.Maps;

namespace GameMapStorageWebSite.Services.Mirroring
{
    public class MirrorService : IMirrorService
    {
        private readonly GameMapStorageContext context;
        private readonly IHttpClientFactory httpClientFactory;
        private readonly IDataConfigurationService dataConfiguration;

        public MirrorService(GameMapStorageContext context, IHttpClientFactory httpClientFactory, IDataConfigurationService dataConfiguration)
        {
            this.context = context;
            this.httpClientFactory = httpClientFactory;
            this.dataConfiguration = dataConfiguration;
        }

        public async Task<SyncReport> UpdateMirror()
        {
            if (dataConfiguration.Mode != DataMode.Mirror)
            {
                throw new ApplicationException($"Application is not in 'Mirror' mode, but in '{dataConfiguration.Mode}' mode.");
            }

            var report = new SyncReport();
            using var client = httpClientFactory.CreateClient("Mirror");
            var results = await new GameSync(report, context, true).Do(client);
            foreach (var (targetGame, sourceGame) in results)
            {
                await new GameMapSync(report, context, targetGame, sourceGame, true).Do(client);
            }
            return report;
        }

    }
}
