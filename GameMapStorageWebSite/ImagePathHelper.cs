using GameMapStorageWebSite.Entities;
using SixLabors.ImageSharp.Formats.Webp;

namespace GameMapStorageWebSite
{
    public static class ImagePathHelper
    {
        private static string WebpContentType = WebpFormat.Instance.DefaultMimeType;

        public static bool AcceptWebp(HttpRequest request)
        {
            if (request.Headers.Accept.Any(v => v?.Contains(WebpContentType, StringComparison.OrdinalIgnoreCase) ?? false))
            {
                return true;
            }
            return request.Headers.UserAgent.Any(SupportsWebpUserAgent);
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

        public static bool SupportsWebpUserAgent(string? userAgent)
        {
            if (string.IsNullOrWhiteSpace(userAgent))
            {
                return false;
            }

            if (userAgent.Contains("Firefox/", StringComparison.OrdinalIgnoreCase))
            {
                // Firefox has supported WebP since version 65
                return GetUserAgentVersion("Firefox/", userAgent) >= 65;
            }

            if (userAgent.Contains("Chrome/", StringComparison.OrdinalIgnoreCase)
                || userAgent.Contains("Chromium/", StringComparison.OrdinalIgnoreCase)
                || userAgent.Contains("Edg/", StringComparison.OrdinalIgnoreCase)
                || userAgent.Contains("OPR/", StringComparison.OrdinalIgnoreCase)
                || userAgent.Contains("Vivaldi/", StringComparison.OrdinalIgnoreCase))
            {
                // Chrome, Edge, Opera and Vivaldi have supported WebP for a long time (10+ years)
                return true;
            }

            if (userAgent.Contains("Safari/", StringComparison.OrdinalIgnoreCase)
                && !userAgent.Contains("Chrome/", StringComparison.OrdinalIgnoreCase)
                && !userAgent.Contains("Chromium/", StringComparison.OrdinalIgnoreCase))
            {
                // Safari has supported WebP since version 16
                return GetUserAgentVersion("Version/", userAgent) >= 16;
            }

            return false;
        }

        private static int GetUserAgentVersion(string versionToken, string userAgent)
        {
            var versionIndex = userAgent.IndexOf(versionToken, StringComparison.OrdinalIgnoreCase);
            if (versionIndex < 0)
            {
                return 0;
            }

            versionIndex += versionToken.Length;
            var endIndex = versionIndex;
            while (endIndex < userAgent.Length && (char.IsDigit(userAgent[endIndex]) || userAgent[endIndex] == '.'))
            {
                endIndex++;
            }

            var versionString = userAgent[versionIndex..endIndex];
            if (Version.TryParse(versionString, out var parsedVersion))
            {
                return parsedVersion.Major;
            }

            return 0;
        }
    }
}
