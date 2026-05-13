namespace Pmad.GameMapStorage.Client.Models
{
    public class GamePaperMapJson
    {
        public int GamePaperMapId { get; set; }

        public PaperFileFormat FileFormat { get; set; }

        public PaperSize PaperSize { get; set; }

        public string? Name { get; set; }

        public int Scale { get; set; }

        public DateTime? LastChangeUtc { get; set; }

        public int FileSize { get; set; }

        public List<GamePaperMapPage>? Pages { get; set; }

        public string? DownloadUri { get; set; }
    }
}
