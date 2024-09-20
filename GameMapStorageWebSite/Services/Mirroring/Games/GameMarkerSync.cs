using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Models.Json;
using Microsoft.EntityFrameworkCore;
using SixLabors.ImageSharp;

namespace GameMapStorageWebSite.Services.Mirroring.Games
{
    internal sealed class GameMarkerSync : SyncBase<GameMarkerJson, GameMarker>
    {
        public GameMarkerSync(SyncReport report, DbSet<GameMarker> dbset, bool keepId)
            : base(report, dbset, keepId)
        {
        }

        public List<(GameMarker, GameMarkerJson)> ImagesToDownload { get; } = new List<(GameMarker, GameMarkerJson)>();

        protected override bool Copy(GameMarkerJson source, GameMarker target)
        {
            ImagesToDownload.Add((target, source));

            target.Usage = source.Usage;
            target.EnglishTitle = source.EnglishTitle!;
            target.Name = source.Name!;
            return true;
        }

        protected override bool IsMatch(GameMarkerJson source, GameMarker target)
        {
            if (keepId)
            {
                return source.GameMarkerId == target.GameMarkerId;
            }
            return source.Name == target.Name;
        }

        protected override GameMarker ToEntity(GameMarkerJson source)
        {
            var target = new GameMarker()
            {
                EnglishTitle = source.EnglishTitle!,
                Usage = source.Usage!,
                Name = source.Name!,
                GameMarkerId = keepId ? source.GameMarkerId : default,
            };
            ImagesToDownload.Add((target, source));
            return target;
        }

        public async Task DownloadImages(HttpClient client, IImageMarkerService markerService)
        {
            await Parallel.ForEachAsync(ImagesToDownload, async (pair, token) =>
            {
                var (target, source) = pair;
                await DownloadImage(target, source, client, markerService);
            });
            ImagesToDownload.Clear();
        }

        private async Task DownloadImage(GameMarker target, GameMarkerJson source, HttpClient client, IImageMarkerService markerService)
        {
            if (!string.IsNullOrEmpty(source.ImagePng))
            {
                var bytes = await client.GetByteArrayAsync(source.ImagePng);
                using var image = Image.Load(new MemoryStream(bytes));
                await markerService.SetMarkerImage(target, image);
            }
        }
    }
}
