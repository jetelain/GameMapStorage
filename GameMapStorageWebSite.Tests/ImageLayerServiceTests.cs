using System.IO.Compression;
using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Services;
using GameMapStorageWebSite.Services.Storages;
using Xunit;

namespace GameMapStorageWebSite.Tests;

/// <summary>
/// In-memory IStorageService test double.
/// StoreAsync captures bytes written and returns the count.
/// GetSizeAsync returns values preset in the Sizes dictionary.
/// </summary>
internal sealed class FakeStorageService : IStorageService
{
    public Dictionary<string, byte[]> Files { get; } = new();

    /// <summary>Pre-seed with file sizes for GetSizeAsync.</summary>
    public Dictionary<string, long> Sizes { get; } = new();

    public async Task<long> StoreAsync(string path, Func<Stream, Task> write)
    {
        using var ms = new MemoryStream();
        await write(ms);
        Files[path] = ms.ToArray();
        return ms.Length;
    }

    public Task<IStorageFile?> GetAsync(string path) =>
        Task.FromResult<IStorageFile?>(null);

    public Task<long?> GetSizeAsync(string path) =>
        Sizes.TryGetValue(path, out var size)
            ? Task.FromResult<long?>(size)
            : Task.FromResult<long?>(null);

    public Task Delete(string path)
    {
        Files.Remove(path);
        return Task.CompletedTask;
    }
}

public class ImageLayerServiceTests
{
    // ──────────────────────────────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────────────────────────────

    private static GameMapLayer MakeLayer(
        LayerFormat format,
        int minZoom = 0,
        int maxZoom = 0,
        int tileSize = 256,
        LayerType type = LayerType.Topographic)
    {
        return new GameMapLayer
        {
            GameMapLayerId = 100,
            GameMapId = 10,
            Format = format,
            MinZoom = minZoom,
            MaxZoom = maxZoom,
            TileSize = tileSize,
            Type = type,
            GameMap = new GameMap
            {
                GameMapId = 10,
                GameId = 1,
                EnglishTitle = "TestMap",
                Game = new Game { GameId = 1, Name = "test", EnglishTitle = "Test", Attribution = "" }
            }
        };
    }

    /// <summary>Path for a tile file, matching GetBasePath(layer, z, x, y) + ext.</summary>
    private static string TilePath(int z, int x, int y, string ext) =>
        Path.Combine("1", "maps", "10", "100", z.ToString(), x.ToString(), y.ToString()) + ext;

    /// <summary>Path for a zoom-level source file, matching GetBasePath(layer, z) + ext.</summary>
    private static string SourcePath(int z, string ext) =>
        Path.Combine("1", "maps", "10", "100", z.ToString()) + ext;

    private static ZipArchive BuildArchive(params (string name, byte[] content)[] entries)
    {
        var ms = new MemoryStream();
        using (var zip = new ZipArchive(ms, ZipArchiveMode.Create, leaveOpen: true))
        {
            foreach (var (name, content) in entries)
            {
                var entry = zip.CreateEntry(name, CompressionLevel.NoCompression);
                using var stream = entry.Open();
                stream.Write(content);
            }
        }
        ms.Position = 0;
        return new ZipArchive(ms, ZipArchiveMode.Read);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // ComputeLayerStorageSize — format coverage
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task ComputeLayerStorageSize_PngOnly_CountsTilePng()
    {
        var storage = new FakeStorageService();
        storage.Sizes[TilePath(0, 0, 0, ".png")] = 1000;
        var svc = new ImageLayerService(storage);

        var result = await svc.ComputeLayerStorageSize(MakeLayer(LayerFormat.PngOnly));

        Assert.Equal(1000, result.PngTiles);
        Assert.Equal(0, result.WebpTiles);
        Assert.Equal(0, result.SvgTiles);
    }

    [Fact]
    public async Task ComputeLayerStorageSize_PngOnly_IncludesSourceFile()
    {
        var storage = new FakeStorageService();
        storage.Sizes[TilePath(0, 0, 0, ".png")] = 500;
        storage.Sizes[SourcePath(0, ".png")] = 2000;
        var svc = new ImageLayerService(storage);

        var result = await svc.ComputeLayerStorageSize(MakeLayer(LayerFormat.PngOnly));

        Assert.Equal(500, result.PngTiles);
        Assert.Equal(2000, result.SourceFiles);
    }

    [Fact]
    public async Task ComputeLayerStorageSize_PngOnly_IncludesHimgSourceFile()
    {
        var storage = new FakeStorageService();
        storage.Sizes[SourcePath(0, ".himg")] = 3000;
        var svc = new ImageLayerService(storage);

        var result = await svc.ComputeLayerStorageSize(MakeLayer(LayerFormat.PngOnly));

        Assert.Equal(3000, result.SourceFiles);
    }

    [Fact]
    public async Task ComputeLayerStorageSize_PngAndWebp_SeparatesBothFormats()
    {
        var storage = new FakeStorageService();
        storage.Sizes[TilePath(0, 0, 0, ".png")]  = 400;
        storage.Sizes[TilePath(0, 0, 0, ".webp")] = 200;
        var svc = new ImageLayerService(storage);

        var result = await svc.ComputeLayerStorageSize(MakeLayer(LayerFormat.PngAndWebp));

        Assert.Equal(400, result.PngTiles);
        Assert.Equal(200, result.WebpTiles);
        Assert.Equal(0,   result.SvgTiles);
    }

    [Fact]
    public async Task ComputeLayerStorageSize_WebpOnly_CountsOnlyWebp()
    {
        var storage = new FakeStorageService();
        storage.Sizes[TilePath(0, 0, 0, ".webp")] = 300;
        var svc = new ImageLayerService(storage);

        var result = await svc.ComputeLayerStorageSize(MakeLayer(LayerFormat.WebpOnly));

        Assert.Equal(300, result.WebpTiles);
        Assert.Equal(0,   result.PngTiles);
        Assert.Equal(0,   result.SvgTiles);
    }

    [Fact]
    public async Task ComputeLayerStorageSize_SvgOnly_CountsOnlySvgTiles_NoSourceFiles()
    {
        var storage = new FakeStorageService();
        storage.Sizes[TilePath(0, 0, 0, ".svg")] = 300;
        storage.Sizes[TilePath(0, 0, 0, ".png")] = 999; // must not be counted
        var svc = new ImageLayerService(storage);

        var result = await svc.ComputeLayerStorageSize(MakeLayer(LayerFormat.SvgOnly));

        Assert.Equal(300, result.SvgTiles);
        Assert.Equal(0,   result.PngTiles);
        Assert.Equal(0,   result.WebpTiles);
        Assert.Equal(0,   result.SourceFiles); // SvgOnly is not raster
    }

    [Fact]
    public async Task ComputeLayerStorageSize_SvgAndWebp_CountsBothSvgAndWebp()
    {
        var storage = new FakeStorageService();
        storage.Sizes[TilePath(0, 0, 0, ".svg")]  = 150;
        storage.Sizes[TilePath(0, 0, 0, ".webp")] = 100;
        var svc = new ImageLayerService(storage);

        var result = await svc.ComputeLayerStorageSize(MakeLayer(LayerFormat.SvgAndWebp));

        Assert.Equal(150, result.SvgTiles);
        Assert.Equal(100, result.WebpTiles);
        Assert.Equal(0,   result.PngTiles);
        Assert.Equal(0,   result.SourceFiles); // SvgAndWebp is not raster
    }

    // ──────────────────────────────────────────────────────────────────────────
    // ComputeLayerStorageSize — zoom level accumulation
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task ComputeLayerStorageSize_MultipleZoomLevels_AccumulatesAcrossZooms()
    {
        // zoom=0 → 1×1 = 1 tile; zoom=1 → 2×2 = 4 tiles
        var storage = new FakeStorageService();
        storage.Sizes[TilePath(0, 0, 0, ".png")] = 100;
        storage.Sizes[TilePath(1, 0, 0, ".png")] = 50;
        storage.Sizes[TilePath(1, 0, 1, ".png")] = 50;
        storage.Sizes[TilePath(1, 1, 0, ".png")] = 50;
        storage.Sizes[TilePath(1, 1, 1, ".png")] = 50;
        var svc = new ImageLayerService(storage);

        var result = await svc.ComputeLayerStorageSize(MakeLayer(LayerFormat.PngOnly, minZoom: 0, maxZoom: 1));

        Assert.Equal(300, result.PngTiles);
    }

    [Fact]
    public async Task ComputeLayerStorageSize_MultipleZoomLevels_AccumulatesSourceFiles()
    {
        var storage = new FakeStorageService();
        storage.Sizes[SourcePath(0, ".png")] = 1000;
        storage.Sizes[SourcePath(1, ".png")] = 500;
        var svc = new ImageLayerService(storage);

        var result = await svc.ComputeLayerStorageSize(MakeLayer(LayerFormat.PngOnly, minZoom: 0, maxZoom: 1));

        Assert.Equal(1500, result.SourceFiles);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // ComputeLayerStorageSize — missing files & validation
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task ComputeLayerStorageSize_MissingFiles_ReturnsZeroForEach()
    {
        var storage = new FakeStorageService(); // empty → all GetSizeAsync return null
        var svc = new ImageLayerService(storage);

        var result = await svc.ComputeLayerStorageSize(MakeLayer(LayerFormat.PngAndWebp));

        Assert.Equal(0, result.PngTiles);
        Assert.Equal(0, result.WebpTiles);
        Assert.Equal(0, result.SourceFiles);
    }

    [Fact]
    public async Task ComputeLayerStorageSize_ElevationLayer_ThrowsArgumentException()
    {
        var svc = new ImageLayerService(new FakeStorageService());

        await Assert.ThrowsAsync<ArgumentException>(
            () => svc.ComputeLayerStorageSize(MakeLayer(LayerFormat.PngOnly, type: LayerType.Elevation)));
    }

    [Fact]
    public async Task ComputeLayerStorageSize_NullGameMap_ThrowsArgumentException()
    {
        var svc = new ImageLayerService(new FakeStorageService());
        var layer = MakeLayer(LayerFormat.PngOnly);
        layer.GameMap = null;

        await Assert.ThrowsAsync<ArgumentException>(() => svc.ComputeLayerStorageSize(layer));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // AddLayerImagesFromArchive
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task AddLayerImagesFromArchive_PngOnly_ReturnsCorrectSizes()
    {
        var svc = new ImageLayerService(new FakeStorageService());
        using var archive = BuildArchive(
            ("0/0/0.png", new byte[512]),
            ("0.png",     new byte[2048]));

        var result = await svc.AddLayerImagesFromArchive(MakeLayer(LayerFormat.PngOnly), archive);

        Assert.Equal(512,  result.PngTiles);
        Assert.Equal(0,    result.WebpTiles);
        Assert.Equal(0,    result.SvgTiles);
        Assert.Equal(2048, result.SourceFiles);
    }

    [Fact]
    public async Task AddLayerImagesFromArchive_PngAndWebp_TracksBothFormats()
    {
        var svc = new ImageLayerService(new FakeStorageService());
        using var archive = BuildArchive(
            ("0/0/0.png",  new byte[400]),
            ("0/0/0.webp", new byte[200]));

        var result = await svc.AddLayerImagesFromArchive(MakeLayer(LayerFormat.PngAndWebp), archive);

        Assert.Equal(400, result.PngTiles);
        Assert.Equal(200, result.WebpTiles);
        Assert.Equal(0,   result.SvgTiles);
    }

    [Fact]
    public async Task AddLayerImagesFromArchive_SvgOnly_ReturnsOnlySvgTiles()
    {
        var svc = new ImageLayerService(new FakeStorageService());
        using var archive = BuildArchive(("0/0/0.svg", new byte[128]));

        var result = await svc.AddLayerImagesFromArchive(MakeLayer(LayerFormat.SvgOnly), archive);

        Assert.Equal(128, result.SvgTiles);
        Assert.Equal(0,   result.PngTiles);
        Assert.Equal(0,   result.SourceFiles); // SvgOnly is not raster
    }

    [Fact]
    public async Task AddLayerImagesFromArchive_MissingEntries_ReturnsZero()
    {
        var svc = new ImageLayerService(new FakeStorageService());
        using var archive = BuildArchive(); // empty

        var result = await svc.AddLayerImagesFromArchive(MakeLayer(LayerFormat.PngAndWebp), archive);

        Assert.Equal(0, result.PngTiles);
        Assert.Equal(0, result.WebpTiles);
        Assert.Equal(0, result.SourceFiles);
    }

    [Fact]
    public async Task AddLayerImagesFromArchive_MultipleZooms_AccumulatesAllTiles()
    {
        // zoom=0 → 1 tile; zoom=1 → 4 tiles
        var svc = new ImageLayerService(new FakeStorageService());
        using var archive = BuildArchive(
            ("0/0/0.png", new byte[100]),
            ("1/0/0.png", new byte[50]),
            ("1/0/1.png", new byte[50]),
            ("1/1/0.png", new byte[50]),
            ("1/1/1.png", new byte[50]));

        var result = await svc.AddLayerImagesFromArchive(MakeLayer(LayerFormat.PngOnly, minZoom: 0, maxZoom: 1), archive);

        Assert.Equal(300, result.PngTiles);
    }

    [Fact]
    public async Task AddLayerImagesFromArchive_StoresFilesInStorage()
    {
        var storage = new FakeStorageService();
        var svc = new ImageLayerService(storage);
        var tileContent = new byte[] { 1, 2, 3, 4 };
        using var archive = BuildArchive(("0/0/0.png", tileContent));

        await svc.AddLayerImagesFromArchive(MakeLayer(LayerFormat.PngOnly), archive);

        Assert.True(storage.Files.ContainsKey(TilePath(0, 0, 0, ".png")));
        Assert.Equal(tileContent, storage.Files[TilePath(0, 0, 0, ".png")]);
    }

    [Fact]
    public async Task AddLayerImagesFromArchive_NullGameMap_ThrowsArgumentException()
    {
        var svc = new ImageLayerService(new FakeStorageService());
        var layer = MakeLayer(LayerFormat.PngOnly);
        layer.GameMap = null;
        using var archive = BuildArchive();

        await Assert.ThrowsAsync<ArgumentException>(() => svc.AddLayerImagesFromArchive(layer, archive));
    }
}
