using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Services.Storages;
using SixLabors.ImageSharp;

namespace GameMapStorageWebSite.Services
{
    public interface IThumbnailService
    {
        Task SetMapThumbnail(IGameMapIdentifier map, Image image);
        Task SetGameLogo(IGameIdentifier game, Image image);

        Task<IStorageFile> ReadMapThumbnailPng(IGameMapIdentifier map);
        Task<IStorageFile> ReadMapThumbnailWebp(IGameMapIdentifier map);

        Task<IStorageFile> ReadGameLogoPng(IGameIdentifier game);
        Task<IStorageFile> ReadGameLogoWebp(IGameIdentifier game);
    }
}
