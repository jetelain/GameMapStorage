using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Pmad.GameMapStorage.Client.Models;

namespace Pmad.GameMapStorage.Client
{
    /// <summary>
    /// Client for the GameMapStorage admin API (requires authentication).
    /// </summary>
    public sealed class GameMapStorageAdminClient
    {
        /// <summary>
        /// How early before the actual expiry the token is considered expired and proactively renewed.
        /// Defaults to 30 seconds.
        /// </summary>
        public TimeSpan TokenExpiryMargin { get; set; } = TimeSpan.FromSeconds(30);

        private readonly HttpClient _httpClient;
        private readonly TimeProvider _timeProvider;
        private int _apiKeyId;
        private string? _apiKey;
        private DateTimeOffset _tokenExpiresAt = DateTimeOffset.MinValue;

        /// <summary>
        /// Initializes a new instance of <see cref="GameMapStorageAdminClient"/>.
        /// </summary>
        /// <param name="httpClient">
        /// An <see cref="HttpClient"/> whose <see cref="HttpClient.BaseAddress"/> is set to the root of the
        /// GameMapStorage instance (e.g. <c>https://atlas.plan-ops.fr/</c>).
        /// </param>
        public GameMapStorageAdminClient(HttpClient httpClient)
            : this(httpClient, TimeProvider.System)
        {
        }

        internal GameMapStorageAdminClient(HttpClient httpClient, TimeProvider timeProvider)
        {
            _httpClient = httpClient;
            _timeProvider = timeProvider;
        }

        /// <summary>
        /// Authenticates with an API key and stores the resulting bearer token on the underlying
        /// <see cref="HttpClient"/> so that subsequent calls are automatically authorized.
        /// The credentials are remembered so the token can be refreshed transparently when it expires.
        /// </summary>
        /// <param name="apiKeyId">The numeric API key identifier.</param>
        /// <param name="apiKey">The secret API key value.</param>
        /// <param name="cancellationToken"></param>
        public async Task AuthenticateAsync(int apiKeyId, string apiKey, CancellationToken cancellationToken = default)
        {
            _apiKeyId = apiKeyId;
            _apiKey = apiKey;
            await RefreshTokenAsync(cancellationToken).ConfigureAwait(false);
        }

        private async Task RefreshTokenAsync(CancellationToken cancellationToken)
        {
            using var form = new MultipartFormDataContent
            {
                { new StringContent(_apiKeyId.ToString()), "apiKeyId" },
                { new StringContent(_apiKey!),             "apiKey"   }
            };

            using var response = await _httpClient.PostAsync("api/v1/tokens", form, cancellationToken).ConfigureAwait(false);
            response.EnsureSuccessStatusCode();

            var token = await response.Content.ReadFromJsonAsync(GameMapStorageJsonContext.Default.AccessTokenResponse, cancellationToken).ConfigureAwait(false);
            if (token?.AccessToken == null)
            {
                throw new InvalidOperationException("Authentication response did not contain an access token.");
            }

            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token.AccessToken);
            _tokenExpiresAt = _timeProvider.GetUtcNow().AddSeconds(token.ExpiresIn);
        }

        private async Task EnsureTokenFreshAsync(CancellationToken cancellationToken)
        {
            if (_apiKey != null && _timeProvider.GetUtcNow() >= _tokenExpiresAt - TokenExpiryMargin)
            {
                await RefreshTokenAsync(cancellationToken).ConfigureAwait(false);
            }
        }

        /// <summary>
        /// Creates a new map layer from a package stream.
        /// </summary>
        /// <param name="packageStream">Stream of the ZIP package to upload.</param>
        /// <param name="fileName">File name hint sent to the server (e.g. <c>altis.zip</c>).</param>
        /// <param name="cancellationToken"></param>
        public async Task CreateLayerFromPackageAsync(Stream packageStream, string fileName = "package.zip", CancellationToken cancellationToken = default)
        {
            await EnsureTokenFreshAsync(cancellationToken).ConfigureAwait(false);
            using var content = BuildPackageContent(packageStream, fileName);
            using var response = await _httpClient.PostAsync("api/v1/layers", content, cancellationToken).ConfigureAwait(false);
            await EnsureSuccessAsync(response).ConfigureAwait(false);
        }

        /// <summary>
        /// Updates an existing map layer from a package stream.
        /// </summary>
        /// <param name="layerId">The <c>GameMapLayerId</c> of the layer to update.</param>
        /// <param name="packageStream">Stream of the ZIP package to upload.</param>
        /// <param name="fileName">File name hint sent to the server.</param>
        /// <param name="cancellationToken"></param>
        public async Task UpdateLayerFromPackageAsync(int layerId, Stream packageStream, string fileName = "package.zip", CancellationToken cancellationToken = default)
        {
            await EnsureTokenFreshAsync(cancellationToken).ConfigureAwait(false);
            using var content = BuildPackageContent(packageStream, fileName);
            using var response = await _httpClient.PostAsync($"api/v1/layers/{layerId}", content, cancellationToken).ConfigureAwait(false);
            await EnsureSuccessAsync(response).ConfigureAwait(false);
        }

        /// <summary>
        /// Creates a new paper map from a definition and a PDF stream.
        /// </summary>
        /// <param name="definition">Paper map definition.</param>
        /// <param name="pdfStream">Stream of the PDF file to upload.</param>
        /// <param name="fileName">File name hint sent to the server.</param>
        /// <param name="cancellationToken"></param>
        public async Task CreatePaperMapAsync(PaperMapDefinition definition, Stream pdfStream, string fileName = "papermap.pdf", CancellationToken cancellationToken = default)
        {
            await EnsureTokenFreshAsync(cancellationToken).ConfigureAwait(false);
            using var content = BuildPaperMapContent(definition, pdfStream, fileName);
            using var response = await _httpClient.PostAsync("api/v1/papermaps", content, cancellationToken).ConfigureAwait(false);
            await EnsureSuccessAsync(response).ConfigureAwait(false);
        }

        /// <summary>
        /// Updates an existing paper map from a definition and a PDF stream.
        /// </summary>
        /// <param name="paperMapId">The <c>GamePaperMapId</c> of the paper map to update.</param>
        /// <param name="definition">Paper map definition.</param>
        /// <param name="pdfStream">Stream of the PDF file to upload.</param>
        /// <param name="fileName">File name hint sent to the server.</param>
        /// <param name="cancellationToken"></param>
        public async Task UpdatePaperMapAsync(int paperMapId, PaperMapDefinition definition, Stream pdfStream, string fileName = "papermap.pdf", CancellationToken cancellationToken = default)
        {
            await EnsureTokenFreshAsync(cancellationToken).ConfigureAwait(false);
            using var content = BuildPaperMapContent(definition, pdfStream, fileName);
            using var response = await _httpClient.PostAsync($"api/v1/papermaps/{paperMapId}", content, cancellationToken).ConfigureAwait(false);
            await EnsureSuccessAsync(response).ConfigureAwait(false);
        }

        private static MultipartFormDataContent BuildPackageContent(Stream stream, string fileName)
        {
            var fileContent = new StreamContent(stream);
            fileContent.Headers.ContentType = new MediaTypeHeaderValue("application/zip");
            return new MultipartFormDataContent
            {
                { fileContent, "package", fileName }
            };
        }

        private static MultipartFormDataContent BuildPaperMapContent(PaperMapDefinition definition, Stream stream, string fileName)
        {
            var json = JsonSerializer.Serialize(definition, GameMapStorageJsonContext.Default.PaperMapDefinition);
            var fileContent = new StreamContent(stream);
            fileContent.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
            return new MultipartFormDataContent
            {
                { new StringContent(json), "jsonDefinition" },
                { fileContent, "content", fileName }
            };
        }

        private static async Task EnsureSuccessAsync(HttpResponseMessage response)
        {
            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
                throw new HttpRequestException($"Request failed ({(int)response.StatusCode}): {body}", null, response.StatusCode);
            }
        }
    }
}
