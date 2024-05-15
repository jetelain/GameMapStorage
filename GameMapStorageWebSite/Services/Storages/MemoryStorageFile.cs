namespace GameMapStorageWebSite.Services.Storages
{
    public class MemoryStorageFile : IStorageFile
    {
        private readonly Func<Stream, Task> copyTo;

        public MemoryStorageFile(Func<Stream, Task> copyTo, DateTimeOffset? lastModified = null)
        {
            this.copyTo = copyTo;
            LastModified = lastModified;
        }

        public DateTimeOffset? LastModified { get; }

        public Task CopyTo(Stream target)
        {
            return copyTo(target);
        }

        public void Dispose()
        {

        }

        public async Task<Stream> OpenRead()
        {
            var mem = new MemoryStream();
            await copyTo(mem);
            mem.Position = 0;
            return mem;
        }
    }
}
