using System.Text.Json.Serialization;

namespace Pmad.GameMapStorage.Client.Models
{
    [JsonConverter(typeof(JsonStringEnumConverter<MarkerUsage>))]
    public enum MarkerUsage
    {
        Custom
    }
}
