﻿using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Services;
using GameMapStorageWebSite.Services.Storages;
using Microsoft.AspNetCore.Mvc;
using SixLabors.ImageSharp.Formats.Png;
using SixLabors.ImageSharp.Formats.Webp;

namespace GameMapStorageWebSite.Controllers
{
    /// <summary>
    /// Map layers images download
    /// </summary>
    public sealed class ImageController : DownloadControllerBase
    {
        public const int CacheDuractionInSeconds = 4 * 60 * 60; // 4 hours

        private static string PngContentType = PngFormat.Instance.DefaultMimeType;
        private static string WebpContentType = WebpFormat.Instance.DefaultMimeType;
        private static string SvgContentType = "image/svg+xml";

        private readonly IImageLayerService layerService;
        private readonly IThumbnailService thumbnailService;

        public ImageController(IImageLayerService layerService, IThumbnailService thumbnailService) 
        {
            this.layerService = layerService;
            this.thumbnailService = thumbnailService;
        }

        private Task<IResult> ToResultWebp(IStorageFile? file)
        {
            return ToResult(file, WebpContentType);
        }

        private Task<IResult> ToResultPng(IStorageFile? file)
        {
            return ToResult(file, PngContentType);
        }

        private Task<IResult> ToResultSvg(IStorageFile? file)
        {
            return ToResult(file, SvgContentType);
        }

        [Route("data/{gameId}/maps/{gameMapId}/{gameMapLayerId}/{z}/{x}/{y}.png")]
        [ResponseCache(Duration = CacheDuractionInSeconds, Location = ResponseCacheLocation.Any)]
        public async Task<IResult> GetTilePng(int gameId, int gameMapId, int gameMapLayerId, int z, int x, int y)
        {
            var count = MapUtils.GetTileRowCount(z);
            if (x < 0 || x >= count || y < 0 || y >= count)
            {
                return Results.NotFound();
            }
            return await ToResultPng(await layerService.ReadTilePng(new GameMapLayerIdentifier(gameId, gameMapId, gameMapLayerId), z, x, y));
        }

        [Route("data/{gameId}/maps/{gameMapId}/{gameMapLayerId}/{z}/{x}/{y}.webp")]
        [ResponseCache(Duration = CacheDuractionInSeconds, Location = ResponseCacheLocation.Any)]
        public async Task<IResult> GetTileWebp(int gameId, int gameMapId, int gameMapLayerId, int z, int x, int y)
        {
            var count = MapUtils.GetTileRowCount(z);
            if (x < 0 || x >= count || y < 0 || y >= count)
            {
                return Results.NotFound();
            }
            return await ToResultWebp(await layerService.ReadTileWebp(new GameMapLayerIdentifier(gameId, gameMapId, gameMapLayerId), z, x, y));
        }

        [Route("data/{gameId}/maps/{gameMapId}/{gameMapLayerId}/{z}/{x}/{y}.svg")]
        [ResponseCache(Duration = CacheDuractionInSeconds, Location = ResponseCacheLocation.Any)]
        public async Task<IResult> GetTileSvg(int gameId, int gameMapId, int gameMapLayerId, int z, int x, int y)
        {
            var count = MapUtils.GetTileRowCount(z);
            if (x < 0 || x >= count || y < 0 || y >= count)
            {
                return Results.NotFound();
            }
            return await ToResultSvg(await layerService.ReadTileSvg(new GameMapLayerIdentifier(gameId, gameMapId, gameMapLayerId), z, x, y));
        }

        [Route("data/{gameId}/logo.png")]
        [ResponseCache(Duration = CacheDuractionInSeconds, Location = ResponseCacheLocation.Any)]
        public async Task<IResult> GetGameLogoPng(int gameId)
        {
            return await ToResultPng(await thumbnailService.ReadGameLogoPng(new GameIdentifier(gameId)));
        }

        [Route("data/{gameId}/logo.webp")]
        [ResponseCache(Duration = CacheDuractionInSeconds, Location = ResponseCacheLocation.Any)]
        public async Task<IResult> GetGameLogoWebp(int gameId)
        {
            return await ToResultWebp(await thumbnailService.ReadGameLogoWebp(new GameIdentifier(gameId)));
        }

        [Route("data/{gameId}/maps/{gameMapId}/thumbnail.png")]
        [ResponseCache(Duration = CacheDuractionInSeconds, Location = ResponseCacheLocation.Any)]
        public async Task<IResult> GetGameMapThumbnailPng(int gameId, int gameMapId)
        {
            return await ToResultPng(await thumbnailService.ReadMapThumbnailPng(new GameMapIdentifier(gameId, gameMapId)));
        }

        [Route("data/{gameId}/maps/{gameMapId}/thumbnail.webp")]
        [ResponseCache(Duration = CacheDuractionInSeconds, Location = ResponseCacheLocation.Any)]
        public async Task<IResult> GetGameMapThumbnailWebp(int gameId, int gameMapId)
        {
            return await ToResultWebp(await thumbnailService.ReadMapThumbnailWebp(new GameMapIdentifier(gameId, gameMapId)));
        }
    }
}
