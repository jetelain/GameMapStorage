﻿using System.Globalization;
using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Models.Json;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Http.Extensions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GameMapStorageWebSite.Controllers
{
    /// <summary>
    /// API to query game maps and data
    /// </summary>
    [ApiController]
    [Route("api/v1")]
    [EnableCors("Api")]
    public sealed class ApiV1Controller : Controller
    {
        private readonly GameMapStorageContext context;

        public ApiV1Controller(GameMapStorageContext context)
        {
            this.context = context;
        }

        private WebPathBuilder GetPathBuilder()
        {
            return new WebPathBuilder(new Uri(new Uri(Request.GetEncodedUrl()), "/").AbsoluteUri.TrimEnd('/'), ImagePathHelper.AcceptWebp(Request));
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

        /// <summary>
        /// List supported games
        /// </summary>
        /// <returns></returns>
        [HttpGet]
        [Route("games")]
        [Produces<GameJsonBase[]>]
        public async Task<IActionResult> GetGames()
        {
            var pathBuilder = GetPathBuilder();
            return Json((await context.Games.ToListAsync()).Select(g => new GameJsonBase(g, pathBuilder)).ToList());
        }

        /// <summary>
        /// Get game metadata, standard markers, and standard colors
        /// </summary>
        /// <param name="gameNameOrId">Game name ('arma3') or GameId (1)</param>
        /// <returns></returns>
        [HttpGet]
        [Route("games/{gameNameOrId}")]
        [Produces<GameJson>]
        public async Task<IActionResult> GetGame(string gameNameOrId)
        {
            var game = await FindGame(gameNameOrId);
            if (game == null)
            {
                return NotFound();
            }
            var pathBuilder = GetPathBuilder();
            var gameJson = new GameJson(game, pathBuilder);
            gameJson.Colors = (await context.GameColors.Where(c => c.GameId == game.GameId).ToListAsync()).Select(c => new GameColorJson(c)).ToList();
            gameJson.Markers = (await context.GameMarkers.Where(c => c.GameId == game.GameId).ToListAsync()).Select(c => new GameMarkerJson(c, pathBuilder)).ToList();
            return Json(gameJson);
        }

        /// <summary>
        /// List available maps of a game
        /// </summary>
        /// <param name="gameNameOrId">Game name ('arma3') or GameId (1)</param>
        /// <returns></returns>
        [HttpGet]
        [Route("games/{gameNameOrId}/maps")]
        [Produces<GameMapJsonBase[]>]
        public async Task<IActionResult> GetMaps(string gameNameOrId)
        {
            var game = await FindGame(gameNameOrId);
            if (game == null)
            {
                return NotFound();
            }
            var maps = await context.GameMaps.Where(c => c.GameId == game.GameId).ToListAsync();
            await context.GameMapLayers.Where(l => l.GameMap!.GameId == game.GameId && l.State == LayerState.Ready).ToListAsync();
            var pathBuilder = GetPathBuilder();
            var useWebp = ImagePathHelper.AcceptWebp(Request);
            return Json(maps.Select(m => new GameMapJsonBase(m, pathBuilder) { Layers = GameMapLayerJson.CreateList(m.Layers, pathBuilder) }).ToList());
        }

        /// <summary>
        /// Get map metadata, available layers, and locations
        /// </summary>
        /// <param name="gameNameOrId">Game name ('arma3') or GameId (1)</param>
        /// <param name="mapNameOrId">Map name ('altis') or GameMapId (1)</param>
        /// <returns></returns>
        [HttpGet]
        [Route("games/{gameNameOrId}/maps/{mapNameOrId}")]
        [Produces<GameMapJson>]
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
            var pathBuilder = GetPathBuilder();
            var useWebp = ImagePathHelper.AcceptWebp(Request);
            var mapJson = new GameMapJson(map, pathBuilder);
            mapJson.Attribution = MapUtils.CombineAttibutions(game.Attribution, map.AppendAttribution);
            mapJson.Layers = GameMapLayerJson.CreateList(await context.GameMapLayers.Where(l => l.GameMapId == map.GameMapId && l.State == LayerState.Ready).ToListAsync(), pathBuilder);
            mapJson.Locations = (await context.GameMapLocations.Where(l => l.GameMapId == map.GameMapId).ToListAsync()).Select(l => new GameMapLocationJson(l)).ToList();
            return Json(mapJson);
        }

        /// <summary>
        /// List paper maps of a map
        /// </summary>
        /// <param name="gameNameOrId">Game name ('arma3') or GameId (1)</param>
        /// <param name="mapNameOrId">Map name ('altis') or GameMapId (1)</param>
        /// <returns></returns>
        [HttpGet]
        [Route("games/{gameNameOrId}/maps/{mapNameOrId}/papermaps")]
        [Produces<GamePaperMapJson[]>]
        public async Task<IActionResult> GetMapPaperMaps(string gameNameOrId, string mapNameOrId)
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
            var pathBuilder = GetPathBuilder();

            var papermaps = await context.GamePaperMaps
                .Where(p => p.GameMapId == map.GameMapId && p.FileSize > 0)
                .ToListAsync();

            return Json(papermaps.Select(m => new GamePaperMapJson(m, pathBuilder)).ToList());
        }

        /// <summary>
        /// List paper maps of all maps of a game
        /// </summary>
        /// <param name="gameNameOrId">Game name ('arma3') or GameId (1)</param>
        /// <returns></returns>
        [HttpGet]
        [Route("games/{gameNameOrId}/papermaps")]
        [Produces<GamePaperMapMapJson[]>]
        public async Task<IActionResult> GetMapPaperMaps(string gameNameOrId)
        {
            var game = await FindGame(gameNameOrId);
            if (game == null)
            {
                return NotFound();
            }

            var pathBuilder = GetPathBuilder();

            var papermaps = await context.GamePaperMaps
                .Include(p => p.GameMap)
                .Where(p => p.GameMap!.GameId == game.GameId && p.FileSize > 0)
                .ToListAsync();

            return Json(papermaps.Select(m => new GamePaperMapMapJson(m, pathBuilder)).ToList());
        }
    }
}
