using GameMapStorageWebSite.Legacy;

namespace GameMapStorageWebSite.Works.MigrateArma3Maps
{
    /// <summary>
    /// Migrate an Arma3Map map
    /// </summary>
    public class MigrateArma3MapWorkData
    {
        public MigrateArma3MapWorkData(LegacyMapInfos mapInfos, string baseUri)
        {
            MapInfos = mapInfos;
            BaseUri = baseUri;
        }

        public LegacyMapInfos MapInfos { get; }

        public string BaseUri { get; }
    }
}
