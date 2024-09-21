/// <reference path="../Types/leaflet.d.ts" />
/// <reference path="LatLngGraticule.ts" />
/// <reference path="Overlays.ts" /> 

namespace GameMapUtils {

    export interface MapWithGrid extends L.Map{
        grid?: MapGrid;
    }

    export function formatCoordinate(num: number, precision: number): string {
        if (precision === undefined || precision > 5) {
            precision = 4;
        }
        if (num == 0) {
            return "0".repeat(precision);
        }
        if (num < 0) {
            return (100000 + (num % 100000)).toFixed(0).padStart(5, "0").substring(0, precision);
        }
        return (num % 100000).toFixed(0).padStart(5, "0").substring(0, precision);
    }


    export interface MapGridOptions {
        sizeInMeters: number;
        originX: number;
        originY: number;
        defaultPrecision: number;
    }

    export class MapGrid {

        options: MapGridOptions;

        constructor(options: MapGridOptions) {
            this.options = options;
        }

        toCoordinates(latlng: L.LatLng, precision?: number) {
            if (!precision) {
                precision = this.options.defaultPrecision;
            }
            return formatCoordinate(latlng.lng + this.options.originX, precision)
                + " - " + formatCoordinate(latlng.lat + this.options.originY, precision);
        }
    }

    export function toGridCoordinates(latlng: L.LatLng, precision: number, map: L.Map): string {
        if ((map as MapWithGrid).grid) {
            return (map as MapWithGrid).grid.toCoordinates(latlng, precision);
        }
        return formatCoordinate(latlng.lng, precision) + " - " + formatCoordinate(latlng.lat, precision);
    }

    export function computeBearingMils (p1: L.LatLng, p2: L.LatLng, map: L.Map): number {
        return ((Math.atan2(p2.lng - p1.lng, p2.lat - p1.lat) * 3200 / Math.PI) + 6400) % 6400;
    }

    export function computeBearingDegrees(p1: L.LatLng, p2: L.LatLng, map: L.Map): number {
        return ((Math.atan2(p2.lng - p1.lng, p2.lat - p1.lat) * 180 / Math.PI) + 360) % 360;
    }

    export function computeAndFormatBearing(p1: L.LatLng, p2: L.LatLng, map: L.Map, useMils: boolean = false): string {
        if (useMils) {
            return computeBearingMils(p1, p2 ,map).toFixed() + ' mil';
        }
        return computeBearingDegrees(p1, p2, map).toFixed(1) + '°';
    }

    export function CRS (factorx: number, factory: number, tileSize: number): L.CRS {
        return L.extend({}, L.CRS.Simple, {
            projection: L.Projection.LonLat,
            transformation: new L.Transformation(factorx, 0, -factory, tileSize),
            scale: function (zoom) {
                return Math.pow(2, zoom);
            },
            zoom: function (scale) {
                return Math.log(scale) / Math.LN2;
            },
            distance: function (latlng1, latlng2) {
                var dx = latlng2.lng - latlng1.lng,
                    dy = latlng2.lat - latlng1.lat;
                return Math.sqrt(dx * dx + dy * dy);
            },
            infinite: true
        });
    }

    export interface LayerDisplayOptions {
        minZoom: number;
        maxZoom: number;
        factorX: number;
        factorY: number;
        tileSize: number;
        attribution: string;
        tilePattern: string;
        defaultPosition: [number, number];
        defaultZoom: number;
        originX?: number;
        originY?: number;
        sizeInMeters?: number;
        isSvg?: boolean;
        bounds?: [[number, number], [number, number]];
    }

    export function basicInit(mapInfos: LayerDisplayOptions, mapDivId: string | HTMLElement = 'map'): MapWithGrid {

        var map = L.map(mapDivId, {
            minZoom: mapInfos.minZoom,
            maxZoom: mapInfos.isSvg ? mapInfos.maxZoom + 3 : mapInfos.maxZoom + 1,
            crs: GameMapUtils.CRS(mapInfos.factorX, mapInfos.factorY, mapInfos.tileSize),
            zoomDelta: 0.5,
            zoomSnap: 0.25,
            zoomAnimation: !mapInfos.isSvg
        }) as MapWithGrid;

        map.grid = new MapGrid({
            sizeInMeters: mapInfos.sizeInMeters || (mapInfos.tileSize / mapInfos.factorX),
            originX: mapInfos.originX || 0,
            originY: mapInfos.originY || 0,
            defaultPrecision: 4
        });

        L.tileLayer(mapInfos.tilePattern, {
            attribution: mapInfos.attribution,
            tileSize: mapInfos.tileSize,
            maxNativeZoom: mapInfos.maxZoom
        }).addTo(map);

        if (mapInfos.bounds) {
            map.fitBounds(mapInfos.bounds);
        }
        else {
            map.setView(mapInfos.defaultPosition, mapInfos.defaultZoom);
        }

        GameMapUtils.latlngGraticule().addTo(map);

        L.control.scale({ maxWidth: 200, imperial: false }).addTo(map);

        GameMapUtils.gridMousePosition().addTo(map);

        return map;
    }

    export async function basicInitFromAPI(gameName: string, mapName: string, mapDivId: string | HTMLElement = 'map', apiBasePath: string = "https://atlas.plan-ops.fr/"): Promise<L.Map | null> {

        const client = new ApiClient(apiBasePath);

        const map = await client.getMap(gameName, mapName);

        if (map == null) {
            return null;
        }

        const layer = map.layers.find(l => l.isDefault);

        return basicInit({
            minZoom: layer.minZoom,
            maxZoom: layer.maxZoom,
            factorX: layer.factorX,
            factorY: layer.factorY,
            tileSize: layer.tileSize,
            attribution: map.appendAttribution,
            tilePattern: layer.pattern,
            defaultPosition: [map.sizeInMeters / 2, map.sizeInMeters / 2],
            defaultZoom: 2,
            originX: map.originX,
            originY: map.originY,
            sizeInMeters: map.sizeInMeters,
            isSvg: layer.format == 'SvgOnly' || layer.format == 'SvgAndWebp'
        }, mapDivId);
    }

    const delay = ms => new Promise(res => setTimeout(res, ms));

    export class ApiClient {
        _apiBasePath;
        _failOverApiBasePath;

        constructor(apiBasePath = "https://atlas.plan-ops.fr/", failOverApiBasePath ="https://de.atlas.plan-ops.fr/") {
            this._apiBasePath = apiBasePath;
            this._failOverApiBasePath = failOverApiBasePath;
        }

        async _retryFetch(path: string, attempt): Promise<any> {
            await delay(500 + (Math.random() * 1000));
            return await this._fetch(path, attempt + 1);
        }

        async _fetch(path: string, attempt: number = 0): Promise<any> {
            let response;
            try {
                if (attempt < 5) {
                    response = await fetch(this._apiBasePath + path);
                }
                else {
                    response = await fetch(this._failOverApiBasePath + path);
                }
                if (response.status == 404) {
                    return null;
                }
                if (response.status == 200) {
                    return await response.json();
                }
            }
            catch(e) {
                if (attempt < 10) {
                    return await this._retryFetch(path, attempt + 1);
                } else {
                    throw e;
                }
            }
            if (response) {
                if (response.status == 429 && attempt < 10) {
                    return await this._retryFetch(path, attempt + 1);
                }
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            throw new Error();
        }

        async getGames(): Promise<GameJsonBase[]> {
            return await this._fetch("api/v1/games") as GameJsonBase[];
        }

        async getGame(gameNameOrId: string | number): Promise<GameJson | null> {
            return await this._fetch(`api/v1/games/${encodeURIComponent(gameNameOrId)}`) as (GameJson | null);
        }

        async getMaps(gameNameOrId: string | number): Promise<GameMapJsonBase[]> {
            return await this._fetch(`api/v1/games/${encodeURIComponent(gameNameOrId)}/maps`) as GameMapJsonBase[];
        }

        async getMap(gameNameOrId: string | number, mapNameOrId: string | number): Promise<GameMapJson | null> {
            return await this._fetch(`api/v1/games/${encodeURIComponent(gameNameOrId)}/maps/${encodeURIComponent(mapNameOrId)}`) as (GameMapJson | null);
        }
    }

    export interface GameJsonBase {
        gameId?: number;
        englishTitle?: string | undefined;
        name?: string | undefined;
        attribution?: string | undefined;
        officialSiteUri?: string | undefined;
        steamAppId?: string | undefined;
        lastChangeUtc?: Date | undefined;
        logo?: string | undefined;
        logoWebp?: string | undefined;
        logoPng?: string | undefined;
    }

    export interface GameJson extends GameJsonBase {
        colors?: GameColorJson[] | undefined;
        markers?: GameMarkerJson[] | undefined;
    }

    export interface GameColorJson {
        gameColorId?: number;
        englishTitle?: string | undefined;
        name?: string | undefined;
        hexadecimal?: string | undefined;
        usage?: ColorUsage;
        contrastHexadecimal?: ColorUsage;
    }

    export type ColorUsage = "Custom" | "FriendSide" | "NeutralSide" | "HostileSide" | "UnknownSide" | "CivilianSide";

    export interface GameMarkerJson {
        gameMarkerId?: number;
        englishTitle?: string | undefined;
        name?: string | undefined;
        usage?: MarkerUsage;
        imagePng?: string | undefined;
        imageWebp?: string | undefined;
        isColorCompatible?: boolean;
        imageLastChangeUtc?: Date | undefined;
        milSymbolEquivalent?: string | undefined;
        steamWorkshopId?: string | undefined;
    }

    export type MarkerUsage = "Custom";

    export interface GameMapJsonBase {
        gameMapId?: number;
        englishTitle?: string | undefined;
        appendAttribution?: string | undefined;
        steamWorkshopId?: string | undefined;
        officialSiteUri?: string | undefined;
        sizeInMeters?: number;
        name?: string | undefined;
        aliases?: string[] | undefined;
        thumbnail?: string | undefined;
        thumbnailWebp?: string | undefined;
        thumbnailPng?: string | undefined;
        lastChangeUtc?: Date | undefined;
        originX?: number;
        originY?: number;
        layers?: GameMapLayerJson[] | undefined;
    }

    export interface GameMapLayerJson {
        gameMapLayerId?: number;
        type?: LayerType;
        format?: LayerFormat;
        minZoom?: number;
        maxZoom?: number;
        defaultZoom?: number;
        isDefault?: boolean;
        tileSize?: number;
        factorX?: number;
        factorY?: number;
        culture?: string | undefined;
        lastChangeUtc?: Date | undefined;
        dataLastChangeUtc?: Date | undefined;
        gameMapLayerGuid?: string | undefined;
        downloadUri?: string | undefined;
        patternPng?: string | undefined;
        patternWebp?: string | undefined;
        pattern?: string | undefined;
    }

    export type LayerType = "Topographic" | "Satellite" | "Aerial" | "Elevation";

    export type LayerFormat = "PngOnly" | "PngAndWebp" | "SvgOnly" | "SvgAndWebp" | "WebpOnly" | "SinglePDF" | "BookletPDF";

    export interface GameMapJson extends GameMapJsonBase {
        attribution?: string | undefined;
        locations?: GameMapLocationJson[] | undefined;
    }

    export interface GameMapLocationJson {
        gameMapLocationId?: number;
        englishTitle?: string | undefined;
        type?: LocationType;
        x?: number;
        y?: number;
        gameMapLocationGuid?: string | undefined;
    }

    export type LocationType = "City";
};