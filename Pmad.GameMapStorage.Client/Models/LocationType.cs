using System.Text.Json.Serialization;

namespace Pmad.GameMapStorage.Client.Models
{
    [JsonConverter(typeof(JsonStringEnumConverter<LocationType>))]
    public enum LocationType
    {
        City
    }
}
