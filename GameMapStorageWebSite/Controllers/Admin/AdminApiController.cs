using System.Security.Claims;
using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Security;
using GameMapStorageWebSite.Services.DataPackages;
using Microsoft.AspNetCore.Authentication.BearerToken;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace GameMapStorageWebSite.Controllers.Admin
{
    [ApiController]
    [Route("api/v1")]
    public class AdminApiController : ControllerBase
    {
        private readonly GameMapStorageContext _context;
        private readonly IPackageService _packageService;

        public AdminApiController(GameMapStorageContext context, IPackageService packageService)
        {
            _context = context;
            _packageService = packageService;
        }

        [HttpPost]
        [Route("tokens")]
        [EnableRateLimiting("ApiAuth")]
        public async Task<IActionResult> GetToken([FromForm] int apiKeyId, [FromForm] string apiKey)
        {
            await Task.Delay(Random.Shared.Next(1000, 3000));

            // Brute force mitigation:
            // - Enforce one request at a time (with ApiAuth policy)
            // - Enforce requester to wait 1 to 3 sec to know if apiKey is valid
            // An attacker will need an average of 2 seconds to test each possibility
            // Assuming a 128 chars api key with a 64 chars alphabet, attacker would need more than 10^220 years to find the key

            var configuredKey = await _context.ApiKeys.FindAsync(apiKeyId);
            if (configuredKey == null)
            {
                return Forbid();
            }
            if (configuredKey.IsValid(apiKey))
            {
                var principal = new ClaimsPrincipal(new ClaimsIdentity([
                    new Claim(ApiSecurityHelper.TicketClaimType, ApiSecurityHelper.CurrentTicket),
                    new Claim(ApiSecurityHelper.ApiKeyIdClaimType, configuredKey.ApiKeyId.ToString())],
                    "Bearer"));
                return SignIn(principal, BearerTokenDefaults.AuthenticationScheme);
            }
            return Forbid();
        }

        [HttpPost]
        [Authorize("ApiAdminEdit")]
        [DisableRequestSizeLimit]
        [RequestFormLimits(MultipartBodyLengthLimit = int.MaxValue, ValueLengthLimit = int.MaxValue)]
        [Route("layers")]
        public async Task<IActionResult> CreateFromPackage(IFormFile package)
        {
            try
            {
                using var stream = package.OpenReadStream();
                var layer = await _packageService.CreateLayerFromPackage(stream);
                return Ok();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost]
        [Authorize("ApiAdminEdit")]
        [DisableRequestSizeLimit]
        [RequestFormLimits(MultipartBodyLengthLimit = int.MaxValue, ValueLengthLimit = int.MaxValue)]
        [Route("layers/{id}")]
        public async Task<IActionResult> UpdateFromPackage(int id, IFormFile package)
        {
            var gameMapLayer = await _context.GameMapLayers
                .Include(g => g.GameMap)
                .Include(g => g.GameMap!.Game)
                .FirstOrDefaultAsync(m => m.GameMapLayerId == id);
            if (gameMapLayer == null)
            {
                return NotFound();
            }
            try
            {
                using var stream = package.OpenReadStream();
                await _packageService.UpdateLayerFromPackage(stream, gameMapLayer);
                return Ok();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
