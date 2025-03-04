using System.ComponentModel.DataAnnotations;

namespace GameMapStorageWebSite.Entities
{
    public class GameColor
    {
        public int GameColorId { get; set; }

        public required string EnglishTitle { get; set; }

        public required string Name { get; set; }

        [Display(Name = "Aliases")]
        public string[]? Aliases { get; set; }

        [Display(Name = "Color Code")]
        public required string Hexadecimal {  get; set; }

        [Display(Name = "Contrast Color")] 
        public required string ContrastHexadecimal { get; set; }

        public ColorUsage Usage { get; set; }

        // FK to Game
        public int GameId { get; set; }

        public Game? Game { get; set; }

    }
}
