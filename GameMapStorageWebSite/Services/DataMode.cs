namespace GameMapStorageWebSite.Services
{
    public enum DataMode
    {
        /// <summary>
        /// Standard mode, the application uses its own database and storage.
        /// </summary>
        Primary,

        /// <summary>
        /// Planned for future use: the application uses its own database, but syncs data with other instances (to be able to share data between instances).
        /// </summary>
        Syndicated,

        /// <summary>
        /// Mirror mode, the application syncs a copy of database and storage of an other instance, and uses it as a read-only mirror.
        /// </summary>
        Mirror,

        /// <summary>
        /// Mode used for debugging and testing:
        /// The application use a copy of a production database, and a proxy to access data from the corresponding
        /// instance (to avoid downloading all the data).
        /// </summary>
        Proxy
    }
}