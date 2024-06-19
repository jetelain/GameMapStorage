/// <reference path="../Types/leaflet.d.ts" />
/// <reference path="GameMapUtils.ts" />

namespace GameMapUtils {

    export interface LatLngGraticuleOptions extends L.LayerOptions {
        font: string;
        fontColor: string;
        color: string;
        opacity: number;
        weight: number;
    }

    /**
     *  Create a Canvas as ImageOverlay to draw the Lat/Lon Graticule,
     *  and show the axis tick label on the edge of the map.
     *  Intitial version author: lanwei@cloudybay.com.tw
     */
    export class LatLngGraticule extends L.Layer
    {
        options: LatLngGraticuleOptions;
        _container: HTMLDivElement;
        _canvas: HTMLCanvasElement;
        _grid?: GameMapUtils.MapGrid;

        constructor(options?: LatLngGraticuleOptions) {
            super(L.extend({
                opacity: 1,
                weight: 0.8,
                color: '#444',
                font: '12px Verdana'
            }, options));

            var defaultFontName = 'Verdana';
            var _ff = this.options.font.split(' ');
            if (_ff.length < 2) {
                this.options.font += ' ' + defaultFontName;
            }
            if (!this.options.fontColor) {
                this.options.fontColor = this.options.color;
            }
        }

        initialize(options) {
            L.Util.setOptions(this, options);
        }

        onAdd (map: L.Map): this {
            this._map = map;
            this._grid = (map as GameMapUtils.MapWithGrid).grid;
            if (!this._grid) {
                this._grid = new GameMapUtils.MapGrid({ originX: 0, originY: 0, defaultPrecision: 4, sizeInMeters: 1000000 });
            }

            if (!this._container) {
                this._initCanvas();
            }

            map.getPane('overlayPane').appendChild(this._container);

            map.on('viewreset', this._reset, this);
            map.on('move', this._reset, this);
            map.on('moveend', this._reset, this);

            this._reset();
            return this;
        }

        onRemove(map: L.Map): this {
            this._grid = null;
            map.getPanes().overlayPane.removeChild(this._container);
            map.off('viewreset', this._reset, this);
            map.off('move', this._reset, this);
            map.off('moveend', this._reset, this);
            return this;
        }

        addTo (map) {
            map.addLayer(this);
            return this;
        }

        setOpacity (opacity) {
            this.options.opacity = opacity;
            this._updateOpacity();
            return this;
        }

        bringToFront () {
            if (this._canvas) {
                this._map.getPane('overlayPane').appendChild(this._canvas);
            }
            return this;
        }

        bringToBack () {
            var pane = this._map.getPane('overlayPane');
            if (this._canvas) {
                pane.insertBefore(this._canvas, pane.firstChild);
            }
            return this;
        }

        getAttribution () {
            return this.options.attribution;
        }

        _initCanvas () {
            this._container = L.DomUtil.create('div', 'leaflet-image-layer');

            this._canvas = L.DomUtil.create('canvas', '');

            if (this._map.options.zoomAnimation && L.Browser.any3d) {
                L.DomUtil.addClass(this._canvas, 'leaflet-zoom-animated');
            } else {
                L.DomUtil.addClass(this._canvas, 'leaflet-zoom-hide');
            }

            this._updateOpacity();

            this._container.appendChild(this._canvas);

            L.extend(this._canvas, {
                onselectstart: L.Util.falseFn,
                onmousemove: L.Util.falseFn,
                onload: L.bind(this._onCanvasLoad, this)
            });
        }

        _reset () {
            let container = this._container,
                canvas = this._canvas,
                size = this._map.getSize(),
                lt = this._map.containerPointToLayerPoint([0, 0]);

            L.DomUtil.setPosition(container, lt);

            container.style.width = size.x + 'px';
            container.style.height = size.y + 'px';

            canvas.width = size.x;
            canvas.height = size.y;
            canvas.style.width = size.x + 'px';
            canvas.style.height = size.y + 'px';

            this.__draw(true);
        }

        _onCanvasLoad () {
            this.fire('load');
        }

        _updateOpacity () {
            L.DomUtil.setOpacity(this._canvas, this.options.opacity);
        }

        __draw(label: boolean) {
            function _parse_px_to_int(txt) {
                if (txt.length > 2) {
                    if (txt.charAt(txt.length - 2) == 'p') {
                        txt = txt.substr(0, txt.length - 2);
                    }
                }
                try {
                    return parseInt(txt, 10);
                }
                catch (e) { }
                return 0;
            };

            const canvas = this._canvas,
                map = this._map,
                grid = this._grid;

            if (L.Browser.canvas && map) {
                const latInterval = 1000,
                    lngInterval = 1000,
                    ww = canvas.width,
                    hh = canvas.height,
                    originX = grid.options.originX,
                    originY = grid.options.originY,
                    sizeInMeters = grid.options.sizeInMeters;

                const latGap = (-originY) % latInterval,
                      lngGap = (-originX) % lngInterval;

                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, ww, hh);
                ctx.lineWidth = this.options.weight;
                ctx.strokeStyle = this.options.color;
                ctx.fillStyle = this.options.fontColor;
                if (this.options.font) {
                    ctx.font = this.options.font;
                }
                let txtHeight = 12;
                try {
                    let _font_size = ctx.font.split(' ')[0];
                    txtHeight = _parse_px_to_int(_font_size);
                }
                catch (e) { }

                const lt = map.containerPointToLatLng(L.point(0, 0));
                const rt = map.containerPointToLatLng(L.point(ww, 0));
                const rb = map.containerPointToLatLng(L.point(ww, hh));

                let startLat = rb.lat,
                    endLat = lt.lat;

                let startLng = lt.lng,
                    endLng = rt.lng;

                const pointPerLat = Math.max(1, (endLat - startLat) / (hh * 0.2));
                if (isNaN(pointPerLat)) {
                    return;
                }
                startLat = Math.trunc(startLat - pointPerLat);
                endLat = Math.trunc(endLat + pointPerLat);

                const pointPerLon = Math.max(1, (endLng - startLng) / (ww * 0.2));
                endLng = Math.trunc(endLng + pointPerLon);
                startLng = Math.trunc(startLng - pointPerLon);

                function drawLatLine(self: LatLngGraticule, lat_tick: number) {

                    const left = self._latLngToCanvasPoint(L.latLng(lat_tick, startLng));
                    const right = self._latLngToCanvasPoint(L.latLng(lat_tick, endLng));

                    const latstr = GameMapUtils.formatCoordinate(lat_tick + grid.options.originY, 2);
                    const txtWidth = ctx.measureText(latstr).width;

                    //ctx.beginPath();
                    //ctx.moveTo(left.x + 1, left.y);
                    //ctx.lineTo(right.x - 1, right.y);
                    //ctx.stroke();

                    if (label) {
                        const _yy = left.y + (txtHeight / 2) - 2;
                        ctx.fillText(latstr, 0, _yy);
                        ctx.fillText(latstr, ww - txtWidth, _yy);
                    }
                };

                if (latInterval > 0) {
                    for (let lat = latGap; lat <= endLat; lat += latInterval) {
                        if (lat >= startLat && lat <= sizeInMeters) {
                            drawLatLine(this, lat);
                        }
                    }
                }

                function drawLngLine(self: LatLngGraticule, lon_tick: number) {
                    const bottom = self._latLngToCanvasPoint(L.latLng(startLat, lon_tick));
                    const top = self._latLngToCanvasPoint(L.latLng(endLat, lon_tick));

                    const lngstr = GameMapUtils.formatCoordinate(lon_tick + grid.options.originX, 2);
                    const txtWidth = ctx.measureText(lngstr).width;

                    //ctx.beginPath();
                    //ctx.moveTo(top.x, top.y + 1);
                    //ctx.lineTo(bottom.x, bottom.y - 1);
                    //ctx.stroke();

                    if (label) {
                        ctx.fillText(lngstr, top.x - (txtWidth / 2), txtHeight + 1);
                        ctx.fillText(lngstr, bottom.x - (txtWidth / 2), hh - 3);
                    }

                };

                if (lngInterval > 0) {
                    for (let lng = lngGap; lng <= endLng; lng += lngInterval) {
                        if (lng >= startLng && lng <= sizeInMeters) {
                            drawLngLine(this, lng);
                        }
                    }
                }
            }
        }

        _latLngToCanvasPoint (latlng) {
            let map = this._map;
            var projectedPoint = map.project(L.latLng(latlng));
            projectedPoint._subtract(map.getPixelOrigin());
            return L.point(projectedPoint).add(map._getMapPanePos());
        }

    }

    export function latlngGraticule(options?: LatLngGraticuleOptions): LatLngGraticule{
        return new GameMapUtils.LatLngGraticule(options);
    };

}
