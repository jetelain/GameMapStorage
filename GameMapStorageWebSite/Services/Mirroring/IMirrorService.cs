namespace GameMapStorageWebSite.Services.Mirroring
{
    public interface IMirrorService
    {
        Task<SyncReport> UpdateMirror(IProgress<string>? progress = null);
    }
}