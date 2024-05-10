using System.IO.Compression;
using System.Text.Json;
using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Works.ProcessLayers;
using Microsoft.EntityFrameworkCore;

namespace GameMapStorageWebSite.Services.DataPackages
{
    public class PackageService : IPackageService
    {
        private readonly GameMapStorageContext context;
        private readonly IWorkspaceService workspaceService;

        public PackageService(GameMapStorageContext context, IWorkspaceService workspaceService)
        {
            this.context = context;
            this.workspaceService = workspaceService;
        }

        public async Task<GameMapLayer> CreateLayerFromPackage(Stream stream)
        {
            using var zip = new ZipArchive(stream);

            var indexContent = await GetAndCheckIndex(zip);

            var map = await GetOrCreateMap(indexContent);

            var layer = await CreateLayerDefinition(indexContent, map);

            await SubmitBackgroundWork(zip, indexContent, layer);

            return layer;
        }

        private async Task SubmitBackgroundWork(ZipArchive zip, PackageIndex indexContent, GameMapLayer layer)
        {
            var workspace = workspaceService.GetLayerWorkspace(layer.GameMapLayerId);
            foreach (var image in indexContent.Images)
            {
                zip.GetEntry(image.FileName)!.ExtractToFile(Path.Combine(workspace, image.FileName));
            }

            context.Works.Add(new BackgroundWork()
            {
                Type = BackgroundWorkType.ProcessLayer,
                CreatedUtc = DateTime.UtcNow,
                GameMapLayerId = layer.GameMapLayerId,
                GameMapLayer = layer,
                Data = JsonSerializer.Serialize(new ProcessLayerWorkData(
                    layer.GameMapLayerId,
                    indexContent.Images.Select(i => new ProcessLayerItem(i.MinZoom, i.MaxZoom, i.FileName)).ToList()))
            });
            await context.SaveChangesAsync();
        }

        private async Task<GameMapLayer> CreateLayerDefinition(PackageIndex indexContent, GameMap map)
        {
            var layer = new GameMapLayer()
            {
                Culture = indexContent.Culture,
                Type = indexContent.Type,
                GameMap = map,
                State = LayerState.Created,
                Format = LayerFormat.PngAndWebp,
                DefaultZoom = indexContent.DefaultZoom,
                FactorX = indexContent.FactorX,
                FactorY = indexContent.FactorY,
                TileSize = indexContent.TileSize,
                MaxZoom = indexContent.Images.Max(i => i.MaxZoom),
                MinZoom = indexContent.Images.Min(i => i.MinZoom),
                LastChangeUtc = DateTime.UtcNow
            };
            context.GameMapLayers.Add(layer);
            await context.SaveChangesAsync(); // we need GameMapLayerId to continue
            return layer;
        }

        private async Task<GameMap> GetOrCreateMap(PackageIndex indexContent)
        {
            var game = await context.Games.FirstOrDefaultAsync(g => g.Name == indexContent.GameName);
            if (game == null)
            {
                throw new ApplicationException($"Game '{indexContent.GameName}' is unknown");
            }

            var map = await context.GameMaps.FirstOrDefaultAsync(g => g.Name == indexContent.MapName && g.GameId == game.GameId);
            if (map != null)
            {
                if (map.SizeInMeters != indexContent.SizeInMeters)
                {
                    throw new ApplicationException($"Map '{indexContent.MapName}' is already registred with a different size. Existing = '{map.SizeInMeters}', Package = '{indexContent.SizeInMeters}'");
                }
            }
            else
            {
                map = new GameMap()
                {
                    EnglishTitle = indexContent.EnglishTitle,
                    Name = indexContent.MapName,
                    Game = game,
                    GameId = game.GameId,
                    LastChangeUtc = DateTime.UtcNow,
                    SizeInMeters = indexContent.SizeInMeters,
                    Locations = indexContent.Locations.Select(l => new GameMapLocation() { EnglishTitle = l.EnglishTitle, Type = l.Type, X = l.X, Y = l.Y }).ToList(),
                    CitiesCount = indexContent.Locations.Count(l => l.Type == LocationType.City)
                };
                context.GameMaps.Add(map);
            }
            return map;
        }

        private static async Task<PackageIndex> GetAndCheckIndex(ZipArchive zip)
        {
            var index = zip.GetEntry("index.json");
            if (index == null)
            {
                throw new ApplicationException("Missing 'index.json'");
            }
            PackageIndex? indexContent;
            using (var indexStream = index.Open())
            {
                indexContent = await JsonSerializer.DeserializeAsync<PackageIndex>(indexStream);
            }
            if (indexContent == null)
            {
                throw new ApplicationException("Bad index.json");
            }
            foreach (var image in indexContent.Images)
            {
                if (zip.GetEntry(image.FileName) == null)
                {
                    throw new ApplicationException($"Missing '{image.FileName}'");
                }
            }
            return indexContent;
        }
    }
}
