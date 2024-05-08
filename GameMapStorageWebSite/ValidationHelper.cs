using System.Text.RegularExpressions;

namespace GameMapStorageWebSite
{
    public static class ValidationHelper
    {
        private static readonly Regex ValidFileName = new Regex("^[a-z0-9_\\-]+\\.(png|webp)$", RegexOptions.CultureInvariant | RegexOptions.CultureInvariant);

        public static bool IsValidFileName(string fileName)
        {
            return ValidFileName.IsMatch(fileName) && Path.GetFileName(fileName) == fileName;
        }

    }
}
