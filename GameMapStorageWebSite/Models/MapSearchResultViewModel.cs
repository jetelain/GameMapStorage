namespace GameMapStorageWebSite.Models
{
    public class MapSearchResultViewModel
    {
        public int GameMapId { get; set; }
        public required string MapName { get; set; }
        public required string MapTitle { get; set; }
        public required string GameName { get; set; }
        public required string GameTitle { get; set; }
        public required string ThumbnailUrl { get; set; }
        public required string MapUrl { get; set; }
    }
}
