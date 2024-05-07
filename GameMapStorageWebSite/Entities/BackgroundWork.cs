namespace GameMapStorageWebSite.Entities
{
    public class BackgroundWork
    {
        public int BackgroundWorkId { get; set; }

        public BackgroundWorkType Type { get; set; }

        public BackgroundWorkState State { get; set; }

        public required string Data { get; set; }

        public DateTime CreatedUtc { get; set; }

        public DateTime? StartedUtc { get; set; }

        public DateTime? FinishedUtc { get; set; }

        public string? Error { get; set; }

        public int? GameMapLayerId { get; set; }

        public GameMapLayer? GameMapLayer { get; set; }
    }
}
