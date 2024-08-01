using GameMapStorageWebSite.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;

namespace GameMapStorageWebSite.Controllers.Admin
{
    [Authorize("Admin")]
    public class AdminGamePaperMapsController : Controller
    {
        private readonly GameMapStorageContext _context;

        public AdminGamePaperMapsController(GameMapStorageContext context)
        {
            _context = context;
        }

        // GET: AdminGamePaperMaps
        public async Task<IActionResult> Index()
        {
            var gameMapStorageContext = _context.GamePaperMaps.Include(g => g.GameMap);
            return View(await gameMapStorageContext.ToListAsync());
        }

        // GET: AdminGamePaperMaps/Details/5
        public async Task<IActionResult> Details(int? id)
        {
            if (id == null)
            {
                return NotFound();
            }

            var gamePaperMap = await _context.GamePaperMaps
                .Include(g => g.GameMap)
                .Include(g => g.GameMap!.Game)
                .FirstOrDefaultAsync(m => m.GamePaperMapId == id);
            if (gamePaperMap == null)
            {
                return NotFound();
            }

            return View(gamePaperMap);
        }

        // GET: AdminGamePaperMaps/Delete/5
        [Authorize("AdminEdit")]
        public async Task<IActionResult> Delete(int? id)
        {
            if (id == null)
            {
                return NotFound();
            }

            var gamePaperMap = await _context.GamePaperMaps
                .Include(g => g.GameMap)
                .Include(g => g.GameMap!.Game)
                .FirstOrDefaultAsync(m => m.GamePaperMapId == id);
            if (gamePaperMap == null)
            {
                return NotFound();
            }

            return View(gamePaperMap);
        }

        // POST: AdminGamePaperMaps/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        [Authorize("AdminEdit")]
        public async Task<IActionResult> DeleteConfirmed(int id)
        {
            var gamePaperMap = await _context.GamePaperMaps.FindAsync(id);
            if (gamePaperMap != null)
            {
                _context.GamePaperMaps.Remove(gamePaperMap);
            }

            await _context.SaveChangesAsync();
            return RedirectToAction(nameof(Index));
        }

        private bool GamePaperMapExists(int id)
        {
            return _context.GamePaperMaps.Any(e => e.GamePaperMapId == id);
        }
    }
}
