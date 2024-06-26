﻿using FluentFTP;
using GameMapStorageWebSite.Services.Storages;

namespace GameMapStorageStaticMirrorBuilder
{
    internal class FtpStorageFile : IStorageFile
    {
        private readonly AsyncFtpClient client;
        private readonly string fullPath;

        public FtpStorageFile(AsyncFtpClient client, string fullPath)
        {
            this.client = client;
            this.fullPath = fullPath;
        }

        public DateTimeOffset? LastModified => null;

        public async Task CopyTo(Stream target)
        {
            var stream = await client.OpenRead(fullPath);
            await stream.CopyToAsync(target);
        }

        public void Dispose()
        {

        }

        public async Task<Stream> OpenRead()
        {
            return await client.OpenRead(fullPath);
        }
    }
}