namespace GameMapStorageWebSite.Services
{
    public class ProxyStorageService : IStorageService, IDisposable
    {
        private readonly ILocalStorageService localStorage;
        private readonly HttpClient client;

        public ProxyStorageService(ILocalStorageService localStorage, IHttpClientFactory clientFactory)
        {
            this.localStorage = localStorage;
            client = clientFactory.CreateClient("ProxyClient");
        }

        public Task Delete(string path)
        {
            return localStorage.Delete(path);
        }

        public void Dispose()
        {
            client.Dispose();
        }

        public async Task ReadAsync(string path, Func<Stream, Task> read)
        {
            if (!await TryReadAsync(path, read))
            {
                throw new FileNotFoundException($"File '{path}' was not found.", path);
            }
        }

        public Task StoreAsync(string path, Func<Stream, Task> write)
        {
            return localStorage.StoreAsync(path, write);
        }

        public async Task<bool> TryReadAsync(string path, Func<Stream, Task> read)
        {
            if (await localStorage.TryReadAsync(path, read))
            {
                return true;
            }
            var request = new HttpRequestMessage(HttpMethod.Get, path);
            var response = await client.SendAsync(request);
            if (response.IsSuccessStatusCode)
            {
                using var stream = await response.Content.ReadAsStreamAsync();
                await read(stream);
                return true;
            }
            return false;
        }
    }
}
