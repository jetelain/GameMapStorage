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
    public class AdminGameMarkersController : Controller
    {
        private readonly GameMapStorageContext _context;
        private readonly IImageMarkerService _imageMarkerService;

        public AdminGameMarkersController(GameMapStorageContext context, IImageMarkerService imageMarkerService)
        {
            _context = context;
            _imageMarkerService = imageMarkerService;
        }

        // GET: AdminGameMarkers
        public async Task<IActionResult> Index()
        {
            var gameMapStorageContext = _context.GameMarkers.Include(g => g.Game);
            return View(await gameMapStorageContext.ToListAsync());
        }

        // GET: AdminGameMarkers/Details/5
        public async Task<IActionResult> Details(int? id)
        {
            if (id == null)
            {
                return NotFound();
            }

            var gameMarker = await _context.GameMarkers
                .Include(g => g.Game)
                .FirstOrDefaultAsync(m => m.GameMarkerId == id);
            if (gameMarker == null)
            {
                return NotFound();
            }

            return View(gameMarker);
        }

        // GET: AdminGameMarkers/Create
        [Authorize("AdminEdit")]
        public IActionResult Create()
        {
            ViewData["GameId"] = new SelectList(_context.Games, "GameId", "EnglishTitle");
            return View();
        }

        // POST: AdminGameMarkers/Create
        // To protect from overposting attacks, enable the specific properties you want to bind to.
        // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        [Authorize("AdminEdit")]
        public async Task<IActionResult> Create([Bind("EnglishTitle,Name,Usage,IsColorCompatible,MilSymbolEquivalent,SteamWorkshopId,GameId")] GameMarker gameMarker, IFormFile? image)
        {
            if (ModelState.IsValid)
            {
                _context.Add(gameMarker);
                await UpdateGameTimestamp(gameMarker);
                await _context.SaveChangesAsync();
                if (image != null)
                {
                    await SetImage(gameMarker, image);
                    await _context.SaveChangesAsync();
                }
                return RedirectToAction(nameof(Index));
            }
            ViewData["GameId"] = new SelectList(_context.Games, "GameId", "EnglishTitle", gameMarker.GameId);
            return View(gameMarker);
        }

        private async Task SetImage(GameMarker gameMarker, IFormFile imageFile)
        {
            using var stream = imageFile.OpenReadStream();
            using var image = await Image.LoadAsync(stream);
            await _imageMarkerService.SetMarkerImage(gameMarker, image);
            gameMarker.ImageLastChangeUtc = DateTime.UtcNow;
            
        }

        // GET: AdminGameMarkers/Edit/5
        [Authorize("AdminEdit")]
        public async Task<IActionResult> Edit(int? id)
        {
            if (id == null)
            {
                return NotFound();
            }

            var gameMarker = await _context.GameMarkers.FindAsync(id);
            if (gameMarker == null)
            {
                return NotFound();
            }
            ViewData["GameId"] = new SelectList(_context.Games, "GameId", "EnglishTitle", gameMarker.GameId);
            return View(gameMarker);
        }

        // POST: AdminGameMarkers/Edit/5
        // To protect from overposting attacks, enable the specific properties you want to bind to.
        // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        [Authorize("AdminEdit")]
        public async Task<IActionResult> Edit(int id, [Bind("GameMarkerId,EnglishTitle,Name,Usage,IsColorCompatible,MilSymbolEquivalent,SteamWorkshopId,GameId")] GameMarker gameMarker, IFormFile? image)
        {
            if (id != gameMarker.GameMarkerId)
            {
                return NotFound();
            }

            if (ModelState.IsValid)
            {
                try
                {
                    _context.Update(gameMarker);
                    if (image == null)
                    {
                        var gameMarkerExisting = await _context.GameMarkers.AsNoTracking().FirstOrDefaultAsync(m => m.GameMarkerId == id);
                        gameMarker.ImageLastChangeUtc = gameMarkerExisting?.ImageLastChangeUtc;
                    }
                    else
                    {
                        await SetImage(gameMarker, image);
                    }
                    await UpdateGameTimestamp(gameMarker);
                    await _context.SaveChangesAsync();
                }
                catch (DbUpdateConcurrencyException)
                {
                    if (!GameMarkerExists(gameMarker.GameMarkerId))
                    {
                        return NotFound();
                    }
                    else
                    {
                        throw;
                    }
                }
                return RedirectToAction(nameof(Index));
            }
            ViewData["GameId"] = new SelectList(_context.Games, "GameId", "EnglishTitle", gameMarker.GameId);
            return View(gameMarker);
        }

        // GET: AdminGameMarkers/Delete/5
        [Authorize("AdminEdit")]
        public async Task<IActionResult> Delete(int? id)
        {
            if (id == null)
            {
                return NotFound();
            }

            var gameMarker = await _context.GameMarkers
                .Include(g => g.Game)
                .FirstOrDefaultAsync(m => m.GameMarkerId == id);
            if (gameMarker == null)
            {
                return NotFound();
            }

            return View(gameMarker);
        }

        // POST: AdminGameMarkers/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        [Authorize("AdminEdit")]
        public async Task<IActionResult> DeleteConfirmed(int id)
        {
            var gameMarker = await _context.GameMarkers.FindAsync(id);
            if (gameMarker != null)
            {
                _context.GameMarkers.Remove(gameMarker);
            }

            await _context.SaveChangesAsync();
            return RedirectToAction(nameof(Index));
        }

        private bool GameMarkerExists(int id)
        {
            return _context.GameMarkers.Any(e => e.GameMarkerId == id);
        }
        private async Task UpdateGameTimestamp(GameMarker gameMarker)
        {
            var game = await _context.Games.FindAsync(gameMarker.GameId);
            if (game != null)
            {
                game.LastChangeUtc = DateTime.UtcNow;
                _context.Update(game);
            }
        }
    }
}
