using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Models.Json;

namespace GameMapStorageStaticMirrorBuilder
{
    internal class StaticMirrorPathBuilder : IDataPathBuilder
    {
        private readonly bool defaultUseWebp = false;
        private readonly string basePath = string.Empty;

        public string? GetDownloadUri(IGameMapLayerIdentifier layer)
        {
            return null;
        }

        public string GetLayerPattern(IGameMapLayerIdentifier layer)
        {
            return GetLayerPattern(defaultUseWebp, layer);
        }

        public string GetLayerPattern(bool useWebp, IGameMapLayerIdentifier layer)
        {
            if (useWebp)
            {
                return FormattableString.Invariant($"{basePath}/{layer.GameId}/maps/{layer.GameMapId}/{layer.GameMapLayerId}/{{z}}/{{x}}/{{y}}.webp");
            }
            return FormattableString.Invariant($"{basePath}/{layer.GameId}/maps/{layer.GameMapId}/{layer.GameMapLayerId}/{{z}}/{{x}}/{{y}}.png");
        }

        public string GetLogo(IGameIdentifier game)
        {
            return GetLogo(defaultUseWebp, game);
        }

        public string GetLogo(bool useWebp, IGameIdentifier game)
        {
            if (useWebp)
            {
                return FormattableString.Invariant($"{basePath}/{game.GameId}/logo.webp");
            }
            return FormattableString.Invariant($"{basePath}/{game.GameId}/logo.png");
        }

        public string GetThumbnail(IGameMapIdentifier gameMap)
        {
            return GetThumbnail(defaultUseWebp, gameMap);
        }

        public string GetThumbnail(bool useWebp, IGameMapIdentifier gameMap)
        {
            if (useWebp)
            {
                return FormattableString.Invariant($"{basePath}/{gameMap.GameId}/maps/{gameMap.GameMapId}/thumbnail.webp");
            }
            return FormattableString.Invariant($"{basePath}/{gameMap.GameId}/maps/{gameMap.GameMapId}/thumbnail.png");
        }
    }
}
