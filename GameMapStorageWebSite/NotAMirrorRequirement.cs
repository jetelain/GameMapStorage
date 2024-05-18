using GameMapStorageWebSite.Services;
using Microsoft.AspNetCore.Authorization;

namespace GameMapStorageWebSite
{
    internal class DataModeRequirement : IAuthorizationRequirement
    {
        public DataModeRequirement(params DataMode[] requires)
        {
            Requires = requires;
        }

        public DataMode[] Requires { get; }
    }
}