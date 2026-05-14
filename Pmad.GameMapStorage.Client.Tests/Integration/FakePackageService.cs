using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Services.DataPackages;

namespace Pmad.GameMapStorage.Client.Tests.Integration;

/// <summary>
/// Test double for <see cref="IPackageService"/> that records calls and succeeds without I/O.
/// </summary>
public sealed class FakePackageService : IPackageService
{
    public List<string> CreateCalls { get; } = new();
    public List<(int LayerId, string FileName)> UpdateCalls { get; } = new();

    public Task<GameMapLayer> CreateLayerFromPackage(Stream stream)
    {
        CreateCalls.Add("create");
        return Task.FromResult(new GameMapLayer
        {
            Type = LayerType.Topographic,
            Format = LayerFormat.PngOnly,
            State = LayerState.Created,
            MinZoom = 1,
            MaxZoom = 6,
            DefaultZoom = 4,
            IsDefault = true,
            TileSize = 256,
            FactorX = 1,
            FactorY = 1
        });
    }

    public Task UpdateLayerFromPackage(Stream stream, GameMapLayer layer)
    {
        UpdateCalls.Add((layer.GameMapLayerId, "update"));
        return Task.CompletedTask;
    }
}
