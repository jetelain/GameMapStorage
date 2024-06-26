﻿using System.IO.Compression;
using System.Text.Json;
using System.Text.Json.Serialization;
using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Works.ProcessLayers;
using GameMapStorageWebSite.Works.UnpackLayers;
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

            var layer = await CreateLayerDefinition(indexContent, map, false);

            await SubmitBackgroundWork(stream, zip, indexContent, layer);

            return layer;
        }

        private async Task SubmitBackgroundWork(Stream stream, ZipArchive zip, PackageIndex indexContent, GameMapLayer layer)
        {
            if (indexContent.Images != null)
            {
                await SubmitProcessLayerBackgroundWork(zip, indexContent, layer);
            }
            else if (indexContent.Format != null)
            {
                await SubmitExtractLayerBackgroundWork(stream, indexContent, layer);
            }
        }

        public async Task UpdateLayerFromPackage(Stream stream, GameMapLayer layer)
        {
            using var zip = new ZipArchive(stream);

            var indexContent = await GetAndCheckIndex(zip);

            if (layer.GameMap!.Game!.Name != indexContent.GameName)
            {
                throw new ApplicationException("Game name mismatch.");
            }
            if ( layer.GameMap!.Name != indexContent.MapName )
            {
                throw new ApplicationException("Map name mismatch.");
            }
            if (indexContent.GameMapLayerGuid != null && layer.GameMapLayerGuid!.Value != indexContent.GameMapLayerGuid.Value)
            {
                throw new ApplicationException("Layer GUID mismatch.");
            }
            await UpdateLayer(indexContent, layer);

            await SubmitBackgroundWork(stream, zip, indexContent, layer);
        }

        private async Task SubmitExtractLayerBackgroundWork(Stream source, PackageIndex indexContent, GameMapLayer layer)
        {
            var workspace = workspaceService.GetLayerWorkspace(layer.GameMapLayerId);
            using (var target = File.Create(Path.Combine(workspace, "content.zip")))
            {
                source.Position = 0;
                await source.CopyToAsync(target);
            }
            context.Works.Add(new BackgroundWork()
            {
                Type = BackgroundWorkType.UnpackLayer,
                CreatedUtc = DateTime.UtcNow,
                GameMapLayerId = layer.GameMapLayerId,
                GameMapLayer = layer,
                Data = JsonSerializer.Serialize(new UnpackLayerWorkData(layer.GameMapLayerId))
            });
            await context.SaveChangesAsync();
        }

        private async Task SubmitProcessLayerBackgroundWork(ZipArchive zip, PackageIndex indexContent, GameMapLayer layer)
        {
            var workspace = workspaceService.GetLayerWorkspace(layer.GameMapLayerId);
            foreach (var image in indexContent.Images!)
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

        private async Task<GameMapLayer> CreateLayerDefinition(PackageIndex indexContent, GameMap map, bool allowUpdate)
        {
            if (indexContent.GameMapLayerGuid != null)
            {
                var existing = await context.GameMapLayers.FirstOrDefaultAsync(l => l.GameMapId == map.GameMapId && l.GameMapLayerGuid == indexContent.GameMapLayerGuid);
                if (existing != null)
                {
                    if (!allowUpdate)
                    {
                        throw new ApplicationException("Layer already exists. Use update operation instead.");
                    }
                    await UpdateLayer(indexContent, existing);
                    return existing;
                }
            }

            var layer = new GameMapLayer()
            {
                Culture = indexContent.Culture,
                Type = indexContent.Type,
                GameMap = map,
                State = LayerState.Created,
                Format = GetFormat(indexContent),
                DefaultZoom = indexContent.DefaultZoom,
                FactorX = indexContent.FactorX,
                FactorY = indexContent.FactorY,
                TileSize = indexContent.TileSize,
                MaxZoom = indexContent.GetMaxZoom(),
                MinZoom = indexContent.GetMinZoom(),
                LastChangeUtc = DateTime.UtcNow,
                GameMapLayerGuid = indexContent.GameMapLayerGuid ?? Guid.NewGuid()
            };
            context.GameMapLayers.Add(layer);
            await context.SaveChangesAsync(); // we need GameMapLayerId to continue
            return layer;
        }

        private async Task UpdateLayer(PackageIndex indexContent, GameMapLayer layer)
        {
            layer.Culture = indexContent.Culture;
            layer.Type = indexContent.Type;
            layer.State = LayerState.Created;
            layer.Format = GetFormat(indexContent);
            layer.DefaultZoom = indexContent.DefaultZoom;
            layer.FactorX = indexContent.FactorX;
            layer.FactorY = indexContent.FactorY;
            layer.TileSize = indexContent.TileSize;
            layer.MaxZoom = indexContent.GetMaxZoom();
            layer.MinZoom = indexContent.GetMinZoom();
            layer.LastChangeUtc = DateTime.UtcNow;
            context.GameMapLayers.Update(layer);
            await context.SaveChangesAsync();
        }

        private LayerFormat GetFormat(PackageIndex indexContent)
        {
            if (indexContent.Images != null)
            {
                return LayerFormat.PngAndWebp;
            }
            if (indexContent.Format != null)
            {
                switch(indexContent.Format.Value)
                {
                    case LayerFormat.SvgOnly:
                    case LayerFormat.SvgAndWebp:
                    case LayerFormat.PngOnly:
                    case LayerFormat.PngAndWebp:
                    case LayerFormat.WebpOnly:
                        return indexContent.Format.Value;
                }
            }
            throw new ApplicationException("Invalid package.");
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
                if (Math.Round(map.SizeInMeters, 1) != Math.Round(indexContent.SizeInMeters, 1))
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
                    Locations = indexContent.Locations?.Select(l => new GameMapLocation() { EnglishTitle = l.EnglishTitle, Type = l.Type, X = l.X, Y = l.Y, GameMapLocationGuid = Guid.NewGuid() })?.ToList(),
                    CitiesCount = indexContent.Locations?.Count(l => l.Type == LocationType.City) ?? 0,
                    OriginX = indexContent.OriginX,
                    OriginY = indexContent.OriginY
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
                indexContent = await JsonSerializer.DeserializeAsync<PackageIndex>(indexStream, new JsonSerializerOptions() { Converters = { new JsonStringEnumConverter() } });
            }
            if (indexContent == null)
            {
                throw new ApplicationException("Bad index.json");
            }
            if (indexContent.Images != null)
            {
                foreach (var image in indexContent.Images)
                {
                    if (zip.GetEntry(image.FileName) == null)
                    {
                        throw new ApplicationException($"Missing '{image.FileName}'");
                    }
                }
            }
            return indexContent;
        }

    }
}
