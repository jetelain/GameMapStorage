using Pmad.GameMapStorage.Client.Models;

namespace Pmad.GameMapStorage.Client.Tests.Integration;

/// <summary>
/// Integration tests that run against a real (in-process) <see cref="GameMapStorageWebSite"/>
/// instance with an isolated SQLite in-memory database seeded with predictable test data.
/// </summary>
public sealed class GameMapStorageClientIntegrationTests : IAsyncLifetime
{
    private readonly TestWebApplicationFactory _factory = new();
    private GameMapStorageClient _client = null!;

    public async Task InitializeAsync()
    {
        await _factory.SeedAsync();
        _client = new GameMapStorageClient(_factory.CreateClient());
    }

    public Task DisposeAsync()
    {
        _factory.Dispose();
        return Task.CompletedTask;
    }

    // ── GetGamesAsync ──────────────────────────────────────────────────────────

    [Fact]
    public async Task GetGamesAsync_ReturnsSeededGame()
    {
        var games = await _client.GetGamesAsync();

        Assert.NotEmpty(games);
        var arma3 = Assert.Single(games, g => g.Name == "arma3");
        Assert.Equal("Arma 3", arma3.EnglishTitle);
    }

    // ── GetGameAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task GetGameAsync_ByName_ReturnsGame()
    {
        var game = await _client.GetGameAsync("arma3");

        Assert.NotNull(game);
        Assert.Equal("arma3", game.Name);
        Assert.Equal("Arma 3", game.EnglishTitle);
    }

    [Fact]
    public async Task GetGameAsync_ById_ReturnsGame()
    {
        var games = await _client.GetGamesAsync();
        var id = games.Single(g => g.Name == "arma3").GameId;

        var game = await _client.GetGameAsync(id.ToString());

        Assert.NotNull(game);
        Assert.Equal("arma3", game.Name);
    }

    [Fact]
    public async Task GetGameAsync_UnknownGame_ReturnsNull()
    {
        var game = await _client.GetGameAsync("unknown-game-xyz");

        Assert.Null(game);
    }

    // ── GetMapsAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task GetMapsAsync_ReturnsSeededMaps()
    {
        var maps = await _client.GetMapsAsync("arma3");

        Assert.NotEmpty(maps);
        var altis = Assert.Single(maps, m => m.Name == "altis");
        Assert.Equal("Altis", altis.EnglishTitle);
        Assert.Equal(30720, altis.SizeInMeters);
    }

    [Fact]
    public async Task GetMapsAsync_ReturnsLayers()
    {
        var maps = await _client.GetMapsAsync("arma3");

        var altis = maps.Single(m => m.Name == "altis");
        Assert.NotNull(altis.Layers);
        Assert.NotEmpty(altis.Layers);
        var layer = altis.Layers[0];
        Assert.Equal(LayerType.Topographic, layer.Type);
        Assert.True(layer.IsDefault);
    }

    [Fact]
    public async Task GetMapsAsync_UnknownGame_ReturnsEmpty()
    {
        var maps = await _client.GetMapsAsync("unknown-game-xyz");

        Assert.Empty(maps);
    }

    // ── GetMapAsync ────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetMapAsync_ByName_ReturnsFullMap()
    {
        var map = await _client.GetMapAsync("arma3", "altis");

        Assert.NotNull(map);
        Assert.Equal("altis", map.Name);
        Assert.NotNull(map.Layers);
        Assert.NotEmpty(map.Layers);
        Assert.NotNull(map.Locations);
        Assert.NotEmpty(map.Locations);
    }

    [Fact]
    public async Task GetMapAsync_ReturnsLayer_WithCorrectProperties()
    {
        var map = await _client.GetMapAsync("arma3", "altis");

        Assert.NotNull(map?.Layers);
        var layer = map.Layers[0];
        Assert.Equal(LayerFormat.PngOnly, layer.Format);
        Assert.Equal(1, layer.MinZoom);
        Assert.Equal(6, layer.MaxZoom);
        Assert.Equal(256, layer.TileSize);
    }

    [Fact]
    public async Task GetMapAsync_ReturnsLocations()
    {
        var map = await _client.GetMapAsync("arma3", "altis");

        Assert.NotNull(map?.Locations);
        var kavala = Assert.Single(map.Locations, l => l.EnglishTitle == "Kavala");
        Assert.Equal(LocationType.City, kavala.Type);
    }

    [Fact]
    public async Task GetMapAsync_ByAlias_ReturnsMap()
    {
        var map = await _client.GetMapAsync("arma3", "Altis");

        Assert.NotNull(map);
        Assert.Equal("altis", map.Name);
    }

    [Fact]
    public async Task GetMapAsync_UnknownMap_ReturnsNull()
    {
        var map = await _client.GetMapAsync("arma3", "unknown-map-xyz");

        Assert.Null(map);
    }

    // ── GetMapPaperMapsAsync ───────────────────────────────────────────────────

    [Fact]
    public async Task GetMapPaperMapsAsync_ReturnsPaperMaps()
    {
        var paperMaps = await _client.GetMapPaperMapsAsync("arma3", "altis");

        Assert.NotEmpty(paperMaps);
        var pm = paperMaps[0];
        Assert.Equal("Altis 1:50 000", pm.Name);
        Assert.Equal(50000, pm.Scale);
        Assert.Equal(PaperFileFormat.SinglePDF, pm.FileFormat);
        Assert.Equal(PaperSize.A3, pm.PaperSize);
    }

    // ── GetGamePaperMapsAsync ──────────────────────────────────────────────────

    [Fact]
    public async Task GetGamePaperMapsAsync_ReturnsPaperMapsWithMapInfo()
    {
        var paperMaps = await _client.GetGamePaperMapsAsync("arma3");

        Assert.NotEmpty(paperMaps);
        var pm = paperMaps[0];
        Assert.Equal("altis", pm.MapName);
        Assert.Equal(50000, pm.Scale);
    }

    // ── GetGameBaseAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task GetGameBaseAsync_ByName_ReturnsGame()
    {
        var game = await _client.GetGameBaseAsync("arma3");

        Assert.NotNull(game);
        Assert.Equal("Arma 3", game.EnglishTitle);
    }

    [Fact]
    public async Task GetGameBaseAsync_CaseInsensitive()
    {
        var game = await _client.GetGameBaseAsync("ARMA3");

        Assert.NotNull(game);
    }

    [Fact]
    public async Task GetGameBaseAsync_Unknown_ReturnsNull()
    {
        var game = await _client.GetGameBaseAsync("unknown-xyz");

        Assert.Null(game);
    }

    // ── GetMapBaseAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task GetMapBaseAsync_ByName_ReturnsMap()
    {
        var map = await _client.GetMapBaseAsync("arma3", "altis");

        Assert.NotNull(map);
        Assert.Equal("Altis", map.EnglishTitle);
    }

    [Fact]
    public async Task GetMapBaseAsync_ByAlias_ReturnsMap()
    {
        var map = await _client.GetMapBaseAsync("arma3", "Altis");

        Assert.NotNull(map);
        Assert.Equal("altis", map.Name);
    }

    [Fact]
    public async Task GetMapBaseAsync_Unknown_ReturnsNull()
    {
        var map = await _client.GetMapBaseAsync("arma3", "unknown-xyz");

        Assert.Null(map);
    }
}
