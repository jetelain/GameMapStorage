using System.ComponentModel;
using System.ComponentModel.DataAnnotations;

namespace GameMapStorageWebSite.Entities
{
    public enum LayerType
    {
        [Display(Name = "Topographic (Game)")]
        Topographic,
        [Display(Name = "Satellite (Game)")]
        Satellite,
        Aerial,
        Elevation,
        [Display(Name = "Topographic (Atlas)")]
        TopographicAtlas
    }
}
