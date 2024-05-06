using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Services;
using Microsoft.AspNetCore.Mvc;
using SixLabors.ImageSharp.Formats.Png;
using SixLabors.ImageSharp.Formats.Webp;

namespace GameMapStorageWebSite.Controllers
{
    public class ImageController : Controller
    {
        public const int CacheDuractionInSeconds = 30 * 24 * 60 * 60; // 30 days

        private static string PngContentType = PngFormat.Instance.DefaultMimeType;
        private static string WebpContentType = WebpFormat.Instance.DefaultMimeType;

        private readonly IImageLayerService layerService;
        private readonly IThumbnailService thumbnailService;

        public ImageController(IImageLayerService layerService, IThumbnailService thumbnailService) 
        {
            this.layerService = layerService;
            this.thumbnailService = thumbnailService;
        }

        [Route("data/{gameId}/maps/{gameMapId}/{gameMapLayerId}/{z}/{x}/{y}.png")]
        [ResponseCache(Duration = CacheDuractionInSeconds, Location = ResponseCacheLocation.Any)]
        public IResult GetPngTile(int gameId, int gameMapId, int gameMapLayerId, int z, int x, int y)
        {
            var count = MapUtils.GetTileRowCount(z);
            if (x < 0 || x >= count || y < 0 || y >= count)
            {
                return Results.NotFound();
            }
            return Results.Stream(target => layerService.ReadTilePng(new GameMapLayerIdentifier(gameId, gameMapId, gameMapLayerId), z, x, y, source => source.CopyToAsync(target)), PngContentType);
        }

        [Route("data/{gameId}/maps/{gameMapId}/{gameMapLayerId}/{z}/{x}/{y}.webp")]
        [ResponseCache(Duration = CacheDuractionInSeconds, Location = ResponseCacheLocation.Any)]
        public IResult GetWebpTile(int gameId, int gameMapId, int gameMapLayerId, int z, int x, int y)
        {
            var count = MapUtils.GetTileRowCount(z);
            if (x < 0 || x >= count || y < 0 || y >= count)
            {
                return Results.NotFound();
            }
            return Results.Stream(target => layerService.ReadTileWebp(new GameMapLayerIdentifier(gameId, gameMapId, gameMapLayerId), z, x, y, source => source.CopyToAsync(target)), WebpContentType);
        }

        [Route("data/{gameId}/logo.png")]
        [ResponseCache(Duration = CacheDuractionInSeconds, Location = ResponseCacheLocation.Any)]
        public IResult GetGameLogoPng(int gameId)
        {
            return Results.Stream(target => thumbnailService.ReadGameLogoPng(new GameIdentifier(gameId), source => source.CopyToAsync(target)), PngContentType);
        }

        [Route("data/{gameId}/logo.webp")]
        [ResponseCache(Duration = CacheDuractionInSeconds, Location = ResponseCacheLocation.Any)]
        public IResult GetGameLogoWebp(int gameId)
        {
            return Results.Stream(target => thumbnailService.ReadGameLogoWebp(new GameIdentifier(gameId), source => source.CopyToAsync(target)), WebpContentType);
        }

        [Route("data/{gameId}/maps/{gameMapId}/thumbnail.png")]
        [ResponseCache(Duration = CacheDuractionInSeconds, Location = ResponseCacheLocation.Any)]
        public IResult GetGameMapThumbnailPng(int gameId, int gameMapId)
        {
            return Results.Stream(target => thumbnailService.ReadMapThumbnailPng(new GameMapIdentifier(gameId, gameMapId), source => source.CopyToAsync(target)), PngContentType);
        }

        [Route("data/{gameId}/maps/{gameMapId}/thumbnail.webp")]
        [ResponseCache(Duration = CacheDuractionInSeconds, Location = ResponseCacheLocation.Any)]
        public IResult GetGameMapThumbnailWebp(int gameId, int gameMapId)
        {
            return Results.Stream(target => thumbnailService.ReadMapThumbnailWebp(new GameMapIdentifier(gameId, gameMapId), source => source.CopyToAsync(target)), WebpContentType);
        }
    }
}
