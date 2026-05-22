/// <reference path="../Types/leaflet.d.ts" />
/// <reference path="GameMapUtils.ts" />

namespace GameMapUtils {

    export interface LatLngGraticuleOptions extends L.LayerOptions {
        /** The font to use for the graticule labels (default: '12px Verdana') */
        font: string;

        /** The color of the font (default: same as color) */
        fontColor: string;

        /** The color of the graticule lines (default: '#444') */
        color: string;

        /** The opacity of the graticule lines (default: 1) */
        opacity: number;

        /** The weight of the graticule lines (default: 0.8) */
        weight: number;

        /** Whether to draw the graticule lines (default: false) */
        drawLines: boolean;
    }

    function applyComputedDefaults(options?: Partial<LatLngGraticuleOptions>): Partial<LatLngGraticuleOptions> {
        if (!options) {
            return {};
        }
        if (!options.fontColor) {
            // If fontColor is not specified, use the same color as the graticule lines
            options.fontColor = options.color;
        }
        if (options.font && options.font.indexOf(' ') < 0) {
            // If the font option is specified but does not include a font family, add a default font family (e.g., 'Verdana')
            options.font += ' ' + 'Verdana';
        }
        return options;
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

        constructor(options?: Partial<LatLngGraticuleOptions>) {
            super(L.extend({
                opacity: 1,
                weight: 0.8,
                color: '#444',
                fontColor: '#444',
                font: '12px Verdana',
                drawLines: false
            }, applyComputedDefaults(options)));
        }

        /**
         * Called by super constructor to initialize the options. Do not call this method directly.
         * @private
         */
        initialize(options) {
            L.Util.setOptions(this, options);
        }

        /**
         * Update the graticule style. If the graticule is already added to map, it will be redrawn immediately.
         * @param options The options to update
         * @returns
         */
        setStyle(options: Partial<LatLngGraticuleOptions>) {
            L.Util.setOptions(this, applyComputedDefaults(options));
            if (this._container) {
                if (this._map) {
                    this._reset();
                }
                this._updateOpacity();
            }
            return this;
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
            this._grid = undefined;
            map.getPane('overlayPane').removeChild(this._container);
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
            if (this._container) {
                this._updateOpacity();
            }
            return this;
        }

        bringToFront () {
            if (this._container) {
                this._map.getPane('overlayPane').appendChild(this._container);
            }
            return this;
        }

        bringToBack () {
            if (this._container) {
                let pane = this._map.getPane('overlayPane');
                pane.insertBefore(this._container, pane.firstChild);
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

            this.__draw(true, this.options.drawLines);
        }

        _onCanvasLoad () {
            this.fire('load');
        }

        _updateOpacity () {
            L.DomUtil.setOpacity(this._canvas, this.options.opacity);
        }

        __draw(drawLabels: boolean, drawLines: boolean = false) {
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

                if (drawLines) {
                    ctx.beginPath();
                }

                if (latInterval > 0) {
                    for (let lat = latGap; lat <= endLat; lat += latInterval) {
                        if (lat >= startLat && lat <= sizeInMeters) {
                            const left = this._latLngToCanvasPoint(L.latLng(lat, startLng));
                            const right = this._latLngToCanvasPoint(L.latLng(lat, endLng));
                            if (drawLines) {
                                ctx.moveTo(left.x + 1, left.y);
                                ctx.lineTo(right.x - 1, right.y);
                            }
                            if (drawLabels) {
                                const latstr = GameMapUtils.formatCoordinate(lat + grid.options.originY, 2);
                                const txtWidth = ctx.measureText(latstr).width;
                                const _yy = left.y + (txtHeight / 2) - 2;
                                ctx.fillText(latstr, 0, _yy);
                                ctx.fillText(latstr, ww - txtWidth, _yy);
                            }
                        }
                    }
                }

                if (lngInterval > 0) {
                    for (let lng = lngGap; lng <= endLng; lng += lngInterval) {
                        if (lng >= startLng && lng <= sizeInMeters) {
                            const bottom = this._latLngToCanvasPoint(L.latLng(startLat, lng));
                            const top = this._latLngToCanvasPoint(L.latLng(endLat, lng));
                            if (drawLines) {
                                ctx.moveTo(top.x, top.y + 1);
                                ctx.lineTo(bottom.x, bottom.y - 1);
                            }
                            if (drawLabels) {
                                const lngstr = GameMapUtils.formatCoordinate(lng + grid.options.originX, 2);
                                const txtWidth = ctx.measureText(lngstr).width;
                                ctx.fillText(lngstr, top.x - (txtWidth / 2), txtHeight + 1);
                                ctx.fillText(lngstr, bottom.x - (txtWidth / 2), hh - 3);
                            }
                        }
                    }
                }

                if (drawLines) {
                    ctx.stroke();
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
