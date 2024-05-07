using GameMapStorageWebSite.Entities;
using SixLabors.ImageSharp;

namespace GameMapStorageWebSite.Services
{
    public interface IThumbnailService
    {
        Task SetMapThumbnail(IGameMapIdentifier map, Image image);
        Task SetGameLogo(IGameIdentifier game, Image image);

        Task ReadMapThumbnailPng(IGameMapIdentifier map, Func<Stream, Task> read);
        Task ReadMapThumbnailWebp(IGameMapIdentifier map, Func<Stream, Task> read);

        Task ReadGameLogoPng(IGameIdentifier game, Func<Stream, Task> read);
        Task ReadGameLogoWebp(IGameIdentifier game, Func<Stream, Task> read);
    }
}
