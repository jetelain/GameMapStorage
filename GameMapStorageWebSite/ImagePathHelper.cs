using GameMapStorageWebSite.Entities;
using SixLabors.ImageSharp.Formats.Webp;

namespace GameMapStorageWebSite
{
    public static class ImagePathHelper
    {
        private static string WebpContentType = WebpFormat.Instance.DefaultMimeType;

        public static bool AcceptWebp(HttpRequest request)
        {
            if (request.Headers.UserAgent.Any(u => u?.Contains("Chrome/") ?? false))
            {
                return false; // Chrome has an issue with webp that size it not even
            }
            return request.Headers.Accept.Any(v => v?.Contains(WebpContentType) ?? false);
        }

        public static string GetLayerPattern(HttpRequest request, IGameMapLayerIdentifier layer)
        {
            if (AcceptWebp(request))
            {
                return FormattableString.Invariant($"/data/{layer.GameId}/maps/{layer.GameMapId}/{layer.GameMapLayerId}/{{z}}/{{x}}/{{y}}.webp");
            }
            return FormattableString.Invariant($"/data/{layer.GameId}/maps/{layer.GameMapId}/{layer.GameMapLayerId}/{{z}}/{{x}}/{{y}}.png");
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

        public static string GetLogo(HttpRequest request, IGameIdentifier game)
        {
            return GetLogo(AcceptWebp(request), game);
        }

        public static string GetLogo(bool useWebp, IGameIdentifier game)
        {
            if (useWebp)
            {
                return FormattableString.Invariant($"/data/{game.GameId}/logo.webp");
            }
            return FormattableString.Invariant($"/data/{game.GameId}/logo.png");
        }
    }
}
