using System.Globalization;

namespace GameMapStorageWebSite.Services.Storages
{
    internal class HttpFile : IStorageFile
    {
        private static readonly string[] Formats = ["ddd, dd MMM yyyy HH:mm:ss 'GMT'", "ddd, dd MMM yyyy HH:mm:ss 'UTC'"];

        private readonly HttpResponseMessage response;

        public HttpFile(HttpResponseMessage response)
        {
            this.response = response;
        }

        public DateTimeOffset? LastModified
        {
            get 
            { 
                if (response.Headers.TryGetValues("Last-Modified", out var values))
                {
                    var value = values.FirstOrDefault();
                    if (value != null && DateTime.TryParseExact(value, Formats, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var result))
                    {
                        return new DateTimeOffset(result, TimeSpan.Zero);
                    }
                }
                return null;
            } 
        }

        public void Dispose()
        {
            response.Dispose();
        }

        public Task<Stream> OpenRead()
        {
            return response.Content.ReadAsStreamAsync();
        }
    }
}