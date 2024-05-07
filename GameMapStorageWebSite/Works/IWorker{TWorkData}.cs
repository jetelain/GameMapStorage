using GameMapStorageWebSite.Entities;

namespace GameMapStorageWebSite.Works
{
    public interface IWorker<TWorkData>
    {
        Task Process(TWorkData workData, BackgroundWork work);
    }
}
