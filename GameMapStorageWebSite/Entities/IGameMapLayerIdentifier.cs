namespace GameMapStorageWebSite.Entities
{
    public interface IGameMapLayerIdentifier : IGameMapIdentifier
    {
        int GameMapLayerId { get; }
    }
}
