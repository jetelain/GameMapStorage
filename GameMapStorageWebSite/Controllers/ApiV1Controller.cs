using System.Globalization;
using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Models.Json;
using Microsoft.AspNetCore.Http.Extensions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GameMapStorageWebSite.Controllers
{
    [ApiController]
    [Route("api/v1")]
    public sealed class ApiV1Controller : Controller
    {
        private readonly GameMapStorageContext context;

        public ApiV1Controller(GameMapStorageContext context)
        {
            this.context = context;
        }

        private string GetBasePath()
        {
            return new Uri(new Uri(Request.GetEncodedUrl()), "/").AbsoluteUri.TrimEnd('/');
        }

        private async Task<Game?> FindGame(string gameNameOrId)
        {
            if (int.TryParse(gameNameOrId, CultureInfo.InvariantCulture, out var gameId))
            {
                return await context.Games.FirstOrDefaultAsync(g => g.GameId == gameId);
            }
            return await context.Games.FirstOrDefaultAsync(g => g.Name == gameNameOrId);
        }

        private async Task<GameMap?> FindMap(Game game, string mapNameOrId)
        {
            if (int.TryParse(mapNameOrId, CultureInfo.InvariantCulture, out var gameMapId))
            {
                return await context.GameMaps.FirstOrDefaultAsync(g => g.GameId == game.GameId && g.GameMapId == gameMapId);
            }
            return await context.GameMaps.FirstOrDefaultAsync(g => g.GameId == game.GameId && (g.Name == mapNameOrId || g.Aliases!.Contains(mapNameOrId)));
        }

        [HttpGet]
        [Route("games")]
        public async Task<IActionResult> GetGames()
        {
            var basePath = GetBasePath();
            var useWebp = ImagePathHelper.AcceptWebp(Request);
            return Json((await context.Games.ToListAsync()).Select(g => new GameJson(g, basePath, useWebp)).ToList());
        }

        [HttpGet]
        [Route("games/{gameNameOrId}")]
        public async Task<IActionResult> GetGame(string gameNameOrId)
        {
            var game = await FindGame(gameNameOrId);
            if (game == null)
            {
                return NotFound();
            }
            var basePath = GetBasePath();
            var useWebp = ImagePathHelper.AcceptWebp(Request);
            var gameJson = new GameJson(game, basePath, useWebp);
            gameJson.Colors = (await context.GameColors.Where(c => c.GameId == game.GameId).ToListAsync()).Select(c => new GameColorJson(c)).ToList();
            gameJson.Markers = (await context.GameMarkers.Where(c => c.GameId == game.GameId).ToListAsync()).Select(c => new GameMarkerJson(c)).ToList();
            return Json(gameJson);
        }

        [HttpGet]
        [Route("games/{gameNameOrId}/maps")]
        public async Task<IActionResult> GetMaps(string gameNameOrId)
        {
            var game = await FindGame(gameNameOrId);
            if (game == null)
            {
                return NotFound();
            }
            var maps = await context.GameMaps.Where(c => c.GameId == game.GameId).ToListAsync();
            await context.GameMapLayers.Where(l => l.GameMap!.GameId == game.GameId).ToListAsync();
            var basePath = GetBasePath();
            var useWebp = ImagePathHelper.AcceptWebp(Request);
            return Json(maps.Select(m => new GameMapJson(m, basePath, useWebp) { Layers = GetLayers(m.Layers!, basePath, useWebp) }).ToList());
        }

        private List<GameMapLayerJson> GetLayers(IEnumerable<GameMapLayer> layers, string basePath, bool useWebp)
        {
            return layers.Select(l => new GameMapLayerJson(l, basePath, useWebp)).ToList();
        }

        [HttpGet]
        [Route("games/{gameNameOrId}/maps/{mapNameOrId}")]
        public async Task<IActionResult> GetMap(string gameNameOrId, string mapNameOrId)
        {
            var game = await FindGame(gameNameOrId);
            if (game == null)
            {
                return NotFound();
            }
            var map = await FindMap(game, mapNameOrId);
            if (map == null)
            {
                return NotFound();
            }
            var basePath = GetBasePath();
            var useWebp = ImagePathHelper.AcceptWebp(Request);
            var mapJson = new GameMapJson(map, basePath, useWebp);
            mapJson.Layers = GetLayers(await context.GameMapLayers.Where(l => l.GameMapId == map.GameMapId).ToListAsync(), basePath, useWebp);
            mapJson.Locations = (await context.GameMapLocations.Where(l => l.GameMapId == map.GameMapId).ToListAsync()).Select(l => new GameMapLocationJson(l)).ToList();
            return Json(mapJson);
        }

    }
}
