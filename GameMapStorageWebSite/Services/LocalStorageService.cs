
namespace GameMapStorageWebSite.Services
{
    public class LocalStorageService : IStorageService, ILocalStorageService
    {
        private readonly string basePath;

        public LocalStorageService(IConfiguration configuration): this(
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

        public async Task ReadAsync(string path, Func<Stream, Task> read)
        {
            var target = Path.Combine(basePath, path);
            using var stream = File.OpenRead(target);
            await read(stream);
        }

        public async Task StoreAsync(string path, Func<Stream, Task> write)
        {
            var target = Path.Combine(basePath, path);
            Directory.CreateDirectory(Path.GetDirectoryName(target)!);
            using var stream = File.Create(target);
            await write(stream);
        }

        public async Task<bool> TryReadAsync(string path, Func<Stream, Task> read)
        {
            var target = Path.Combine(basePath, path);
            if (File.Exists(target))
            {
                using var stream = File.OpenRead(target);
                await read(stream);
                return true;
            }
            return false;
        }
    }
}
