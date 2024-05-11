using System;
using System.IO;
using MapToolkit;
using MapToolkit.Drawing;
using SixLabors.ImageSharp;

namespace SvgImageGenerator
{
    internal class Program
    {
        const string Background = "F1F1F140";


        static void Main(string[] args)
        {
            Render.ToSvg("protractor.svg", new Vector(102, 102), DrawProtractor, "prtt");
            Render.ToSvg("coordinateScale.svg", new Vector(150, 150), DrawCoordinateScale, "cdsc");
            Render.ToSvg("ruler.svg", new Vector(812, 812), DrawRuler, "rulr");

            var protractorForJS = CleanForJs(File.ReadAllText("protractor.svg"));
            var coordinateScaleForJS = CleanForJs(File.ReadAllText("coordinateScale.svg"));
            var rulerForJS = CleanForJs(File.ReadAllText("ruler.svg"));
        }

        private static void DrawRuler(IDrawSurface d)
        {
            const double center = 812/2.0;
            const double halfHeight = 20;
            const double tick1 = 2;
            const double tick10 = 4;
            const double tick50 = 6;
            const double tick100 = 8;
            const double tickBegin = -200;
            const double margin = 5;
            const double textMargin = 1;
            const int totalTicks = 600;

            var boldTick = d.AllocatePenStyle(Color.Black, 0.2);
            var boldRed = d.AllocatePenStyle(Color.Red, 0.3);
            var normalTick = d.AllocatePenStyle(Color.Black, 0.1);
            var outer = d.AllocatePenStyle("80808080", 1);
            var backgroundOutline = boldTick;
            var background = d.AllocateStyle(Background, "000000FF", 0.2);
            var textTop = d.AllocateTextStyle(new[] { "Arial" }, SixLabors.Fonts.FontStyle.Regular, 5, new SolidColorBrush(Color.Black), null, false, TextAnchor.TopCenter);
            var textBottom = d.AllocateTextStyle(new[] { "Arial" }, SixLabors.Fonts.FontStyle.Regular, 5, new SolidColorBrush(Color.Black), null, false, TextAnchor.BottomCenter);



            d.DrawRoundedRectangle(new Vector(center + tickBegin - margin - 0.5, center - halfHeight - 0.5), new Vector(center + totalTicks + tickBegin + margin + 0.5, center + halfHeight + 0.5), outer, 5.5f);
            d.DrawRoundedRectangle(new Vector(center + tickBegin - margin, center - halfHeight), new Vector(center + totalTicks + tickBegin + margin, center + halfHeight), background, 5);
            
            for (int i = 0; i <= totalTicks; i++)
            {
                if (i % 100 == 0)
                {
                    d.DrawPolyline([new Vector(center + i + tickBegin, center - halfHeight), new Vector(center + i + tickBegin, center - halfHeight + tick100)], boldTick);
                    d.DrawText(new Vector(center + i + tickBegin, center - halfHeight + tick100 + textMargin), (i / 100).ToString(), textTop);
                    d.DrawPolyline([new Vector(center + i + tickBegin, center + halfHeight), new Vector(center + i + tickBegin, center + halfHeight - tick100)], boldTick);
                    d.DrawText(new Vector(center + i + tickBegin, center + halfHeight - tick100 - textMargin), (i / 100).ToString(), textBottom);
                }
                else if (i % 50 == 0)
                {
                    d.DrawPolyline([new Vector(center + i + tickBegin, center - halfHeight), new Vector(center + i + tickBegin, center - halfHeight + tick50)], normalTick);
                    d.DrawPolyline([new Vector(center + i + tickBegin, center + halfHeight), new Vector(center + i + tickBegin, center + halfHeight - tick50)], normalTick);
                }
                else if (i % 10 == 0)
                {
                    d.DrawPolyline([new Vector(center + i + tickBegin, center - halfHeight), new Vector(center + i + tickBegin, center - halfHeight + tick10)], normalTick);
                    d.DrawPolyline([new Vector(center + i + tickBegin, center + halfHeight), new Vector(center + i + tickBegin, center + halfHeight - tick10)], normalTick);
                }
                else
                {
                    d.DrawPolyline([new Vector(center + i + tickBegin, center - halfHeight), new Vector(center + i + tickBegin, center - halfHeight+ tick1)], normalTick);
                    d.DrawPolyline([new Vector(center + i + tickBegin, center + halfHeight), new Vector(center + i + tickBegin, center + halfHeight - tick1)], normalTick);
                }
            }

            d.DrawCircle(new Vector(center + totalTicks+ tickBegin+ tickBegin, center), 5f, outer);
            d.DrawCircle(new Vector(center + totalTicks + tickBegin + tickBegin, center), 5.5f, backgroundOutline);

            d.DrawPolyline(new[] { new Vector(center + tickBegin, center), new Vector(center + tickBegin + tickBegin + totalTicks - 6, center) }, boldRed);
            d.DrawPolyline(new[] { new Vector(center + tickBegin + tickBegin + totalTicks + 6, center), new Vector(center + tickBegin + totalTicks, center) }, boldRed);
            d.DrawPolyline(new[] { new Vector(center, center - 4), new Vector(center, center + 4) }, boldRed);

        }

        private static void DrawCoordinateScale(IDrawSurface d)
        {

            var boldTick = d.AllocatePenStyle(Color.Black, 0.2);
            var normalTick = d.AllocatePenStyle(Color.Black, 0.1);
            var textTop = d.AllocateTextStyle(new[] { "Arial" }, SixLabors.Fonts.FontStyle.Regular, 5, new SolidColorBrush(Color.Black), null, false, TextAnchor.BottomCenter);
            var textRight = d.AllocateTextStyle(new[] { "Arial" }, SixLabors.Fonts.FontStyle.Regular, 5, new SolidColorBrush(Color.Black), null, false, TextAnchor.CenterLeft);

            var outer = d.AllocatePenStyle("80808080", 1);
            var background = d.AllocateStyle(Background, "000000FF", 0.2);

            d.DrawRoundedRectangle(new Vector(0.5, 0.5), new Vector(149.5, 149.5), outer, 5.5f);
            d.DrawRoundedRectangle(new Vector(1, 1), new Vector(149, 149), background, 5);


            d.DrawPolyline([new Vector(125, 1), new Vector(125, 149)], boldTick);
            d.DrawPolyline([new Vector(25, 1), new Vector(25, 149)], boldTick);
            d.DrawPolyline([new Vector(1, 125), new Vector(149, 125)], boldTick);
            d.DrawPolyline([new Vector(1, 25), new Vector(149, 25)], boldTick);

            const int tick1 = 4;
            const int tick2 = 8;
            const int tick10 = 12;
            const int textOffset = 14;


            for (int i = 1; i < 100; i++)
            {
                if (i % 10 == 0)
                {
                    if (i != 0 && i != 100)
                    {
                        d.DrawPolyline([new Vector(25 + (i * 1), 25 - tick10), new Vector(25 + (i * 1), 125)], boldTick);
                        d.DrawPolyline([new Vector(25, 25 + (i * 1)), new Vector(125 + tick10, 25 + (i * 1))], boldTick);
                    }
                    d.DrawText(new Vector(25 + (i * 1), 25 - textOffset), ((100 - i) / 10).ToString(), textTop);
                    d.DrawText(new Vector(125 + textOffset, 25 + (i * 1)), (i / 10).ToString(), textRight);
                }
                else if (i % 2 == 0)
                {
                    d.DrawPolyline([new Vector(25 + (i * 1), 25 - tick2), new Vector(25 + (i * 1), 25)], boldTick);
                    d.DrawPolyline([new Vector(125, 25 + (i * 1)), new Vector(125 + tick2, 25 + (i * 1))], boldTick);
                }
                else
                {
                    d.DrawPolyline([new Vector(25 + (i * 1), 25 - tick1), new Vector(25 + (i * 1), 25)], boldTick);
                    d.DrawPolyline([new Vector(125, 25 + (i * 1)), new Vector(125 + tick1, 25 + (i * 1))], boldTick);
                }
            }
            d.DrawText(new Vector(25, 25 - textOffset), "10", textTop);
            d.DrawText(new Vector(125 + textOffset, 125 + 1), "10", d.AllocateTextStyle(new[] { "Arial" }, SixLabors.Fonts.FontStyle.Regular, 5, new SolidColorBrush(Color.Black), null, false, TextAnchor.TopLeft));
        }

        private static void DrawProtractor(IDrawSurface d)
        {

            const float center = 51f;
            const double textDegreesAngle = 3.5;
            const double textMilsAngle = 30;

            var boldTick = d.AllocatePenStyle(Color.Black, 0.2);
            var normalTick = d.AllocatePenStyle(Color.Black, 0.1);
            var textNormal = d.AllocateTextStyle(new[] { "Arial" }, SixLabors.Fonts.FontStyle.Regular, 2.5, new SolidColorBrush(Color.Black), null, false);
            var textCardinal = d.AllocateTextStyle(new[] { "Arial" }, SixLabors.Fonts.FontStyle.Bold, 5, new SolidColorBrush(Color.Red), null, false);
            var textCardinalBC = d.AllocateTextStyle(new[] { "Arial" }, SixLabors.Fonts.FontStyle.Bold, 5, new SolidColorBrush(Color.Red), null, false, TextAnchor.BottomCenter);

            var outer = d.AllocatePenStyle("80808080", 1);
            var background = d.AllocateStyle(Background, "000000FF", 0.1);

            d.DrawCircle(new Vector(center, center), center - 0.5f, outer);
            d.DrawCircle(new Vector(center, center), center - 1, background);

            for (int i = 0; i < 360; ++i)
            {
                var sin = Math.Sin(-(i * Math.PI / 180.0) + Math.PI);
                var cos = Math.Cos(-(i * Math.PI / 180.0) + Math.PI);

                if (i % 10 == 0)
                {
                    d.DrawPolyline(
                        new[] {
                        new Vector((sin * 40.0) + center, (cos * 40.0) + center),
                        new Vector((sin * 35.0) + center, (cos * 35.0) + center) },
                        boldTick);

                    var sin1 = Math.Sin(-((i - textDegreesAngle) * Math.PI / 180.0) + Math.PI);
                    var cos1 = Math.Cos(-((i - textDegreesAngle) * Math.PI / 180.0) + Math.PI);
                    var sin2 = Math.Sin(-((i + textDegreesAngle) * Math.PI / 180.0) + Math.PI);
                    var cos2 = Math.Cos(-((i + textDegreesAngle) * Math.PI / 180.0) + Math.PI);

                    d.DrawTextPath(
                        new[]
                        {
                            new Vector((sin1 * 33.0) + center, (cos1 * 33.0) + center),
                            new Vector((sin2 * 33.0) + center, (cos2 * 33.0) + center)
                        }
                        , i.ToString("000"), textNormal);
                }
                else if (i % 5 == 0)
                {
                    d.DrawPolyline(
                        new[] {
                            new Vector((sin * 40.0) + center, (cos * 40.0) + center),
                            new Vector((sin * 36) + center, (cos * 36) + center) },
                        normalTick);
                }
                else
                {
                    d.DrawPolyline(
                        new[] {
                            new Vector((sin * 40.0) + center, (cos * 40.0) + center),
                            new Vector((sin * 37.5) + center, (cos * 37.5) + center) },
                        normalTick);
                }
            }


            for (int i = 0; i < 6400; i += 10)
            {
                var sin = Math.Sin(-(i * Math.PI / 3200.0) + Math.PI);
                var cos = Math.Cos(-(i * Math.PI / 3200.0) + Math.PI);

                if (i % 100 == 0)
                {
                    d.DrawPolyline(
                        new[] {
                        new Vector((sin * 50.0) + center, (cos * 50.0) + center),
                        new Vector((sin * 45.0) + center, (cos * 45.0) + center) },
                        boldTick);


                    var sin1 = Math.Sin(-((i - textMilsAngle) * Math.PI / 3200.0) + Math.PI);
                    var cos1 = Math.Cos(-((i - textMilsAngle) * Math.PI / 3200.0) + Math.PI);
                    var sin2 = Math.Sin(-((i + textMilsAngle) * Math.PI / 3200.0) + Math.PI);
                    var cos2 = Math.Cos(-((i + textMilsAngle) * Math.PI / 3200.0) + Math.PI);

                    d.DrawTextPath(
                        new[]
                        {
                            new Vector((sin1 * 43.0) + center, (cos1 * 43.0) + center),
                            new Vector((sin2 * 43.0) + center, (cos2 * 43.0) + center)
                        }
                        , (i / 100).ToString("00"), textNormal);
                }
                else if (i % 20 == 0)
                {
                    d.DrawPolyline(
                        new[] {
                            new Vector((sin * 50.0) + center, (cos * 50.0) + center),
                            new Vector((sin * 47.5) + center, (cos * 47.5) + center) },
                        normalTick);
                }
                else
                {
                    d.DrawPolyline(
                        new[] {
                            new Vector((sin * 50.0)  + center, (cos * 50.0) + center),
                            new Vector((sin * 48.75) + center, (cos * 48.75) + center) },
                        normalTick);
                }
            }

            d.DrawPolyline(new[] { new Vector(center - 2, center), new Vector(center + 2, center) }, boldTick);
            d.DrawPolyline(new[] { new Vector(center, center - 2), new Vector(center, center + 2) }, boldTick);

            d.DrawText(new Vector(center, center - 23.5), "N", textCardinalBC);
            d.DrawTextPath(new[] { new Vector(center + 1.5, center + 25), new Vector(center - 1.5, center + 25) }, "S", textCardinal);
            d.DrawTextPath(new[] { new Vector(center + 25, center - 1.5), new Vector(center + 25, center + 1.5) }, "E", textCardinal);
            d.DrawTextPath(new[] { new Vector(center - 25, center + 1.5), new Vector(center - 25, center - 1.5) }, "W", textCardinal);

            d.DrawCircle(new Vector(center, center - 25), 5f, outer);
            d.DrawCircle(new Vector(center, center - 25), 5.5f, normalTick);
        }

        private static string CleanForJs(string v)
        {
            return v
                .Substring(v.IndexOf("fill=\"#fff\" />") + 14)
                .ReplaceLineEndings("")
                .Replace(@"</svg>", "");
        }
    }
}
