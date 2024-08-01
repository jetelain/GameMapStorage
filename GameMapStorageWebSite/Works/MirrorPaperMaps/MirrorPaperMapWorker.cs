using System.Net;
using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Services;
using Microsoft.EntityFrameworkCore;

namespace GameMapStorageWebSite.Works.MirrorPaperMaps
{
    public class MirrorPaperMapWorker : IWorker<MirrorPaperMapWorkData>
    {
        private readonly GameMapStorageContext context;
        private readonly HttpClient client;
        private readonly IPaperMapService paperMapService;

        public MirrorPaperMapWorker(GameMapStorageContext context, IPaperMapService paperMapService, IHttpClientFactory httpClientFactory)
        {
            this.context = context;
            this.client = httpClientFactory.CreateClient("Mirror");
            this.paperMapService = paperMapService;
        }

        public void Dispose()
        {
            client.Dispose();
        }

        public async Task Process(MirrorPaperMapWorkData workData, BackgroundWork work, IProgress<string>? progress)
        {
            if (work.GamePaperMapId != workData.GamePaperMapId)
            {
                throw new ArgumentException("GamePaperMapId mismatch.");
            }

            var gamePaperMap = await context.GamePaperMaps
                .Include(g => g.GameMap)
                .Include(g => g.GameMap!.Game)
                .FirstOrDefaultAsync(m => m.GamePaperMapId == workData.GamePaperMapId);

            if (gamePaperMap == null)
            {
                throw new ArgumentException("Paper map was not found.");
            }

            using var request = new HttpRequestMessage(HttpMethod.Get, workData.DownloadUri);

            using var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead);

            if (response.StatusCode != HttpStatusCode.OK)
            {
                throw new ApplicationException($"{workData.DownloadUri} replied with status code {response.StatusCode}");
            }

            var length = response.Content.Headers.ContentLength ?? throw new ApplicationException("Content-Length is missing.");

            await paperMapService.StoreFile(gamePaperMap, (int)length, response.Content.CopyToAsync);
        }
    }
}
