using GameMapStorageWebSite;
using GameMapStorageWebSite.Entities;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Pmad.GameMapStorage.Client.Tests.Integration;

/// <summary>
/// Hosts <see cref="GameMapStorageWebSite"/> in-process with an isolated SQLite in-memory
/// database seeded with predictable test data.
/// The connection is kept open for the lifetime of the factory so the in-memory DB is preserved.
/// </summary>
public sealed class TestWebApplicationFactory : WebApplicationFactory<Program>
{
    // Kept open so the in-memory DB is not dropped between EF scopes.
    private readonly SqliteConnection _connection;

    public TestWebApplicationFactory()
    {
        _connection = new SqliteConnection("Data Source=:memory:");
        _connection.Open();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");

        builder.ConfigureServices(services =>
        {
            // Replace the real EF context registration with an in-memory SQLite one
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<GameMapStorageContext>));
            if (descriptor != null)
            {
                services.Remove(descriptor);
            }

            services.AddDbContext<GameMapStorageContext>(options =>
                options.UseSqlite(_connection));
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing)
        {
            _connection.Dispose();
        }
    }

        /// <summary>
        /// Creates the schema and seeds test data. Must be called once before running tests.
        /// </summary>
        public async Task SeedAsync()
        {
            using var scope = Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<GameMapStorageContext>();

            // Run migrations (and the default InitData seeding via InitDataBase).
            // This inserts the default games (arma3, arma-reforger, dayz).
            await db.Database.MigrateAsync();
            await db.InitData();

            // Retrieve the arma3 game created by InitData
            var arma3 = await db.Games.SingleAsync(g => g.Name == "arma3");

            // ── Map ───────────────────────────────────────────────────────────
            var altis = new GameMap
            {
                GameId = arma3.GameId,
                Name = "altis",
                EnglishTitle = "Altis",
                SizeInMeters = 30720,
                Aliases = ["Altis"],
                OriginX = 0,
                OriginY = 0,
                LastChangeUtc = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            };
            db.GameMaps.Add(altis);
            await db.SaveChangesAsync();

            // ── Layer (Ready) ─────────────────────────────────────────────────
            db.GameMapLayers.Add(new GameMapLayer
            {
                GameMapId = altis.GameMapId,
                Type = LayerType.Topographic,
                Format = LayerFormat.PngOnly,
                State = LayerState.Ready,
                MinZoom = 1,
                MaxZoom = 6,
                DefaultZoom = 4,
                IsDefault = true,
                TileSize = 256,
                FactorX = 1,
                FactorY = 1,
                LastChangeUtc = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            });

            // ── Location ──────────────────────────────────────────────────────
            db.GameMapLocations.Add(new GameMapLocation
            {
                GameMapId = altis.GameMapId,
                EnglishTitle = "Kavala",
                Type = LocationType.City,
                X = 0.35,
                Y = 0.22
            });

            // ── Paper map ─────────────────────────────────────────────────────
            db.GamePaperMaps.Add(new GamePaperMap
            {
                GameMapId = altis.GameMapId,
                Name = "Altis 1:50 000",
                Scale = 50000,
                FileFormat = PaperFileFormat.SinglePDF,
                PaperSize = PaperSize.A3,
                FileSize = 2048,
                LastChangeUtc = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                Pages = [new GamePaperMapPage { PageNumber = 1 }]
            });

            await db.SaveChangesAsync();
        }
    }
