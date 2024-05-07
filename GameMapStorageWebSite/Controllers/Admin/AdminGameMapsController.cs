using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using SixLabors.ImageSharp;

namespace GameMapStorageWebSite.Controllers.Admin
{
    [Authorize("Admin")]
    public class AdminGameMapsController : Controller
    {
        private readonly GameMapStorageContext _context;
        private readonly IHttpClientFactory _factory;
        private readonly IThumbnailService _thumbnailService;

        public AdminGameMapsController(GameMapStorageContext context, IHttpClientFactory factory, IThumbnailService thumbnailService)
        {
            _context = context;
            _factory = factory;
            _thumbnailService = thumbnailService;
        }

        // GET: Admin/GameMaps
        public async Task<IActionResult> Index()
        {
            var gameMapStorageContext = _context.GameMaps.Include(g => g.Game);
            return View(await gameMapStorageContext.ToListAsync());
        }

        // GET: Admin/GameMaps/Details/5
        public async Task<IActionResult> Details(int? id)
        {
            if (id == null)
            {
                return NotFound();
            }

            var gameMap = await _context.GameMaps
                .Include(g => g.Game)
                .FirstOrDefaultAsync(m => m.GameMapId == id);
            if (gameMap == null)
            {
                return NotFound();
            }

            return View(gameMap);
        }

        // GET: Admin/GameMaps/Create
        public IActionResult Create()
        {
            ViewData["GameId"] = new SelectList(_context.Games, "GameId", "EnglishTitle");
            return View();
        }

        // POST: Admin/GameMaps/Create
        // To protect from overposting attacks, enable the specific properties you want to bind to.
        // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create([Bind("GameMapId,EnglishTitle,AppendAttribution,SteamWorkshopId,OfficialSiteUri,SizeInMeters,Name,GameId")] GameMap gameMap, string? aliases)
        {
            if (ModelState.IsValid)
            {
                gameMap.LastChangeUtc = DateTime.UtcNow;
                gameMap.Aliases = GetAliases(aliases);
                _context.Add(gameMap);
                await _context.SaveChangesAsync();
                return RedirectToAction(nameof(Index));
            }
            ViewData["GameId"] = new SelectList(_context.Games, "GameId", "EnglishTitle", gameMap.GameId);
            return View(gameMap);
        }

        // GET: Admin/GameMaps/Edit/5
        public async Task<IActionResult> Edit(int? id)
        {
            if (id == null)
            {
                return NotFound();
            }

            var gameMap = await _context.GameMaps.Include(m => m.Game).FirstOrDefaultAsync(m => m.GameMapId == id);
            if (gameMap == null)
            {
                return NotFound();
            }
            return View(gameMap);
        }

        // POST: Admin/GameMaps/Edit/5
        // To protect from overposting attacks, enable the specific properties you want to bind to.
        // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(int id, [Bind("GameMapId,EnglishTitle,AppendAttribution,SteamWorkshopId,OfficialSiteUri,SizeInMeters,Name")] GameMap gameMap, string? aliases)
        {
            if (id != gameMap.GameMapId)
            {
                return NotFound();
            }
            var existing = await _context.GameMaps.Include(m => m.Game).FirstOrDefaultAsync(m => m.GameMapId == id);
            if (existing == null)
            {
                return NotFound();
            }
            if (ModelState.IsValid)
            {
                existing.EnglishTitle = gameMap.EnglishTitle;
                existing.AppendAttribution = gameMap.AppendAttribution;
                existing.SteamWorkshopId = gameMap.SteamWorkshopId;
                existing.OfficialSiteUri = gameMap.OfficialSiteUri;
                existing.SizeInMeters = gameMap.SizeInMeters;
                existing.Name = gameMap.Name;
                existing.Aliases = GetAliases(aliases);
                existing.LastChangeUtc = DateTime.UtcNow;
                existing.CitiesCount = await _context.GameMapLocations.Where(l => l.GameMapId == gameMap.GameMapId && l.Type == LocationType.City).CountAsync();
                _context.Update(existing);
                await _context.SaveChangesAsync();
                return RedirectToAction(nameof(Index));
            }
            return View(gameMap);
        }

        private string[]? GetAliases(string? aliases)
        {
            if (string.IsNullOrEmpty(aliases) )
            {
                return [];
            }
            return aliases.Split(';', ',').Select(a => a.Trim()).Where(a => !string.IsNullOrEmpty(a)).ToArray();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> SetThumbnail(int id, int gameMapId, string imageUri)
        {
            if (id != gameMapId)
            {
                return NotFound();
            }
            var map = await _context.GameMaps.Include(m => m.Game).FirstOrDefaultAsync(m => m.GameMapId == id);
            if (map == null)
            {
                return NotFound();
            }
            if (!string.IsNullOrEmpty(imageUri))
            {
                try
                {
                    using var stream = await _factory.CreateClient("CDN").GetStreamAsync(imageUri);
                    using var image = await Image.LoadAsync(stream);
                    await _thumbnailService.SetMapThumbnail(map, image);
                }
                catch (Exception e)
                {
                    ViewBag.ImageError = e.Message;
                    return View(nameof(Edit), map);
                }
                return RedirectToAction(nameof(Index));
            }
            return View(nameof(Edit), map);
        }

        // GET: Admin/GameMaps/Delete/5
        public async Task<IActionResult> Delete(int? id)
        {
            if (id == null)
            {
                return NotFound();
            }

            var gameMap = await _context.GameMaps
                .Include(g => g.Game)
                .FirstOrDefaultAsync(m => m.GameMapId == id);
            if (gameMap == null)
            {
                return NotFound();
            }

            return View(gameMap);
        }

        // POST: Admin/GameMaps/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteConfirmed(int id)
        {
            var gameMap = await _context.GameMaps.FindAsync(id);
            if (gameMap != null)
            {
                _context.GameMaps.Remove(gameMap);
            }

            await _context.SaveChangesAsync();
            return RedirectToAction(nameof(Index));
        }
    }
}
