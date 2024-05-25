using GameMapStorageWebSite.Services;

namespace GameMapStoreStaticMirrorBuilder
{
    internal class StaticDataConfiguration : IDataConfigurationService
    {
        public DataMode Mode => DataMode.Mirror;

        public LayerStorageMode LayerStorage => LayerStorageMode.PngAndWebpTiles;
    }
}
