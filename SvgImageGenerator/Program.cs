using System;
using System.IO;
using MapToolkit;
using MapToolkit.Drawing;
using PdfSharpCore.Pdf.IO;
using SixLabors.ImageSharp;

namespace SvgImageGenerator
{
    internal class Program
    {
        static void Main(string[] args)
        {
            const string background = "F1F1F140";

            //PdfReader.Open("", PdfDocumentOpenMode.Import);

            Render.ToSvg("protractor.svg", new Vector(102, 102), d =>
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

                d.DrawCircle(new Vector(center, center), center - 0.5f, outer);
                d.DrawCircle(new Vector(center, center), center - 1, d.AllocateStyle(background, "000000FF", 0.1));

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

                //d.DrawTextPath(new[] { new Vector(center - 1, center - 25), new Vector(center + 1, center - 25) }, "N", textCardinal);


                d.DrawTextPath(new[] { new Vector(center + 1.5, center + 25), new Vector(center - 1.5, center + 25) }, "S", textCardinal);
                d.DrawTextPath(new[] { new Vector(center + 25, center - 1.5), new Vector(center + 25, center + 1.5) }, "E", textCardinal);
                d.DrawTextPath(new[] { new Vector(center - 25, center + 1.5), new Vector(center - 25, center - 1.5) }, "W", textCardinal);

                d.DrawText(new Vector(center, center - 23.5), "N", textCardinalBC);

                d.DrawCircle(new Vector(center, center - 25), 5f, outer);
                d.DrawCircle(new Vector(center, center - 25), 5.5f, normalTick);



            },"prtt");

  
            Render.ToSvg("coordinateScale.svg", new Vector(150, 150), d =>
            {
                var boldTick = d.AllocatePenStyle(Color.Black, 0.2);
                var normalTick = d.AllocatePenStyle(Color.Black, 0.1);
                var textTop = d.AllocateTextStyle(new[] { "Arial" }, SixLabors.Fonts.FontStyle.Regular, 5, new SolidColorBrush(Color.Black), null, false, TextAnchor.BottomCenter);
                var textRight = d.AllocateTextStyle(new[] { "Arial" }, SixLabors.Fonts.FontStyle.Regular, 5, new SolidColorBrush(Color.Black), null, false, TextAnchor.CenterLeft);


                d.DrawRoundedRectangle(new Vector(0.5, 0.5), new Vector(149.5, 149.5), d.AllocatePenStyle("80808080", 1), 5.5f);
                d.DrawRoundedRectangle(new Vector(1, 1), new Vector(149, 149), d.AllocateStyle(background, "000000FF", 0.2), 5);


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
                    if ( i % 10 == 0 )
                    {
                        if (i != 0 && i != 100)
                        {
                            d.DrawPolyline([new Vector(25 + (i * 1), 25 - tick10), new Vector(25 + (i * 1), 125)], boldTick);
                            d.DrawPolyline([new Vector(25, 25 + (i * 1)), new Vector(125 + tick10, 25 + (i * 1))], boldTick);
                        }
                        d.DrawText(new Vector(25 + (i * 1), 25 - textOffset), ((100-i)/10).ToString(), textTop);
                        d.DrawText(new Vector(125+ textOffset, 25 + (i * 1)), (i / 10).ToString(), textRight);
                    }
                    else if(i % 2 == 0)
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


            },"cdsc");

            //Render.ToSvg("grip.svg", new Vector(50, 50), d =>
            //{
            //    //var color1 = d.AllocateBrushStyle("80808080");
            //    //var color2 = d.AllocateStyle("FFFFFFFF", "80808080", 0.25);
            //    //for (var x= 0; x <50; x += 10)
            //    //{
            //    //    for (var y = 0; y < 50; y += 10)
            //    //    {
            //    //        d.DrawCircle(new Vector(x + 6, y + 6), 3, color1);
            //    //        d.DrawCircle(new Vector(x + 5, y + 5), 3, color2);
            //    //    }
            //    //}

            //    d.DrawCircle(new Vector(25, 25), 22, d.AllocatePenStyle("80808080", 4));
            //    d.DrawCircle(new Vector(25, 25), 24, d.AllocatePenStyle("000000FF", 1));



            //}, "grp");

            var protractorForJS = CleanForJs(File.ReadAllText("protractor.svg"));

            var coordinateScaleForJS = CleanForJs(File.ReadAllText("coordinateScale.svg"));

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
