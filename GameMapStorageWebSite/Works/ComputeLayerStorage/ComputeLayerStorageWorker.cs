using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Services;
using Microsoft.EntityFrameworkCore;

namespace GameMapStorageWebSite.Works.ComputeLayerStorage
{
    public sealed class ComputeLayerStorageWorker : LayerWorkerBase, IWorker<ComputeLayerStorageWorkData>
    {
        private readonly IImageLayerService imageLayerService;

        public ComputeLayerStorageWorker(GameMapStorageContext context, IImageLayerService imageLayerService)
            : base(context)
        {
            this.imageLayerService = imageLayerService;
        }

        public void Dispose()
        {
            // Nothing to do
        }

        public async Task Process(ComputeLayerStorageWorkData workData, BackgroundWork work, IProgress<string>? progress)
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

            progress?.Report("Computing storage sizes");
            var sizes = await imageLayerService.ComputeLayerStorageSize(layer);

            await context.Entry(layer).ReloadAsync();
            layer.StoragePngTiles = sizes.PngTiles;
            layer.StorageWebpTiles = sizes.WebpTiles;
            layer.StorageSvgTiles = sizes.SvgTiles;
            layer.StorageSourceFiles = sizes.SourceFiles;
            context.Update(layer);
            await context.SaveChangesAsync();
        }
    }
}
