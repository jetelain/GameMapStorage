using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GameMapStorageWebSite.Controllers.Admin
{
    [Authorize("Admin")]
    public class AdminApiKeysController : Controller
    {
        private readonly GameMapStorageContext _context;

        public AdminApiKeysController(GameMapStorageContext context)
        {
            _context = context;
        }

        // GET: AdminApiKeys
        public async Task<IActionResult> Index()
        {
            return View(await _context.ApiKeys.ToListAsync());
        }

        // GET: AdminApiKeys/Create
        [Authorize("AdminEdit")]
        public IActionResult Create()
        {
            return View();
        }

        // POST: AdminApiKeys/Create
        // To protect from overposting attacks, enable the specific properties you want to bind to.
        // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        [Authorize("AdminEdit")]
        public async Task<IActionResult> Create([Bind("Title")] CreateApiKeyViewModel vm)
        {
            if (ModelState.IsValid)
            {
                var created = ApiKey.Create(vm.Title);
                _context.Add(created.Entity);
                await _context.SaveChangesAsync();
                return View("Created", new CreatedApiKeyViewModel() { ApiKey = created.Entity, ClearText = created.ClearText });
            }
            return View();
        }

        // GET: AdminApiKeys/Delete/5
        [Authorize("AdminEdit")]
        public async Task<IActionResult> Delete(int? id)
        {
            if (id == null)
            {
                return NotFound();
            }

            var apiKey = await _context.ApiKeys
                .FirstOrDefaultAsync(m => m.ApiKeyId == id);
            if (apiKey == null)
            {
                return NotFound();
            }

            return View(apiKey);
        }

        // POST: AdminApiKeys/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        [Authorize("AdminEdit")]
        public async Task<IActionResult> DeleteConfirmed(int id)
        {
            var apiKey = await _context.ApiKeys.FindAsync(id);
            if (apiKey != null)
            {
                _context.ApiKeys.Remove(apiKey);
            }

            await _context.SaveChangesAsync();
            return RedirectToAction(nameof(Index));
        }
    }
}
