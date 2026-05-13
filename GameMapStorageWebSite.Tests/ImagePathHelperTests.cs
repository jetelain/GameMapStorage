using GameMapStorageWebSite;
using GameMapStorageWebSite.Entities;
using Microsoft.AspNetCore.Http;
using Xunit;

namespace GameMapStorageWebSite.Tests;

public class ImagePathHelperTests
{
    [Fact]
    public void AcceptWebp_ReturnsTrue_WhenAcceptHeaderContainsWebp()
    {
        var context = new DefaultHttpContext();
        context.Request.Headers.Accept = "text/html,application/xhtml+xml,image/webp";

        Assert.True(ImagePathHelper.AcceptWebp(context.Request));
    }

    [Fact]
    public void AcceptWebp_UsesUserAgentFallback_WhenHeaderMissing()
    {
        var context = new DefaultHttpContext();
        context.Request.Headers.UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0";

        Assert.True(ImagePathHelper.AcceptWebp(context.Request));
    }

    [Fact]
    public void AcceptWebp_ReturnsFalse_WhenNoHeaderAndNoSupport()
    {
        var context = new DefaultHttpContext();
        context.Request.Headers.UserAgent = "curl/7.54.0";

        Assert.False(ImagePathHelper.AcceptWebp(context.Request));
    }

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

    // --- GetLayerPattern ---

    private static GameMapLayer MakeLayer(LayerFormat format) => new GameMapLayer
    {
        GameMapLayerId = 10,
        GameMapId = 20,
        Format = format,
        GameMap = new GameMap { GameMapId = 20, GameId = 5, EnglishTitle = "Test" }
    };

    [Theory]
    [InlineData(LayerFormat.PngOnly, false, "/data/5/maps/20/10/{z}/{x}/{y}.png")]
    [InlineData(LayerFormat.PngOnly, true,  "/data/5/maps/20/10/{z}/{x}/{y}.png")]
    [InlineData(LayerFormat.PngAndWebp, false, "/data/5/maps/20/10/{z}/{x}/{y}.png")]
    [InlineData(LayerFormat.PngAndWebp, true,  "/data/5/maps/20/10/{z}/{x}/{y}.webp")]
    [InlineData(LayerFormat.WebpOnly,   false, "/data/5/maps/20/10/{z}/{x}/{y}.webp")]
    [InlineData(LayerFormat.WebpOnly,   true,  "/data/5/maps/20/10/{z}/{x}/{y}.webp")]
    [InlineData(LayerFormat.SvgOnly,    false, "/data/5/maps/20/10/{z}/{x}/{y}.svg")]
    [InlineData(LayerFormat.SvgOnly,    true,  "/data/5/maps/20/10/{z}/{x}/{y}.svg")]
    [InlineData(LayerFormat.SvgAndWebp, false, "/data/5/maps/20/10/{z}/{x}/{y}.svg")]
    [InlineData(LayerFormat.SvgAndWebp, true,  "/data/5/maps/20/10/{z}/{x}/{y}.svg")]
    public void GetLayerPattern_ReturnsExpectedPath(LayerFormat format, bool useWebp, string expected)
    {
        var layer = MakeLayer(format);
        Assert.Equal(expected, ImagePathHelper.GetLayerPattern(useWebp, layer));
    }

    // --- GetLayerPreview ---

    [Theory]
    [InlineData(LayerFormat.PngOnly,    false, "/data/5/maps/20/10/0/0/0.png")]
    [InlineData(LayerFormat.PngOnly,    true,  "/data/5/maps/20/10/0/0/0.png")]
    [InlineData(LayerFormat.PngAndWebp, false, "/data/5/maps/20/10/0/0/0.png")]
    [InlineData(LayerFormat.PngAndWebp, true,  "/data/5/maps/20/10/0/0/0.webp")]
    [InlineData(LayerFormat.WebpOnly,   false, "/data/5/maps/20/10/0/0/0.webp")]
    [InlineData(LayerFormat.WebpOnly,   true,  "/data/5/maps/20/10/0/0/0.webp")]
    [InlineData(LayerFormat.SvgAndWebp, false, "/data/5/maps/20/10/0/0/0.webp")]
    [InlineData(LayerFormat.SvgAndWebp, true,  "/data/5/maps/20/10/0/0/0.webp")]
    public void GetLayerPreview_ReturnsExpectedPath(LayerFormat format, bool useWebp, string expected)
    {
        var layer = MakeLayer(format);
        Assert.Equal(expected, ImagePathHelper.GetLayerPreview(useWebp, layer));
    }
}
