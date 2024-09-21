using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Services.Storages;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;

namespace GameMapStorageWebSite.Services
{
    public interface IImageMarkerService
    {
        Task SetMarkerImage(IGameMarkerIdentifier marker, Image image);

        Task<IStorageFile> ReadMarkerPng(IGameMarkerIdentifier marker);

        Task<IStorageFile> ReadMarkerWebp(IGameMarkerIdentifier marker);

        Task<IStorageFile> ReadMarkerPng(IGameMarkerIdentifier marker, Rgba32 color);

        Task<IStorageFile> ReadMarkerWebp(IGameMarkerIdentifier marker, Rgba32 color);
    }
}
