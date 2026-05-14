using System.Text.Json.Serialization;

namespace Pmad.GameMapStorage.Client.Models
{
    [JsonConverter(typeof(JsonStringEnumConverter<LayerType>))]
    public enum LayerType
    {
        Topographic,
        Satellite,
        Aerial,
        Elevation,
        TopographicAtlas
    }
}
