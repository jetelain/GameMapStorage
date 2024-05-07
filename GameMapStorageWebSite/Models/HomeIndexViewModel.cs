using GameMapStorageWebSite.Entities;

namespace GameMapStorageWebSite.Models
{
    public class HomeIndexViewModel
    {
        public bool AcceptWebp { get; set; }

        public required List<Game> Games { get; set; }
    }
}
