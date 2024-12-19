namespace GameMapStorageWebSite.Models
{
    public class TagsViewModel
    {
        public TagsViewModel(string[]? tags, string gameName)
        {
            Tags = tags ?? Array.Empty<string>();
            GameName = gameName;
        }

        public string[] Tags { get; }
        public string GameName { get; }
    }
}
