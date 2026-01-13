using GameMapStorageWebSite;
using Xunit;

namespace GameMapStorageWebSite.Tests;

public class ImagePathHelperTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("    ")]
    [InlineData("Bad User Agent")]
    public void SupportsWebpUserAgent_ReturnsFalse_ForMissingValues(string? userAgent)
    {
        Assert.False(ImagePathHelper.SupportsWebpUserAgent(userAgent));
    }

    [Theory]
    [InlineData("Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0")]
    [InlineData("mozilla/5.0 (x11; ubuntu; linux x86_64; rv:65.0) gecko/20100101 firefox/65.0")]
    public void SupportsWebpUserAgent_ReturnsTrue_ForSupportedFirefox(string userAgent)
    {
        Assert.True(ImagePathHelper.SupportsWebpUserAgent(userAgent));
    }

    [Theory]
    [InlineData("Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:60.0) Gecko/20100101 Firefox/60.0")]
    public void SupportsWebpUserAgent_ReturnsFalse_ForLegacyFirefox(string userAgent)
    {
        Assert.False(ImagePathHelper.SupportsWebpUserAgent(userAgent));
    }

    [Theory]
    [InlineData("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")]
    [InlineData("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edg/122.0.0.0 Safari/537.36")]
    [InlineData("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Vivaldi/6.8.3381.44 Chrome/122.0.0.0 Safari/537.36")]
    public void SupportsWebpUserAgent_ReturnsTrue_ForChromiumBasedBrowsers(string userAgent)
    {
        Assert.True(ImagePathHelper.SupportsWebpUserAgent(userAgent));
    }

    [Theory]
    [InlineData("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15")]
    public void SupportsWebpUserAgent_ReturnsTrue_ForSafari16Plus(string userAgent)
    {
        Assert.True(ImagePathHelper.SupportsWebpUserAgent(userAgent));
    }

    [Theory]
    [InlineData("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Safari/605.1.15")]
    public void SupportsWebpUserAgent_ReturnsFalse_ForOldSafari(string userAgent)
    {
        Assert.False(ImagePathHelper.SupportsWebpUserAgent(userAgent));
    }
}
