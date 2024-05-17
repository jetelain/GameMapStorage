using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Models.Json;
using Microsoft.EntityFrameworkCore;

namespace GameMapStorageWebSite.Services.Mirroring.Maps
{
    internal sealed class GameMapLayerSync : SyncBase<GameMapLayerJson, GameMapLayer>
    {
        public GameMapLayerSync(SyncReport report, DbSet<GameMapLayer> dbset, bool keepId)
            : base(report, dbset, keepId)
        {
        }

        public List<(GameMapLayer, GameMapLayerJson)> LayersToDownload { get; } = new List<(GameMapLayer, GameMapLayerJson)>();

        protected override bool Copy(GameMapLayerJson source, GameMapLayer target)
        {
            if (target.LastChangeUtc == source.LastChangeUtc)
            {
                return false;
            }
            target.Type = source.Type;
            target.Format = source.Format;
            target.MinZoom = source.MinZoom;
            target.MaxZoom = source.MaxZoom;
            target.DefaultZoom = source.DefaultZoom;
            target.IsDefault = source.IsDefault;
            target.TileSize = source.TileSize;
            target.FactorX = source.FactorX;
            target.FactorY = source.FactorY;
            target.Culture = source.Culture;
            target.LastChangeUtc = source.LastChangeUtc;
            LayersToDownload.Add((target, source)); // TODO: Should create a DataLastChangeUtc column to avoid full download if a metadata changed
            return true;
        }

        protected override bool IsMatch(GameMapLayerJson source, GameMapLayer target)
        {
            if (keepId)
            {
                return source.GameMapLayerId == target.GameMapLayerId;
            }
            throw new NotImplementedException();
            // TODO: Should create a GameMapLayerGuid to match across syndicated sources
        }

        protected override GameMapLayer ToEntity(GameMapLayerJson source)
        {
            var layer = new GameMapLayer()
            {
                GameMapLayerId = keepId ? source.GameMapLayerId : default,
                Type = source.Type,
                Format = source.Format,
                MinZoom = source.MinZoom,
                MaxZoom = source.MaxZoom,
                DefaultZoom = source.DefaultZoom,
                IsDefault = source.IsDefault,
                TileSize = source.TileSize,
                FactorX = source.FactorX,
                FactorY = source.FactorY,
                Culture = source.Culture
            };
            LayersToDownload.Add((layer, source));
            return layer;
        }

    }
}
