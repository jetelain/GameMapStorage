namespace GameMapStorageWebSite.Controllers.Admin
{
    public static class CommaSeparatedHelper
    {
        public static string[]? Parse(string? aliases)
        {
            if (string.IsNullOrEmpty(aliases))
            {
                return [];
            }
            return aliases.Split(';', ',').Select(a => a.Trim()).Where(a => !string.IsNullOrEmpty(a)).ToArray();
        }
    }
}
