using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Models;
using GameMapStorageWebSite.Services;
using GameMapStorageWebSite.Services.Mirroring;
using GameMapStorageWebSite.Works.MigrateArma3Maps;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GameMapStorageWebSite.Controllers.Admin
{
    [Authorize("Admin")]
    public class AdminBackgroundWorksController : Controller
    {
        private readonly GameMapStorageContext _context;
        private readonly IMigrateArma3MapFactory _migrateArma3MapFactory;
        private readonly IDataConfigurationService _dataConfiguration;
        private readonly IMirrorService _mirrorService;

        public AdminBackgroundWorksController(GameMapStorageContext context, IMigrateArma3MapFactory migrateArma3MapFactory, IDataConfigurationService dataConfiguration, IMirrorService mirrorService)
        {
            _context = context;
            _migrateArma3MapFactory = migrateArma3MapFactory;
            _dataConfiguration = dataConfiguration;
            _mirrorService = mirrorService;
        }

        // GET: AdminBackgroundWorks
        public async Task<IActionResult> Index()
        {
            var gameMapStorageContext = _context.Works.Include(b => b.GameMapLayer);
            ViewBag.DataMode = _dataConfiguration.Mode;
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
        public async Task<IActionResult> SyncArma3Map()
        {
            if (_dataConfiguration.Mode == DataMode.Mirror)
            {
                return Forbid();
            }
            await _migrateArma3MapFactory.IncrementalWorkLoad();
            return RedirectToAction(nameof(Index));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> SyncMirror()
        {
            if (_dataConfiguration.Mode != DataMode.Mirror)
            {
                return Forbid();
            }
            var report = await _mirrorService.UpdateMirror();
            var vm = new SyncMirrorViewModel(report);
            vm.PendingCount = await _context.Works.CountAsync(w => w.State == BackgroundWorkState.Pending && w.Type == BackgroundWorkType.MirrorLayer);
            return View(vm);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Restart(int id)
        {
            var backgroundWork = await _context.Works.FindAsync(id);
            if (backgroundWork != null)
            {
                backgroundWork.Error = null;
                backgroundWork.FinishedUtc = null;
                backgroundWork.StartedUtc = null;
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
