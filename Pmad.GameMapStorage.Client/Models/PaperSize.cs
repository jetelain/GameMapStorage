using System.Text.Json.Serialization;

namespace Pmad.GameMapStorage.Client.Models
{
    [JsonConverter(typeof(JsonStringEnumConverter<PaperSize>))]
    public enum PaperSize
    {
        A4,
        A3,
        A2,
        A1,
        A0,
        ArchE
    }
}
