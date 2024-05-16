
using System.Text.Json;
using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Works.MigrateArma3Maps;
using GameMapStorageWebSite.Works.MirrorLayers;
using GameMapStorageWebSite.Works.ProcessLayers;

namespace GameMapStorageWebSite.Works
{
    public sealed class BackgroundWorker
    {
        private readonly GameMapStorageContext context;
        private readonly IServiceProvider services;
        private readonly ILogger<BackgroundWorker> logger;

        public BackgroundWorker(GameMapStorageContext context, IServiceProvider services, ILogger<BackgroundWorker> logger)
        {
            this.context = context;
            this.services = services;
            this.logger = logger;
        }

        internal async Task<bool> DoOnePendingWork()
        {
            var nextTask = context.Works.FirstOrDefault(t => t.State == BackgroundWorkState.Pending || t.State == BackgroundWorkState.Running);
            if (nextTask != null)
            {
                await DoWork(nextTask);
                return true;
            }
            return false;
        }

        private async Task DoWork(BackgroundWork work)
        {
            logger.LogInformation("Start work '{Id}' of type '{Type}'.", work.BackgroundWorkId, work.Type);

            work.State = BackgroundWorkState.Running;
            work.StartedUtc = DateTime.UtcNow;
            context.Update(work);
            await context.SaveChangesAsync();
            try
            {
                await CallWorker(work);
                work.State = BackgroundWorkState.Success;
                work.Error = null;
            }
            catch(Exception ex)
            {
                logger.LogError(ex, "Work '{Id}' failed.", work.BackgroundWorkId);
                work.State = BackgroundWorkState.Failed;
                work.Error = ex.ToString();
            }
            work.FinishedUtc = DateTime.UtcNow;
            context.Update(work);
            await context.SaveChangesAsync();

            logger.LogInformation("Work '{Id}' done.", work.BackgroundWorkId);
        }

        private Task CallWorker(BackgroundWork work)
        {
            switch(work.Type)
            {
                case BackgroundWorkType.MigrateArma3Map:
                    return CallWorker<MigrateArma3MapWorkData>(work);

                case BackgroundWorkType.ProcessLayer:
                    return CallWorker<ProcessLayerWorkData>(work);

                case BackgroundWorkType.MirrorLayer:
                    return CallWorker<MirrorLayerWorkData>(work);
            }
            return Task.CompletedTask;
        }

        private async Task CallWorker<T>(BackgroundWork work)
        {
            var data = JsonSerializer.Deserialize<T>(work.Data);
            if (data != null)
            {
                await services.GetRequiredService<IWorker<T>>().Process(data, work);
            }
        }
    }
}
