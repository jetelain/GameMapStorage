namespace GameMapStorageWebSite.Entities
{
    public interface IGameMarkerIdentifier : IGameIdentifier
    {
        int GameMarkerId { get; }
    }
}