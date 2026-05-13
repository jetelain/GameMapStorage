using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Services;
using Microsoft.EntityFrameworkCore;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats;
using SixLabors.ImageSharp.Memory;

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

        public async Task Process(ProcessLayerWorkData workData, BackgroundWork work, IProgress<string>? progress)
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

            var configuration = new Configuration
            {
                MemoryAllocator = MemoryAllocator.Create(new MemoryAllocatorOptions()
                {
                    MaximumPoolSizeMegabytes = 16_384,
                    AllocationLimitMegabytes = 16_384 // a 40x40km map at 1.5px/ms is ~12GB, so 16GB limit for safety (max for aerial images)
                })
            };

            foreach (var item in workData.Items)
            {
                using var image = await Image.LoadAsync(new DecoderOptions() { Configuration = configuration }, Path.Combine(workspace, item.FileName));
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
