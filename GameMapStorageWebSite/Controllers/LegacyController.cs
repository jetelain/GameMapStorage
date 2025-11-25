using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Web;
using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Legacy;
using Microsoft.AspNetCore.Http.Extensions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GameMapStorageWebSite.Controllers
{
    /// <summary>
    /// Allow existing instances of cTabIRL and Arma3TacMap to use our maps
    /// </summary>
    [ApiExplorerSettings(IgnoreApi = true)]
    public class LegacyController : Controller
    {
        private readonly GameMapStorageContext context;

        public LegacyController(GameMapStorageContext context)
        {
            this.context = context;
        }

        [Route("data/{gameId}/css/mapUtils.css")]
        [ResponseCache(VaryByHeader = "Accept", Duration = 3600, Location = ResponseCacheLocation.Any)]
        public IActionResult GetMapUtilsCss(int gameId)
        {
            return RedirectPermanent("/css/map-utils.css");
        }

        [Route("data/{gameId}/js/mapUtils.js")]
        [ResponseCache(VaryByHeader = "Accept", Duration = 3600, Location = ResponseCacheLocation.Any)]
        public IActionResult GetMapUtilsJs(int gameId)
        {
            return RedirectPermanent("/js/legacy-map-utils.js");
        }

        [Route("data/{gameId}/js/defaultMap.js")]
        [ResponseCache(VaryByHeader = "Accept", Duration = 3600, Location = ResponseCacheLocation.Any)]
        public IActionResult GetDefaultMap(int gameId)
        {
            return RedirectPermanent("/js/legacy-default-map.js");
        }

        [Route("data/{gameId}/maps/all.js")]
        [ResponseCache(VaryByHeader = "Accept", Duration = 3600, Location = ResponseCacheLocation.Any)]
        public async Task<IActionResult> GetAllJs(int gameId)
        {
            var layers = await context.GameMapLayers
                .Include(l => l.GameMap)
                .Include(l => l.GameMap!.Game)
                .Where(l => l.IsDefault && l.GameMap!.GameId == gameId)
                .ToListAsync();

            var locations = await context.GameMapLocations
                .Where(c => c.GameMap!.GameId == gameId && c.Type == LocationType.City)
                .ToListAsync();

            var basePath = GetBasePath();

            var sb = new StringBuilder();

            foreach (var layer in layers)
            {
                Append(sb, CreateInfo(layer, locations, basePath), layer);
            }

            return Content(sb.ToString(), "text/javascript;charset=utf-8", Encoding.UTF8);
        }

        private string GetBasePath()
        {
            return new Uri(new Uri(Request.GetEncodedUrl()), "/").AbsoluteUri.TrimEnd('/');
        }

        private LegacyMapInfos CreateInfo(GameMapLayer layer, List<GameMapLocation> locations, string basePath)
        {
            var suffix = $"/data/{layer.GameMap!.GameId}";

            return new LegacyMapInfos()
            {
                fullMapTile = ImagePathHelper.GetLayerPreview(Request, layer).Substring(suffix.Length),
                attribution = HttpUtility.HtmlEncode(layer.GameMap.Game!.Attribution + ", " + layer.GameMap.AppendAttribution),
                defaultZoom = layer.DefaultZoom,
                maxZoom = layer.MaxZoom,
                minZoom = layer.MinZoom,
                tilePattern = ImagePathHelper.GetLayerPattern(Request, layer).Substring(suffix.Length),
                worldName = layer.GameMap.Name,
                worldSize = layer.GameMap.SizeInMeters,
                title = layer.GameMap.EnglishTitle,
                tileSize = layer.TileSize,
                center = new List<int>() { (int)layer.GameMap.SizeInMeters / 2, (int)layer.GameMap.SizeInMeters / 2 },
                dlc = string.IsNullOrEmpty(layer.GameMap.SteamWorkshopId) ? layer.GameMap.OfficialSiteUri : null,
                preview = basePath + ImagePathHelper.GetThumbnail(Request, layer.GameMap),
                steamWorkshop = !string.IsNullOrEmpty(layer.GameMap.SteamWorkshopId) ? $"https://steamcommunity.com/workshop/filedetails/?id={layer.GameMap.SteamWorkshopId}" : null,
                cities = locations.Where(c => c.GameMapId == layer.GameMapId).Select(c => new LegacyCityInfo() { name =c.EnglishTitle, x = c.X, y = c.Y }).ToList()
            };
        }

        private static void Append(StringBuilder sb, LegacyMapInfos legacyMapInfos, GameMapLayer layer)
        {
            var json = JsonSerializer.Serialize(legacyMapInfos, new JsonSerializerOptions() { WriteIndented = true });
            var aliases = layer.GameMap?.Aliases;
            if (aliases != null)
            {
                foreach (var alias in aliases)
                {
                    sb.Append($@"Arma3Map.Maps['{alias}'] =");
                }
            }
            sb.Append($@"Arma3Map.Maps['{layer.GameMap!.Name}'] = {{
  CRS: MGRS_CRS({layer.FactorX.ToString(CultureInfo.InvariantCulture)}, {layer.FactorY.ToString(CultureInfo.InvariantCulture)}, {layer.TileSize}),
{json.Substring(1).TrimStart('\r','\n')};");
        }

        [Route("data/{gameId}/maps/all.json")]
        [ResponseCache(VaryByHeader = "Accept", Duration = 3600, Location = ResponseCacheLocation.Any)]
        public async Task<IActionResult> GetAllJson(int gameId)
        {
            var layers = await context.GameMapLayers
                .Include(l => l.GameMap)
                .Include(l => l.GameMap!.Game)
                .Where(l => l.IsDefault && l.GameMap!.GameId == gameId)
                .ToListAsync();

            var locations = await context.GameMapLocations
                .Where(c => c.GameMap!.GameId == gameId && c.Type == LocationType.City)
                .ToListAsync();

            var basePath = GetBasePath();

            var dict = new Dictionary<string, LegacyMapInfos>();
            foreach (var layer in layers)
            {
                var name = layer.GameMap!.Name;
                if (!string.IsNullOrEmpty(name))
                {
                    dict[name] = CreateInfo(layer, locations, basePath);
                }
            }
            return Json(dict);
        }

        [Route("data/{gameId}/maps/{name}.js")]
        [ResponseCache(VaryByHeader = "Accept", Duration = 3600, Location = ResponseCacheLocation.Any)]
        public async Task<IActionResult> GetMapJs(int gameId, string name)
        {
            var layer = await context.GameMapLayers
                .Include(l => l.GameMap)
                .Include(l => l.GameMap!.Game)
                .Where(l => l.IsDefault && l.GameMap!.GameId == gameId && (l.GameMap.Name == name || l.GameMap!.Aliases!.Contains(name)))
                .FirstOrDefaultAsync();

            if ( layer == null)
            {
                return NotFound();
            }

            var locations = await context.GameMapLocations
                .Where(c => c.GameMap!.GameId == gameId && c.Type == LocationType.City && c.GameMapId == layer.GameMapId)
                .ToListAsync();

            var basePath = GetBasePath();

            var sb = new StringBuilder();

            Append(sb, CreateInfo(layer, locations, basePath), layer);
            
            return Content(sb.ToString(), "text/javascript;charset=utf-8", Encoding.UTF8);
        }
    }
}
