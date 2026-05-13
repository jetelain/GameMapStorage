using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using Pmad.GameMapStorage.Client.Models;

namespace Pmad.GameMapStorage.Client.Tests.Unit;

public class GameMapStorageClientTests
{
    private static GameMapStorageClient CreateClient(StubHttpMessageHandler handler)
    {
        var httpClient = new HttpClient(handler) { BaseAddress = new Uri("http://localhost/") };
        return new GameMapStorageClient(httpClient);
    }

    private static GameMapStorageClient CreateClientWithCache(StubHttpMessageHandler handler)
    {
        var httpClient = new HttpClient(handler) { BaseAddress = new Uri("http://localhost/") };
        var cache = new MemoryCache(Options.Create(new MemoryCacheOptions()));
        return new GameMapStorageClient(httpClient, cache);
    }

    // ── GetGamesAsync ──────────────────────────────────────────────────────────

    [Fact]
    public async Task GetGamesAsync_ReturnsGames()
    {
        var handler = new StubHttpMessageHandler();
        handler.Setup("api/v1/games", """
            [{"gameId":1,"name":"arma3","englishTitle":"Arma 3"},
             {"gameId":2,"name":"dayz","englishTitle":"DayZ"}]
            """);
        var client = CreateClient(handler);

        var games = await client.GetGamesAsync();

        Assert.Equal(2, games.Length);
        Assert.Equal("arma3", games[0].Name);
        Assert.Equal(2, games[1].GameId);
    }

    [Fact]
    public async Task GetGamesAsync_ReturnsEmpty_WhenServerReturnsEmpty()
    {
        var handler = new StubHttpMessageHandler();
        handler.Setup("api/v1/games", "[]");
        var client = CreateClient(handler);

        var games = await client.GetGamesAsync();

        Assert.Empty(games);
    }

    // ── GetGameAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task GetGameAsync_ReturnsGame_WhenFound()
    {
        var handler = new StubHttpMessageHandler();
        handler.Setup("api/v1/games/arma3", """
            {"gameId":1,"name":"arma3","englishTitle":"Arma 3",
             "colors":[],"markers":[]}
            """);
        var client = CreateClient(handler);

        var game = await client.GetGameAsync("arma3");

        Assert.NotNull(game);
        Assert.Equal(1, game.GameId);
        Assert.Equal("arma3", game.Name);
    }

    [Fact]
    public async Task GetGameAsync_ReturnsNull_WhenNotFound()
    {
        var handler = new StubHttpMessageHandler();
        handler.SetupNotFound("api/v1/games/unknown");
        var client = CreateClient(handler);

        var game = await client.GetGameAsync("unknown");

        Assert.Null(game);
    }

    // ── GetMapsAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task GetMapsAsync_ReturnsMaps()
    {
        var handler = new StubHttpMessageHandler();
        handler.Setup("api/v1/games/arma3/maps", """
            [{"gameMapId":10,"name":"altis","englishTitle":"Altis","sizeInMeters":30720},
             {"gameMapId":11,"name":"stratis","englishTitle":"Stratis","sizeInMeters":8192}]
            """);
        var client = CreateClient(handler);

        var maps = await client.GetMapsAsync("arma3");

        Assert.Equal(2, maps.Length);
        Assert.Equal("altis", maps[0].Name);
    }

    // ── GetMapAsync ────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetMapAsync_ReturnsMap_WhenFound()
    {
        var handler = new StubHttpMessageHandler();
        handler.Setup("api/v1/games/arma3/maps/altis", """
            {"gameMapId":10,"name":"altis","englishTitle":"Altis","sizeInMeters":30720,
             "attribution":"© BI","layers":[],"locations":[]}
            """);
        var client = CreateClient(handler);

        var map = await client.GetMapAsync("arma3", "altis");

        Assert.NotNull(map);
        Assert.Equal(10, map.GameMapId);
        Assert.Equal("altis", map.Name);
    }

    [Fact]
    public async Task GetMapAsync_ReturnsNull_WhenNotFound()
    {
        var handler = new StubHttpMessageHandler();
        handler.SetupNotFound("api/v1/games/arma3/maps/unknown");
        var client = CreateClient(handler);

        var map = await client.GetMapAsync("arma3", "unknown");

        Assert.Null(map);
    }

    // ── GetMapPaperMapsAsync ───────────────────────────────────────────────────

    [Fact]
    public async Task GetMapPaperMapsAsync_ReturnsPaperMaps()
    {
        var handler = new StubHttpMessageHandler();
        handler.Setup("api/v1/games/arma3/maps/altis/papermaps", """
            [{"gamePaperMapId":1,"name":"Altis 1:50000","scale":50000,
              "fileFormat":"SinglePDF","paperSize":"A3","fileSize":1024}]
            """);
        var client = CreateClient(handler);

        var paperMaps = await client.GetMapPaperMapsAsync("arma3", "altis");

        Assert.Single(paperMaps);
        Assert.Equal(50000, paperMaps[0].Scale);
    }

    // ── GetGamePaperMapsAsync ──────────────────────────────────────────────────

    [Fact]
    public async Task GetGamePaperMapsAsync_ReturnsPaperMapsWithMapInfo()
    {
        var handler = new StubHttpMessageHandler();
        handler.Setup("api/v1/games/arma3/papermaps", """
            [{"gamePaperMapId":1,"name":"Altis 1:50000","scale":50000,
              "fileFormat":"SinglePDF","paperSize":"A3","fileSize":1024,
              "gameMapId":10,"mapName":"altis"}]
            """);
        var client = CreateClient(handler);

        var paperMaps = await client.GetGamePaperMapsAsync("arma3");

        Assert.Single(paperMaps);
        Assert.Equal("altis", paperMaps[0].MapName);
    }

    // ── GetGameBaseAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task GetGameBaseAsync_FindsByName()
    {
        var handler = new StubHttpMessageHandler();
        handler.Setup("api/v1/games", """
            [{"gameId":1,"name":"arma3"},{"gameId":2,"name":"dayz"}]
            """);
        var client = CreateClient(handler);

        var game = await client.GetGameBaseAsync("dayz");

        Assert.NotNull(game);
        Assert.Equal(2, game.GameId);
    }

    [Fact]
    public async Task GetGameBaseAsync_FindsByNumericId()
    {
        var handler = new StubHttpMessageHandler();
        handler.Setup("api/v1/games", """
            [{"gameId":1,"name":"arma3"},{"gameId":2,"name":"dayz"}]
            """);
        var client = CreateClient(handler);

        var game = await client.GetGameBaseAsync("1");

        Assert.NotNull(game);
        Assert.Equal("arma3", game.Name);
    }

    [Fact]
    public async Task GetGameBaseAsync_ReturnsNull_WhenNotFound()
    {
        var handler = new StubHttpMessageHandler();
        handler.Setup("api/v1/games", """[{"gameId":1,"name":"arma3"}]""");
        var client = CreateClient(handler);

        var game = await client.GetGameBaseAsync("unknown");

        Assert.Null(game);
    }

    // ── GetMapBaseAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task GetMapBaseAsync_FindsByName()
    {
        var handler = new StubHttpMessageHandler();
        handler.Setup("api/v1/games/arma3/maps", """
            [{"gameMapId":10,"name":"altis"},{"gameMapId":11,"name":"stratis"}]
            """);
        var client = CreateClient(handler);

        var map = await client.GetMapBaseAsync("arma3", "stratis");

        Assert.NotNull(map);
        Assert.Equal(11, map.GameMapId);
    }

    [Fact]
    public async Task GetMapBaseAsync_FindsByAlias()
    {
        var handler = new StubHttpMessageHandler();
        handler.Setup("api/v1/games/arma3/maps", """
            [{"gameMapId":10,"name":"altis","aliases":["Altis","altis_en"]}]
            """);
        var client = CreateClient(handler);

        var map = await client.GetMapBaseAsync("arma3", "Altis");

        Assert.NotNull(map);
        Assert.Equal(10, map.GameMapId);
    }

    [Fact]
    public async Task GetMapBaseAsync_FindsByNumericId()
    {
        var handler = new StubHttpMessageHandler();
        handler.Setup("api/v1/games/arma3/maps", """
            [{"gameMapId":10,"name":"altis"},{"gameMapId":11,"name":"stratis"}]
            """);
        var client = CreateClient(handler);

        var map = await client.GetMapBaseAsync("arma3", "10");

        Assert.NotNull(map);
        Assert.Equal("altis", map.Name);
    }

    [Fact]
    public async Task GetMapBaseAsync_ReturnsNull_WhenNotFound()
    {
        var handler = new StubHttpMessageHandler();
        handler.Setup("api/v1/games/arma3/maps", """[{"gameMapId":10,"name":"altis"}]""");
        var client = CreateClient(handler);

        var map = await client.GetMapBaseAsync("arma3", "unknown");

        Assert.Null(map);
    }

    // ── Cache ──────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Cache_ReturnsCachedResult_OnSecondCall()
    {
        var handler = new StubHttpMessageHandler();
        handler.Setup("api/v1/games", """[{"gameId":1,"name":"arma3"}]""");
        var client = CreateClientWithCache(handler);

        var first = await client.GetGamesAsync();

        // Remove the response so a real HTTP call would fail
        handler.Setup("api/v1/games", "[]");

        var second = await client.GetGamesAsync();

        // Should still have 1 game from cache
        Assert.Single(second);
        Assert.Equal(first[0].Name, second[0].Name);
    }

    [Fact]
    public async Task Cache_IsDisabled_WhenCacheDurationIsZero()
    {
        var handler = new StubHttpMessageHandler();
        handler.Setup("api/v1/games", """[{"gameId":1,"name":"arma3"}]""");
        var httpClient = new HttpClient(handler) { BaseAddress = new Uri("http://localhost/") };
        var cache = new MemoryCache(Options.Create(new MemoryCacheOptions()));
        var client = new GameMapStorageClient(httpClient, cache) { CacheDuration = TimeSpan.Zero };

        await client.GetGamesAsync();

        // Replace the data — with caching disabled the new response should be returned
        handler.Setup("api/v1/games", "[]");

        var second = await client.GetGamesAsync();
        Assert.Empty(second);
    }

    // ── URL encoding ──────────────────────────────────────────────────────────

    [Fact]
    public async Task GetGameAsync_EncodesSpecialCharactersInName()
    {
        var handler = new StubHttpMessageHandler();
        handler.Setup("api/v1/games/my%20game", """{"gameId":99,"name":"my game"}""");
        var client = CreateClient(handler);

        var game = await client.GetGameAsync("my game");

        Assert.NotNull(game);
        Assert.Equal(99, game.GameId);
    }
}
