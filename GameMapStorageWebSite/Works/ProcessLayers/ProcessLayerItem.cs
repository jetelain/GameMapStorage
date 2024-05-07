namespace GameMapStorageWebSite.Works.ProcessLayers
{
    public class ProcessLayerItem
    {
        public ProcessLayerItem(int minZoom, int maxZoom, string tempFileName)
        {
            MinZoom = minZoom;
            MaxZoom = maxZoom;
            TempFileName = tempFileName;
        }

        public int MinZoom { get; }

        public int MaxZoom { get; }

        public string TempFileName { get; }
    }
}
