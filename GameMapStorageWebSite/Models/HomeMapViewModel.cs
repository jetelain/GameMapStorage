using GameMapStorageWebSite.Entities;

namespace GameMapStorageWebSite.Models
{
    public class HomeMapViewModel
    {
        public bool AcceptWebp { get; set; }

        public required Game Game { get; set; }

        public required GameMap Map { get; set; }

        public required GameMapLayer Layer { get; set; }

        public required LayerDisplayOptions MapInfos { get; set; }
    }
}
