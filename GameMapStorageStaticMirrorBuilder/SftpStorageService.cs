using System.Net;
using GameMapStorageWebSite.Services.Storages;
using Renci.SshNet;

namespace GameMapStorageStaticMirrorBuilder
{
    internal class SftpStorageService : IStorageService, IAsyncDisposable
    {
        private readonly SemaphoreSlim semaphore = new SemaphoreSlim(1, 1);
        private readonly SftpClient client;
        private readonly string basePath;
        private readonly HashSet<string> directories = new HashSet<string>();

        public SftpStorageService(string basePath, string hostNameOrAddress, NetworkCredential credentials)
        {
            this.basePath = basePath.TrimEnd('/') + "/";
            client = new SftpClient(hostNameOrAddress, credentials.UserName, credentials.Password);
        }

        public async Task Connect()
        {
            await client.ConnectAsync(default);
        }

        private string GetFullRemotePath(string path)
        {
            return basePath + path.Replace('\\','/').TrimStart('/');
        }

        public async Task Delete(string path)
        {
            var fullPath = GetFullRemotePath(path);
            await client.DeleteFileAsync(fullPath, default);
        }

        public Task<IStorageFile?> GetAsync(string path)
        {
            var fullPath = GetFullRemotePath(path);
            if (client.Exists(fullPath))
            {
                return Task.FromResult<IStorageFile?>(new SftpStorageFile(client, fullPath));
            }
            return Task.FromResult<IStorageFile?>(null);
        }

        public async Task StoreAsync(string path, Func<Stream, Task> write)
        {
            await semaphore.WaitAsync();
            try
            {
                var fullPath = GetFullRemotePath(path);
                CreateDirectory(GetParentDirectory(fullPath));
                using (var target = client.Create(fullPath))
                {
                    await write(target);
                }
            }
            finally
            {
                semaphore.Release();
            }
        }

        private static string? GetParentDirectory(string fullPath)
        {
            return Path.GetDirectoryName(fullPath)?.Replace('\\', '/');
        }

        private void CreateDirectory(string? directory)
        {
            if (!string.IsNullOrEmpty(directory) && !directories.Contains(directory))
            {
                if (!client.Exists(directory))
                {
                    CreateDirectory(GetParentDirectory(directory));
                    client.CreateDirectory(directory);
                }
                directories.Add(directory);
            }
        }

        public ValueTask DisposeAsync()
        {
            client.Disconnect();

            return ValueTask.CompletedTask;
        }
    }
}
