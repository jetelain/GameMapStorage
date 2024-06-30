using GameMapStorageWebSite.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

namespace GameMapStorageWebSite.Security
{
    internal class ValidApiKeyIdRequirementHandler : AuthorizationHandler<ValidApiKeyIdRequirement>
    {
        private readonly GameMapStorageContext context;

        public ValidApiKeyIdRequirementHandler(GameMapStorageContext context)
        {
            this.context = context;
        }

        protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, ValidApiKeyIdRequirement requirement)
        {
            var apiKeyIdClaim = context.User.Claims.FirstOrDefault(c => c.Type == ApiSecurityHelper.ApiKeyIdClaimType);

            if (apiKeyIdClaim != null &&
                int.TryParse(apiKeyIdClaim.Value, out var id) &&
                await this.context.ApiKeys.AnyAsync(k => k.ApiKeyId == id))
            {
                context.Succeed(requirement);
            }
            else
            {
                context.Fail();
            }
        }
    }
}