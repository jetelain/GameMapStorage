using System.Text.Json.Serialization;

namespace Pmad.GameMapStorage.Client.Models
{
    public class GameJson : GameJsonBase
    {
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public List<GameColorJson>? Colors { get; set; }

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public List<GameMarkerJson>? Markers { get; set; }
    }
}
