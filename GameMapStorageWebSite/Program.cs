using System.Net;
using System.Security.Claims;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Security;
using GameMapStorageWebSite.Services;
using GameMapStorageWebSite.Services.DataPackages;
using GameMapStorageWebSite.Services.Mirroring;
using GameMapStorageWebSite.Services.Steam;
using GameMapStorageWebSite.Services.Storages;
using GameMapStorageWebSite.Works;
using GameMapStorageWebSite.Works.MigrateArma3Maps;
using GameMapStorageWebSite.Works.MirrorLayers;
using GameMapStorageWebSite.Works.MirrorPaperMaps;
using GameMapStorageWebSite.Works.ProcessLayers;
using GameMapStorageWebSite.Works.UnpackLayers;
using Microsoft.AspNetCore.Authentication.BearerToken;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
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
                .AddBearerToken()
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

                options.AddPolicy("AdminEdit", policy => policy
                    .RequireClaim(ClaimTypes.NameIdentifier, admins)
                    .AddRequirements(new DataModeRequirement(DataMode.Syndicated, DataMode.Primary, DataMode.Proxy)));

                options.AddPolicy("ApiAdminEdit", policy => policy
                    .AddAuthenticationSchemes(BearerTokenDefaults.AuthenticationScheme)
                    .RequireClaim(ApiSecurityHelper.TicketClaimType, ApiSecurityHelper.CurrentTicket)
                    .AddRequirements(new DataModeRequirement(DataMode.Syndicated, DataMode.Primary, DataMode.Proxy))
                    .AddRequirements(new ValidApiKeyIdRequirement()));
            });

            services.AddRateLimiter(_ => _
                .AddConcurrencyLimiter(policyName: "ApiAuth", options =>
                {
                    options.PermitLimit = 1;
                    options.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
                    options.QueueLimit = 5;
                }));

            services.AddSingleton<IAuthorizationHandler>(new DataModeRequirementHandler(config));
            services.AddScoped<IAuthorizationHandler,ValidApiKeyIdRequirementHandler>();

            services.AddControllersWithViews()
                .AddJsonOptions(jsonOptions =>
                {
                    jsonOptions.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
                });

            var connectionString = configuration.GetConnectionString("GameMapStorageContext");
            if (string.IsNullOrEmpty(connectionString))
            {
                var directory = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "GameMapStorage");
                try { Directory.CreateDirectory(directory); } catch (Exception ex) { /* Handle exception */ }
                connectionString = "Data Source=" + Path.Combine(directory, "context.db");
            }

            services.AddDbContext<GameMapStorageContext>(options => options.UseSqlite(connectionString));

            if (Environment.OSVersion.Platform == PlatformID.Unix)
            {
                services.AddDataProtection()
                    .PersistKeysToFileSystem(new DirectoryInfo("/var/www/aspnet-keys"))
                    .SetApplicationName("gms");
            }

            services.AddScoped<IMigrateArma3MapFactory, MigrateArma3MapFactory>();

            services.AddSingleton<IImageLayerService, ImageLayerService>();
            services.AddSingleton<IImageMarkerService, ImageMarkerService>();
            services.AddSingleton<IThumbnailService, ThumbnailService>();
            services.AddScoped<IPackageService, PackageService>();
            services.AddScoped<IPaperMapService, PaperMapService>();
            services.AddSingleton<ILocalStorageService, LocalStorageService>();

            SetupDataMode(services, config);

            services.AddSingleton<IWorkspaceService, WorkspaceService>();

            services.AddScoped<IWorker<MigrateArma3MapWorkData>, MigrateArma3MapWorker>();
            services.AddScoped<IWorker<ProcessLayerWorkData>, ProcessLayerWorker>();
            services.AddScoped<IWorker<MirrorLayerWorkData>, MirrorLayerWorker>();
            services.AddScoped<IWorker<UnpackLayerWorkData>, UnpackLayerWorker>();
            services.AddScoped<IWorker<MirrorPaperMapWorkData>, MirrorPaperMapWorker>();
            services.AddScoped<BackgroundWorker>();
            services.AddHostedService<BackgroundWorkerHostedService>();
            services.AddSingleton<IDataConfigurationService>(config);
            
            services.AddScoped<IMirrorService, MirrorService>();
            services.AddScoped<ISteamModService, SteamModService>();


#if DEBUG
            services.AddOpenApiDocument();
#endif            
            
            services.AddCors(o => o.AddPolicy("Api", builder =>
            {
                builder.AllowAnyOrigin()
                    .WithMethods("GET");
            }));
        }

        private static void SetupDataMode(IServiceCollection services, DataConfigurationService config)
        {
            if (config.Mode == DataMode.Proxy)
            {
                services.AddSingleton<IStorageService, ProxyStorageService>();
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
#if DEBUG
            else
            {
                app.UseOpenApi();
                app.UseSwaggerUi();
            }
#endif

            app.UseHttpsRedirection();

            app.UseStaticFiles();

            app.UseRouting();

            app.UseRateLimiter();

            app.UseCors();

            app.UseAuthorization();

            app.UseRequestLocalization("en-GB");

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
                    await context.InitData();
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
