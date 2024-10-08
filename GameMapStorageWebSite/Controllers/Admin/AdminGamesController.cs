﻿using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SixLabors.ImageSharp;

namespace GameMapStorageWebSite.Controllers.Admin
{
    [Authorize("Admin")]
    public class AdminGamesController : Controller
    {
        private readonly GameMapStorageContext _context;
        private readonly IHttpClientFactory _factory;
        private readonly IThumbnailService _thumbnailService;

        public AdminGamesController(GameMapStorageContext context, IHttpClientFactory factory, IThumbnailService thumbnailService)
        {
            _context = context;
            _factory = factory;
            _thumbnailService = thumbnailService;
        }

        // GET: Admin/Games
        public async Task<IActionResult> Index()
        {
            return View(await _context.Games.OrderBy(m => m.EnglishTitle).ToListAsync());
        }

        // GET: Admin/Games/Details/5
        public async Task<IActionResult> Details(int? id)
        {
            if (id == null)
            {
                return NotFound();
            }

            var game = await _context.Games
                .FirstOrDefaultAsync(m => m.GameId == id);
            if (game == null)
            {
                return NotFound();
            }
            game.Maps = await _context.GameMaps.Where(m => m.GameId == id).OrderBy(m => m.EnglishTitle).ToListAsync();
            game.Colors = await _context.GameColors.Where(c => c.GameId == id).OrderBy(m => m.EnglishTitle).ToListAsync();
            game.Markers = await _context.GameMarkers.Where(m => m.GameId == id).OrderBy(m => m.EnglishTitle).ToListAsync();
            return View(game);
        }

        // GET: Admin/Games/Create
        [Authorize("AdminEdit")]
        public IActionResult Create()
        {
            return View();
        }

        // POST: Admin/Games/Create
        // To protect from overposting attacks, enable the specific properties you want to bind to.
        // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        [Authorize("AdminEdit")]
        public async Task<IActionResult> Create([Bind("GameId,EnglishTitle,Name,Attribution,OfficialSiteUri,SteamAppId")] Game game)
        {
            if (ModelState.IsValid)
            {
                game.LastChangeUtc = DateTime.UtcNow;
                _context.Add(game);
                await _context.SaveChangesAsync();
                return RedirectToAction(nameof(Index));
            }
            return View(game);
        }

        // GET: Admin/Games/Edit/5
        [Authorize("AdminEdit")]
        public async Task<IActionResult> Edit(int? id)
        {
            if (id == null)
            {
                return NotFound();
            }

            var game = await _context.Games.FindAsync(id);
            if (game == null)
            {
                return NotFound();
            }
            return View(game);
        }

        // POST: Admin/Games/Edit/5
        // To protect from overposting attacks, enable the specific properties you want to bind to.
        // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        [Authorize("AdminEdit")]
        public async Task<IActionResult> Edit(int id, [Bind("GameId,EnglishTitle,Name,Attribution,OfficialSiteUri,SteamAppId")] Game game)
        {
            if (id != game.GameId)
            {
                return NotFound();
            }

            if (ModelState.IsValid)
            {
                try
                {
                    game.LastChangeUtc = DateTime.UtcNow;
                    _context.Update(game);
                    await _context.SaveChangesAsync();
                }
                catch (DbUpdateConcurrencyException)
                {
                    if (!GameExists(game.GameId))
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
            return View(game);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        [Authorize("AdminEdit")]
        public async Task<IActionResult> SetLogo(int id, [FromForm] int gameId, [FromForm] string imageUri)
        {
            if (id != gameId)
            {
                return NotFound();
            }
            var game = await _context.Games.FindAsync(id);
            if (game == null)
            {
                return NotFound();
            }
            if (!string.IsNullOrEmpty(imageUri))
            {
                try
                {
                    using var stream = await _factory.CreateClient("External").GetStreamAsync(imageUri);
                    using var image = await Image.LoadAsync(stream);
                    await _thumbnailService.SetGameLogo(game, image);
                }
                catch(Exception e)
                {
                    ViewBag.ImageError = e.Message;
                    return View(nameof(Edit), game);
                }
                return RedirectToAction(nameof(Index));
            }
            return View(nameof(Edit), game);
        }

        // GET: Admin/Games/Delete/5
        [Authorize("AdminEdit")]
        public async Task<IActionResult> Delete(int? id)
        {
            if (id == null)
            {
                return NotFound();
            }

            var game = await _context.Games
                .FirstOrDefaultAsync(m => m.GameId == id);
            if (game == null)
            {
                return NotFound();
            }

            return View(game);
        }

        // POST: Admin/Games/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        [Authorize("AdminEdit")]
        public async Task<IActionResult> DeleteConfirmed(int id)
        {
            var game = await _context.Games.FindAsync(id);
            if (game != null)
            {
                _context.Games.Remove(game);
            }

            await _context.SaveChangesAsync();
            return RedirectToAction(nameof(Index));
        }

        private bool GameExists(int id)
        {
            return _context.Games.Any(e => e.GameId == id);
        }
    }
}
