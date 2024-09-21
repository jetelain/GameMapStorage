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

        public string? GetDownloadUri(GamePaperMap layer)
        {
            return FormattableString.Invariant($"{basePath}/{layer.GameMap!.GameId}/maps/{layer.GameMapId}/papermaps/{layer.GamePaperMapId}.pdf");
        }

        public string GetLayerPattern(GameMapLayer layer)
        {
            return GetLayerPattern(defaultUseWebp, layer);
        }

        public string GetLayerPattern(bool useWebp, GameMapLayer layer)
        {
            if (layer.Format.HasSvg())
            {
                return GetLayerPattern(layer, "svg");
            }
            if (layer.Format.HasWebp() && useWebp)
            {
                return GetLayerPattern(layer, "webp");
            }
            return GetLayerPattern(layer, "png");
        }

        public string GetLayerPattern(IGameMapLayerIdentifier layer, string ext)
        {
            return FormattableString.Invariant($"{basePath}/{layer.GameId}/maps/{layer.GameMapId}/{layer.GameMapLayerId}/{{z}}/{{x}}/{{y}}.{ext}");
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

        public string GetMarker(bool useWebp, IGameMarkerIdentifier gameMarker)
        {
            if (useWebp)
            {
                return FormattableString.Invariant($"{basePath}/{gameMarker.GameId}/markers/{gameMarker.GameMarkerId}.webp");
            }
            return FormattableString.Invariant($"{basePath}/{gameMarker.GameId}/markers/{gameMarker.GameMarkerId}.png");
        }

        public string GetThumbnail(IGameMapIdentifier gameMap)
        {
            return GetThumbnail(defaultUseWebp, gameMap);
        }

        public string GetMarker(IGameMarkerIdentifier gameMarker)
        {
            return GetMarker(defaultUseWebp, gameMarker);
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
