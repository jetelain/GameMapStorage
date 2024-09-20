using System.CommandLine;
using System.Net;
using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Services;
using GameMapStorageWebSite.Services.Mirroring;
using GameMapStorageWebSite.Services.Storages;
using GameMapStorageWebSite.Works;
using GameMapStorageWebSite.Works.MirrorLayers;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace GameMapStorageStaticMirrorBuilder
{
    internal class Program
    {
        static async Task Main(string[] args)
        {
            var targetOption = new Option<string>(
                name: "--target",
                description: "Mirror target storage (local path, ftp://login:password@hostname/basepath or sftp://login:password@hostname/basepath).");
            var sourceOption = new Option<Uri>(
                name: "--source",
                description: "Uri to source GameMapStorage instance.",
                getDefaultValue: () => new Uri("https://atlas.plan-ops.fr/"));
            var resumeOption = new Option<bool>(
                name: "--resume",
                description: "Resume from a previous run.");
            var rootCommand = new RootCommand("Mirror a GameMapStorage instance")
            {
                targetOption,
                sourceOption,
                resumeOption
            };
            rootCommand.SetHandler(Mirror, targetOption, sourceOption, resumeOption);
            await rootCommand.InvokeAsync(args);
        }

        private static async Task Mirror(string target, Uri source, bool resume)
        {
            if (target.StartsWith("ftp://", StringComparison.CurrentCultureIgnoreCase))
            {
                var ftpUri = new Uri(target);
                await using (var remote = new FtpStorageService(ftpUri.AbsolutePath, ftpUri.DnsSafeHost, GetCredentials(ftpUri, "FTPPASS")))
                {
                    var infos = await remote.Connect();
                    Console.WriteLine($"Connected to '{infos.Host}' Encryption={infos.Encryption} DataConnection={infos.DataConnection} Protocols={infos.Protocols}");
                    await MirrorToStorage(source, resume, remote);
                }
            }
            else if (target.StartsWith("sftp://", StringComparison.CurrentCultureIgnoreCase))
            {
                var sftpUri = new Uri(target);
                await using (var remote = new SftpStorageService(sftpUri.AbsolutePath, sftpUri.DnsSafeHost, GetCredentials(sftpUri, "SSHPASS") ?? throw new ApplicationException("Credentials required.")))
                {
                    await remote.Connect();
                    await MirrorToStorage(source, resume, remote);
                }
            }
            else
            {
                await MirrorToStorage(source, resume, new LocalStorageService(Path.GetFullPath(target)));
            }
        }

        private static NetworkCredential? GetCredentials(Uri ftpUri, string envPass)
        {
            if (string.IsNullOrEmpty(ftpUri.UserInfo))
            {
                return null;
            }
            var userInfo = ftpUri.UserInfo.Split(':');
            if (userInfo.Length > 1)
            {
                return new NetworkCredential(userInfo[0], string.Join(':', userInfo.Skip(1)));
            }
            return new NetworkCredential(userInfo[0], Environment.GetEnvironmentVariable(envPass) ?? string.Empty);
        }

        private static async Task MirrorToStorage(Uri source, bool resume, IStorageService remoteStorage)
        {
            var tempPath = Path.Combine(Path.GetTempPath(), source.DnsSafeHost);

            Directory.CreateDirectory(tempPath);

            var tempDatabase = Path.Combine(tempPath, "state.db");

            var workspace = new WorkspaceService(tempPath);

            var services = new ServiceCollection();
            services.AddHttpClient("Mirror", client => { client.BaseAddress = source; });
            services.AddSingleton<IStorageService>(remoteStorage);
            services.AddSingleton<IWorkspaceService>(workspace);
            services.AddSingleton<IImageLayerService, ImageLayerService>();
            services.AddSingleton<IImageMarkerService, ImageMarkerService>();
            services.AddSingleton<IThumbnailService, ThumbnailService>();
            services.AddSingleton<IDataConfigurationService, StaticDataConfiguration>();
            services.AddSingleton<IMirrorService, MirrorService>();
            services.AddScoped<StaticMirrorWorker>();
            services.AddDbContext<GameMapStorageContext>(options => options.UseSqlite("Data Source=" + tempDatabase));
            services.AddScoped<IWorker<MirrorLayerWorkData>, MirrorLayerWorker>();

            if (!resume || !File.Exists(tempDatabase))
            {
                Console.WriteLine($"Download database from mirror");
                var remoyteDb = await remoteStorage.GetAsync("state.db");
                if (remoyteDb != null)
                {
                    using var x = File.Create(tempDatabase);
                    await remoyteDb.CopyTo(x);
                }
                else
                {
                    File.Delete(tempDatabase);
                }
            }

            using (var scope = services.BuildServiceProvider().CreateScope())
            {
                await scope.ServiceProvider.GetRequiredService<StaticMirrorWorker>().Do();
            }

            SqliteConnection.ClearAllPools();

            Console.WriteLine($"Upload database to mirror");
            await remoteStorage.StoreAsync("state.db", async f =>
            {
                using var s = File.OpenRead(tempDatabase);
                await s.CopyToAsync(f);
            });
        }
    }
}
