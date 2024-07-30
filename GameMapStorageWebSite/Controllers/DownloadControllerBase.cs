using GameMapStorageWebSite.Services.Storages;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;

namespace GameMapStorageWebSite.Controllers
{
    public abstract class DownloadControllerBase : Controller
    {
        protected async Task<IResult> ToResult(IStorageFile? file, string contentType, string? fileDownloadName = null)
        {
            if (file != null)
            {
                Response.RegisterForDispose(file);
                if (file is MemoryStorageFile)
                {
                    AllowSynchronousIO();
                    return Results.Stream(file.CopyTo, contentType, fileDownloadName, file.LastModified);
                }
                return Results.Stream(await file.OpenRead(), contentType, fileDownloadName, file.LastModified);
            }
            return Results.NotFound();
        }

        private void AllowSynchronousIO()
        {
            // Workaround for ZipArchive
            var syncIOFeature = HttpContext.Features.Get<IHttpBodyControlFeature>();
            if (syncIOFeature != null)
            {
                syncIOFeature.AllowSynchronousIO = true;
            }
        }
    }
}
