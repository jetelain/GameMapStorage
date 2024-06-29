using GameMapStorageWebSite.Entities;

namespace GameMapStorageWebSite.Models.Json
{
    public class WebPathBuilder : IDataPathBuilder
    {
        private readonly string basePath;
        private readonly bool defaultUseWebp;

        public WebPathBuilder(string basePath, bool useWebp)
        {
            this.basePath = basePath;
            this.defaultUseWebp = useWebp;
        }

        public string GetLogo(IGameIdentifier game)
        {
            return GetLogo(defaultUseWebp, game);
        }

        public string GetLogo(bool useWebp, IGameIdentifier game)
        {
            return basePath + ImagePathHelper.GetLogo(useWebp, game);
        }

        public string GetLayerPattern(GameMapLayer layer)
        {
            return GetLayerPattern(defaultUseWebp, layer);
        }

        public string GetLayerPattern(bool useWebp, GameMapLayer layer)
        {
            return basePath + ImagePathHelper.GetLayerPattern(useWebp, layer);
        }

        public string GetThumbnail(IGameMapIdentifier gameMap)
        {
            return GetThumbnail(defaultUseWebp, gameMap);
        }

        public string GetThumbnail(bool useWebp, IGameMapIdentifier gameMap)
        {
            return basePath + ImagePathHelper.GetThumbnail(useWebp, gameMap);
        }

        public string? GetDownloadUri(IGameMapLayerIdentifier layer)
        {
            return $"{basePath}/data/{layer.GameId}/maps/{layer.GameMapId}/{layer.GameMapLayerId}.zip";
        }

        public string GetLayerPattern(IGameMapLayerIdentifier layer, string ext)
        {
            return basePath + ImagePathHelper.GetLayerPattern(layer, ext);
        }
    }
}
