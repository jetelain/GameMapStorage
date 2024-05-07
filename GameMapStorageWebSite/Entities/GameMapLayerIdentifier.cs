namespace GameMapStorageWebSite.Entities
{
    public record GameMapLayerIdentifier(int GameId, int GameMapId, int GameMapLayerId) : IGameMapLayerIdentifier;
}
