using System.Text.Json;
using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Services.Mirroring;
using GameMapStorageWebSite.Works;
using GameMapStorageWebSite.Works.MirrorLayers;
using Microsoft.EntityFrameworkCore;

namespace GameMapStoreStaticMirrorBuilder
{
    internal class StaticMirrorWorker : IProgress<string>
    {
        private readonly GameMapStorageContext context;
        private readonly IMirrorService mirrorService;
        private readonly IWorker<MirrorLayerWorkData> worker;

        public StaticMirrorWorker(GameMapStorageContext context, IMirrorService mirrorService, IWorker<MirrorLayerWorkData> worker)
        {
            this.context = context;
            this.mirrorService = mirrorService;
            this.worker = worker;
        }

        public async Task Do()
        {
            Console.WriteLine($"Migrate database");
            await context.Database.MigrateAsync();

            Console.WriteLine($"Synchronize database");
            var report = await mirrorService.UpdateMirror(this);

            foreach (var work in await context.Works.Where(w => w.Type == BackgroundWorkType.MirrorLayer).ToListAsync())
            {
                Console.WriteLine($"Mirror Layer #{work.GameMapLayerId}");
                var data = JsonSerializer.Deserialize<MirrorLayerWorkData>(work.Data)!;
                await worker.Process(data, work, this);
            }

            await context.SaveChangesAsync();

            // TODO: Generate JSON files
        }

        public void Report(string value)
        {
            Console.Write("  "); // Ident
            Console.WriteLine(value);
        }
    }
}
