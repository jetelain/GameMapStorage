using System.Net;
using System.Text;

namespace Pmad.GameMapStorage.Client.Tests.Unit;

/// <summary>
/// A stub <see cref="HttpMessageHandler"/> that returns pre-configured responses for specific URLs
/// and records all requests for assertion.
/// </summary>
internal sealed class StubHttpMessageHandler : HttpMessageHandler
{
    private readonly Dictionary<string, (HttpStatusCode status, string body)> _responses = new();
    private readonly List<CapturedRequest> _requests = new();

    /// <summary>All requests captured by this handler.</summary>
    public IReadOnlyList<CapturedRequest> Requests => _requests;

    /// <summary>Registers a JSON response for a relative URL.</summary>
    public void Setup(string relativeUrl, string jsonBody, HttpStatusCode status = HttpStatusCode.OK)
    {
        _responses[relativeUrl] = (status, jsonBody);
    }

    /// <summary>Registers a 404 Not Found for a URL.</summary>
    public void SetupNotFound(string relativeUrl)
    {
        _responses[relativeUrl] = (HttpStatusCode.NotFound, string.Empty);
    }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        // Read the body before the caller disposes the content.
        var bodyText = request.Content is not null
            ? await request.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false)
            : string.Empty;

        _requests.Add(new CapturedRequest(request, bodyText));

        var key = request.RequestUri!.PathAndQuery.TrimStart('/');
        if (_responses.TryGetValue(key, out var entry))
        {
            return new HttpResponseMessage(entry.status)
            {
                Content = new StringContent(entry.body, Encoding.UTF8, "application/json")
            };
        }
        return new HttpResponseMessage(HttpStatusCode.NotFound);
    }
}

/// <summary>Snapshot of a captured HTTP request.</summary>
internal sealed record CapturedRequest(
    HttpRequestMessage Message,
    string BodyText);
