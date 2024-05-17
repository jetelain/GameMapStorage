using System.Text.Json.Serialization;
using GameMapStorageWebSite.Entities;

namespace GameMapStorageWebSite.Models.Json
{
    public class GameMapJson : IWithTimestamp
    {
        public GameMapJson()
        {

        }

        public GameMapJson(GameMap gameMap, string basePath, bool useWebp)
        {
            GameMapId = gameMap.GameMapId;
            EnglishTitle = gameMap.EnglishTitle;
            AppendAttribution = gameMap.AppendAttribution;
            SteamWorkshopId = gameMap.SteamWorkshopId;
            OfficialSiteUri = gameMap.OfficialSiteUri;
            SizeInMeters = gameMap.SizeInMeters;
            Name = gameMap.Name;
            Aliases = gameMap.Aliases;

            Thumbnail = basePath + ImagePathHelper.GetThumbnail(useWebp, gameMap);
            ThumbnailWebp = basePath + ImagePathHelper.GetThumbnail(true, gameMap);
            ThumbnailPng = basePath + ImagePathHelper.GetThumbnail(false, gameMap);
        }

        public int GameMapId { get; set; }

        public string? EnglishTitle { get; set; }

        public string? AppendAttribution { get; set; }

        public string? SteamWorkshopId { get; set; }

        public string? OfficialSiteUri { get; set; }

        public double SizeInMeters { get; set; }

        public string? Name { get; set; }

        public string[]? Aliases { get; set; }

        public string? Thumbnail { get; set; }

        public string? ThumbnailWebp { get; set; }

        public string? ThumbnailPng { get; set; }

        public DateTime? LastChangeUtc { get; set; }

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public List<GameMapLayerJson>? Layers { get; set; }

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public List<GameMapLocationJson>? Locations { get; set; }

    }
}
