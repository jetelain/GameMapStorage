namespace GameMapStorageWebSite.Services
{
    [Flags]
    public enum LayerStorageMode
    {
        SourcePng = 0x1,
        PngTiles = 0x2,
        WebpTiles = 0x4,

        Full = PngAndWebpTiles | SourcePng,
        PngAndWebpTiles = PngTiles | WebpTiles
    }
}
