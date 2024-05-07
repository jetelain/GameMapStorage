using GameMapStorageWebSite.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GameMapStorageWebSite.Controllers.Admin
{
    [Authorize("Admin")]
    public class AdminBackgroundWorksController : Controller
    {
        private readonly GameMapStorageContext _context;

        public AdminBackgroundWorksController(GameMapStorageContext context)
        {
            _context = context;
        }

        // GET: AdminBackgroundWorks
        public async Task<IActionResult> Index()
        {
            var gameMapStorageContext = _context.Works.Include(b => b.GameMapLayer);
            return View(await gameMapStorageContext.ToListAsync());
        }

        // GET: AdminBackgroundWorks/Details/5
        public async Task<IActionResult> Details(int? id)
        {
            if (id == null)
            {
                return NotFound();
            }

            var backgroundWork = await _context.Works
                .Include(b => b.GameMapLayer)
                .FirstOrDefaultAsync(m => m.BackgroundWorkId == id);
            if (backgroundWork == null)
            {
                return NotFound();
            }

            return View(backgroundWork);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Restart(int id)
        {
            var backgroundWork = await _context.Works.FindAsync(id);
            if (backgroundWork != null)
            {
                backgroundWork.Error = null;
                backgroundWork.State = BackgroundWorkState.Pending;
                _context.Update(backgroundWork);
                await _context.SaveChangesAsync();
            }
            return RedirectToAction(nameof(Details), new { id });
        }

        // GET: AdminBackgroundWorks/Delete/5
        public async Task<IActionResult> Delete(int? id)
        {
            if (id == null)
            {
                return NotFound();
            }

            var backgroundWork = await _context.Works
                .Include(b => b.GameMapLayer)
                .FirstOrDefaultAsync(m => m.BackgroundWorkId == id);
            if (backgroundWork == null)
            {
                return NotFound();
            }

            return View(backgroundWork);
        }

        // POST: AdminBackgroundWorks/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteConfirmed(int id)
        {
            var backgroundWork = await _context.Works.FindAsync(id);
            if (backgroundWork != null)
            {
                _context.Works.Remove(backgroundWork);
            }

            await _context.SaveChangesAsync();
            return RedirectToAction(nameof(Index));
        }

        private bool BackgroundWorkExists(int id)
        {
            return _context.Works.Any(e => e.BackgroundWorkId == id);
        }
    }
}
