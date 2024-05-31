namespace GameMapStorageWebSite.Entities
{
    public static class LayerFormatExtensions
    {
        public static bool HasPng(this LayerFormat layerFormat)
        {
            return layerFormat == LayerFormat.PngOnly || layerFormat == LayerFormat.PngAndWebp;
        }

        public static bool HasWebp(this LayerFormat layerFormat)
        {
            return layerFormat == LayerFormat.WebpOnly || layerFormat == LayerFormat.PngAndWebp || layerFormat == LayerFormat.SvgAndWebp;
        }

        public static bool HasSvg(this LayerFormat layerFormat)
        {
            return layerFormat == LayerFormat.SvgOnly || layerFormat == LayerFormat.SvgAndWebp;
        }
    }
}
