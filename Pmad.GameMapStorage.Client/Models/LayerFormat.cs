using System.Text.Json.Serialization;

namespace Pmad.GameMapStorage.Client.Models
{
    [JsonConverter(typeof(JsonStringEnumConverter<LayerFormat>))]
    public enum LayerFormat
    {
        PngOnly,
        PngAndWebp,
        SvgOnly,
        SvgAndWebp,
        WebpOnly
    }
}
