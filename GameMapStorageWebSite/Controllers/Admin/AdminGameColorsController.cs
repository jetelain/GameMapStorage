using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using GameMapStorageWebSite.Entities;
using Microsoft.AspNetCore.Authorization;

namespace GameMapStorageWebSite.Controllers.Admin
{
    [Authorize("Admin")]
    public class AdminGameColorsController : Controller
    {
        private readonly GameMapStorageContext _context;

        public AdminGameColorsController(GameMapStorageContext context)
        {
            _context = context;
        }

        // GET: AdminGameColors
        public async Task<IActionResult> Index()
        {
            var gameMapStorageContext = _context.GameColors.Include(g => g.Game);
            return View(await gameMapStorageContext.ToListAsync());
        }

        // GET: AdminGameColors/Details/5
        public async Task<IActionResult> Details(int? id)
        {
            if (id == null)
            {
                return NotFound();
            }

            var gameColor = await _context.GameColors
                .Include(g => g.Game)
                .FirstOrDefaultAsync(m => m.GameColorId == id);
            if (gameColor == null)
            {
                return NotFound();
            }

            return View(gameColor);
        }

        // GET: AdminGameColors/Create
        [Authorize("AdminEdit")]
        public IActionResult Create()
        {
            ViewData["GameId"] = new SelectList(_context.Games, "GameId", "EnglishTitle");
            return View();
        }

        // POST: AdminGameColors/Create
        // To protect from overposting attacks, enable the specific properties you want to bind to.
        // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        [Authorize("AdminEdit")]
        public async Task<IActionResult> Create([Bind("GameColorId,EnglishTitle,Name,Hexadecimal,ContrastHexadecimal,Usage,GameId")] GameColor gameColor, string? aliases)
        {
            if (ModelState.IsValid)
            {
                gameColor.Aliases = CommaSeparatedHelper.Parse(aliases?.ToLowerInvariant()); // aliases must be lowercase, to make SQL request simplier
                _context.Add(gameColor);
                await UpdateGameTimestamp(gameColor);
                await _context.SaveChangesAsync();
                return RedirectToAction(nameof(Index));
            }
            ViewData["GameId"] = new SelectList(_context.Games, "GameId", "EnglishTitle", gameColor.GameId);
            return View(gameColor);
        }

        // GET: AdminGameColors/Edit/5
        [Authorize("AdminEdit")]
        public async Task<IActionResult> Edit(int? id)
        {
            if (id == null)
            {
                return NotFound();
            }

            var gameColor = await _context.GameColors.FindAsync(id);
            if (gameColor == null)
            {
                return NotFound();
            }
            ViewData["GameId"] = new SelectList(_context.Games, "GameId", "EnglishTitle", gameColor.GameId);
            return View(gameColor);
        }

        // POST: AdminGameColors/Edit/5
        // To protect from overposting attacks, enable the specific properties you want to bind to.
        // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        [Authorize("AdminEdit")]
        public async Task<IActionResult> Edit(int id, [Bind("GameColorId,EnglishTitle,Name,Hexadecimal,ContrastHexadecimal,Usage,GameId")] GameColor gameColor, string? aliases)
        {
            if (id != gameColor.GameColorId)
            {
                return NotFound();
            }

            if (ModelState.IsValid)
            {
                try
                {
                    gameColor.Aliases = CommaSeparatedHelper.Parse(aliases?.ToLowerInvariant()); // aliases must be lowercase, to make SQL request simplier
                    _context.Update(gameColor);
                    await UpdateGameTimestamp(gameColor);
                    await _context.SaveChangesAsync();
                }
                catch (DbUpdateConcurrencyException)
                {
                    if (!GameColorExists(gameColor.GameColorId))
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
            ViewData["GameId"] = new SelectList(_context.Games, "GameId", "EnglishTitle", gameColor.GameId);
            return View(gameColor);
        }

        // GET: AdminGameColors/Delete/5
        [Authorize("AdminEdit")]
        public async Task<IActionResult> Delete(int? id)
        {
            if (id == null)
            {
                return NotFound();
            }

            var gameColor = await _context.GameColors
                .Include(g => g.Game)
                .FirstOrDefaultAsync(m => m.GameColorId == id);
            if (gameColor == null)
            {
                return NotFound();
            }

            return View(gameColor);
        }

        // POST: AdminGameColors/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        [Authorize("AdminEdit")]
        public async Task<IActionResult> DeleteConfirmed(int id)
        {
            var gameColor = await _context.GameColors.FindAsync(id);
            if (gameColor != null)
            {
                _context.GameColors.Remove(gameColor);
            }

            await _context.SaveChangesAsync();
            return RedirectToAction(nameof(Index));
        }

        private bool GameColorExists(int id)
        {
            return _context.GameColors.Any(e => e.GameColorId == id);
        }

        private async Task UpdateGameTimestamp(GameColor gameColor)
        {
            var game = await _context.Games.FindAsync(gameColor.GameId);
            if (game != null)
            {
                game.LastChangeUtc = DateTime.UtcNow;
                _context.Update(game);
            }
        }
    }
}
