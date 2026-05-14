using Microsoft.Extensions.Caching.Memory;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization.Metadata;
using Pmad.GameMapStorage.Client.Models;

namespace Pmad.GameMapStorage.Client
{
    /// <summary>
    /// Client for the GameMapStorage public API (read-only).
    /// </summary>
    public sealed class GameMapStorageClient
    {
        private readonly HttpClient _httpClient;
        private readonly IMemoryCache? _cache;

        /// <summary>
        /// Duration for which responses are kept in the memory cache.
        /// Defaults to 30 minutes. Set to <see cref="TimeSpan.Zero"/> to disable caching.
        /// Has no effect when no <see cref="IMemoryCache"/> was provided.
        /// </summary>
        public TimeSpan CacheDuration { get; set; } = TimeSpan.FromMinutes(30);

        /// <summary>
        /// Initializes a new instance of <see cref="GameMapStorageClient"/> without caching.
        /// </summary>
        /// <param name="httpClient">
        /// An <see cref="HttpClient"/> whose <see cref="HttpClient.BaseAddress"/> is set to the root of the
        /// GameMapStorage instance (e.g. <c>https://atlas.plan-ops.fr/</c>).
        /// </param>
        public GameMapStorageClient(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        /// <summary>
        /// Initializes a new instance of <see cref="GameMapStorageClient"/> with memory caching.
        /// </summary>
        /// <param name="httpClient">
        /// An <see cref="HttpClient"/> whose <see cref="HttpClient.BaseAddress"/> is set to the root of the
        /// GameMapStorage instance (e.g. <c>https://atlas.plan-ops.fr/</c>).
        /// </param>
        /// <param name="cache">The <see cref="IMemoryCache"/> used to cache API responses.</param>
        public GameMapStorageClient(HttpClient httpClient, IMemoryCache cache)
        {
            _httpClient = httpClient;
            _cache = cache;
        }

        private async Task<T?> GetAsync<T>(string relativeUri, JsonTypeInfo<T> typeInfo, CancellationToken cancellationToken = default)
        {
            if (_cache != null && CacheDuration > TimeSpan.Zero)
            {
                var cacheKey = $"GameMapStorage:{relativeUri}";
                if (_cache.TryGetValue(cacheKey, out T? cached))
                {
                    return cached;
                }
                var result = await FetchAsync(relativeUri, typeInfo, cancellationToken).ConfigureAwait(false);
                if (result != null)
                {
                    _cache.Set(cacheKey, result, CacheDuration);
                }
                return result;
            }
            return await FetchAsync(relativeUri, typeInfo, cancellationToken).ConfigureAwait(false);
        }

        private async Task<T?> FetchAsync<T>(string relativeUri, JsonTypeInfo<T> typeInfo, CancellationToken cancellationToken)
        {
            using var response = await _httpClient.GetAsync(relativeUri, cancellationToken).ConfigureAwait(false);
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                return default;
            }
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadFromJsonAsync(typeInfo, cancellationToken).ConfigureAwait(false);
        }

        /// <summary>
        /// Lists all supported games.
        /// </summary>
        public async Task<GameJsonBase[]> GetGamesAsync(CancellationToken cancellationToken = default)
        {
            return await GetAsync("api/v1/games", GameMapStorageJsonContext.Default.GameJsonBaseArray, cancellationToken).ConfigureAwait(false) ?? [];
        }

        /// <summary>
        /// Gets game metadata, standard markers and standard colors.
        /// </summary>
        /// <param name="gameNameOrId">Game name (e.g. 'arma3') or GameId (e.g. 1).</param>
        /// <param name="cancellationToken"></param>
        public Task<GameJson?> GetGameAsync(string gameNameOrId, CancellationToken cancellationToken = default)
        {
            return GetAsync($"api/v1/games/{Uri.EscapeDataString(gameNameOrId)}", GameMapStorageJsonContext.Default.GameJson, cancellationToken);
        }

        /// <summary>
        /// Lists all available maps for a game.
        /// </summary>
        /// <param name="gameNameOrId">Game name (e.g. 'arma3') or GameId (e.g. 1).</param>
        /// <param name="cancellationToken"></param>
        public async Task<GameMapJsonBase[]> GetMapsAsync(string gameNameOrId, CancellationToken cancellationToken = default)
        {
            return await GetAsync($"api/v1/games/{Uri.EscapeDataString(gameNameOrId)}/maps", GameMapStorageJsonContext.Default.GameMapJsonBaseArray, cancellationToken).ConfigureAwait(false) ?? [];
        }

        /// <summary>
        /// Gets map metadata, available layers and locations.
        /// </summary>
        /// <param name="gameNameOrId">Game name (e.g. 'arma3') or GameId (e.g. 1).</param>
        /// <param name="mapNameOrId">Map name (e.g. 'altis') or GameMapId (e.g. 1).</param>
        /// <param name="cancellationToken"></param>
        public Task<GameMapJson?> GetMapAsync(string gameNameOrId, string mapNameOrId, CancellationToken cancellationToken = default)
        {
            return GetAsync($"api/v1/games/{Uri.EscapeDataString(gameNameOrId)}/maps/{Uri.EscapeDataString(mapNameOrId)}", GameMapStorageJsonContext.Default.GameMapJson, cancellationToken);
        }

        /// <summary>
        /// Lists paper maps available for a specific map.
        /// </summary>
        /// <param name="gameNameOrId">Game name (e.g. 'arma3') or GameId (e.g. 1).</param>
        /// <param name="mapNameOrId">Map name (e.g. 'altis') or GameMapId (e.g. 1).</param>
        /// <param name="cancellationToken"></param>
        public async Task<GamePaperMapJson[]> GetMapPaperMapsAsync(string gameNameOrId, string mapNameOrId, CancellationToken cancellationToken = default)
        {
            return await GetAsync($"api/v1/games/{Uri.EscapeDataString(gameNameOrId)}/maps/{Uri.EscapeDataString(mapNameOrId)}/papermaps", GameMapStorageJsonContext.Default.GamePaperMapJsonArray, cancellationToken).ConfigureAwait(false) ?? [];
        }

        /// <summary>
        /// Lists paper maps for all maps of a game.
        /// </summary>
        /// <param name="gameNameOrId">Game name (e.g. 'arma3') or GameId (e.g. 1).</param>
        /// <param name="cancellationToken"></param>
        public async Task<GamePaperMapMapJson[]> GetGamePaperMapsAsync(string gameNameOrId, CancellationToken cancellationToken = default)
        {
            return await GetAsync($"api/v1/games/{Uri.EscapeDataString(gameNameOrId)}/papermaps", GameMapStorageJsonContext.Default.GamePaperMapMapJsonArray, cancellationToken).ConfigureAwait(false) ?? [];
        }

        /// <summary>
        /// Finds a game by name or numeric id by searching within <see cref="GetGamesAsync"/>.
        /// Returns <see langword="null"/> when no matching game is found.
        /// </summary>
        /// <param name="gameNameOrId">Game name (e.g. 'arma3') or GameId (e.g. 1).</param>
        /// <param name="cancellationToken"></param>
        public async Task<GameJsonBase?> GetGameBaseAsync(string gameNameOrId, CancellationToken cancellationToken = default)
        {
            var games = await GetGamesAsync(cancellationToken).ConfigureAwait(false);
            if (int.TryParse(gameNameOrId, System.Globalization.NumberStyles.Integer, System.Globalization.CultureInfo.InvariantCulture, out var gameId))
            {
                return games.FirstOrDefault(g => g.GameId == gameId);
            }
            return games.FirstOrDefault(g => string.Equals(g.Name, gameNameOrId, StringComparison.OrdinalIgnoreCase));
        }

        /// <summary>
        /// Finds a map by name or numeric id by searching within <see cref="GetMapsAsync"/>.
        /// Returns <see langword="null"/> when no matching map is found.
        /// </summary>
        /// <param name="gameNameOrId">Game name (e.g. 'arma3') or GameId (e.g. 1).</param>
        /// <param name="mapNameOrId">Map name (e.g. 'altis') or GameMapId (e.g. 1).</param>
        /// <param name="cancellationToken"></param>
        public async Task<GameMapJsonBase?> GetMapBaseAsync(string gameNameOrId, string mapNameOrId, CancellationToken cancellationToken = default)
        {
            var maps = await GetMapsAsync(gameNameOrId, cancellationToken).ConfigureAwait(false);
            if (int.TryParse(mapNameOrId, System.Globalization.NumberStyles.Integer, System.Globalization.CultureInfo.InvariantCulture, out var mapId))
            {
                return maps.FirstOrDefault(m => m.GameMapId == mapId);
            }
            return maps.FirstOrDefault(m => string.Equals(m.Name, mapNameOrId, StringComparison.OrdinalIgnoreCase)
                || (m.Aliases?.Any(a => string.Equals(a, mapNameOrId, StringComparison.OrdinalIgnoreCase)) ?? false));
        }
    }
}
