namespace GameMapStorageWebSite.Services.Steam
{
    public interface ISteamModService
    {
        Task<SteamModInfos?> GetModInfosAsync(string steamWorkshopId);
    }
}
