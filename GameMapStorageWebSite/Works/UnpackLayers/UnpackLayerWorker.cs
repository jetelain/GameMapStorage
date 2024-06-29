using System.IO.Compression;
using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Services;
using Microsoft.EntityFrameworkCore;

namespace GameMapStorageWebSite.Works.UnpackLayers
{
    public sealed class UnpackLayerWorker : LayerWorkerBase, IWorker<UnpackLayerWorkData>
    {
        private readonly IImageLayerService imageLayerService;
        private readonly IWorkspaceService workspaceService;

        public UnpackLayerWorker(GameMapStorageContext context, IImageLayerService imageLayerService, IWorkspaceService workspaceService)
            : base(context)
        {
            this.imageLayerService = imageLayerService;
            this.workspaceService = workspaceService;
        }

        public void Dispose()
        {
            // Nothing to do
        }

        public async Task Process(UnpackLayerWorkData workData, BackgroundWork work, IProgress<string>? progress)
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

            await MarkLayerAsProcessing(layer);

            var archivePath = Path.Combine(workspaceService.GetLayerWorkspace(layer.GameMapLayerId), "content.zip");

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
}
