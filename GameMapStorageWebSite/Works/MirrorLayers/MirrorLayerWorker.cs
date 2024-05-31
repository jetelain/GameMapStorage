using System.IO.Compression;
using System.Net;
using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Services;
using Microsoft.EntityFrameworkCore;

namespace GameMapStorageWebSite.Works.MirrorLayers
{
    public class MirrorLayerWorker : LayerWorkerBase, IWorker<MirrorLayerWorkData>
    {
        private readonly HttpClient client;
        private readonly IWorkspaceService workspaceService;
        private readonly IImageLayerService imageLayerService;
        private readonly IDataConfigurationService dataConfiguration;

        public MirrorLayerWorker(GameMapStorageContext context, IImageLayerService imageLayerService, IWorkspaceService workspaceService, IHttpClientFactory httpClientFactory, IDataConfigurationService dataConfiguration)
            : base(context)
        {
            this.client = httpClientFactory.CreateClient("Mirror");
            this.workspaceService = workspaceService;
            this.imageLayerService = imageLayerService;
            this.dataConfiguration = dataConfiguration;
        }

        public void Dispose()
        {

        }

        public async Task Process(MirrorLayerWorkData workData, BackgroundWork work, IProgress<string>? progress)
        {
            if (work.GameMapLayerId != workData.GameMapLayerId)
            {
                throw new ArgumentException("GameMapLayerId mismatch.");
            }

            var layer = await context.GameMapLayers
                .Include(l => l.GameMap)
                .Include(l => l.GameMap!.Game)
                .FirstOrDefaultAsync(l => l.GameMapLayerId == workData.GameMapLayerId);
            if (layer == null)
            {
                throw new ArgumentException("Layer was not found.");
            }

            var archivePath = Path.Combine(workspaceService.GetLayerWorkspace(layer.GameMapLayerId), "mirror.zip");

            if (await DownloadArchiveIfChanged(workData, layer, archivePath, progress))
            {
                await MarkLayerAsProcessing(layer);

                progress?.Report("Store tiles");

                using (var archiveStream = File.OpenRead(archivePath))
                {
                    using (var archive = new ZipArchive(archiveStream, ZipArchiveMode.Read))
                    {
                        await imageLayerService.AddLayerImagesFromArchive(layer, archive);
                    }
                }

                File.Delete(archivePath);

                await MarkLayerAsReady(layer);
            }
        }

        private async Task<bool> DownloadArchiveIfChanged(MirrorLayerWorkData workData, GameMapLayer layer, string archivePath, IProgress<string>? progress)
        {
            var uri = $"{workData.DownloadUri}?content={dataConfiguration.LayerStorage}";
            progress?.Report($"Download {uri}");
            using var request = new HttpRequestMessage(HttpMethod.Get, uri);
            if (layer.DataLastChangeUtc != null && layer.State == LayerState.Ready)
            {
                request.Headers.IfModifiedSince = new DateTimeOffset(layer.DataLastChangeUtc.Value, TimeSpan.Zero);
            }

            using var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead);
            if (response.StatusCode == HttpStatusCode.NotModified)
            {
                return false;
            }

            if (response.StatusCode != HttpStatusCode.OK)
            {
                throw new ApplicationException($"{uri} replied with status code {response.StatusCode}");
            }

            using var targetStream = File.Create(archivePath);
            await response.Content.CopyToAsync(targetStream);       
            return true;
        }
    }
}
