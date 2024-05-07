using System.Text.Json;
using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Legacy;

namespace GameMapStorageWebSite.Works.MigrateArma3Maps
{
    public class MigrateArma3MapFactory
    {
        private readonly HttpClient client;
        private readonly GameMapStorageContext context;
        private readonly string baseUri;

        public MigrateArma3MapFactory(IConfiguration configuration, GameMapStorageContext context, IHttpClientFactory httpClientFactory)
        {
            this.baseUri = configuration["Arma3MapEndpoint"] ?? @"https://mapsdata.plan-ops.fr";
            this.client = httpClientFactory.CreateClient("CDN");
            this.context = context;
        }

        public async Task InitialWorkLoad()
        {
            foreach (var work in await GetAll())
            {
                context.Works.Add(new BackgroundWork() {
                    Data = JsonSerializer.Serialize(work),
                    CreatedUtc = DateTime.UtcNow, 
                    Type = BackgroundWorkType.MigrateArma3Map });
            }
            await context.SaveChangesAsync();
        }

        public async Task<List<MigrateArma3MapWorkData>> GetAll()
        {
            using var stream = await OpenStream(baseUri + "/maps/all.json");
            var data = await JsonSerializer.DeserializeAsync<Dictionary<string, LegacyMapInfos>>(stream, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });
            if (data == null)
            {
                return new List<MigrateArma3MapWorkData>();
            }
            foreach(var pair in data)
            {
                if (string.IsNullOrEmpty(pair.Value.worldName))
                {
                    pair.Value.worldName = pair.Key;
                }
            }
            return data.Values.Select(info => new MigrateArma3MapWorkData(info, baseUri)).ToList();
        }

        private async Task<Stream> OpenStream(string uriOrPath)
        {
            if (uriOrPath.StartsWith("https://"))
            {
                return await client.GetStreamAsync(uriOrPath);
            }
            return File.OpenRead(uriOrPath);
        }
    }
}
