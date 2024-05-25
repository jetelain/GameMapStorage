using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Services;
using GameMapStorageWebSite.Services.Mirroring;
using GameMapStorageWebSite.Services.Storages;
using GameMapStorageWebSite.Works;
using GameMapStorageWebSite.Works.MirrorLayers;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace GameMapStoreStaticMirrorBuilder
{
    internal class Program
    {
        static async Task Main(string[] args)
        {
            var tempDatabase = Path.GetTempFileName();

            var remoteStorage = new LocalStorageService(@"c:\temp\mirror-test");

            var workspace = new WorkspaceService(Path.Combine(Path.GetTempPath(), "GameMapStorage"));

            var services = new ServiceCollection();
            services.AddHttpClient("Mirror", client => { client.BaseAddress = new Uri("https://atlas.plan-ops.fr/"); });
            services.AddSingleton<IStorageService>(remoteStorage);
            services.AddSingleton<IWorkspaceService>(workspace);
            services.AddSingleton<IImageLayerService, ImageLayerService>();
            services.AddSingleton<IThumbnailService, ThumbnailService>();
            services.AddSingleton<IDataConfigurationService, StaticDataConfiguration>();
            services.AddSingleton<IMirrorService, MirrorService>();
            services.AddScoped<StaticMirrorWorker>();
            services.AddDbContext<GameMapStorageContext>(options => options.UseSqlite("Data Source=" + tempDatabase));
            services.AddScoped<IWorker<MirrorLayerWorkData>, MirrorLayerWorker>();

            Console.WriteLine($"Download database from mirror");
            var remoyteDb = await remoteStorage.GetAsync("state.db");
            if (remoyteDb != null)
            {
                using var x = File.Create(tempDatabase);
                await remoyteDb.CopyTo(x);
            }

            using (var scope = services.BuildServiceProvider().CreateScope())
            {
                await scope.ServiceProvider.GetRequiredService<StaticMirrorWorker>().Do();
            }

            SqliteConnection.ClearAllPools();

            Console.WriteLine($"Upload database to mirror");
            await remoteStorage.StoreAsync("state.db", async f => {
                using var s = File.OpenRead(tempDatabase);
                await s.CopyToAsync(f);            
            });
            
        }
    }
}
