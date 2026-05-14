using System.Text.Json.Serialization;

namespace Pmad.GameMapStorage.Client.Models
{
    public class GameColorJson
    {
        public int GameColorId { get; init; }

        public string? EnglishTitle { get; init; }

        public string? Name { get; init; }

        public string[]? Aliases { get; init; }

        public string? Hexadecimal { get; init; }

        public ColorUsage Usage { get; init; }

        public string? ContrastHexadecimal { get; init; }
    }
}
