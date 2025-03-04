using GameMapStorageWebSite.Entities;
using static AspNet.Security.OpenId.OpenIdAuthenticationConstants;

namespace GameMapStorageWebSite.Models.Json
{
    public class GameColorJson
    {
        public GameColorJson()
        {

        }

        public GameColorJson(GameColor gameColor)
        {
            GameColorId = gameColor.GameColorId;
            EnglishTitle = gameColor.EnglishTitle;
            Name = gameColor.Name;
            Aliases = gameColor.Aliases;
            Hexadecimal = gameColor.Hexadecimal;
            ContrastHexadecimal = gameColor.ContrastHexadecimal;
            Usage = gameColor.Usage;
        }

        public int GameColorId { get; set; }

        public string? EnglishTitle { get; set; }

        public string? Name { get; set; }

        public string[]? Aliases { get; }

        public string? Hexadecimal { get; set; }

        public ColorUsage Usage { get; set; }

        public string? ContrastHexadecimal { get; set; }
    }
}