using GameMapStorageWebSite.Services.Storages;
using Xunit;

namespace GameMapStorageWebSite.Tests;

public class LocalStorageServiceTests : IDisposable
{
    private readonly string tempDir;

    public LocalStorageServiceTests()
    {
        tempDir = Path.Combine(Path.GetTempPath(), "LocalStorageTests_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempDir);
    }

    public void Dispose()
    {
        if (Directory.Exists(tempDir))
        {
            Directory.Delete(tempDir, recursive: true);
        }
    }

    // --- StoreAsync ---

    [Fact]
    public async Task StoreAsync_WritesContent_AndReturnsCorrectSize()
    {
        var svc = new LocalStorageService(tempDir);
        var content = new byte[] { 1, 2, 3, 4, 5 };

        var size = await svc.StoreAsync("file.bin", async stream => await stream.WriteAsync(content));

        Assert.Equal(5, size);
        Assert.Equal(content, await File.ReadAllBytesAsync(Path.Combine(tempDir, "file.bin")));
    }

    [Fact]
    public async Task StoreAsync_EmptyContent_ReturnsZero()
    {
        var svc = new LocalStorageService(tempDir);

        var size = await svc.StoreAsync("empty.bin", _ => Task.CompletedTask);

        Assert.Equal(0, size);
        Assert.True(File.Exists(Path.Combine(tempDir, "empty.bin")));
    }

    [Fact]
    public async Task StoreAsync_CreatesSubdirectories_IfNotExisting()
    {
        var svc = new LocalStorageService(tempDir);
        var content = new byte[] { 42 };

        await svc.StoreAsync(Path.Combine("a", "b", "c.bin"), async stream => await stream.WriteAsync(content));

        Assert.True(File.Exists(Path.Combine(tempDir, "a", "b", "c.bin")));
    }

    [Fact]
    public async Task StoreAsync_OverwritesExistingFile()
    {
        var svc = new LocalStorageService(tempDir);
        var path = Path.Combine(tempDir, "ow.bin");
        await File.WriteAllBytesAsync(path, new byte[] { 1, 2, 3, 4, 5, 6, 7, 8 });

        var size = await svc.StoreAsync("ow.bin", async stream => await stream.WriteAsync(new byte[] { 9, 10 }));

        Assert.Equal(2, size);
        Assert.Equal(2, new FileInfo(path).Length);
    }

    // --- GetSizeAsync ---

    [Fact]
    public async Task GetSizeAsync_ReturnsFileLength_WhenFileExists()
    {
        var svc = new LocalStorageService(tempDir);
        var content = new byte[] { 10, 20, 30 };
        await File.WriteAllBytesAsync(Path.Combine(tempDir, "sized.bin"), content);

        var size = await svc.GetSizeAsync("sized.bin");

        Assert.Equal(3, size);
    }

    [Fact]
    public async Task GetSizeAsync_ReturnsNull_WhenFileMissing()
    {
        var svc = new LocalStorageService(tempDir);

        var size = await svc.GetSizeAsync("does_not_exist.bin");

        Assert.Null(size);
    }

    [Fact]
    public async Task GetSizeAsync_ReturnsZero_ForEmptyFile()
    {
        var svc = new LocalStorageService(tempDir);
        await File.WriteAllBytesAsync(Path.Combine(tempDir, "empty.bin"), Array.Empty<byte>());

        var size = await svc.GetSizeAsync("empty.bin");

        Assert.Equal(0, size);
    }

    [Fact]
    public async Task StoreAsync_ThenGetSizeAsync_ReturnsConsistentSize()
    {
        var svc = new LocalStorageService(tempDir);
        var content = new byte[1234];
        new Random(42).NextBytes(content);

        var stored = await svc.StoreAsync("data.bin", async s => await s.WriteAsync(content));
        var queried = await svc.GetSizeAsync("data.bin");

        Assert.Equal(stored, queried);
        Assert.Equal(1234, stored);
    }

    // --- GetAsync ---

    [Fact]
    public async Task GetAsync_ReturnsStorageFile_WhenFileExists()
    {
        var svc = new LocalStorageService(tempDir);
        await File.WriteAllBytesAsync(Path.Combine(tempDir, "present.bin"), new byte[] { 99 });

        var file = await svc.GetAsync("present.bin");

        Assert.NotNull(file);
    }

    [Fact]
    public async Task GetAsync_ReturnsNull_WhenFileMissing()
    {
        var svc = new LocalStorageService(tempDir);

        var file = await svc.GetAsync("absent.bin");

        Assert.Null(file);
    }

    [Fact]
    public async Task GetAsync_ReturnedFile_CanBeRead()
    {
        var svc = new LocalStorageService(tempDir);
        var content = new byte[] { 1, 2, 3 };
        await File.WriteAllBytesAsync(Path.Combine(tempDir, "readable.bin"), content);

        using var file = await svc.GetAsync("readable.bin");
        using var stream = await file!.OpenRead();
        using var ms = new MemoryStream();
        await stream.CopyToAsync(ms);

        Assert.Equal(content, ms.ToArray());
    }

    // --- Delete ---

    [Fact]
    public async Task Delete_RemovesFile_WhenExists()
    {
        var svc = new LocalStorageService(tempDir);
        var path = Path.Combine(tempDir, "todelete.bin");
        await File.WriteAllBytesAsync(path, new byte[] { 1 });

        await svc.Delete("todelete.bin");

        Assert.False(File.Exists(path));
    }

    [Fact]
    public async Task Delete_DoesNotThrow_WhenFileMissing()
    {
        var svc = new LocalStorageService(tempDir);

        var ex = await Record.ExceptionAsync(() => svc.Delete("missing.bin"));

        Assert.Null(ex);
    }

    [Fact]
    public async Task Delete_ThenGetAsync_ReturnsNull()
    {
        var svc = new LocalStorageService(tempDir);
        await File.WriteAllBytesAsync(Path.Combine(tempDir, "cycle.bin"), new byte[] { 1 });

        await svc.Delete("cycle.bin");
        var file = await svc.GetAsync("cycle.bin");

        Assert.Null(file);
    }
}
