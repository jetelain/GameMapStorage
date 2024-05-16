using System.Text.Json.Serialization;
using GameMapStorageWebSite.Entities;

namespace GameMapStorageWebSite.Models.Json
{
    public class GameJson
    {
        public GameJson()
        {

        }

        public GameJson(Game game, string basePath, bool useWebp)
        {
            GameId = game.GameId;
            EnglishTitle = game.EnglishTitle;
            Name = game.Name;
            Attribution = game.Attribution;
            OfficialSiteUri = game.OfficialSiteUri;
            SteamAppId = game.SteamAppId;
            LastChangeUtc = game.LastChangeUtc;
            Logo = basePath + ImagePathHelper.GetLogo(useWebp, game);
            LogoWebp = basePath + ImagePathHelper.GetLogo(true, game);
            LogoPng = basePath + ImagePathHelper.GetLogo(false, game);
        }

        public int GameId { get; set; }

        public string? EnglishTitle { get; set; }

        public string? Name { get; set; }

        public string? Attribution { get; set; }

        public string? OfficialSiteUri { get; set; }

        public string? SteamAppId { get; set; }

        public DateTime? LastChangeUtc { get; set; }

        public string? Logo { get; set; }

        public string? LogoWebp { get; set; }

        public string? LogoPng { get; set; }

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public List<GameColorJson>? Colors { get; set; }

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public List<GameMarkerJson>? Markers { get; set; }

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public List<GameMapJson>? Maps { get; set; }
    }
}
