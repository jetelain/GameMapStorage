using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Services;
using SixLabors.ImageSharp;

namespace GameMapStorageWebSite.Works.ProcessLayers
{
    public sealed class ProcessLayerWorker : LayerWorkerBase, IWorker<ProcessLayerWorkData>
    {
        private readonly IImageLayerService imageLayerService;

        public ProcessLayerWorker(GameMapStorageContext context, IImageLayerService imageLayerService)
            : base(context)
        {
            this.imageLayerService = imageLayerService;
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

            var layer = await context.GameMapLayers.FindAsync(workData.GameMapLayerId);
            if (layer == null)
            {
                throw new ArgumentException("Layer was not found.");
            }

            await MarkLayerAsProcessing(layer);

            foreach (var item in workData.Items)
            {
                using var image = await Image.LoadAsync(item.TempFileName);
                await imageLayerService.AddZoomLevelRangeFromImage(layer, item.MinZoom, item.MaxZoom, image);
            }

            //foreach (var item in workData.Items)
            //{
            //    File.Delete(item.TempFilePath);
            //}

            await MarkLayerAsReady(layer);
        }


    }
}
