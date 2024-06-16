using System.Text.Json.Serialization;
using GameMapStorageWebSite.Entities;

namespace GameMapStorageWebSite.Models.Json
{
    public class GameJsonBase : IWithTimestamp
    {
        public GameJsonBase()
        {

        }

        public GameJsonBase(Game game, IDataPathBuilder pathBuilder)
        {
            GameId = game.GameId;
            EnglishTitle = game.EnglishTitle;
            Name = game.Name;
            Attribution = game.Attribution;
            OfficialSiteUri = game.OfficialSiteUri;
            SteamAppId = game.SteamAppId;
            LastChangeUtc = game.LastChangeUtc;
            Logo = pathBuilder.GetLogo(game);
            LogoWebp = pathBuilder.GetLogo(true, game);
            LogoPng = pathBuilder.GetLogo(false, game);
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
    }
}
