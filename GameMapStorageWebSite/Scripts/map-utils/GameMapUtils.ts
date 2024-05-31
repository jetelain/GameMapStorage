/// <reference path="../types/leaflet.d.ts" />
/// <reference path="LatLngGraticule.ts" />
/// <reference path="Overlays.ts" /> 

namespace GameMapUtils {

    export function toCoord (num: number, precision: number) {
        if (precision === undefined || precision > 5) {
            precision = 4;
        }
        if (num <= 0) {
            return '0'.repeat(precision);
        }
        var numText = "00000" + num.toFixed(0);
        return numText.substr(numText.length - 5, precision);
    }

    export function toGrid (latlng: L.LatLng, precision: number, map: L.Map) {
        return GameMapUtils.toCoord(latlng.lng, precision) + " - " + GameMapUtils.toCoord(latlng.lat, precision);
    }

    export function bearing (p1: L.LatLng, p2: L.LatLng, map: L.Map, useMils: boolean = false): number {
        if (useMils) {
            return ((Math.atan2(p2.lng - p1.lng, p2.lat - p1.lat) * 3200 / Math.PI) + 6400) % 6400;
        }
        return ((Math.atan2(p2.lng - p1.lng, p2.lat - p1.lat) * 180 / Math.PI) + 360) % 360;
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

    export function basicInit (mapInfos, mapDivId = 'map') {

        var map = L.map(mapDivId, {
            minZoom: mapInfos.minZoom,
            maxZoom: mapInfos.maxZoom,
            crs: GameMapUtils.CRS(mapInfos.factorx, mapInfos.factory, mapInfos.tileSize),
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
};