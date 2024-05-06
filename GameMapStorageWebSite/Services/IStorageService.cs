namespace GameMapStorageWebSite.Services
{
    public interface IStorageService
    {
        // Use delegate to be able to use a S3 or equivalent storage

        Task StoreAsync(string path, Func<Stream,Task> write);

        Task ReadAsync(string path, Func<Stream, Task> read);

        Task<bool> TryReadAsync(string path, Func<Stream, Task> read);

        Task Delete(string path);
    }
}