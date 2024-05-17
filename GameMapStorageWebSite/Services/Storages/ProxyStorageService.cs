namespace GameMapStorageWebSite.Services.Storages
{
    public class ProxyStorageService : IStorageService, IDisposable
    {
        private readonly ILocalStorageService localStorage;
        private readonly HttpClient client;

        public ProxyStorageService(ILocalStorageService localStorage, IHttpClientFactory clientFactory)
        {
            this.localStorage = localStorage;
            client = clientFactory.CreateClient("Proxy");
        }

        public Task Delete(string path)
        {
            return localStorage.Delete(path);
        }

        public void Dispose()
        {
            client.Dispose();
        }

        public async Task<IStorageFile?> GetAsync(string path)
        {
            var localFile = await localStorage.GetAsync(path);
            if (localFile != null)
            {
                return localFile;
            }
            using var request = new HttpRequestMessage(HttpMethod.Get, path);
            var response = await client.SendAsync(request);
            if (response.IsSuccessStatusCode)
            {
                // response will be disposed by HttpFile
                return new HttpFile(response);
            }
            response.Dispose();
            return null;
        }

        public Task StoreAsync(string path, Func<Stream, Task> write)
        {
            return localStorage.StoreAsync(path, write);
        }
    }
}
