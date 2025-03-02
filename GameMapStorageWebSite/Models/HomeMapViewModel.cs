using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Services.Steam;

namespace GameMapStorageWebSite.Models
{
    public class HomeMapViewModel
    {
        public bool AcceptWebp { get; set; }

        public required Game Game { get; set; }

        public required GameMap Map { get; set; }

        public required GameMapLayer Layer { get; set; }

        public required LayerDisplayOptions MapInfos { get; set; }
        public bool HasPaperMaps { get; internal set; }
        public SteamModInfos? ModInfos { get; internal set; }
    }
}
