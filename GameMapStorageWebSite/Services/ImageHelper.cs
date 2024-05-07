using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;

namespace GameMapStorageWebSite.Services
{
    public static class ImageHelper
    {
        public static WebpEncoder WebpEncoder90 = new WebpEncoder()
        {
            FileFormat = WebpFileFormatType.Lossy,
            Quality = 90,
            Method = WebpEncodingMethod.BestQuality,
            TransparentColorMode = WebpTransparentColorMode.Preserve
        };

        public static Image Fit(Image sourceImage, int wantedWidth, int wantedHeight)
        {
            var widthRatio = (double)sourceImage.Width / (double)wantedWidth;
            var heightRatio = (double)sourceImage.Height / (double)wantedHeight;
            var ratio = Math.Max(widthRatio, heightRatio);
            using var resizedImage = sourceImage.Clone(p => p.Resize((int)(sourceImage.Width / ratio), (int)(sourceImage.Height / ratio)));
            var image = new Image<Rgba32>(wantedWidth, wantedHeight);
            image.Mutate(p => p.DrawImage(resizedImage, new Point(
                (wantedWidth - resizedImage.Width) / 2,
                (wantedHeight - resizedImage.Height) / 2), 1.0f));
            return image;
        }
    }
}
