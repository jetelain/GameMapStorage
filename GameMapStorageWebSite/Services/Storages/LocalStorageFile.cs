namespace GameMapStorageWebSite.Services.Storages
{
    public class LocalStorageFile : IStorageFile
    {
        private readonly string path;

        public LocalStorageFile(string path)
        {
            this.path = path;
        }

        public DateTimeOffset? LastModified => new DateTimeOffset(File.GetLastWriteTimeUtc(path), TimeSpan.Zero);

        public async Task CopyTo(Stream target)
        {
            using var source = File.OpenRead(path);
            await source.CopyToAsync(target);
        }

        public void Dispose()
        {
        }

        public Task<Stream> OpenRead()
        {
            return Task.FromResult<Stream>(File.OpenRead(path));
        }
    }
}
