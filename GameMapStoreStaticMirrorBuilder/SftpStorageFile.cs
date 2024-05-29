using GameMapStorageWebSite.Services.Storages;
using Renci.SshNet;

namespace GameMapStoreStaticMirrorBuilder
{
    internal class SftpStorageFile : IStorageFile
    {
        private readonly SftpClient client;
        private readonly string fullPath;

        public SftpStorageFile(SftpClient client, string fullPath)
        {
            this.client = client;
            this.fullPath = fullPath;
        }

        public DateTimeOffset? LastModified => new DateTimeOffset(client.GetLastWriteTimeUtc(fullPath), TimeSpan.Zero);

        public async Task CopyTo(Stream target)
        {
            using var stream = client.OpenRead(fullPath);
            await stream.CopyToAsync(target);
        }

        public void Dispose()
        {
        }

        public Task<Stream> OpenRead()
        {
            return Task.FromResult<Stream>(client.OpenRead(fullPath));
        }
    }
}