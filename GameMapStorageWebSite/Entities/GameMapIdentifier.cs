namespace GameMapStorageWebSite.Entities
{
    public record GameMapIdentifier(int GameId, int GameMapId) : IGameMapIdentifier;
}
