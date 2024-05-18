namespace GameMapStorageWebSite.Works.MirrorLayers
{
    public sealed class MirrorLayerWorkData
    {
        public MirrorLayerWorkData(int gameMapLayerId, string downloadUri)
        {
            GameMapLayerId = gameMapLayerId;
            DownloadUri = downloadUri;
        }

        public int GameMapLayerId { get; }

        public string DownloadUri { get; }
    }
}
