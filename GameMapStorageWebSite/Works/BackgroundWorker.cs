
using System.Text.Json;
using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Works.MigrateArma3Maps;

namespace GameMapStorageWebSite.Works
{
    public class BackgroundWorker
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

        internal async Task DoPendingWorks(CancellationToken token)
        {
            var nextTask = context.Works.FirstOrDefault(t => t.State == BackgroundWorkState.Pending || t.State == BackgroundWorkState.Running);
            while (nextTask != null && !token.IsCancellationRequested)
            {
                await DoWork(nextTask);
                nextTask = context.Works.FirstOrDefault(t => t.State == BackgroundWorkState.Pending || t.State == BackgroundWorkState.Running);
            }
        }

        private async Task DoWork(BackgroundWork work)
        {
            logger.LogInformation($"Start work {work.BackgroundWorkId} of type {work.Type}.");

            work.State = BackgroundWorkState.Running;
            work.StartedUtc = DateTime.UtcNow;
            context.Update(work);
            await context.SaveChangesAsync();
            try
            {
                await CallWorker(work);
                work.State = BackgroundWorkState.Success;
            }
            catch(Exception ex)
            {
                logger.LogError(ex, $"Work {work.BackgroundWorkId} failed.");
                work.State = BackgroundWorkState.Failed;
                work.Error = ex.ToString();
            }
            work.FinishedUtc = DateTime.UtcNow;
            context.Update(work);
            await context.SaveChangesAsync();

            logger.LogInformation($"Work {work.BackgroundWorkId} done.");
        }

        private Task CallWorker(BackgroundWork work)
        {
            switch(work.Type)
            {
                case BackgroundWorkType.MigrateArma3Map:
                    return CallWorker<MigrateArma3MapWorkData>(work);
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
