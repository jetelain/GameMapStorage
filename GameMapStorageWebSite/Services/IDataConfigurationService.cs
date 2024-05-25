namespace GameMapStorageWebSite.Services
{
    public interface IDataConfigurationService
    {
        DataMode Mode { get; }

        LayerStorageMode LayerStorage { get; }
    }
}
