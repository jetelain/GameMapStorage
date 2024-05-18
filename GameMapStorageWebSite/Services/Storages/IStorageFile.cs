namespace GameMapStorageWebSite.Services.Storages
{
    public interface IStorageFile : IDisposable
    {
        DateTimeOffset? LastModified { get; }

        Task<Stream> OpenRead();

        Task CopyTo(Stream target);
    }
}
