using GameMapStorageWebSite;
using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Services;
using GameMapStorageWebSite.Services.DataPackages;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Pmad.GameMapStorage.Client.Tests.Integration;

/// <summary>
/// Variant of <see cref="TestWebApplicationFactory"/> that additionally:
/// <list type="bullet">
///   <item>Configures the site in <c>Primary</c> data mode so the ApiAdminEdit policy succeeds.</item>
///   <item>Replaces <see cref="IPackageService"/> and <see cref="IPaperMapService"/> with in-memory fakes.</item>
///   <item>Seeds an <see cref="ApiKey"/> and exposes it via <see cref="SeedAdminAsync"/>.</item>
/// </list>
/// </summary>
public sealed class AdminWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly SqliteConnection _connection;

    public FakePackageService PackageService { get; } = new();
    public FakePaperMapService PaperMapService { get; } = new();

    public AdminWebApplicationFactory()
    {
        _connection = new SqliteConnection("Data Source=:memory:");
        _connection.Open();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");

        // Force Primary DataMode so the ApiAdminEdit authorization policy succeeds.
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                // An empty Data section means no Mirror/Proxy => DataMode.Primary
            });
        });

        builder.ConfigureServices(services =>
        {
            // Replace EF context with in-memory SQLite
            var efDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<GameMapStorageContext>));
            if (efDescriptor != null)
            {
                services.Remove(efDescriptor);
            }
            services.AddDbContext<GameMapStorageContext>(options =>
                options.UseSqlite(_connection));

            // Replace heavy services with fakes
            var pkgDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(IPackageService));
            if (pkgDescriptor != null) services.Remove(pkgDescriptor);
            services.AddSingleton(typeof(IPackageService), PackageService);

            var pmDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(IPaperMapService));
            if (pmDescriptor != null) services.Remove(pmDescriptor);
            services.AddSingleton(typeof(IPaperMapService), PaperMapService);

            // Override data protection to avoid issues with ephemeral keys in tests
            services.AddDataProtection()
                .PersistKeysToFileSystem(new DirectoryInfo(Path.GetTempPath()));
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
    /// Migrates the database, runs InitData, seeds an API key, and seeds a map layer + paper map.
    /// Returns the clear-text API key and the generated <c>ApiKeyId</c>.
    /// </summary>
    public async Task<(int ApiKeyId, string ClearTextKey, int LayerId, int PaperMapId)> SeedAdminAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<GameMapStorageContext>();

        await db.Database.MigrateAsync();
        await db.InitData();

        // Seed an API key
        var (apiKeyEntity, clearText) = ApiKey.Create("integration-test");
        db.ApiKeys.Add(apiKeyEntity);
        await db.SaveChangesAsync();

        // Seed a map + layer + paper map for update-endpoint tests
        var arma3 = await db.Games.SingleAsync(g => g.Name == "arma3");

        var map = new GameMap
        {
            GameId = arma3.GameId,
            Name = "altis",
            EnglishTitle = "Altis",
            SizeInMeters = 30720,
            Aliases = ["Altis"],
            OriginX = 0,
            OriginY = 0,
            LastChangeUtc = DateTime.UtcNow
        };
        db.GameMaps.Add(map);
        await db.SaveChangesAsync();

        var layer = new GameMapLayer
        {
            GameMapId = map.GameMapId,
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
            LastChangeUtc = DateTime.UtcNow
        };
        db.GameMapLayers.Add(layer);

        var paperMap = new GamePaperMap
        {
            GameMapId = map.GameMapId,
            Name = "Altis 1:50 000",
            Scale = 50000,
            FileFormat = PaperFileFormat.SinglePDF,
            PaperSize = PaperSize.A3,
            FileSize = 2048,
            LastChangeUtc = DateTime.UtcNow,
            Pages = [new GamePaperMapPage { PageNumber = 1 }]
        };
        db.GamePaperMaps.Add(paperMap);
        await db.SaveChangesAsync();

        return (apiKeyEntity.ApiKeyId, clearText, layer.GameMapLayerId, paperMap.GamePaperMapId);
    }
}
