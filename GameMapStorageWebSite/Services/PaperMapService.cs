using System.Globalization;
using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Services.Storages;
using Microsoft.EntityFrameworkCore;

namespace GameMapStorageWebSite.Services
{
    public class PaperMapService : IPaperMapService
    {
        private readonly IStorageService storageService;
        private readonly GameMapStorageContext context;

        public PaperMapService(IStorageService storageService, GameMapStorageContext context)
        {
            this.storageService = storageService;
            this.context = context;
        }

        public async Task<IStorageFile?> GetFile(GamePaperMap paperMap)
        {
            return await storageService.GetAsync(GetPath(paperMap));
        }

        public async Task StoreFile(GamePaperMap paperMap, int fileSize, Func<Stream, Task> write)
        {
            await storageService.StoreAsync(GetPath(paperMap), write);
            paperMap.FileSize = fileSize;
            await context.SaveChangesAsync();
        }

        private static string GetPath(GamePaperMap paperMap)
        {
            return Path.Combine(
                paperMap.GameMap!.GameId.ToString(NumberFormatInfo.InvariantInfo),
                "maps",
                paperMap.GameMapId.ToString(NumberFormatInfo.InvariantInfo),
                "papermaps",
                paperMap.GamePaperMapId.ToString(NumberFormatInfo.InvariantInfo) + ".pdf");
        }

        public async Task Create(PaperMapDefinition def, int fileSize, Func<Stream, Task> write)
        {
            var gameMap = await context.GameMaps
                .Include(g => g.Game)
                .FirstOrDefaultAsync(g => g.Name == def.MapName && g.Game!.Name == def.GameName);
            if (gameMap == null)
            {
                throw new ApplicationException("Game map does not exists");
            }
            var existing = await context.GamePaperMaps.FirstOrDefaultAsync(m => m.GameMapId == gameMap.GameMapId && m.Name == def.Name && m.FileFormat == def.FileFormat && m.Scale == def.Scale);
            if (existing != null)
            {
                await Update(def, fileSize, write, existing);
                return;
            }
            var paperMap = new GamePaperMap()
            {
                Name = def.Name,
                GameMap = gameMap,
                GameMapId = gameMap.GameMapId,
                FileFormat = def.FileFormat,
                PaperSize = def.PaperSize,
                Pages = def.Pages,
                Scale = def.Scale,
                LastChangeUtc = DateTime.UtcNow
            };
            context.GamePaperMaps.Add(paperMap);
            await context.SaveChangesAsync();

            await StoreFile(paperMap, fileSize, write);
        }

        public async Task Update(PaperMapDefinition definition, int fileSize, Func<Stream, Task> write, GamePaperMap paperMap)
        {
            if (paperMap.GameMap!.Name != definition.MapName || paperMap.GameMap!.Game!.Name != definition.GameName)
            {
                throw new ApplicationException("Bad game map");
            }
            paperMap.Pages = definition.Pages;
            paperMap.FileFormat = definition.FileFormat;
            paperMap.PaperSize = definition.PaperSize;
            paperMap.Scale = definition.Scale;
            paperMap.Name = definition.Name;
            paperMap.LastChangeUtc = DateTime.UtcNow;
            await StoreFile(paperMap, fileSize, write);
        }
    }
}
