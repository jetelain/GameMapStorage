namespace GameMapStorageWebSite
{
    public static class MapUtils
    {
        public static int GetTileRowCount(int zoom)
        {
            return 1 << zoom;
        }
    }
}
