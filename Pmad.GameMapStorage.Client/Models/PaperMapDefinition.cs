namespace Pmad.GameMapStorage.Client.Models
{
    public class PaperMapDefinition
    {
        public required string GameName { get; set; }

        public required string MapName { get; set; }

        public required string Name { get; set; }

        public PaperFileFormat FileFormat { get; set; }

        public PaperSize PaperSize { get; set; }

        public required List<GamePaperMapPage> Pages { get; set; }

        public int Scale { get; set; }
    }
}
