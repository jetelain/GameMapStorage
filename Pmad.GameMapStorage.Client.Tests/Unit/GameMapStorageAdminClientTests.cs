using System.Net;
using System.Net.Http.Headers;
using Pmad.GameMapStorage.Client.Models;

namespace Pmad.GameMapStorage.Client.Tests.Unit;

public sealed class GameMapStorageAdminClientTests
{
    private static (GameMapStorageAdminClient client, StubHttpMessageHandler handler) CreateClient()
    {
        var handler = new StubHttpMessageHandler();
        var httpClient = new HttpClient(handler) { BaseAddress = new Uri("https://example.com/") };
        return (new GameMapStorageAdminClient(httpClient), handler);
    }

    // ── AuthenticateAsync ──────────────────────────────────────────────────────

    [Fact]
    public async Task AuthenticateAsync_SetsAuthorizationHeader()
    {
        var (client, handler) = CreateClient();
        handler.Setup("api/v1/tokens", """{"AccessToken":"tok123"}""");

        await client.AuthenticateAsync(42, "secret");

        var req = Assert.Single(handler.Requests);
        Assert.Equal(HttpMethod.Post, req.Message.Method);
        Assert.Contains("api/v1/tokens", req.Message.RequestUri!.ToString());
    }

    [Fact]
    public async Task AuthenticateAsync_PostsApiKeyIdAndSecret()
    {
        var (client, handler) = CreateClient();
        handler.Setup("api/v1/tokens", """{"AccessToken":"tok123"}""");

        await client.AuthenticateAsync(7, "my-key");

        var body = handler.Requests[0].BodyText;
        Assert.Contains("my-key", body);
        Assert.Contains("7", body);
    }

    [Fact]
    public async Task AuthenticateAsync_Throws_WhenResponseIsNotSuccess()
    {
        var (client, handler) = CreateClient();
        handler.Setup("api/v1/tokens", "Unauthorized", HttpStatusCode.Unauthorized);

        await Assert.ThrowsAsync<HttpRequestException>(() => client.AuthenticateAsync(1, "bad-key"));
    }

    [Fact]
    public async Task AuthenticateAsync_Throws_WhenTokenIsMissingInResponse()
    {
        var (client, handler) = CreateClient();
        handler.Setup("api/v1/tokens", """{"AccessToken":null}""");

        await Assert.ThrowsAsync<InvalidOperationException>(() => client.AuthenticateAsync(1, "key"));
    }

    // ── CreateLayerFromPackageAsync ────────────────────────────────────────────

    [Fact]
    public async Task CreateLayerFromPackageAsync_PostsToLayersEndpoint()
    {
        var (client, handler) = CreateClient();
        handler.Setup("api/v1/layers", string.Empty, HttpStatusCode.OK);

        using var stream = new MemoryStream([1, 2, 3]);
        await client.CreateLayerFromPackageAsync(stream, "altis.zip");

        var req = Assert.Single(handler.Requests);
        Assert.Equal(HttpMethod.Post, req.Message.Method);
        Assert.EndsWith("api/v1/layers", req.Message.RequestUri!.AbsolutePath);
    }

    [Fact]
    public async Task CreateLayerFromPackageAsync_SendsZipBody()
    {
        var (client, handler) = CreateClient();
        handler.Setup("api/v1/layers", string.Empty, HttpStatusCode.OK);

        using var stream = new MemoryStream([0xFF, 0xFE]);
        await client.CreateLayerFromPackageAsync(stream, "test.zip");

        // The multipart body is serialized to the captured BodyText; verify it contains the file name.
        var body = handler.Requests[0].BodyText;
        Assert.Contains("test.zip", body);
    }

    [Fact]
    public async Task CreateLayerFromPackageAsync_Throws_WhenServerReturnsError()
    {
        var (client, handler) = CreateClient();
        handler.Setup("api/v1/layers", "Bad Request", HttpStatusCode.BadRequest);

        using var stream = new MemoryStream([1]);
        var ex = await Assert.ThrowsAsync<HttpRequestException>(
            () => client.CreateLayerFromPackageAsync(stream));
        Assert.Equal(HttpStatusCode.BadRequest, ex.StatusCode);
        Assert.Contains("400", ex.Message);
    }

    // ── UpdateLayerFromPackageAsync ────────────────────────────────────────────

    [Fact]
    public async Task UpdateLayerFromPackageAsync_PostsToCorrectLayerEndpoint()
    {
        var (client, handler) = CreateClient();
        handler.Setup("api/v1/layers/99", string.Empty, HttpStatusCode.OK);

        using var stream = new MemoryStream([1, 2, 3]);
        await client.UpdateLayerFromPackageAsync(99, stream, "update.zip");

        var req = Assert.Single(handler.Requests);
        Assert.Equal(HttpMethod.Post, req.Message.Method);
        Assert.EndsWith("/api/v1/layers/99", req.Message.RequestUri!.AbsolutePath);
    }

    [Fact]
    public async Task UpdateLayerFromPackageAsync_Throws_WhenServerReturnsError()
    {
        var (client, handler) = CreateClient();
        handler.Setup("api/v1/layers/5", "Not Found", HttpStatusCode.NotFound);

        using var stream = new MemoryStream([1]);
        var ex = await Assert.ThrowsAsync<HttpRequestException>(
            () => client.UpdateLayerFromPackageAsync(5, stream));
        Assert.Equal(HttpStatusCode.NotFound, ex.StatusCode);
    }

    // ── CreatePaperMapAsync ────────────────────────────────────────────────────

    [Fact]
    public async Task CreatePaperMapAsync_PostsToPaperMapsEndpoint()
    {
        var (client, handler) = CreateClient();
        handler.Setup("api/v1/papermaps", string.Empty, HttpStatusCode.OK);

        using var stream = new MemoryStream([0x25, 0x50, 0x44, 0x46]); // %PDF
        await client.CreatePaperMapAsync(MakePaperMapDefinition(), stream, "map.pdf");

        var req = Assert.Single(handler.Requests);
        Assert.Equal(HttpMethod.Post, req.Message.Method);
        Assert.EndsWith("api/v1/papermaps", req.Message.RequestUri!.AbsolutePath);
    }

    [Fact]
    public async Task CreatePaperMapAsync_BodyContainsJsonDefinitionAndFileName()
    {
        var (client, handler) = CreateClient();
        handler.Setup("api/v1/papermaps", string.Empty, HttpStatusCode.OK);

        using var stream = new MemoryStream([0x25, 0x50, 0x44, 0x46]);
        await client.CreatePaperMapAsync(MakePaperMapDefinition(), stream, "map.pdf");

        var body = handler.Requests[0].BodyText;
        Assert.Contains("arma3", body);
        Assert.Contains("altis", body);
        Assert.Contains("map.pdf", body);
    }

    [Fact]
    public async Task CreatePaperMapAsync_Throws_WhenServerReturnsError()
    {
        var (client, handler) = CreateClient();
        handler.Setup("api/v1/papermaps", "error", HttpStatusCode.InternalServerError);

        using var stream = new MemoryStream([1]);
        var ex = await Assert.ThrowsAsync<HttpRequestException>(
            () => client.CreatePaperMapAsync(MakePaperMapDefinition(), stream));
        Assert.Equal(HttpStatusCode.InternalServerError, ex.StatusCode);
    }

    // ── UpdatePaperMapAsync ────────────────────────────────────────────────────

    [Fact]
    public async Task UpdatePaperMapAsync_PostsToCorrectPaperMapEndpoint()
    {
        var (client, handler) = CreateClient();
        handler.Setup("api/v1/papermaps/12", string.Empty, HttpStatusCode.OK);

        using var stream = new MemoryStream([0x25, 0x50]);
        await client.UpdatePaperMapAsync(12, MakePaperMapDefinition(), stream, "update.pdf");

        var req = Assert.Single(handler.Requests);
        Assert.Equal(HttpMethod.Post, req.Message.Method);
        Assert.EndsWith("/api/v1/papermaps/12", req.Message.RequestUri!.AbsolutePath);
    }

    [Fact]
    public async Task UpdatePaperMapAsync_Throws_WhenServerReturnsError()
    {
        var (client, handler) = CreateClient();
        handler.Setup("api/v1/papermaps/3", "Forbidden", HttpStatusCode.Forbidden);

        using var stream = new MemoryStream([1]);
        var ex = await Assert.ThrowsAsync<HttpRequestException>(
            () => client.UpdatePaperMapAsync(3, MakePaperMapDefinition(), stream));
        Assert.Equal(HttpStatusCode.Forbidden, ex.StatusCode);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private static PaperMapDefinition MakePaperMapDefinition() => new()
    {
        GameName = "arma3",
        MapName = "altis",
        Name = "Altis 1:50 000",
        FileFormat = PaperFileFormat.SinglePDF,
        PaperSize = PaperSize.A3,
        Scale = 50000,
        Pages = [new GamePaperMapPage { PageNumber = 1 }]
    };
}
