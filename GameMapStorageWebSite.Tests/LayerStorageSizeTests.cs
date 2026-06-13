using GameMapStorageWebSite.Services;
using Xunit;

namespace GameMapStorageWebSite.Tests;

public class LayerStorageSizeTests
{
    [Fact]
    public void DefaultValues_AreAllZero()
    {
        var size = new LayerStorageSize();

        Assert.Equal(0, size.PngTiles);
        Assert.Equal(0, size.WebpTiles);
        Assert.Equal(0, size.SvgTiles);
        Assert.Equal(0, size.SourceFiles);
    }

    [Fact]
    public void Add_AccumulatesAllFields()
    {
        var a = new LayerStorageSize { PngTiles = 100, WebpTiles = 200, SvgTiles = 300, SourceFiles = 400 };
        var b = new LayerStorageSize { PngTiles = 10,  WebpTiles = 20,  SvgTiles = 30,  SourceFiles = 40  };

        a.Add(b);

        Assert.Equal(110, a.PngTiles);
        Assert.Equal(220, a.WebpTiles);
        Assert.Equal(330, a.SvgTiles);
        Assert.Equal(440, a.SourceFiles);
    }

    [Fact]
    public void Add_WithZeroValues_DoesNotChangeTarget()
    {
        var a = new LayerStorageSize { PngTiles = 100, WebpTiles = 200, SvgTiles = 300, SourceFiles = 400 };

        a.Add(new LayerStorageSize());

        Assert.Equal(100, a.PngTiles);
        Assert.Equal(200, a.WebpTiles);
        Assert.Equal(300, a.SvgTiles);
        Assert.Equal(400, a.SourceFiles);
    }

    [Fact]
    public void Add_DoesNotModifyArgument()
    {
        var a = new LayerStorageSize { PngTiles = 50 };
        var b = new LayerStorageSize { PngTiles = 25 };

        a.Add(b);

        Assert.Equal(25, b.PngTiles);
    }

    [Fact]
    public void Add_MultipleCallsAccumulateCorrectly()
    {
        var total = new LayerStorageSize();

        for (int i = 0; i < 5; i++)
        {
            total.Add(new LayerStorageSize { PngTiles = 100, WebpTiles = 200, SvgTiles = 50, SourceFiles = 1000 });
        }

        Assert.Equal(500,  total.PngTiles);
        Assert.Equal(1000, total.WebpTiles);
        Assert.Equal(250,  total.SvgTiles);
        Assert.Equal(5000, total.SourceFiles);
    }

    [Fact]
    public void Add_OnlyAffectsTargetNotSource()
    {
        var a = new LayerStorageSize { PngTiles = 10 };
        var b = new LayerStorageSize { PngTiles = 10 };

        a.Add(b);

        Assert.Equal(20, a.PngTiles);
        Assert.Equal(10, b.PngTiles);
    }

    [Fact]
    public void Add_WithLargeValues_DoesNotOverflow()
    {
        var a = new LayerStorageSize { SourceFiles = long.MaxValue / 2 };
        var b = new LayerStorageSize { SourceFiles = long.MaxValue / 2 };

        a.Add(b);

        Assert.Equal(long.MaxValue - 1, a.SourceFiles);
    }
}
