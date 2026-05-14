using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Pmad.GameMapStorage.Client;

namespace Pmad.GameMapStorage.Client.Tests.Unit;

public sealed class ServiceCollectionExtensionsTests
{
    // ── AddGameMapStorageClient ─────────────────────────────────────────────

    [Fact]
    public void AddGameMapStorageClient_RegistersGameMapStorageClient()
    {
        var services = new ServiceCollection();
        services.AddGameMapStorageClient(c => c.BaseAddress = new Uri("https://example.com/"));

        var provider = services.BuildServiceProvider();

        Assert.NotNull(provider.GetService<GameMapStorageClient>());
    }

    [Fact]
    public void AddGameMapStorageClient_ReturnsIHttpClientBuilder()
    {
        var services = new ServiceCollection();
        var builder = services.AddGameMapStorageClient(c => c.BaseAddress = new Uri("https://example.com/"));

        Assert.NotNull(builder);
    }

    [Fact]
    public void AddGameMapStorageClient_DoesNotRegisterMemoryCache()
    {
        var services = new ServiceCollection();
        services.AddGameMapStorageClient(c => c.BaseAddress = new Uri("https://example.com/"));

        Assert.DoesNotContain(services, d => d.ServiceType == typeof(IMemoryCache));
    }

    [Fact]
    public void AddGameMapStorageClient_DoesNotRegisterAdminClient()
    {
        var services = new ServiceCollection();
        services.AddGameMapStorageClient(c => c.BaseAddress = new Uri("https://example.com/"));

        var provider = services.BuildServiceProvider();

        Assert.Null(provider.GetService<GameMapStorageAdminClient>());
    }

    // ── AddGameMapStorageClientWithCache ────────────────────────────────────

    [Fact]
    public void AddGameMapStorageClientWithCache_RegistersGameMapStorageClient()
    {
        var services = new ServiceCollection();
        services.AddGameMapStorageClientWithCache(c => c.BaseAddress = new Uri("https://example.com/"));

        var provider = services.BuildServiceProvider();

        Assert.NotNull(provider.GetService<GameMapStorageClient>());
    }

    [Fact]
    public void AddGameMapStorageClientWithCache_RegistersMemoryCache()
    {
        var services = new ServiceCollection();
        services.AddGameMapStorageClientWithCache(c => c.BaseAddress = new Uri("https://example.com/"));

        Assert.Contains(services, d => d.ServiceType == typeof(IMemoryCache));
    }

    [Fact]
    public void AddGameMapStorageClientWithCache_DefaultCacheDuration()
    {
        var services = new ServiceCollection();
        services.AddGameMapStorageClientWithCache(c => c.BaseAddress = new Uri("https://example.com/"));

        var provider = services.BuildServiceProvider();
        var client = provider.GetRequiredService<GameMapStorageClient>();

        Assert.Equal(TimeSpan.FromMinutes(30), client.CacheDuration);
    }

    [Fact]
    public void AddGameMapStorageClientWithCache_CustomCacheDuration()
    {
        var customDuration = TimeSpan.FromMinutes(10);
        var services = new ServiceCollection();
        services.AddGameMapStorageClientWithCache(c => c.BaseAddress = new Uri("https://example.com/"), customDuration);

        var provider = services.BuildServiceProvider();
        var client = provider.GetRequiredService<GameMapStorageClient>();

        Assert.Equal(customDuration, client.CacheDuration);
    }

    [Fact]
    public void AddGameMapStorageClientWithCache_ReturnsIHttpClientBuilder()
    {
        var services = new ServiceCollection();
        var builder = services.AddGameMapStorageClientWithCache(c => c.BaseAddress = new Uri("https://example.com/"));

        Assert.NotNull(builder);
    }

    [Fact]
    public void AddGameMapStorageClientWithCache_NullCacheDuration_UsesDefault()
    {
        var services = new ServiceCollection();
        services.AddGameMapStorageClientWithCache(c => c.BaseAddress = new Uri("https://example.com/"), null);

        var provider = services.BuildServiceProvider();
        var client = provider.GetRequiredService<GameMapStorageClient>();

        Assert.Equal(TimeSpan.FromMinutes(30), client.CacheDuration);
    }

    // ── AddGameMapStorageAdminClient ────────────────────────────────────────

    [Fact]
    public void AddGameMapStorageAdminClient_RegistersGameMapStorageAdminClient()
    {
        var services = new ServiceCollection();
        services.AddGameMapStorageAdminClient(c => c.BaseAddress = new Uri("https://example.com/"));

        var provider = services.BuildServiceProvider();

        Assert.NotNull(provider.GetService<GameMapStorageAdminClient>());
    }

    [Fact]
    public void AddGameMapStorageAdminClient_ReturnsIHttpClientBuilder()
    {
        var services = new ServiceCollection();
        var builder = services.AddGameMapStorageAdminClient(c => c.BaseAddress = new Uri("https://example.com/"));

        Assert.NotNull(builder);
    }

    [Fact]
    public void AddGameMapStorageAdminClient_DoesNotRegisterPublicClient()
    {
        var services = new ServiceCollection();
        services.AddGameMapStorageAdminClient(c => c.BaseAddress = new Uri("https://example.com/"));

        var provider = services.BuildServiceProvider();

        Assert.Null(provider.GetService<GameMapStorageClient>());
    }

    [Fact]
    public void AddGameMapStorageAdminClient_DoesNotRegisterMemoryCache()
    {
        var services = new ServiceCollection();
        services.AddGameMapStorageAdminClient(c => c.BaseAddress = new Uri("https://example.com/"));

        Assert.DoesNotContain(services, d => d.ServiceType == typeof(IMemoryCache));
    }

    // ── Combined registrations ──────────────────────────────────────────────

    [Fact]
    public void AddBothClients_BothResolvable()
    {
        var services = new ServiceCollection();
        services.AddGameMapStorageClient(c => c.BaseAddress = new Uri("https://example.com/"));
        services.AddGameMapStorageAdminClient(c => c.BaseAddress = new Uri("https://example.com/"));

        var provider = services.BuildServiceProvider();

        Assert.NotNull(provider.GetService<GameMapStorageClient>());
        Assert.NotNull(provider.GetService<GameMapStorageAdminClient>());
    }
}
