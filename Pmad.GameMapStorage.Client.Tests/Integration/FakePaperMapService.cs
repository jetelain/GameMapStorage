using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Services;
using GameMapStorageWebSite.Services.Storages;

namespace Pmad.GameMapStorage.Client.Tests.Integration;

/// <summary>
/// Test double for <see cref="IPaperMapService"/> that records calls and succeeds without I/O.
/// </summary>
public sealed class FakePaperMapService : IPaperMapService
{
    public List<string> CreateCalls { get; } = new();
    public List<int> UpdateCalls { get; } = new();

    public Task Create(PaperMapDefinition definition, int fileSize, Func<Stream, Task> write)
    {
        CreateCalls.Add(definition.Name);
        return Task.CompletedTask;
    }

    public Task<IStorageFile?> GetFile(GamePaperMap layer)
        => Task.FromResult<IStorageFile?>(null);

    public Task Update(PaperMapDefinition definition, int fileSize, Func<Stream, Task> write, GamePaperMap paperMap)
    {
        UpdateCalls.Add(paperMap.GamePaperMapId);
        return Task.CompletedTask;
    }

    public Task StoreFile(GamePaperMap paperMap, int fileSize, Func<Stream, Task> write)
        => Task.CompletedTask;
}
