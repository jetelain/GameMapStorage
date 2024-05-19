using GameMapStorageWebSite.Services;
using Microsoft.AspNetCore.Authorization;

namespace GameMapStorageWebSite.Security
{
    internal class DataModeRequirementHandler : AuthorizationHandler<DataModeRequirement>
    {
        private readonly DataConfigurationService config;

        public DataModeRequirementHandler(DataConfigurationService config)
        {
            this.config = config;
        }

        protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, DataModeRequirement requirement)
        {
            if (requirement.Requires.Contains(config.Mode))
            {
                context.Succeed(requirement);
            }
            else
            {
                context.Fail();
            }
            return Task.CompletedTask;
        }
    }
}