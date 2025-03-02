namespace GameMapStorageWebSite.Services.Steam
{
    public class PublishedFileDetailsResponse
    {
        public int result { get; set; }
        public int resultcount { get; set; }
        public List<PublishedFileDetail>? publishedfiledetails { get; set; }
    }
}