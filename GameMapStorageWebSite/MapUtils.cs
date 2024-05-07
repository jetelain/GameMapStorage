namespace GameMapStorageWebSite
{
    public static class MapUtils
    {
        public static int GetTileRowCount(int zoom)
        {
            return 1 << zoom;
        }

        public static string CombineAttibutions(string attribution, string? appendAttribution)
        {
            if (string.IsNullOrEmpty(appendAttribution) )
            {
                return attribution;
            }
            return $"{attribution}, {appendAttribution}";
        }

        public static string CombineAttibutions(string attribution, IEnumerable<string?> appendAttribution)
        {
            return CombineAttibutions(attribution, string.Join(", ", appendAttribution.Where(a => !string.IsNullOrEmpty(a)).Distinct(StringComparer.OrdinalIgnoreCase).Order())); 
        }
    }
}
