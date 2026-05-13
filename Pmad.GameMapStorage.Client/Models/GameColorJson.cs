using System.Text.Json.Serialization;

namespace Pmad.GameMapStorage.Client.Models
{
    public class GameColorJson
    {
        public int GameColorId { get; set; }

        public string? EnglishTitle { get; set; }

        public string? Name { get; set; }

        public string[]? Aliases { get; set; }

        public string? Hexadecimal { get; set; }

        public ColorUsage Usage { get; set; }

        public string? ContrastHexadecimal { get; set; }
    }
}
