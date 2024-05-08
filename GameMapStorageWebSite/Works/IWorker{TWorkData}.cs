using GameMapStorageWebSite.Entities;

namespace GameMapStorageWebSite.Works
{
    public interface IWorker<TWorkData> : IDisposable
    {
        Task Process(TWorkData workData, BackgroundWork work);
    }
}
