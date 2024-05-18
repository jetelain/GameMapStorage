using GameMapStorageWebSite.Entities;

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

        protected async Task MarkLayerAsReady(GameMapLayer layer)
        {
            await context.Entry(layer).ReloadAsync();
            layer.State = LayerState.Ready;
            layer.DataLastChangeUtc = DateTime.UtcNow;
            context.Update(layer);
            await context.SaveChangesAsync();
        }
    }
}
