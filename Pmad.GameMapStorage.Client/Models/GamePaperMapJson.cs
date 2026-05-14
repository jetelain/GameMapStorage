namespace Pmad.GameMapStorage.Client.Models
{
    public class GamePaperMapJson
    {
        public int GamePaperMapId { get; init; }

        public PaperFileFormat FileFormat { get; init; }

        public PaperSize PaperSize { get; init; }

        public string? Name { get; init; }

        public int Scale { get; init; }

        public DateTime? LastChangeUtc { get; init; }

        public int FileSize { get; init; }

        public IReadOnlyList<GamePaperMapPage>? Pages { get; init; }

        public string? DownloadUri { get; init; }
    }
}
