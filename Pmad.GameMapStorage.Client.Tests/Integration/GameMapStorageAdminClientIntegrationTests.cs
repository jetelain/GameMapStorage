using Pmad.GameMapStorage.Client.Models;

namespace Pmad.GameMapStorage.Client.Tests.Integration;

file static class TestPaperMapDefinition
{
    public static PaperMapDefinition Create(string name = "Test", int scale = 50000) => new()
    {
        GameName = "arma3",
        MapName = "altis",
        Name = name,
        Scale = scale,
        FileFormat = PaperFileFormat.SinglePDF,
        PaperSize = Models.PaperSize.A3,
        Pages = [new GamePaperMapPage { PageNumber = 1 }]
    };
}

/// <summary>
/// Integration tests for <see cref="GameMapStorageAdminClient"/> against a small
/// in-process <c>GameMapStorageWebSite</c> instance with fake storage services.
/// </summary>
public sealed class GameMapStorageAdminClientIntegrationTests : IAsyncLifetime
{
    private readonly AdminWebApplicationFactory _factory = new();
    private int _apiKeyId;
    private string _clearTextKey = "";
    private int _layerId;
    private int _paperMapId;
    private HttpClient _httpClient = null!;

    public async Task InitializeAsync()
    {
        (_apiKeyId, _clearTextKey, _layerId, _paperMapId) = await _factory.SeedAdminAsync();
        _httpClient = _factory.CreateClient(new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });
    }

    public Task DisposeAsync()
    {
        _httpClient.Dispose();
        _factory.Dispose();
        return Task.CompletedTask;
    }

    private GameMapStorageAdminClient CreateAdminClient()
        => new(_httpClient);

    // ── Authentication ──────────────────────────────────────────────────────

    [Fact]
    public async Task AuthenticateAsync_ValidCredentials_SetsAuthorizationHeader()
    {
        var client = CreateAdminClient();

        await client.AuthenticateAsync(_apiKeyId, _clearTextKey);

        Assert.NotNull(_httpClient.DefaultRequestHeaders.Authorization);
        Assert.Equal("Bearer", _httpClient.DefaultRequestHeaders.Authorization.Scheme);
        Assert.False(string.IsNullOrWhiteSpace(_httpClient.DefaultRequestHeaders.Authorization.Parameter));
    }

    [Fact]
    public async Task AuthenticateAsync_InvalidKey_ThrowsHttpRequestException()
    {
        var client = CreateAdminClient();

        await Assert.ThrowsAsync<HttpRequestException>(
            () => client.AuthenticateAsync(_apiKeyId, "WRONG_KEY"));
    }

    [Fact]
    public async Task AuthenticateAsync_UnknownKeyId_ThrowsHttpRequestException()
    {
        var client = CreateAdminClient();

        await Assert.ThrowsAsync<HttpRequestException>(
            () => client.AuthenticateAsync(99999, "whatever"));
    }

    // ── CreateLayerFromPackageAsync ─────────────────────────────────────────

    [Fact]
    public async Task CreateLayerFromPackageAsync_AfterAuth_Succeeds()
    {
        var client = CreateAdminClient();
        await client.AuthenticateAsync(_apiKeyId, _clearTextKey);

        using var stream = new MemoryStream([0x50, 0x4B, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                                             0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                                             0x00, 0x00]);
        await client.CreateLayerFromPackageAsync(stream, "test.zip");

        Assert.Single(_factory.PackageService.CreateCalls);
    }

    [Fact]
    public async Task CreateLayerFromPackageAsync_WithoutAuth_ThrowsHttpRequestException()
    {
        var client = CreateAdminClient();

        using var stream = new MemoryStream([1, 2, 3]);
        await Assert.ThrowsAsync<HttpRequestException>(
            () => client.CreateLayerFromPackageAsync(stream));
    }

    // ── UpdateLayerFromPackageAsync ─────────────────────────────────────────

    [Fact]
    public async Task UpdateLayerFromPackageAsync_AfterAuth_Succeeds()
    {
        var client = CreateAdminClient();
        await client.AuthenticateAsync(_apiKeyId, _clearTextKey);

        using var stream = new MemoryStream([0x50, 0x4B, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                                             0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                                             0x00, 0x00]);
        await client.UpdateLayerFromPackageAsync(_layerId, stream, "test.zip");

        Assert.Single(_factory.PackageService.UpdateCalls);
        Assert.Equal(_layerId, _factory.PackageService.UpdateCalls[0].LayerId);
    }

    [Fact]
    public async Task UpdateLayerFromPackageAsync_UnknownId_ThrowsHttpRequestException()
    {
        var client = CreateAdminClient();
        await client.AuthenticateAsync(_apiKeyId, _clearTextKey);

        using var stream = new MemoryStream([1, 2, 3]);
        await Assert.ThrowsAsync<HttpRequestException>(
            () => client.UpdateLayerFromPackageAsync(99999, stream));
    }

    [Fact]
    public async Task UpdateLayerFromPackageAsync_WithoutAuth_ThrowsHttpRequestException()
    {
        var client = CreateAdminClient();

        using var stream = new MemoryStream([1, 2, 3]);
        await Assert.ThrowsAsync<HttpRequestException>(
            () => client.UpdateLayerFromPackageAsync(_layerId, stream));
    }

    // ── CreatePaperMapAsync ─────────────────────────────────────────────────

    [Fact]
    public async Task CreatePaperMapAsync_AfterAuth_Succeeds()
    {
        var client = CreateAdminClient();
        await client.AuthenticateAsync(_apiKeyId, _clearTextKey);

        var definition = TestPaperMapDefinition.Create("Stratis 1:25 000", 25000);

        using var stream = new MemoryStream([0x25, 0x50, 0x44, 0x46]); // %PDF
        await client.CreatePaperMapAsync(definition, stream, "stratis.pdf");

        Assert.Single(_factory.PaperMapService.CreateCalls);
    }

    [Fact]
    public async Task CreatePaperMapAsync_WithoutAuth_ThrowsHttpRequestException()
    {
        var client = CreateAdminClient();

        var definition = TestPaperMapDefinition.Create();
        using var stream = new MemoryStream([1, 2, 3]);
        await Assert.ThrowsAsync<HttpRequestException>(
            () => client.CreatePaperMapAsync(definition, stream));
    }

    // ── UpdatePaperMapAsync ─────────────────────────────────────────────────

    [Fact]
    public async Task UpdatePaperMapAsync_AfterAuth_Succeeds()
    {
        var client = CreateAdminClient();
        await client.AuthenticateAsync(_apiKeyId, _clearTextKey);

        var definition = TestPaperMapDefinition.Create("Altis 1:50 000", 50000);

        using var stream = new MemoryStream([0x25, 0x50, 0x44, 0x46]); // %PDF
        await client.UpdatePaperMapAsync(_paperMapId, definition, stream, "altis.pdf");

        Assert.Single(_factory.PaperMapService.UpdateCalls);
        Assert.Equal(_paperMapId, _factory.PaperMapService.UpdateCalls[0]);
    }

    [Fact]
    public async Task UpdatePaperMapAsync_UnknownId_ThrowsHttpRequestException()
    {
        var client = CreateAdminClient();
        await client.AuthenticateAsync(_apiKeyId, _clearTextKey);

        var definition = TestPaperMapDefinition.Create();
        using var stream = new MemoryStream([1, 2, 3]);
        await Assert.ThrowsAsync<HttpRequestException>(
            () => client.UpdatePaperMapAsync(99999, definition, stream));
    }

    [Fact]
    public async Task UpdatePaperMapAsync_WithoutAuth_ThrowsHttpRequestException()
    {
        var client = CreateAdminClient();

        var definition = TestPaperMapDefinition.Create();
        using var stream = new MemoryStream([1, 2, 3]);
        await Assert.ThrowsAsync<HttpRequestException>(
            () => client.UpdatePaperMapAsync(_paperMapId, definition, stream));
    }
}
