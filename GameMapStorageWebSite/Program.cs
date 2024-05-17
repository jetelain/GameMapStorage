using System.Net;
using System.Security.Claims;
using System.Text.Json.Serialization;
using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Services;
using GameMapStorageWebSite.Services.DataPackages;
using GameMapStorageWebSite.Services.Storages;
using GameMapStorageWebSite.Works;
using GameMapStorageWebSite.Works.MigrateArma3Maps;
using GameMapStorageWebSite.Works.MirrorLayers;
using GameMapStorageWebSite.Works.ProcessLayers;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Http.Resilience;
using Polly;
using Polly.Timeout;

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
            var config = new DataConfigurationService(configuration.GetSection("Data").Get<DataConfiguration>());

            AddHttpClients(services);

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

            services.AddControllersWithViews()
                .AddJsonOptions(jsonOptions =>
                {
                    jsonOptions.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
                });

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

            services.AddScoped<IMigrateArma3MapFactory, MigrateArma3MapFactory>();

            services.AddScoped<IImageLayerService, ImageLayerService>();
            services.AddScoped<IThumbnailService, ThumbnailService>();
            services.AddScoped<IPackageService, PackageService>();
            services.AddSingleton<ILocalStorageService, LocalStorageService>();

            SetupDataMode(services, config);

            services.AddSingleton<IWorkspaceService, WorkspaceService>();

            services.AddResponseCaching();

            services.AddScoped<IWorker<MigrateArma3MapWorkData>, MigrateArma3MapWorker>();
            services.AddScoped<IWorker<ProcessLayerWorkData>, ProcessLayerWorker>();
            services.AddScoped<IWorker<MirrorLayerWorkData>, MirrorLayerWorker>();
            services.AddScoped<BackgroundWorker>();
            services.AddHostedService<BackgroundWorkerHostedService>();
            services.AddSingleton<IDataConfigurationService>(config);
        }

        private static void SetupDataMode(IServiceCollection services, DataConfigurationService config)
        {
            if (config.Mode == DataMode.Proxy)
            {
                services.AddScoped<IStorageService, ProxyStorageService>();
                services.AddHttpClient("Proxy", client => { client.BaseAddress = config.ProxyUri!; })
                    .AddStandardResilienceHandler();
            }
            else if (config.Mode == DataMode.Mirror)
            {
                services.AddSingleton<IStorageService, LocalStorageService>();
                services.AddHttpClient("Mirror", client => { client.BaseAddress = config.MirrorUri!; })
                    .AddResilienceHandler("retry", ConfigureBackgroundRetryHandler);
            }
            else
            {
                services.AddSingleton<IStorageService, LocalStorageService>();
            }
        }

        private static void AddHttpClients(IServiceCollection services)
        {
            services
                .AddHttpClient("Arma3Map", client =>
                {
                    client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (X11; Linux x86_64; rv:60.0) Gecko/20100101 Firefox/81.0");
                })
                .AddResilienceHandler("retry", ConfigureBackgroundRetryHandler);

            services
                .AddHttpClient("External", client =>
                {
                    client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (X11; Linux x86_64; rv:60.0) Gecko/20100101 Firefox/81.0");
                });
        }

        private static void ConfigureBackgroundRetryHandler(ResiliencePipelineBuilder<HttpResponseMessage> builder)
        {
            builder
                .AddRetry(new HttpRetryStrategyOptions()
                {
                    BackoffType = DelayBackoffType.Linear,
                    UseJitter = true,
                    Delay = TimeSpan.FromMilliseconds(500),
                    MaxRetryAttempts = 20,
                    ShouldHandle = new PredicateBuilder<HttpResponseMessage>()
                        .Handle<TimeoutRejectedException>()
                        .Handle<HttpRequestException>()
                        .HandleResult(response =>
                            response.StatusCode == HttpStatusCode.ServiceUnavailable
                            || response.StatusCode == HttpStatusCode.TooManyRequests
                            || response.StatusCode >= HttpStatusCode.InternalServerError)
                })
                .AddTimeout(new HttpTimeoutStrategyOptions()
                {
                    Timeout = TimeSpan.FromMinutes(10)
                });
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
