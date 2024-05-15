using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Services;
using GameMapStorageWebSite.Services.Storages;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GameMapStorageWebSite.Controllers
{
    public sealed class DownloadController : DownloadControllerBase
    {
        private readonly IImageLayerService layerService;
        private readonly GameMapStorageContext context;

        public DownloadController(IImageLayerService layerService,GameMapStorageContext context) 
        {
            this.layerService = layerService;
            this.context = context;
        }


        [Route("data/{gameId}/maps/{gameMapId}/{gameMapLayerId}.zip")]
        // TODO: Rate limiting ? Authentication ?
        public async Task<IResult> GetLayerArchive(int gameId, int gameMapId, int gameMapLayerId)
        {
            var layer = await context.GameMapLayers
                .Include(l => l.GameMap)
                .Include(l => l.GameMap!.Game)
                .FirstOrDefaultAsync(l => l.GameMapLayerId == gameMapLayerId && l.GameMapId == gameMapId && l.GameMap!.GameId == gameId);
            if (layer == null)
            {
                 return Results.NotFound();
            }
            var file = await layerService.GetArchive(layer);
            return await ToResult(file, "application/zip");
        }
    }
}
