﻿using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Services.Steam;

namespace GameMapStorageWebSite.Models
{
    public class HomeGameViewModel
    {
        public bool AcceptWebp { get; set; }

        public required Game Game { get; set; }

        public required List<GameMap> Maps { get; set; }
        public string? Tag { get; internal set; }
        public string? SteamWorkshopId { get; internal set; }
        public SteamModInfos? ModInfos { get; internal set; }
    }
}
