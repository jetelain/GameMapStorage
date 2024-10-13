using System.Security.Claims;
using GameMapStorageWebSite.Entities;
using GameMapStorageWebSite.Security;
using GameMapStorageWebSite.Services;
using GameMapStorageWebSite.Services.DataPackages;
using Microsoft.AspNetCore.Authentication.BearerToken;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;

namespace GameMapStorageWebSite.Controllers.Admin
{
    [ApiController]
    [Route("api/v1")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public class AdminApiController : ControllerBase
    {
        private readonly GameMapStorageContext _context;
        private readonly IPackageService _packageService;
        private readonly IPaperMapService _paperMap;

        public AdminApiController(GameMapStorageContext context, IPackageService packageService, IPaperMapService paperMap)
        {
            _context = context;
            _packageService = packageService;
            _paperMap = paperMap;
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


        [HttpPost]
        [Authorize("ApiAdminEdit")]
        [DisableRequestSizeLimit]
        [RequestFormLimits(MultipartBodyLengthLimit = int.MaxValue, ValueLengthLimit = int.MaxValue)]
        [Route("papermaps")]
        public async Task<IActionResult> CreatePaperMap([FromForm] string jsonDefinition, [FromForm] IFormFile content)
        {
            try
            {
                var definition = JsonConvert.DeserializeObject<PaperMapDefinition>(jsonDefinition);
                if (definition == null)
                {
                    return BadRequest("Bad definition");
                }
                using var stream = content.OpenReadStream();
                await _paperMap.Create(definition, (int)content.Length, stream.CopyToAsync);
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
        [Route("papermaps/{id}")]
        public async Task<IActionResult> UpdatePaperMap(int id, [FromForm] string jsonDefinition, [FromForm] IFormFile content)
        {
            var gameMapLayer = await _context.GamePaperMaps
                .Include(g => g.GameMap)
                .Include(g => g.GameMap!.Game)
                .FirstOrDefaultAsync(m => m.GamePaperMapId == id);
            if (gameMapLayer == null)
            {
                return NotFound();
            }
            try
            {
                var definition = JsonConvert.DeserializeObject<PaperMapDefinition>(jsonDefinition);
                if (definition == null)
                {
                    return BadRequest("Bad definition");
                }
                using var stream = content.OpenReadStream();
                await _paperMap.Update(definition, (int)content.Length, stream.CopyToAsync, gameMapLayer);
                return Ok();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
