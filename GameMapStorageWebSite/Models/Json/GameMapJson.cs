using System.Text.Json.Serialization;
using GameMapStorageWebSite.Entities;

namespace GameMapStorageWebSite.Models.Json
{
    public class GameMapJson : GameMapJsonBase
    {
        public GameMapJson()
        {

        }

        public GameMapJson(GameMap gameMap, IDataPathBuilder pathBuilder)
            : base(gameMap, pathBuilder)
        {

        }

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? Attribution { get; set; }

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public List<GameMapLocationJson>? Locations { get; set; }
    }
}
