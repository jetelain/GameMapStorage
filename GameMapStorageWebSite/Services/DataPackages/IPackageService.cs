using GameMapStorageWebSite.Entities;

namespace GameMapStorageWebSite.Services.DataPackages
{
    public interface IPackageService
    {
        Task<GameMapLayer> CreateLayerFromPackage(Stream stream);

        Task UpdateLayerFromPackage(Stream stream, GameMapLayer layer);
    }
}
