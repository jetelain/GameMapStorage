using System.ComponentModel.DataAnnotations;

namespace GameMapStorageWebSite.Entities
{
    public enum PaperFileFormat
    {
        [Display(Name = "Full Page")]
        SinglePDF,

        [Display(Name = "Booklet")]
        BookletPDF
    }
}