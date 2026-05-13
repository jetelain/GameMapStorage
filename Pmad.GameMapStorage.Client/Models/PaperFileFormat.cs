using System.Text.Json.Serialization;

namespace Pmad.GameMapStorage.Client.Models
{
    [JsonConverter(typeof(JsonStringEnumConverter<PaperFileFormat>))]
    public enum PaperFileFormat
    {
        SinglePDF,
        BookletPDF
    }
}
