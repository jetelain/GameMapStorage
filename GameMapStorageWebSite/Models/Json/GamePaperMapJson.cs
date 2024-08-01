using GameMapStorageWebSite.Entities;

namespace GameMapStorageWebSite.Models.Json
{
    public class GamePaperMapJson : IWithTimestamp
    {
        public GamePaperMapJson()
        {

        }

        public GamePaperMapJson(GamePaperMap paperMap, IDataPathBuilder pathBuilder)
        {
            GamePaperMapId = paperMap.GamePaperMapId;
            FileFormat = paperMap.FileFormat;
            PaperSize = paperMap.PaperSize;
            Name = paperMap.Name;
            Scale = paperMap.Scale;
            LastChangeUtc = paperMap.LastChangeUtc;
            FileSize = paperMap.FileSize;
            Pages = paperMap.Pages;
            DownloadUri = pathBuilder.GetDownloadUri(paperMap);
        }

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
