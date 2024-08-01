namespace GameMapStorageWebSite.Works.MirrorPaperMaps
{
    public class MirrorPaperMapWorkData
    {
        public MirrorPaperMapWorkData(int gamePaperMapId, string downloadUri)
        {
            GamePaperMapId = gamePaperMapId;
            DownloadUri = downloadUri;
        }

        public int GamePaperMapId { get; }

        public string DownloadUri { get; }
    }
}
