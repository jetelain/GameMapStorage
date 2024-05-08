namespace GameMapStorageWebSite.Works.MigrateArma3Maps
{
    public interface IMigrateArma3MapFactory
    {
        Task InitialWorkLoad();

        Task IncrementalWorkLoad();
    }
}