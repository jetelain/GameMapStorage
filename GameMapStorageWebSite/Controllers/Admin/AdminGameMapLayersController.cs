using GameMapStorageWebSite.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;

namespace GameMapStorageWebSite.Controllers.Admin
{
    [Authorize("Admin")]
    public class AdminGameMapLayersController : Controller
    {
        private readonly GameMapStorageContext _context;

        public AdminGameMapLayersController(GameMapStorageContext context)
        {
            _context = context;
        }

        // GET: AdminGameMapLayers
        public async Task<IActionResult> Index()
        {
            var gameMapStorageContext = _context.GameMapLayers.Include(g => g.GameMap);
            return View(await gameMapStorageContext.ToListAsync());
        }

        // GET: AdminGameMapLayers/Details/5
        public async Task<IActionResult> Details(int? id)
        {
            if (id == null)
            {
                return NotFound();
            }

            var gameMapLayer = await _context.GameMapLayers
                .Include(g => g.GameMap)
                .FirstOrDefaultAsync(m => m.GameMapLayerId == id);
            if (gameMapLayer == null)
            {
                return NotFound();
            }

            return View(gameMapLayer);
        }

        // GET: AdminGameMapLayers/Create
        public IActionResult Create()
        {
            ViewData["GameMapId"] = new SelectList(_context.GameMaps, "GameMapId", "EnglishTitle");
            return View();
        }

        // POST: AdminGameMapLayers/Create
        // To protect from overposting attacks, enable the specific properties you want to bind to.
        // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create([Bind("GameMapLayerId,Type,Format,MinZoom,MaxZoom,DefaultZoom,IsDefault,TileSize,FactorX,FactorY,Culture,GameMapId")] GameMapLayer gameMapLayer)
        {
            if (ModelState.IsValid)
            {
                gameMapLayer.LastChangeUtc = DateTime.UtcNow;
                _context.Add(gameMapLayer);
                await _context.SaveChangesAsync();
                return RedirectToAction(nameof(Index));
            }
            ViewData["GameMapId"] = new SelectList(_context.GameMaps, "GameMapId", "EnglishTitle", gameMapLayer.GameMapId);
            return View(gameMapLayer);
        }

        // GET: AdminGameMapLayers/Edit/5
        public async Task<IActionResult> Edit(int? id)
        {
            if (id == null)
            {
                return NotFound();
            }

            var gameMapLayer = await _context.GameMapLayers.FindAsync(id);
            if (gameMapLayer == null)
            {
                return NotFound();
            }
            return View(gameMapLayer);
        }

        // POST: AdminGameMapLayers/Edit/5
        // To protect from overposting attacks, enable the specific properties you want to bind to.
        // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(int id, [Bind("GameMapLayerId,Type,Format,State,MinZoom,MaxZoom,DefaultZoom,IsDefault,TileSize,FactorX,FactorY,Culture")] GameMapLayer gameMapLayer)
        {
            if (id != gameMapLayer.GameMapLayerId)
            {
                return NotFound();
            }

            var existing = await _context.GameMapLayers.FindAsync(gameMapLayer.GameMapLayerId);
            if (existing == null)
            {
                return NotFound();
            }
            if (ModelState.IsValid)
            {
                existing.Type = gameMapLayer.Type;
                existing.DefaultZoom = gameMapLayer.DefaultZoom;
                existing.IsDefault = gameMapLayer.IsDefault;
                existing.Culture = gameMapLayer.Culture;
                existing.LastChangeUtc = DateTime.UtcNow;
                _context.Update(existing);
                await _context.SaveChangesAsync();
                return RedirectToAction(nameof(Index));
            }
            return View(gameMapLayer);
        }

        // GET: AdminGameMapLayers/Delete/5
        public async Task<IActionResult> Delete(int? id)
        {
            if (id == null)
            {
                return NotFound();
            }

            var gameMapLayer = await _context.GameMapLayers
                .Include(g => g.GameMap)
                .FirstOrDefaultAsync(m => m.GameMapLayerId == id);
            if (gameMapLayer == null)
            {
                return NotFound();
            }

            return View(gameMapLayer);
        }

        // POST: AdminGameMapLayers/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteConfirmed(int id)
        {
            var gameMapLayer = await _context.GameMapLayers.FindAsync(id);
            if (gameMapLayer != null)
            {
                _context.GameMapLayers.Remove(gameMapLayer);
            }

            await _context.SaveChangesAsync();
            return RedirectToAction(nameof(Index));
        }

        private bool GameMapLayerExists(int id)
        {
            return _context.GameMapLayers.Any(e => e.GameMapLayerId == id);
        }
    }
}
