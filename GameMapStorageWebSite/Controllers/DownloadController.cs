using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GameMapStorageWebSite.Controllers
{
    [ApiExplorerSettings(IgnoreApi = true)]
    public sealed class DownloadController : DownloadControllerBase
    {
        private readonly IImageLayerService layerService;
        private readonly IPaperMapService paperMapService;
        private readonly GameMapStorageContext context;

        public DownloadController(IImageLayerService layerService, IPaperMapService paperMapService,  GameMapStorageContext context) 
        {
            this.layerService = layerService;
            this.paperMapService = paperMapService;
            this.context = context;
        }


        [Route("data/{gameId}/maps/{gameMapId}/{gameMapLayerId}.zip")]
        // TODO: Rate limiting ? Authentication ?
        public async Task<IResult> GetLayerArchive(int gameId, int gameMapId, int gameMapLayerId, LayerStorageMode content = LayerStorageMode.Full)
        {
            var layer = await context.GameMapLayers
                .Include(l => l.GameMap)
                .Include(l => l.GameMap!.Game)
                .FirstOrDefaultAsync(l => l.GameMapLayerId == gameMapLayerId && l.GameMapId == gameMapId && l.GameMap!.GameId == gameId);
            if (layer == null)
            {
                 return Results.NotFound();
            }
            var file = await layerService.GetArchive(layer, content);
            return await ToResult(file, "application/zip");
        }

        [Route("data/{gameId}/maps/{gameMapId}/papermaps/{gamePaperMapId}.pdf")]
        // TODO: Rate limiting ? Authentication ?
        public async Task<IResult> GetPaperMap(int gameId, int gameMapId, int gamePaperMapId)
        {
            var layer = await context.GamePaperMaps
                .Include(l => l.GameMap)
                .Include(l => l.GameMap!.Game)
                .FirstOrDefaultAsync(l => l.GamePaperMapId == gamePaperMapId && l.GameMapId == gameMapId && l.GameMap!.GameId == gameId);
            if (layer == null)
            {
                return Results.NotFound();
            }
            var file = await paperMapService.GetFile(layer);
            if (file == null)
            {
                return Results.NotFound();
            }
            string fileName;
            if (layer.FileFormat == PaperFileFormat.BookletPDF)
            {
                fileName = $"{layer.GameMap!.Name}_booklet.pdf";
            }
            else if (string.IsNullOrEmpty(layer.Name))
            {
                fileName = $"{layer.GameMap!.Name}.pdf";
            }
            else 
            {
                fileName = $"{layer.GameMap!.Name}_{layer.Name}.pdf";
            }
            return await ToResult(file, "application/pdf", fileName);
        }
    }
}
