namespace GameMapStorageWebSite.Security
{
    internal static class ApiSecurityHelper
    {
        /// <summary>
        /// A new ticked is allocated on each application startup.
        /// 
        /// It's a basic way to invalidate all existing tokens at each application restart.
        /// </summary>
        internal static string CurrentTicket { get; } = Guid.NewGuid().ToString();

        public const string TicketClaimType = "gms:ticket";
        public const string ApiKeyIdClaimType = "gms:apiKeyId";

    }
}
