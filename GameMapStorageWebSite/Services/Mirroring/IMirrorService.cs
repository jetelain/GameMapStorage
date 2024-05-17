namespace GameMapStorageWebSite.Services.Mirroring
{
    public interface IMirrorService
    {
        Task<SyncReport> UpdateMirror();
    }
}