using System.Net;
using FluentFTP;
using FluentFTP.Helpers;
using GameMapStorageWebSite.Services.Storages;

namespace GameMapStoreStaticMirrorBuilder
{
    internal class FtpStorageService : IStorageService, IAsyncDisposable
    {
        private readonly SemaphoreSlim semaphore = new SemaphoreSlim(1, 1);
        private readonly AsyncFtpClient client;
        private readonly string basePath;

        private readonly HashSet<string> createdDirectories = new HashSet<string>();
        private readonly HashSet<string> preExistingDirectories = new HashSet<string>();

        public FtpStorageService(string basePath, string hostNameOrAddress, NetworkCredential? credentials)
        {
            this.basePath = basePath.TrimEnd('/') + "/";
            client = credentials != null ? new AsyncFtpClient(hostNameOrAddress, credentials) : new AsyncFtpClient(hostNameOrAddress);
        }

        public async Task<FtpProfile> Connect()
        {
            var result =  await client.AutoConnect();
            if (result == null)
            {
                throw new ApplicationException($"FTP connection to '{client.Host}' failed.");
            }
            return result;
        }

        private string GetFullRemotePath(string path)
        {
            return basePath + path.Replace('\\','/').TrimStart('/');
        }

        public async Task Delete(string path)
        {
            var fullPath = GetFullRemotePath(path);
            await client.DeleteFile(fullPath);
        }

        public async Task<IStorageFile?> GetAsync(string path)
        {
            var fullPath = GetFullRemotePath(path);
            if (await client.FileExists(fullPath))
            {
                return new FtpStorageFile(client, fullPath);
            }
            return null;
        }

        public async Task StoreAsync(string path, Func<Stream, Task> write)
        {
            await semaphore.WaitAsync();
            try
            {
                var fullPath = GetFullRemotePath(path);
                var fullDirectoryPath = fullPath.GetFtpDirectoryName();
                var preExistingDirectory = preExistingDirectories.Contains(fullDirectoryPath);

                if (!string.IsNullOrEmpty(fullDirectoryPath) && !createdDirectories.Contains(fullDirectoryPath) && !preExistingDirectory)
                {
                    if (!await client.DirectoryExists(fullDirectoryPath))
                    {
                        await client.CreateDirectory(fullDirectoryPath);
                        createdDirectories.Add(fullDirectoryPath);
                    }
                    else
                    {
                        preExistingDirectories.Add(fullDirectoryPath);
                        preExistingDirectory = true;
                    }
                }

                if (preExistingDirectory && await client.FileExists(fullPath))
                {
                    await client.DeleteFile(fullPath);
                }

                using (var target = await client.OpenWrite(fullPath, FtpDataType.Binary, false))
                {
                    await write(target);
                }
                await client.GetReply();
            }
            finally
            {
                semaphore.Release();
            }
        }

        public async ValueTask DisposeAsync()
        {
            await client.DisposeAsync();
        }
    }
}
