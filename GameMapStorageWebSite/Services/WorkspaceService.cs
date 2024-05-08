namespace GameMapStorageWebSite.Services
{
    public class WorkspaceService : IWorkspaceService
    {
        private readonly string basePath;

        public WorkspaceService(IConfiguration configuration)
            : this(configuration["LocalWorkspacePath"] ??
                    Path.Combine(Path.GetTempPath(), "GameMapStorage"))
        {

        }

        public WorkspaceService(string basePath)
        {
            this.basePath = basePath;
        }

        public string GetLayerWorkspace(int gameMapLayerId)
        {
            var target = Path.Combine(basePath, "layers", gameMapLayerId.ToString());
            Directory.CreateDirectory(target);
            return target;
        }
    }
}
