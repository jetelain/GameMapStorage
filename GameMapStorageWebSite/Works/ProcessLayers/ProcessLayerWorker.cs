using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Services;
using Microsoft.EntityFrameworkCore;
using SixLabors.ImageSharp;

namespace GameMapStorageWebSite.Works.ProcessLayers
{
    public sealed class ProcessLayerWorker : LayerWorkerBase, IWorker<ProcessLayerWorkData>
    {
        private readonly IImageLayerService imageLayerService;
        private readonly IWorkspaceService workspaceService;

        public ProcessLayerWorker(GameMapStorageContext context, IImageLayerService imageLayerService, IWorkspaceService workspaceService)
            : base(context)
        {
            this.imageLayerService = imageLayerService;
            this.workspaceService = workspaceService;
        }

        public void Dispose()
        {
            // Nothing to do
        }

        public async Task Process(ProcessLayerWorkData workData, BackgroundWork work)
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

            var workspace = workspaceService.GetLayerWorkspace(workData.GameMapLayerId);

            foreach (var item in workData.Items)
            {
                using var image = await Image.LoadAsync(Path.Combine(workspace, item.FileName));
                await imageLayerService.AddZoomLevelRangeFromImage(layer, item.MinZoom, item.MaxZoom, image);
            }

            foreach (var item in workData.Items)
            {
                File.Delete(Path.Combine(workspace, item.FileName));
            }

            await MarkLayerAsReady(layer);
        }


    }
}
