namespace GameMapStorageWebSite.Works.ProcessLayers
{
    public sealed class ProcessLayerItem
    {
        public ProcessLayerItem(int minZoom, int maxZoom, string fileName)
        {
            if (!ValidationHelper.IsValidFileName(fileName))
            {
                throw new ArgumentException($"'{fileName}' is not a valid file name.");
            }
            MinZoom = minZoom;
            MaxZoom = maxZoom;
            FileName = fileName;
        }

        public int MinZoom { get; }

        public int MaxZoom { get; }

        public string FileName { get; }
    }
}
