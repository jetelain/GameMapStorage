/// <reference path="../types/leaflet.d.ts" />
/// <reference path="LatLngGraticule.ts" />
/// <reference path="Overlays.ts" /> 

namespace GameMapUtils {

    export function toCoord(num: number, precision: number): string {
        if (precision === undefined || precision > 5) {
            precision = 4;
        }
        if (num == 0) {
            return "0".repeat(precision);
        }
        if (num < 0) {
            return (100000 + (num % 100000)).toFixed(0).padStart(5, "0").substring(5 - precision);
        }
        return (num % 100000).toFixed(0).padStart(5, "0").substring(5 - precision);
    }

    export function toGrid (latlng: L.LatLng, precision: number, map: L.Map): string {
        return GameMapUtils.toCoord(latlng.lng, precision) + " - " + GameMapUtils.toCoord(latlng.lat, precision);
    }

    export function bearing (p1: L.LatLng, p2: L.LatLng, map: L.Map, useMils: boolean = false): number {
        if (useMils) {
            return ((Math.atan2(p2.lng - p1.lng, p2.lat - p1.lat) * 3200 / Math.PI) + 6400) % 6400;
        }
        return ((Math.atan2(p2.lng - p1.lng, p2.lat - p1.lat) * 180 / Math.PI) + 360) % 360;
    }

    export function bearingWithUnit(p1: L.LatLng, p2: L.LatLng, map: L.Map, useMils: boolean = false): string {
        if (useMils) {
            return (((Math.atan2(p2.lng - p1.lng, p2.lat - p1.lat) * 3200 / Math.PI) + 6400) % 6400).toFixed() + ' mil';
        }
        return (((Math.atan2(p2.lng - p1.lng, p2.lat - p1.lat) * 180 / Math.PI) + 360) % 360).toFixed(1) + '°';
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
    }

    export function basicInit(mapInfos: LayerDisplayOptions, mapDivId: string | HTMLElement = 'map'): L.Map {

        var map = L.map(mapDivId, {
            minZoom: mapInfos.minZoom,
            maxZoom: mapInfos.maxZoom,
            crs: GameMapUtils.CRS(mapInfos.factorX, mapInfos.factorY, mapInfos.tileSize),
            zoomDelta: 0.5,
            zoomSnap: 0.25
        });

        L.tileLayer(mapInfos.tilePattern, {
            attribution: mapInfos.attribution,
            tileSize: mapInfos.tileSize
        }).addTo(map);

        map.setView(mapInfos.defaultPosition, mapInfos.defaultZoom);

        GameMapUtils.latlngGraticule().addTo(map);

        L.control.scale({ maxWidth: 200, imperial: false }).addTo(map);

        GameMapUtils.gridMousePosition().addTo(map);

        return map;
    }

    interface APILayerResponse {
        isDefault: boolean;
        tileSize: number;
        factorX: number;
        factorY: number;
        minZoom: number;
        maxZoom: number;
        pattern: string;
    }

    interface APIMapResponse {
        appendAttribution: string;
        sizeInMeters: number;
        layers: APILayerResponse[];
    }

    export async function basicInitFromAPI(gameName: string, mapName: string, mapDivId: string | HTMLElement = 'map', apiBasePath: string = "https://atlas.plan-ops.fr/api/v1/"): Promise<L.Map> {

        const response = await fetch(`${apiBasePath}games/${encodeURIComponent(gameName)}/maps/${encodeURIComponent(mapName)}`);

        const map = await response.json() as APIMapResponse;

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
            defaultZoom: 2
        }, mapDivId);
    }

};