﻿// <auto-generated />
using System;
using GameMapStorageWebSite.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

#nullable disable

namespace GameMapStorageWebSite.Migrations
{
    [DbContext(typeof(GameMapStorageContext))]
    partial class GameMapStorageContextModelSnapshot : ModelSnapshot
    {
        protected override void BuildModel(ModelBuilder modelBuilder)
        {
#pragma warning disable 612, 618
            modelBuilder.HasAnnotation("ProductVersion", "8.0.11");

            modelBuilder.Entity("GameMapStorageWebSite.Entities.ApiKey", b =>
                {
                    b.Property<int>("ApiKeyId")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("INTEGER");

                    b.Property<DateTime>("CreatedUtc")
                        .HasColumnType("TEXT");

                    b.Property<string>("Hash")
                        .IsRequired()
                        .HasColumnType("TEXT");

                    b.Property<string>("Salt")
                        .IsRequired()
                        .HasColumnType("TEXT");

                    b.Property<string>("Title")
                        .IsRequired()
                        .HasColumnType("TEXT");

                    b.HasKey("ApiKeyId");

                    b.ToTable("ApiKey", (string)null);
                });

            modelBuilder.Entity("GameMapStorageWebSite.Entities.BackgroundWork", b =>
                {
                    b.Property<int>("BackgroundWorkId")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("INTEGER");

                    b.Property<DateTime>("CreatedUtc")
                        .HasColumnType("TEXT");

                    b.Property<string>("Data")
                        .IsRequired()
                        .HasColumnType("TEXT");

                    b.Property<string>("Error")
                        .HasColumnType("TEXT");

                    b.Property<DateTime?>("FinishedUtc")
                        .HasColumnType("TEXT");

                    b.Property<int?>("GameMapLayerId")
                        .HasColumnType("INTEGER");

                    b.Property<int?>("GamePaperMapId")
                        .HasColumnType("INTEGER");

                    b.Property<DateTime?>("StartedUtc")
                        .HasColumnType("TEXT");

                    b.Property<int>("State")
                        .HasColumnType("INTEGER");

                    b.Property<int>("Type")
                        .HasColumnType("INTEGER");

                    b.HasKey("BackgroundWorkId");

                    b.HasIndex("GameMapLayerId");

                    b.HasIndex("GamePaperMapId");

                    b.ToTable("BackgroundWork", (string)null);
                });

            modelBuilder.Entity("GameMapStorageWebSite.Entities.Game", b =>
                {
                    b.Property<int>("GameId")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("INTEGER");

                    b.Property<string>("Attribution")
                        .IsRequired()
                        .HasColumnType("TEXT");

                    b.Property<string>("EnglishTitle")
                        .IsRequired()
                        .HasColumnType("TEXT");

                    b.Property<DateTime?>("LastChangeUtc")
                        .HasColumnType("TEXT");

                    b.Property<string>("Name")
                        .IsRequired()
                        .HasColumnType("TEXT");

                    b.Property<string>("OfficialSiteUri")
                        .HasColumnType("TEXT");

                    b.Property<string>("SteamAppId")
                        .HasColumnType("TEXT");

                    b.HasKey("GameId");

                    b.ToTable("Game", (string)null);
                });

            modelBuilder.Entity("GameMapStorageWebSite.Entities.GameColor", b =>
                {
                    b.Property<int>("GameColorId")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("INTEGER");

                    b.Property<string>("Aliases")
                        .HasColumnType("TEXT");

                    b.Property<string>("ContrastHexadecimal")
                        .IsRequired()
                        .HasColumnType("TEXT");

                    b.Property<string>("EnglishTitle")
                        .IsRequired()
                        .HasColumnType("TEXT");

                    b.Property<int>("GameId")
                        .HasColumnType("INTEGER");

                    b.Property<string>("Hexadecimal")
                        .IsRequired()
                        .HasColumnType("TEXT");

                    b.Property<string>("Name")
                        .IsRequired()
                        .HasColumnType("TEXT");

                    b.Property<int>("Usage")
                        .HasColumnType("INTEGER");

                    b.HasKey("GameColorId");

                    b.HasIndex("GameId");

                    b.ToTable("GameColor", (string)null);
                });

            modelBuilder.Entity("GameMapStorageWebSite.Entities.GameMap", b =>
                {
                    b.Property<int>("GameMapId")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("INTEGER");

                    b.Property<string>("Aliases")
                        .HasColumnType("TEXT");

                    b.Property<string>("AppendAttribution")
                        .HasColumnType("TEXT");

                    b.Property<int>("CitiesCount")
                        .HasColumnType("INTEGER");

                    b.Property<string>("EnglishTitle")
                        .IsRequired()
                        .HasColumnType("TEXT");

                    b.Property<int>("GameId")
                        .HasColumnType("INTEGER");

                    b.Property<DateTime?>("LastChangeUtc")
                        .HasColumnType("TEXT");

                    b.Property<string>("Name")
                        .HasColumnType("TEXT");

                    b.Property<string>("OfficialSiteUri")
                        .HasColumnType("TEXT");

                    b.Property<double>("OriginX")
                        .HasColumnType("REAL");

                    b.Property<double>("OriginY")
                        .HasColumnType("REAL");

                    b.Property<double>("SizeInMeters")
                        .HasColumnType("REAL");

                    b.Property<string>("SteamWorkshopId")
                        .HasColumnType("TEXT");

                    b.Property<string>("Tags")
                        .HasColumnType("TEXT");

                    b.HasKey("GameMapId");

                    b.HasIndex("GameId");

                    b.ToTable("GameMap", (string)null);
                });

            modelBuilder.Entity("GameMapStorageWebSite.Entities.GameMapLayer", b =>
                {
                    b.Property<int>("GameMapLayerId")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("INTEGER");

                    b.Property<string>("Culture")
                        .HasColumnType("TEXT");

                    b.Property<DateTime?>("DataLastChangeUtc")
                        .HasColumnType("TEXT");

                    b.Property<int>("DefaultZoom")
                        .HasColumnType("INTEGER");

                    b.Property<double>("FactorX")
                        .HasColumnType("REAL");

                    b.Property<double>("FactorY")
                        .HasColumnType("REAL");

                    b.Property<int>("Format")
                        .HasColumnType("INTEGER");

                    b.Property<int>("GameMapId")
                        .HasColumnType("INTEGER");

                    b.Property<byte[]>("GameMapLayerGuid")
                        .HasColumnType("BLOB");

                    b.Property<bool>("IsDefault")
                        .HasColumnType("INTEGER");

                    b.Property<DateTime?>("LastChangeUtc")
                        .HasColumnType("TEXT");

                    b.Property<int>("MaxZoom")
                        .HasColumnType("INTEGER");

                    b.Property<int>("MinZoom")
                        .HasColumnType("INTEGER");

                    b.Property<int>("State")
                        .HasColumnType("INTEGER");

                    b.Property<int>("TileSize")
                        .HasColumnType("INTEGER");

                    b.Property<int>("Type")
                        .HasColumnType("INTEGER");

                    b.HasKey("GameMapLayerId");

                    b.HasIndex("GameMapId");

                    b.ToTable("GameMapLayer", (string)null);
                });

            modelBuilder.Entity("GameMapStorageWebSite.Entities.GameMapLocation", b =>
                {
                    b.Property<int>("GameMapLocationId")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("INTEGER");

                    b.Property<string>("EnglishTitle")
                        .IsRequired()
                        .HasColumnType("TEXT");

                    b.Property<int>("GameMapId")
                        .HasColumnType("INTEGER");

                    b.Property<byte[]>("GameMapLocationGuid")
                        .HasColumnType("BLOB");

                    b.Property<int>("Type")
                        .HasColumnType("INTEGER");

                    b.Property<double>("X")
                        .HasColumnType("REAL");

                    b.Property<double>("Y")
                        .HasColumnType("REAL");

                    b.HasKey("GameMapLocationId");

                    b.HasIndex("GameMapId");

                    b.ToTable("GameMapLocation", (string)null);
                });

            modelBuilder.Entity("GameMapStorageWebSite.Entities.GameMarker", b =>
                {
                    b.Property<int>("GameMarkerId")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("INTEGER");

                    b.Property<string>("EnglishTitle")
                        .IsRequired()
                        .HasColumnType("TEXT");

                    b.Property<int>("GameId")
                        .HasColumnType("INTEGER");

                    b.Property<DateTime?>("ImageLastChangeUtc")
                        .HasColumnType("TEXT");

                    b.Property<bool>("IsColorCompatible")
                        .HasColumnType("INTEGER");

                    b.Property<string>("MilSymbolEquivalent")
                        .HasColumnType("TEXT");

                    b.Property<string>("Name")
                        .IsRequired()
                        .HasColumnType("TEXT");

                    b.Property<string>("SteamWorkshopId")
                        .HasColumnType("TEXT");

                    b.Property<int>("Usage")
                        .HasColumnType("INTEGER");

                    b.HasKey("GameMarkerId");

                    b.HasIndex("GameId");

                    b.ToTable("GameMarker", (string)null);
                });

            modelBuilder.Entity("GameMapStorageWebSite.Entities.GamePaperMap", b =>
                {
                    b.Property<int>("GamePaperMapId")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("INTEGER");

                    b.Property<int>("FileFormat")
                        .HasColumnType("INTEGER");

                    b.Property<int>("FileSize")
                        .HasColumnType("INTEGER");

                    b.Property<int>("GameMapId")
                        .HasColumnType("INTEGER");

                    b.Property<DateTime?>("LastChangeUtc")
                        .HasColumnType("TEXT");

                    b.Property<string>("Name")
                        .IsRequired()
                        .HasColumnType("TEXT");

                    b.Property<int>("PaperSize")
                        .HasColumnType("INTEGER");

                    b.Property<int>("Scale")
                        .HasColumnType("INTEGER");

                    b.HasKey("GamePaperMapId");

                    b.HasIndex("GameMapId");

                    b.ToTable("GamePaperMap", (string)null);
                });

            modelBuilder.Entity("GameMapStorageWebSite.Entities.BackgroundWork", b =>
                {
                    b.HasOne("GameMapStorageWebSite.Entities.GameMapLayer", "GameMapLayer")
                        .WithMany("Works")
                        .HasForeignKey("GameMapLayerId")
                        .OnDelete(DeleteBehavior.Cascade);

                    b.HasOne("GameMapStorageWebSite.Entities.GamePaperMap", "GamePaperMap")
                        .WithMany()
                        .HasForeignKey("GamePaperMapId")
                        .OnDelete(DeleteBehavior.Cascade);

                    b.Navigation("GameMapLayer");

                    b.Navigation("GamePaperMap");
                });

            modelBuilder.Entity("GameMapStorageWebSite.Entities.GameColor", b =>
                {
                    b.HasOne("GameMapStorageWebSite.Entities.Game", "Game")
                        .WithMany("Colors")
                        .HasForeignKey("GameId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("Game");
                });

            modelBuilder.Entity("GameMapStorageWebSite.Entities.GameMap", b =>
                {
                    b.HasOne("GameMapStorageWebSite.Entities.Game", "Game")
                        .WithMany("Maps")
                        .HasForeignKey("GameId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("Game");
                });

            modelBuilder.Entity("GameMapStorageWebSite.Entities.GameMapLayer", b =>
                {
                    b.HasOne("GameMapStorageWebSite.Entities.GameMap", "GameMap")
                        .WithMany("Layers")
                        .HasForeignKey("GameMapId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("GameMap");
                });

            modelBuilder.Entity("GameMapStorageWebSite.Entities.GameMapLocation", b =>
                {
                    b.HasOne("GameMapStorageWebSite.Entities.GameMap", "GameMap")
                        .WithMany("Locations")
                        .HasForeignKey("GameMapId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("GameMap");
                });

            modelBuilder.Entity("GameMapStorageWebSite.Entities.GameMarker", b =>
                {
                    b.HasOne("GameMapStorageWebSite.Entities.Game", "Game")
                        .WithMany("Markers")
                        .HasForeignKey("GameId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("Game");
                });

            modelBuilder.Entity("GameMapStorageWebSite.Entities.GamePaperMap", b =>
                {
                    b.HasOne("GameMapStorageWebSite.Entities.GameMap", "GameMap")
                        .WithMany("PaperMaps")
                        .HasForeignKey("GameMapId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.OwnsMany("GameMapStorageWebSite.Entities.GamePaperMapPage", "Pages", b1 =>
                        {
                            b1.Property<int>("GamePaperMapId")
                                .HasColumnType("INTEGER");

                            b1.Property<int>("Id")
                                .ValueGeneratedOnAdd()
                                .HasColumnType("INTEGER");

                            b1.Property<double>("MapHeight")
                                .HasColumnType("REAL");

                            b1.Property<double>("MapOriginX")
                                .HasColumnType("REAL");

                            b1.Property<double>("MapOriginY")
                                .HasColumnType("REAL");

                            b1.Property<double>("MapWidth")
                                .HasColumnType("REAL");

                            b1.Property<int>("PageNumber")
                                .HasColumnType("INTEGER");

                            b1.Property<double>("PaperOriginX")
                                .HasColumnType("REAL");

                            b1.Property<double>("PaperOriginY")
                                .HasColumnType("REAL");

                            b1.HasKey("GamePaperMapId", "Id");

                            b1.ToTable("GamePaperMap");

                            b1.ToJson("Pages");

                            b1.WithOwner()
                                .HasForeignKey("GamePaperMapId");
                        });

                    b.Navigation("GameMap");

                    b.Navigation("Pages");
                });

            modelBuilder.Entity("GameMapStorageWebSite.Entities.Game", b =>
                {
                    b.Navigation("Colors");

                    b.Navigation("Maps");

                    b.Navigation("Markers");
                });

            modelBuilder.Entity("GameMapStorageWebSite.Entities.GameMap", b =>
                {
                    b.Navigation("Layers");

                    b.Navigation("Locations");

                    b.Navigation("PaperMaps");
                });

            modelBuilder.Entity("GameMapStorageWebSite.Entities.GameMapLayer", b =>
                {
                    b.Navigation("Works");
                });
#pragma warning restore 612, 618
        }
    }
}
