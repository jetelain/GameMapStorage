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
        private const long MaxUploadBytes = 20 * 1024 * 1024; // 20 MB
        private const int MaxImageDimension = 16384;
        private const long MaxRemoteBytes = 20 * 1024 * 1024; // 20 MB
        private static readonly TimeSpan RemoteTimeout = TimeSpan.FromSeconds(15);

        private readonly GameMapStorageContext _context;
        private readonly IHttpClientFactory _factory;
        private readonly IThumbnailService _thumbnailService;
        private readonly ILogger<AdminGameMapsController> _logger;

        public AdminGameMapsController(GameMapStorageContext context, IHttpClientFactory factory, IThumbnailService thumbnailService, ILogger<AdminGameMapsController> logger)
        {
            _context = context;
            _factory = factory;
            _thumbnailService = thumbnailService;
            _logger = logger;
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
            gameMap.Layers = await _context.GameMapLayers.Where(l => l.GameMapId == id).ToListAsync();
            gameMap.PaperMaps = await _context.GamePaperMaps.Where(l => l.GameMapId == id).OrderBy(m => m.FileFormat).ThenBy(m => m.Name).ToListAsync();
            return View(gameMap);
        }

        // GET: Admin/GameMaps/Create
        [Authorize("AdminEdit")]
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
        [Authorize("AdminEdit")]
        public async Task<IActionResult> Create([Bind("GameMapId,EnglishTitle,AppendAttribution,SteamWorkshopId,OfficialSiteUri,SizeInMeters,Name,OriginX,OriginY,GameId")] GameMap gameMap, string? aliases, string? tags)
        {
            if (ModelState.IsValid)
            {
                gameMap.LastChangeUtc = DateTime.UtcNow;
                gameMap.Aliases = CommaSeparatedHelper.Parse(aliases);
                gameMap.Tags = CommaSeparatedHelper.Parse(tags);
                _context.Add(gameMap);
                await _context.SaveChangesAsync();
                return RedirectToAction(nameof(Index));
            }
            ViewData["GameId"] = new SelectList(_context.Games, "GameId", "EnglishTitle", gameMap.GameId);
            return View(gameMap);
        }

        // GET: Admin/GameMaps/Edit/5
        [Authorize("AdminEdit")]
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
        [Authorize("AdminEdit")]
        public async Task<IActionResult> Edit(int id, [Bind("GameMapId,EnglishTitle,AppendAttribution,SteamWorkshopId,OfficialSiteUri,SizeInMeters,OriginX,OriginY,Name")] GameMap gameMap, string? aliases, string? tags)
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
                existing.OriginX = gameMap.OriginX;
                existing.OriginY = gameMap.OriginY;
                existing.Aliases = CommaSeparatedHelper.Parse(aliases);
                existing.Tags = CommaSeparatedHelper.Parse(tags);
                existing.LastChangeUtc = DateTime.UtcNow;
                existing.CitiesCount = await _context.GameMapLocations.Where(l => l.GameMapId == gameMap.GameMapId && l.Type == LocationType.City).CountAsync();
                _context.Update(existing);
                await _context.SaveChangesAsync();
                return RedirectToAction(nameof(Details), new { id = gameMap.GameMapId });
            }
            return View(gameMap);
        }

        // GET: Admin/GameMaps/SetThumbnail/5
        [Authorize("AdminEdit")]
        public async Task<IActionResult> SetThumbnail(int? id)
        {
            if (id == null)
            {
                return NotFound();
            }
            var map = await _context.GameMaps.Include(m => m.Game).FirstOrDefaultAsync(m => m.GameMapId == id);
            if (map == null)
            {
                return NotFound();
            }
            return View(map);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        [Authorize("AdminEdit")]
        public async Task<IActionResult> SetThumbnail(int id, [FromForm] int gameMapId, [FromForm] string? imageUri, IFormFile? imageFile)
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
            try
            {
                if (imageFile != null && imageFile.Length > 0)
                {
                    if (imageFile.Length > MaxUploadBytes)
                    {
                        ViewBag.ImageError = "The uploaded file exceeds the maximum allowed size of 20 MB.";
                        return View(map);
                    }

                    using var stream = imageFile.OpenReadStream();
                    var info = await Image.IdentifyAsync(stream);
                    if (info == null)
                    {
                        ViewBag.ImageError = "The uploaded file is not a recognised image format.";
                        return View(map);
                    }
                    if (info.Width > MaxImageDimension || info.Height > MaxImageDimension)
                    {
                        ViewBag.ImageError = $"Image dimensions must not exceed {MaxImageDimension}×{MaxImageDimension} pixels.";
                        return View(map);
                    }

                    stream.Position = 0;
                    using var image = await Image.LoadAsync(stream);
                    await _thumbnailService.SetMapThumbnail(map, image);
                }
                else if (!string.IsNullOrEmpty(imageUri))
                {
                    var imageUriValidated = ValidateImageUri(imageUri);
                    if (imageUriValidated == null)
                    {
                        ViewBag.ImageError = "The URL is not valid or is not allowed.";
                        return View(map);
                    }

                    using var image = await FetchRemoteImageAsync(imageUriValidated);
                    if (image == null)
                    {
                        ViewBag.ImageError = "Could not retrieve a valid image from the provided URL.";
                        return View(map);
                    }
                    await _thumbnailService.SetMapThumbnail(map, image);
                }
                else
                {
                    ModelState.AddModelError(string.Empty, "Please choose a file or provide a URL.");
                    return View(map);
                }
            }
            catch (UnknownImageFormatException ex)
            {
                _logger.LogWarning(ex, "Unknown image format when setting thumbnail for map {MapId}.", id);
                ViewBag.ImageError = "The image format is not supported.";
                return View(map);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error when setting thumbnail for map {MapId}.", id);
                ViewBag.ImageError = "An unexpected error occurred while processing the image. Please try again.";
                return View(map);
            }
            return RedirectToAction(nameof(Details), new { id = gameMapId });
        }

        // GET: Admin/GameMaps/Delete/5
        [Authorize("AdminEdit")]
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
        [Authorize("AdminEdit")]
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

        private static readonly Uri[] AllowedImageBaseUris =
        [
            new Uri("https://images.steamusercontent.com/"),
            new Uri("https://arma3.com/"),
            new Uri("https://store.akamai.steamstatic.com/"),
            new Uri("https://shared.akamai.steamstatic.com/")
        ];

        private static Uri? ValidateImageUri(string imageUri)
        {
            if (!Uri.TryCreate(imageUri, UriKind.Absolute, out var uri))
            {
                return null;
            }
            if (!AllowedImageBaseUris.Any(b => uri.AbsoluteUri.StartsWith(b.AbsoluteUri, StringComparison.OrdinalIgnoreCase)))
            {
                return null;
            }
            return uri;
        }

        private async Task<Image?> FetchRemoteImageAsync(Uri imageUri)
        {
            using var cts = new CancellationTokenSource(RemoteTimeout);
            var client = _factory.CreateClient("External");
            using var response = await client.GetAsync(imageUri, HttpCompletionOption.ResponseHeadersRead, cts.Token);
            response.EnsureSuccessStatusCode();

            // Block responses redirected to private addresses (basic DNS-rebinding mitigation)
            if (response.RequestMessage?.RequestUri is { } finalUri)
            {
                if (ValidateImageUri(finalUri.ToString()) == null)
                {
                    _logger.LogWarning("Remote image fetch for {Uri} was redirected to a disallowed address {Final}.", imageUri, finalUri);
                    return null;
                }
            }

            using var responseStream = await response.Content.ReadAsStreamAsync(cts.Token);
            var buffer = new MemoryStream();
            var copyBuffer = new byte[81920];
            int bytesRead;
            while ((bytesRead = await responseStream.ReadAsync(copyBuffer, cts.Token)) > 0)
            {
                if (buffer.Length + bytesRead > MaxRemoteBytes)
                {
                    throw new InvalidOperationException("Response exceeds the maximum allowed size.");
                }
                buffer.Write(copyBuffer, 0, bytesRead);
            }
            buffer.Position = 0;

            var info = await Image.IdentifyAsync(buffer, cts.Token);
            if (info == null || info.Width > MaxImageDimension || info.Height > MaxImageDimension)
            {
                return null;
            }

            buffer.Position = 0;
            return await Image.LoadAsync(buffer, cts.Token);
        }

    }
}
