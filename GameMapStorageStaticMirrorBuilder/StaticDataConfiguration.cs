using GameMapStorageWebSite.Services;

namespace GameMapStorageStaticMirrorBuilder
{
    internal class StaticDataConfiguration : IDataConfigurationService
    {
        public DataMode Mode => DataMode.Mirror;

        public LayerStorageMode LayerStorage => LayerStorageMode.PngAndWebpTiles;
    }
}
