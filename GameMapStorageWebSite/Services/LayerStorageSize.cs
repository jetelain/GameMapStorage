namespace GameMapStorageWebSite.Services
{
    public class LayerStorageSize
    {
        public long PngTiles { get; set; }

        public long WebpTiles { get; set; }

        public long SvgTiles { get; set; }

        public long SourceFiles { get; set; }

        public void Add(LayerStorageSize other)
        {
            PngTiles += other.PngTiles;
            WebpTiles += other.WebpTiles;
            SvgTiles += other.SvgTiles;
            SourceFiles += other.SourceFiles;
        }
    }
}
