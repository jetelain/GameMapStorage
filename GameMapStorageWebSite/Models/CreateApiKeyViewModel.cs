using System.ComponentModel.DataAnnotations;

namespace GameMapStorageWebSite.Models
{
    public class CreateApiKeyViewModel
    {
        [Required]
        public required string Title { get; set; }
    }
}
