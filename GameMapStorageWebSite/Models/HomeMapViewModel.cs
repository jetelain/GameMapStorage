using GameMapStorageWebSite.Entities;

namespace GameMapStorageWebSite.Models
{
    public class HomeMapViewModel
    {
        public bool AcceptWebp { get; set; }

        public required GameMapLayer Layer { get; set; }
    }
}
