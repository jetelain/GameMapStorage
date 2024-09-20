using GameMapStorageWebSite.Entities;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.PixelFormats;

namespace GameMapStorageWebSite
{
    public static class ImagePathHelper
    {
        private static string WebpContentType = WebpFormat.Instance.DefaultMimeType;

        public static bool AcceptWebp(HttpRequest request)
        {
            return request.Headers.Accept.Any(v => v?.Contains(WebpContentType) ?? false);
        }

        public static string GetLayerPattern(HttpRequest request, GameMapLayer layer)
        {
            return GetLayerPattern(AcceptWebp(request), layer);
        }

        public static string GetLayerPattern(bool useWebp, GameMapLayer layer)
        {
            if (layer.Format.HasSvg())
            {
                return GetLayerPattern(layer, "svg");
            }
            if (useWebp && layer.Format.HasWebp())
            {
                return GetLayerPattern(layer, "webp");
            }
            return GetLayerPattern(layer, "png");
        }

        public static string GetLayerPattern(IGameMapLayerIdentifier layer, string ext)
        {
            return FormattableString.Invariant($"/data/{layer.GameId}/maps/{layer.GameMapId}/{layer.GameMapLayerId}/{{z}}/{{x}}/{{y}}.{ext}");
        }

        public static string GetLayerPreview(HttpRequest request, IGameMapLayerIdentifier layer)
        {
            return GetLayerPreview(AcceptWebp(request), layer);
        }

        public static string GetLayerPreview(bool useWebp, IGameMapLayerIdentifier layer)
        {
            if (useWebp)
            {
                return FormattableString.Invariant($"/data/{layer.GameId}/maps/{layer.GameMapId}/{layer.GameMapLayerId}/0/0/0.webp");
            }
            return FormattableString.Invariant($"/data/{layer.GameId}/maps/{layer.GameMapId}/{layer.GameMapLayerId}/0/0/0.png");
        }

        public static string GetThumbnail(HttpRequest request, IGameMapIdentifier gameMap)
        {
            return GetThumbnail(AcceptWebp(request), gameMap);
        }

        public static string GetThumbnail(bool useWebp, IGameMapIdentifier gameMap)
        {
            if (useWebp)
            {
                return FormattableString.Invariant($"/data/{gameMap.GameId}/maps/{gameMap.GameMapId}/thumbnail.webp");
            }
            return FormattableString.Invariant($"/data/{gameMap.GameId}/maps/{gameMap.GameMapId}/thumbnail.png");
        }

        public static string GetLogo(bool useWebp, IGameIdentifier game)
        {
            if (useWebp)
            {
                return FormattableString.Invariant($"/data/{game.GameId}/logo.webp");
            }
            return FormattableString.Invariant($"/data/{game.GameId}/logo.png");
        }

        public static string GetMarker(bool useWebp, IGameMarkerIdentifier gameMarker)
        {
            if (useWebp)
            {
                return FormattableString.Invariant($"/data/{gameMarker.GameId}/markers/{gameMarker.GameMarkerId}.webp");
            }
            return FormattableString.Invariant($"/data/{gameMarker.GameId}/markers/{gameMarker.GameMarkerId}.png");
        }

        public static string GetMarkerPattern(bool useWebp, IGameMarkerIdentifier gameMarker)
        {
            if (useWebp)
            {
                return FormattableString.Invariant($"/data/{gameMarker.GameId}/markers/{{color}}/{gameMarker.GameMarkerId}.webp");
            }
            return FormattableString.Invariant($"/data/{gameMarker.GameId}/markers/{{color}}/{gameMarker.GameMarkerId}.png");
        }
    }
}
