namespace GameMapStorageWebSite.Services.Storages
{
    public class LocalStorageService : IStorageService, ILocalStorageService
    {
        private readonly string basePath;

        public LocalStorageService(IConfiguration configuration) : this(
                configuration["LocalStoragePath"] ??
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "GameMapStorage", "data"))
        {

        }

        public LocalStorageService(string basePath)
        {
            this.basePath = basePath;
        }

        public Task Delete(string path)
        {
            var target = Path.Combine(basePath, path);
            if (File.Exists(target))
            {
                File.Delete(target);
            }
            return Task.CompletedTask;
        }

        public Task<IStorageFile?> GetAsync(string path)
        {
            var target = Path.Combine(basePath, path);
            if (File.Exists(target))
            {
                return Task.FromResult<IStorageFile?>(new LocalStorageFile(target));
            }
            return Task.FromResult<IStorageFile?>(null);
        }

        public async Task StoreAsync(string path, Func<Stream, Task> write)
        {
            var target = Path.Combine(basePath, path);
            Directory.CreateDirectory(Path.GetDirectoryName(target)!);
            using var stream = File.Create(target);
            await write(stream);
        }
    }
}
