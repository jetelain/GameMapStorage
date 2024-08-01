using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Services.Storages;

namespace GameMapStorageWebSite.Services
{
    public interface IPaperMapService
    {
        Task Create(PaperMapDefinition definition, int fileSize, Func<Stream, Task> write);

        Task<IStorageFile?> GetFile(GamePaperMap layer);

        Task Update(PaperMapDefinition definition, int fileSize, Func<Stream, Task> write, GamePaperMap paperMap);

        Task StoreFile(GamePaperMap paperMap, int fileSize, Func<Stream, Task> write);
    }
}
