using GameMapStorageWebSite.Services.Storages;
using Xunit;

namespace GameMapStorageWebSite.Tests;

public class CountingStreamTests
{
    [Fact]
    public void BytesWritten_IsZero_Initially()
    {
        using var inner = new MemoryStream();
        using var cs = new CountingStream(inner);

        Assert.Equal(0, cs.BytesWritten);
    }

    [Fact]
    public void Write_Array_AccumulatesBytesWritten()
    {
        using var inner = new MemoryStream();
        using var cs = new CountingStream(inner);

        cs.Write(new byte[] { 1, 2, 3, 4, 5 }, 0, 5);

        Assert.Equal(5, cs.BytesWritten);
    }

    [Fact]
    public void Write_Array_WithOffset_CountsOnlySpecifiedCount()
    {
        using var inner = new MemoryStream();
        using var cs = new CountingStream(inner);

        cs.Write(new byte[] { 1, 2, 3, 4, 5 }, 1, 3);

        Assert.Equal(3, cs.BytesWritten);
    }

    [Fact]
    public void Write_Span_AccumulatesBytesWritten()
    {
        using var inner = new MemoryStream();
        using var cs = new CountingStream(inner);

        cs.Write(new ReadOnlySpan<byte>(new byte[] { 10, 20, 30 }));

        Assert.Equal(3, cs.BytesWritten);
    }

    [Fact]
    public async Task WriteAsync_Array_AccumulatesBytesWritten()
    {
        using var inner = new MemoryStream();
        using var cs = new CountingStream(inner);

        await cs.WriteAsync(new byte[] { 1, 2, 3, 4 }, 0, 4);

        Assert.Equal(4, cs.BytesWritten);
    }

    [Fact]
    public async Task WriteAsync_Memory_AccumulatesBytesWritten()
    {
        using var inner = new MemoryStream();
        using var cs = new CountingStream(inner);

        await cs.WriteAsync(new byte[] { 1, 2, 3, 4, 5, 6 }.AsMemory());

        Assert.Equal(6, cs.BytesWritten);
    }

    [Fact]
    public void MultipleWrites_AccumulatesTotalBytesWritten()
    {
        using var inner = new MemoryStream();
        using var cs = new CountingStream(inner);

        cs.Write(new byte[] { 1, 2 }, 0, 2);
        cs.Write(new ReadOnlySpan<byte>(new byte[] { 3, 4, 5 }));
        cs.Write(new byte[] { 6 }, 0, 1);

        Assert.Equal(6, cs.BytesWritten);
    }

    [Fact]
    public async Task MixedSyncAndAsync_AccumulatesAll()
    {
        using var inner = new MemoryStream();
        using var cs = new CountingStream(inner);

        cs.Write(new byte[] { 1 }, 0, 1);
        await cs.WriteAsync(new byte[] { 2, 3 }, 0, 2);
        await cs.WriteAsync(new byte[] { 4, 5, 6 }.AsMemory());

        Assert.Equal(6, cs.BytesWritten);
    }

    [Fact]
    public void Write_ForwardsDataToInnerStream()
    {
        using var inner = new MemoryStream();
        using var cs = new CountingStream(inner);
        var data = new byte[] { 10, 20, 30 };

        cs.Write(data, 0, data.Length);

        Assert.Equal(data, inner.ToArray());
    }

    [Fact]
    public async Task WriteAsync_ForwardsDataToInnerStream()
    {
        using var inner = new MemoryStream();
        using var cs = new CountingStream(inner);
        var data = new byte[] { 7, 8, 9 };

        await cs.WriteAsync(data.AsMemory());

        Assert.Equal(data, inner.ToArray());
    }

    [Fact]
    public void Properties_DelegateToInnerStream()
    {
        using var inner = new MemoryStream(new byte[10], writable: true);
        using var cs = new CountingStream(inner);

        Assert.Equal(inner.CanRead, cs.CanRead);
        Assert.Equal(inner.CanWrite, cs.CanWrite);
        Assert.Equal(inner.CanSeek, cs.CanSeek);
        Assert.Equal(inner.Length, cs.Length);
        Assert.Equal(inner.Position, cs.Position);
    }

    [Fact]
    public void Read_DelegatesToInnerStream()
    {
        var data = new byte[] { 5, 6, 7, 8 };
        using var inner = new MemoryStream(data);
        using var cs = new CountingStream(inner);
        var buffer = new byte[4];

        cs.Read(buffer, 0, 4);

        Assert.Equal(data, buffer);
        Assert.Equal(0, cs.BytesWritten);
    }

    [Fact]
    public void Flush_DoesNotThrow()
    {
        using var inner = new MemoryStream();
        using var cs = new CountingStream(inner);
        cs.Write(new byte[] { 1 }, 0, 1);

        cs.Flush(); // Should not throw
    }

    [Fact]
    public void Write_ZeroBytes_DoesNotChangeBytesWritten()
    {
        using var inner = new MemoryStream();
        using var cs = new CountingStream(inner);

        cs.Write(new byte[0], 0, 0);

        Assert.Equal(0, cs.BytesWritten);
    }
}
