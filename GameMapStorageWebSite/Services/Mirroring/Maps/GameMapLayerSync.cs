using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Models.Json;
using Microsoft.EntityFrameworkCore;

namespace GameMapStorageWebSite.Services.Mirroring.Maps
{
    internal sealed class GameMapLayerSync : SyncBase<GameMapLayerJson, GameMapLayer>
    {
        private readonly List<int> alreadyScheduled;

        public GameMapLayerSync(SyncReport report, DbSet<GameMapLayer> dbset, List<int> alreadyScheduled, bool keepId)
            : base(report, dbset, keepId)
        {
            this.alreadyScheduled = alreadyScheduled;
        }

        public List<(GameMapLayer, GameMapLayerJson)> LayersToDownload { get; } = new List<(GameMapLayer, GameMapLayerJson)>();

        protected override bool Copy(GameMapLayerJson source, GameMapLayer target)
        {
            if (!alreadyScheduled.Contains(target.GameMapLayerId))
            {
                if ((target.DataLastChangeUtc == null) || target.DataLastChangeUtc.Value < (source.DataLastChangeUtc ?? source.LastChangeUtc)!.Value)
                {
                    LayersToDownload.Add((target, source));
                }
            }

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
            target.GameMapLayerGuid = source.GameMapLayerGuid;
            target.LastChangeUtc = source.LastChangeUtc;
            return true;
        }

        protected override bool IsMatch(GameMapLayerJson source, GameMapLayer target)
        {
            if (keepId)
            {
                return source.GameMapLayerId == target.GameMapLayerId;
            }
            if (source.GameMapLayerGuid == null)
            {
                throw new InvalidOperationException($"GameMapLocationGuid is missing on GameMapLayerId={source.GameMapLayerId}");
            }
            return source.GameMapLayerGuid == target.GameMapLayerGuid;
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
                Culture = source.Culture,
                LastChangeUtc = source.LastChangeUtc,
                GameMapLayerGuid = source.GameMapLayerGuid
            };
            LayersToDownload.Add((layer, source));
            return layer;
        }

    }
}
