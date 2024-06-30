using GameMapStorageWebSite.Entities.Converters;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace GameMapStorageWebSite.Entities
{
    public class GameMapStorageContext : DbContext
    {
        public DbSet<Game> Games { get; set; }

        public DbSet<GameMap> GameMaps { get; set; }

        public DbSet<GameMapLocation> GameMapLocations { get; set; }

        public DbSet<GameMapLayer> GameMapLayers { get; set; }

        public DbSet<GameColor> GameColors { get; set; }

        public DbSet<GameMarker> GameMarkers { get; set; }

        public DbSet<BackgroundWork> Works { get; set; }

        public DbSet<ApiKey> ApiKeys { get; set; }

        public GameMapStorageContext(DbContextOptions<GameMapStorageContext> options)
            : base(options)
        {
        }

        protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
        {
            configurationBuilder.Properties<DateTime?>().HaveConversion<DateTimeAssumeUniversal>();
            configurationBuilder.Properties<Guid?>().HaveConversion<GuidToBytesConverter>();
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Game>().ToTable("Game");
            modelBuilder.Entity<GameMap>().ToTable("GameMap");
            modelBuilder.Entity<GameMapLocation>().ToTable("GameMapLocation");
            modelBuilder.Entity<GameMapLayer>().ToTable("GameMapLayer");
            modelBuilder.Entity<GameColor>().ToTable("GameColor");
            modelBuilder.Entity<GameMarker>().ToTable("GameMarker");
            modelBuilder.Entity<BackgroundWork>().ToTable("BackgroundWork");
            modelBuilder.Entity<ApiKey>().ToTable("ApiKey");
        }

        internal async Task InitData()
        {
            if (Games.Count() == 0)
            {
                var initialData = new[]
                {
                    new Game() {
                        Name = "arma3",
                        EnglishTitle = "Arma 3",
                        Attribution = "© Bohemia Interactive",
                        OfficialSiteUri = "https://arma3.com/",
                        SteamAppId = "107410"
                    },
                    new Game() {
                        Name = "arma-reforger",
                        EnglishTitle = "Arma Reforger",
                        Attribution = "© Bohemia Interactive",
                        OfficialSiteUri = "https://reforger.armaplatform.com/",
                        SteamAppId = "1874880"
                    },
                    new Game() {
                        Name = "dayz",
                        EnglishTitle = "DayZ",
                        Attribution = "© Bohemia Interactive",
                        OfficialSiteUri = "https://dayz.com/",
                        SteamAppId = "221100"
                    }
                };
                Games.AddRange(initialData);
                await SaveChangesAsync();
            }
        }
    }
}
