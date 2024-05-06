namespace GameMapStorageWebSite.Entities
{
    public enum LayerState
    {
        /// <summary>
        /// Layer have been declared, but data is not yet ready
        /// </summary>
        Created,

        /// <summary>
        /// Data is being processed
        /// </summary>
        Processing,

        /// <summary>
        /// All data is available
        /// </summary>
        Ready,

        /// <summary>
        /// Map has changed, data is no more relevant
        /// </summary>
        Obsolete
    }
}