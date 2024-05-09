namespace GameMapStorageWebSite.Services.Storages
{
    public interface IStorageService
    {
        // Use delegate to be able to use a S3 or equivalent storage

        Task StoreAsync(string path, Func<Stream, Task> write);

        Task<IStorageFile?> GetAsync(string path);

        Task Delete(string path);
    }
}