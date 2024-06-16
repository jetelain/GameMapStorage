using System.Text.Json.Serialization;
using GameMapStorageWebSite.Entities;

namespace GameMapStorageWebSite.Models.Json
{
    public class GameJson : GameJsonBase
    {
        public GameJson()
        {

        }

        public GameJson(Game game, IDataPathBuilder pathBuilder)
            : base(game, pathBuilder)
        {

        }

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public List<GameColorJson>? Colors { get; set; }

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public List<GameMarkerJson>? Markers { get; set; }
    }
}
