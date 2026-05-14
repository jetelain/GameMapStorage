using System.Text.Json.Serialization;

namespace Pmad.GameMapStorage.Client.Models
{
    [JsonConverter(typeof(JsonStringEnumConverter<ColorUsage>))]
    public enum ColorUsage
    {
        Custom,
        FriendSide,
        NeutralSide,
        HostileSide,
        UnknownSide,
        CivilianSide
    }
}
