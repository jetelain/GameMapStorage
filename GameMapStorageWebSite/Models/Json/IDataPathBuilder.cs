using GameMapStorageWebSite.Entities;

namespace GameMapStorageWebSite.Models.Json
{
    public interface IDataPathBuilder
    {
        string GetLogo(IGameIdentifier game);
        string GetLogo(bool useWebp, IGameIdentifier game);
        string GetLayerPattern(GameMapLayer layer);
        string GetLayerPattern(bool acceptWebp, GameMapLayer layer);
        string GetLayerPattern(IGameMapLayerIdentifier layer, string ext);
        string GetThumbnail(IGameMapIdentifier gameMap);
        string GetThumbnail(bool useWebp, IGameMapIdentifier gameMap);
        string? GetDownloadUri(IGameMapLayerIdentifier layer);
        string? GetDownloadUri(GamePaperMap layer);
        string GetMarker(IGameMarkerIdentifier gameMarker);
        string GetMarker(bool useWebp, IGameMarkerIdentifier gameMarker);
    }
}
