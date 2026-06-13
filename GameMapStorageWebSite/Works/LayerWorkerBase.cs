using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Services;

namespace GameMapStorageWebSite.Works
{
    public abstract class LayerWorkerBase
    {
        protected readonly GameMapStorageContext context;

        protected LayerWorkerBase(GameMapStorageContext context)
        {
            this.context = context;
        }
        protected async Task MarkLayerAsProcessing(GameMapLayer layer)
        {
            layer.State = LayerState.Processing;
            context.Update(layer);
            await context.SaveChangesAsync();
        }

        protected async Task MarkLayerAsReady(GameMapLayer layer, LayerStorageSize? sizes = null)
        {
            await context.Entry(layer).ReloadAsync();
            layer.State = LayerState.Ready;
            layer.DataLastChangeUtc = DateTime.UtcNow;
            if (sizes != null)
            {
                layer.StoragePngTiles = sizes.PngTiles;
                layer.StorageWebpTiles = sizes.WebpTiles;
                layer.StorageSvgTiles = sizes.SvgTiles;
                layer.StorageSourceFiles = sizes.SourceFiles;
            }
            else
            {
                layer.StoragePngTiles = null;
                layer.StorageWebpTiles = null;
                layer.StorageSvgTiles = null;
                layer.StorageSourceFiles = null;
            }
            context.Update(layer);
            await context.SaveChangesAsync();
        }
    }
}
