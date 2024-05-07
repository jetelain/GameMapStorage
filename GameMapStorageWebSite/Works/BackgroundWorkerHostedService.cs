
namespace GameMapStorageWebSite.Works
{
    public class BackgroundWorkerHostedService : IHostedService, IDisposable
    {
        private readonly ILogger<BackgroundWorkerHostedService> logger;
        private readonly IServiceProvider services;

        private readonly PeriodicTimer timer;
        private readonly CancellationTokenSource cts = new();
        private Task? timerTask;

        public BackgroundWorkerHostedService(IServiceProvider services, ILogger<BackgroundWorkerHostedService> logger)
        {
            this.logger = logger;
            this.services = services;
            this.timer = new PeriodicTimer(TimeSpan.FromSeconds(15));
        }

        public Task StartAsync(CancellationToken stoppingToken)
        {
            timerTask = DoWorkAsync();
            return Task.CompletedTask;
        }


        private async Task DoWorkAsync()
        {
            try
            {
                while (await timer.WaitForNextTickAsync(cts.Token))
                {
                    var didSomething = false;
                    do
                    {
                        using (var scope = services.CreateScope())
                        {
                            didSomething = await scope.ServiceProvider.GetRequiredService<BackgroundWorker>().DoOnePendingWork();
                        }
                        if(didSomething)
                        {
                            await Task.Delay(1000);
                        }
                    } while (didSomething && !cts.Token.IsCancellationRequested);
                }
            }
            catch (OperationCanceledException)
            {

            }
        }

        public async Task StopAsync(CancellationToken stoppingToken)
        {
            cts.Cancel();
            if(timerTask != null)
            {
                await timerTask;
            }
        }

        public void Dispose()
        {
            timer.Dispose();
            cts.Dispose();
        }
    }
}
