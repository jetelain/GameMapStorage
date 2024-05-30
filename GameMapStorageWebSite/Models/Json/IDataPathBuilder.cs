using GameMapStorageWebSite.Entities;

namespace GameMapStorageWebSite.Models.Json
{
    public interface IDataPathBuilder
    {
        string GetLogo(IGameIdentifier game);
        string GetLogo(bool useWebp, IGameIdentifier game);
        string GetLayerPattern(IGameMapLayerIdentifier layer);
        string GetLayerPattern(bool useWebp, IGameMapLayerIdentifier layer);
        string GetThumbnail(IGameMapIdentifier gameMap);
        string GetThumbnail(bool useWebp, IGameMapIdentifier gameMap);
        string? GetDownloadUri(IGameMapLayerIdentifier layer);
    }
}
