using System.Diagnostics;
using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GameMapStorageWebSite.Controllers
{
    [ApiExplorerSettings(IgnoreApi = true)]
    public class HomeController : Controller
    {
        private readonly GameMapStorageContext _context;
        private readonly IAuthenticationSchemeProvider _schemeProvider;

        public HomeController(GameMapStorageContext context, IAuthenticationSchemeProvider schemeProvider)
        {
            _context = context;
            _schemeProvider = schemeProvider;
        }

        public async Task<IActionResult> Index()
        {
            var games = await _context.Games.ToListAsync();

            return View(new HomeIndexViewModel() { Games = games, AcceptWebp = ImagePathHelper.AcceptWebp(Request) });
        }

        [Route("maps/{gameName}")]
        public async Task<IActionResult> Game(string gameName)
        {
            var game = await _context.Games
                .Where(g => g.Name == gameName)
                .FirstOrDefaultAsync();
            if (game == null)
            {
                return NotFound();
            }

            var maps = await _context.GameMaps
                .Include(m => m.Game)
                .Where(m => m.Game == game).ToListAsync();

            return View(new HomeGameViewModel() { Maps = maps, Game = game, AcceptWebp = ImagePathHelper.AcceptWebp(Request) });
        }

        [Route("maps/{gameName}/{mapName}")]
        [Route("maps/{gameName}/{mapName}/{layerId}")]
        public async Task<IActionResult> Map(string gameName, string mapName, int? layerId = null, double? x = null, double? y = null, int? zoom = null, double? w = null, double? h = null)
        {
            var map = await _context.GameMaps
                .Include(m => m.Game)
                .Where(g => g.Name == mapName && g.Game!.Name == gameName)
                .FirstOrDefaultAsync();

            if (map == null)
            {
                map = await _context.GameMaps
                    .Include(m => m.Game)
                    .Where(g => g.Aliases!.Contains(mapName) && g.Game!.Name == gameName)
                    .FirstOrDefaultAsync();

                if (map == null)
                {
                    return NotFound();
                }
            }

            map.Layers = await _context.GameMapLayers
                .Where(m => m.GameMap == map && m.State == LayerState.Ready)
                .ToListAsync();

            map.Locations = await _context.GameMapLocations
                .Where(m => m.GameMap == map)
                .OrderBy(m => m.EnglishTitle)
                .ToListAsync();

            var layer = GetLayer(map.Layers, layerId);
            if (layer == null)
            {
                return View("NotYetAvailable", map);
            }

            return View(new HomeMapViewModel() {
                Game = map.Game!, 
                Map = map, 
                Layer = layer,
                AcceptWebp = ImagePathHelper.AcceptWebp(Request),
                MapInfos = new LayerDisplayOptions()
                {
                    FactorX = layer.FactorX,
                    DefaultPosition = [y ?? (map.SizeInMeters  / 2), x ?? (map.SizeInMeters / 2)],
                    DefaultZoom = zoom ?? layer.DefaultZoom,
                    FactorY = layer.FactorY,
                    MaxZoom = layer.MaxZoom,
                    MinZoom = layer.MinZoom,
                    TilePattern = ImagePathHelper.GetLayerPattern(Request, layer),
                    TileSize = layer.TileSize,
                    Attribution = MapUtils.CombineAttibutions(map.Game!.Attribution, map.AppendAttribution),
                    SizeInMeters = map.SizeInMeters,
                    OriginX = map.OriginX,
                    OriginY = map.OriginY,
                    IsSvg = layer.Format.HasSvg(),
                    Bounds = x != null && y != null && w != null && h != null ? [[y.Value, x.Value], [y.Value + h.Value, x.Value + w.Value]] : null
                }
            });
        }

        private GameMapLayer? GetLayer(List<GameMapLayer> layers, int? layerId)
        {
            if (layerId != null)
            {
                return layers.Where(m => m.GameMapLayerId == layerId).FirstOrDefault();
            }
            return layers.Where(m => m.IsDefault).FirstOrDefault();
        }

        public IActionResult Privacy()
        {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }

        [HttpPost]
        public async Task<IActionResult> SignInUser([FromForm] string provider, [FromForm] bool isPersistent)
        {
            if (string.IsNullOrWhiteSpace(provider))
            {
                return BadRequest();
            }
            if (!(await _schemeProvider.GetAllSchemesAsync()).Any(s => !string.IsNullOrEmpty(s.DisplayName) && string.Equals(s.Name, provider, StringComparison.OrdinalIgnoreCase)))
            {
                return BadRequest();
            }
            return Challenge(new AuthenticationProperties { RedirectUri = "/", IsPersistent = isPersistent }, provider);
        }

        [HttpGet, HttpPost]
        public IActionResult SignOutUser()
        {
            return SignOut(new AuthenticationProperties { RedirectUri = "/" },
                CookieAuthenticationDefaults.AuthenticationScheme);
        }

        public IActionResult Denied() => View("Denied");
    }
}
