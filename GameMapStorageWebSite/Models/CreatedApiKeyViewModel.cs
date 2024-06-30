using System.ComponentModel.DataAnnotations;
using GameMapStorageWebSite.Entities;

namespace GameMapStorageWebSite.Models
{
    public class CreatedApiKeyViewModel
    {
        public required string ClearText { get; set; }

        public required ApiKey ApiKey { get; set; }
    }
}
