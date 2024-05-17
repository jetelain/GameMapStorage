namespace GameMapStorageWebSite.Entities
{
    public interface IWithTimestamp
    {
        public DateTime? LastChangeUtc { get; }
    }
}
