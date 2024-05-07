using System.Security.Claims;
using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Services;
using GameMapStorageWebSite.Works;
using GameMapStorageWebSite.Works.MigrateArma3Maps;
using GameMapStorageWebSite.Works.ProcessLayers;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Memory;

namespace GameMapStorageWebSite
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            AddServices(builder.Services, builder.Configuration);

            var app = builder.Build();

            await InitDataBase(app);

            ConfigureHttpPipeline(app);

            app.Run();
        }

        /// <summary>
        /// Add services to the container.
        /// </summary>
        /// <param name="builder"></param>
        private static void AddServices(IServiceCollection services, IConfiguration configuration)
        {
            services.AddHttpClient("CDN", client =>
            {
                client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (X11; Linux x86_64; rv:60.0) Gecko/20100101 Firefox/81.0");
            });

            services.AddAuthentication(options =>
                {
                    options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
                })
                .AddCookie(options =>
                {
                    options.LoginPath = "/Home/SignInUser";
                    options.LogoutPath = "/Home/SignOutUser";
                    options.AccessDeniedPath = "/Home/Denied";
                })
                .AddSteam(s => s.ApplicationKey = configuration["SteamKey"]);

            services.AddAuthorization(options =>
            {
                var admins = configuration.GetSection("Admins").Get<string[]>() ?? Array.Empty<string>();
                options.AddPolicy("Admin", policy => policy.RequireClaim(ClaimTypes.NameIdentifier, admins));
            });

            services.AddControllersWithViews();

            services.AddDbContext<GameMapStorageContext>(options =>
                options.UseSqlite(
                    configuration.GetConnectionString("GameMapStorageContext") ??
                    "Data Source=" + Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "GameMapStorage", "context.db")));

            if (Environment.OSVersion.Platform == PlatformID.Unix)
            {
                services.AddDataProtection()
                    .PersistKeysToFileSystem(new DirectoryInfo("/var/aspnet-keys"))
                    .SetApplicationName("gms");
            }

            services.AddSingleton<IImageLayerService, ImageLayerService>();
            services.AddSingleton<IThumbnailService, ThumbnailService>();

            services.AddSingleton<IStorageService>(new LocalStorageService(
                configuration["LocalStoragePath"] ?? 
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "GameMapStorage", "data")));

            services.AddResponseCaching();

            services.AddScoped<IWorker<MigrateArma3MapWorkData>,MigrateArma3MapWorker>();
            services.AddScoped<IWorker<ProcessLayerWorkData>, ProcessLayerWorker>();
            services.AddScoped<BackgroundWorker>();
            services.AddHostedService<BackgroundWorkerHostedService>();
        }

        /// <summary>
        /// Configure the HTTP request pipeline.
        /// </summary>
        /// <param name="app"></param>
        private static void ConfigureHttpPipeline(WebApplication app)
        {
            if (!app.Environment.IsDevelopment())
            {
                app.UseForwardedHeaders(new ForwardedHeadersOptions
                {
                    ForwardedHeaders = ForwardedHeaders.XForwardedProto
                });
                app.UseExceptionHandler("/Error");
                // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
                app.UseHsts();
            }

            app.UseHttpsRedirection();

            app.UseStaticFiles();

            app.UseRouting();

            app.UseAuthorization();

            app.UseResponseCaching();

            app.UseRequestLocalization("en-US");

            app.MapControllerRoute(
                name: "default",
                pattern: "{controller=Home}/{action=Index}/{id?}");

            app.MapControllerRoute(
                name: "areas",
                pattern: "{area:exists}/{controller=Home}/{action=Index}/{id?}"
              );
        }


        private static async Task InitDataBase(WebApplication app)
        {
            using (var scope = app.Services.CreateScope())
            {
                var services = scope.ServiceProvider;
                try
                {
                    var context = services.GetRequiredService<GameMapStorageContext>();
                    await context.Database.MigrateAsync();
                    context.InitData();

                    if (app.Configuration.GetValue<bool?>("AutoMigrateArma3Map") ?? false)
                    {
                        if (await context.Works.Where(t => t.Type == BackgroundWorkType.MigrateArma3Map).CountAsync() == 0
                            && await context.GameMaps.CountAsync() == 0)
                        {
                            var factory = new MigrateArma3MapFactory(app.Configuration, context, services.GetRequiredService<IHttpClientFactory>());
                            await factory.InitialWorkLoad();
                        }
                    }
                }
                catch (Exception ex)
                {
                    var logger = services.GetRequiredService<ILogger<Program>>();
                    logger.LogError(ex, "An error occurred creating the DB.");
                }
            }
        }
    }
}
