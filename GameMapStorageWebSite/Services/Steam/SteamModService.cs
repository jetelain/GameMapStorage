using Microsoft.Extensions.Caching.Memory;

namespace GameMapStorageWebSite.Services.Steam
{
    public class SteamModService : ISteamModService
    {
        private readonly IHttpClientFactory factory;
        private readonly IMemoryCache memoryCache;
        private readonly string? apiKey;

        public SteamModService(IHttpClientFactory factory, IConfiguration configuration, IMemoryCache memoryCache)
        {
            this.factory = factory;
            this.memoryCache = memoryCache;
            this.apiKey = configuration["SteamKey"];
        }

        public async Task<SteamModInfos?> GetModInfosAsync(string steamWorkshopId)
        {
            var key = $"SteamModInfos:{steamWorkshopId}";
            if (!memoryCache.TryGetValue(key, out SteamModInfos? modInfos))
            {
                var details = await GetPublishedFileDetails(steamWorkshopId);
                modInfos = new SteamModInfos()
                {
                    Title = details?.response?.publishedfiledetails?.FirstOrDefault()?.title ?? steamWorkshopId,
                };
                memoryCache.Set(key, modInfos, TimeSpan.FromMinutes(240));
            }
            return modInfos;
        }

        private async Task<PublishedFileDetails?> GetPublishedFileDetails(string workshopId)
        {
            if (apiKey == null)
            {
                return null;
            }
            using var client = factory.CreateClient();
            using var detailsRequest = await client.PostAsync($"https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/?format=json", new FormUrlEncodedContent(new Dictionary<string, string>()
                {
                    {"key", apiKey },
                    {"itemcount", "1" },
                    {"publishedfileids[0]", workshopId }
                }));
            return await detailsRequest.Content.ReadFromJsonAsync<PublishedFileDetails>();
        }
    }
}
