namespace GameMapStorageWebSite.Services
{
    public class DataConfigurationService : IDataConfigurationService
    {
        internal DataConfigurationService(DataConfiguration? dataConfiguration) 
        { 
            if (dataConfiguration != null)
            {
                if (!string.IsNullOrEmpty(dataConfiguration.Mirror))
                {
                    Mode = DataMode.Mirror;
                    MirrorUri = new Uri(dataConfiguration.Mirror);
                }
                if (!string.IsNullOrEmpty(dataConfiguration.Proxy))
                {
                    if (Mode != DataMode.Primary)
                    {
                        throw new ApplicationException("Data.Mirror and Data.Proxy must not be set at the same time.");
                    }
                    Mode = DataMode.Proxy;
                    ProxyUri = new Uri(dataConfiguration.Proxy);
                }
            }        
        }

        public DataMode Mode { get; }

        public Uri? ProxyUri { get; }

        public Uri? MirrorUri { get; }

    }
}
