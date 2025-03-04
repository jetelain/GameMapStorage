using System.Globalization;
using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SixLabors.ImageSharp.Formats.Png;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.PixelFormats;

namespace GameMapStorageWebSite.Controllers
{
    /// <summary>
    /// Marker images download
    /// </summary>
    public sealed class MarkerController : DownloadControllerBase
    {
        public const int CacheDuractionInSeconds = 4 * 60 * 60; // 4 hours

        private static string PngContentType = PngFormat.Instance.DefaultMimeType;
        private static string WebpContentType = WebpFormat.Instance.DefaultMimeType;

        private readonly IImageMarkerService _markers;
        private readonly GameMapStorageContext _context;

        public MarkerController(IImageMarkerService markers, GameMapStorageContext context)
        {
            this._markers = markers;
            this._context = context;
        }

        [Route("data/{gameId}/markers/{gameMarkerIdOrName}.png")]
        [ResponseCache(Duration = CacheDuractionInSeconds, Location = ResponseCacheLocation.Any)]
        public async Task<IResult> GetGameMarkerPng(int gameId, string gameMarkerIdOrName)
        {
            var marker = await GetMarkerIdentifier(gameId, gameMarkerIdOrName);
            if (marker == null)
            {
                return Results.NotFound();
            }
            return await ToResult(await _markers.ReadMarkerPng(marker), PngContentType);
        }

        [Route("data/{gameId}/markers/{gameMarkerIdOrName}.webp")]
        [ResponseCache(Duration = CacheDuractionInSeconds, Location = ResponseCacheLocation.Any)]
        public async Task<IResult> GetGameMarkerWebp(int gameId, string gameMarkerIdOrName)
        {
            var marker = await GetMarkerIdentifier(gameId, gameMarkerIdOrName);
            if (marker == null)
            {
                return Results.NotFound();
            }
            return await ToResult(await _markers.ReadMarkerWebp(marker), WebpContentType);
        }

        [Route("data/{gameId}/markers/{colorHexOrName}/{gameMarkerIdOrName}.png")]
        [ResponseCache(Duration = CacheDuractionInSeconds, Location = ResponseCacheLocation.Any)]
        public async Task<IResult> GetGameMarkerPng(int gameId, string gameMarkerIdOrName, string colorHexOrName)
        {
            var marker = await GetMarkerIdentifier(gameId, gameMarkerIdOrName);
            if (marker == null)
            {
                return Results.NotFound();
            }
            var color = await GetColor(gameId, colorHexOrName); 
            if (color == null)
            {
                return Results.NotFound();
            }
            return await ToResult(await _markers.ReadMarkerPng(marker, color.Value), PngContentType);
        }

        [Route("data/{gameId}/markers/{colorHexOrName}/{gameMarkerIdOrName}.webp")]
        [ResponseCache(Duration = CacheDuractionInSeconds, Location = ResponseCacheLocation.Any)]
        public async Task<IResult> GetGameMarkerWebp(int gameId, string gameMarkerIdOrName, string colorHexOrName)
        {
            var marker = await GetMarkerIdentifier(gameId, gameMarkerIdOrName);
            if (marker == null)
            {
                return Results.NotFound();
            }
            var color = await GetColor(gameId, colorHexOrName);
            if (color == null)
            {
                return Results.NotFound();
            }
            return await ToResult(await _markers.ReadMarkerWebp(marker, color.Value), WebpContentType);
        }

        private async ValueTask<IGameMarkerIdentifier?> GetMarkerIdentifier(int gameId, string gameMarkerIdOrName)
        {
            if (int.TryParse(gameMarkerIdOrName, CultureInfo.InvariantCulture, out var gameMarkerId))
            {
                return new GameMarkerIdentifier(gameId, gameMarkerId);
            }
            return await _context.GameMarkers.FirstOrDefaultAsync(m => m.GameId == gameId && m.Name.ToLower() == gameMarkerIdOrName.ToLower());
        }

        private async ValueTask<Rgba32?> GetColor(int gameId, string colorHexOrName)
        {
            if (colorHexOrName.Length == 6 && Rgba32.TryParseHex(colorHexOrName, out var color))
            {
                return color;
            }
            var lcaseName = colorHexOrName.ToLower();

            var gameColor = await _context.GameColors.FirstOrDefaultAsync(m => m.GameId == gameId && m.Name.ToLower() == lcaseName);
            if (gameColor == null)
            {
                gameColor = await _context.GameColors.FirstOrDefaultAsync(m => m.GameId == gameId && m.Aliases!.Contains(lcaseName));
                if (gameColor == null)
                {
                    return null;
                }
            }
            return Rgba32.ParseHex(gameColor.Hexadecimal);
        }
    }
}
