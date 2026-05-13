using System.Text.Json.Serialization;

namespace Pmad.GameMapStorage.Client
{
    internal sealed class AccessTokenResponse
    {
        [JsonPropertyName("AccessToken")]
        public string? AccessToken { get; set; }
    }
}
