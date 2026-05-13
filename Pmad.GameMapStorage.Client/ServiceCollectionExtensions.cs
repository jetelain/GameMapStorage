using Microsoft.Extensions.DependencyInjection;

namespace Pmad.GameMapStorage.Client
{
    /// <summary>
    /// Extension methods for registering GameMapStorage clients with the dependency injection container.
    /// </summary>
    public static class ServiceCollectionExtensions
    {
        /// <summary>
        /// Registers <see cref="GameMapStorageClient"/> with the DI container.
        /// </summary>
        /// <param name="services">The service collection.</param>
        /// <param name="configureClient">
        /// A delegate to configure the underlying <see cref="System.Net.Http.HttpClient"/>.
        /// At minimum you should set <see cref="System.Net.Http.HttpClient.BaseAddress"/>.
        /// </param>
        public static IHttpClientBuilder AddGameMapStorageClient(
            this IServiceCollection services,
            Action<System.Net.Http.HttpClient> configureClient)
        {
            return services
                .AddHttpClient<GameMapStorageClient>(configureClient);
        }

        /// <summary>
        /// Registers <see cref="GameMapStorageClient"/> with the DI container and enables
        /// memory caching of API responses.
        /// </summary>
        /// <param name="services">The service collection.</param>
        /// <param name="configureClient">
        /// A delegate to configure the underlying <see cref="System.Net.Http.HttpClient"/>.
        /// At minimum you should set <see cref="System.Net.Http.HttpClient.BaseAddress"/>.
        /// </param>
        /// <param name="cacheDuration">
        /// How long responses are kept in the cache. Defaults to 30 minutes.
        /// </param>
        public static IHttpClientBuilder AddGameMapStorageClientWithCache(
            this IServiceCollection services,
            Action<System.Net.Http.HttpClient> configureClient,
            TimeSpan? cacheDuration = null)
        {
            services.AddMemoryCache();
            return services
                .AddHttpClient<GameMapStorageClient>()
                .ConfigureHttpClient(configureClient)
                .AddTypedClient((httpClient, sp) =>
                {
                    var cache = sp.GetRequiredService<Microsoft.Extensions.Caching.Memory.IMemoryCache>();
                    var client = new GameMapStorageClient(httpClient, cache);
                    if (cacheDuration.HasValue)
                    {
                        client.CacheDuration = cacheDuration.Value;
                    }
                    return client;
                });
        }

        /// <summary>
        /// Registers <see cref="GameMapStorageAdminClient"/> with the DI container.
        /// </summary>
        /// <param name="services">The service collection.</param>
        /// <param name="configureClient">
        /// A delegate to configure the underlying <see cref="System.Net.Http.HttpClient"/>.
        /// At minimum you should set <see cref="System.Net.Http.HttpClient.BaseAddress"/>.
        /// </param>
        public static IHttpClientBuilder AddGameMapStorageAdminClient(
            this IServiceCollection services,
            Action<System.Net.Http.HttpClient> configureClient)
        {
            return services
                .AddHttpClient<GameMapStorageAdminClient>(configureClient);
        }
    }
}
