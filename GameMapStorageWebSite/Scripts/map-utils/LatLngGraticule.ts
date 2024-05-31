/// <reference path="../types/leaflet.d.ts" /> 

namespace GameMapUtils {

    export interface LatLngGraticuleInterval  {
        start: number;
        end: number;
        interval: number;
    }

    export interface LatLngGraticuleOptions extends L.LayerOptions {
        font: string;
        fontColor: string;
        color: string;
        opacity: number;
        weight: number;
        latInterval?: LatLngGraticuleInterval[];
        lngInterval?: LatLngGraticuleInterval[];
        zoomInterval?: LatLngGraticuleInterval[];
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
        _currZoom?: number;
        _currLngInterval?: number;
        _currLatInterval?: number;

        constructor(options?: LatLngGraticuleOptions) {
            super(L.extend({
                opacity: 1,
                weight: 0.8,
                color: '#444',
                font: '12px Verdana',
                zoomInterval: [
                    { start: 0, end: 10, interval: 1000 }
                ]
            }, options));

            var defaultFontName = 'Verdana';
            var _ff = this.options.font.split(' ');
            if (_ff.length < 2) {
                this.options.font += ' ' + defaultFontName;
            }

            if (!this.options.fontColor) {
                this.options.fontColor = this.options.color;
            }

            if (this.options.zoomInterval) {
                if (!this.options.latInterval) {
                    this.options.latInterval = this.options.zoomInterval;
                }
                if (!this.options.lngInterval) {
                    this.options.lngInterval = this.options.zoomInterval;
                }
            }
        }

        initialize(options) {
            L.Util.setOptions(this, options);
        }

        onAdd (map: L.Map): this {
            this._map = map;

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

            this.__calcInterval();

            this.__draw(true);
        }

        _onCanvasLoad () {
            this.fire('load');
        }

        _updateOpacity () {
            L.DomUtil.setOpacity(this._canvas, this.options.opacity);
        }

        __format_lat (lat) {
            let str = "00" + (lat / 1000).toFixed();
            return str.substring(str.length - 2);
        }

        __format_lng (lng) {
            let str = "00" + (lng / 1000).toFixed();
            return str.substring(str.length - 2);
        }

        __calcInterval () {
            let zoom = this._map.getZoom();
            if (this._currZoom != zoom) {
                this._currLngInterval = 0;
                this._currLatInterval = 0;
                this._currZoom = zoom;
            }

            let interv;

            if (!this._currLngInterval) {
                try {
                    for (let idx in this.options.lngInterval) {
                        let dict = this.options.lngInterval[idx];
                        if (dict.start <= zoom) {
                            if (dict.end && dict.end >= zoom) {
                                this._currLngInterval = dict.interval;
                                break;
                            }
                        }
                    }
                }
                catch (e) {
                    this._currLngInterval = 0;
                }
            }

            if (!this._currLatInterval) {
                try {
                    for (let idx in this.options.latInterval) {
                        let dict = this.options.latInterval[idx];
                        if (dict.start <= zoom) {
                            if (dict.end && dict.end >= zoom) {
                                this._currLatInterval = dict.interval;
                                break;
                            }
                        }
                    }
                }
                catch (e) {
                    this._currLatInterval = 0;
                }
            }
        }

        __draw (label) {
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

            var self = this,
                canvas = this._canvas,
                map = this._map

            if (L.Browser.canvas && map) {
                if (!this._currLngInterval || !this._currLatInterval) {
                    this.__calcInterval();
                }

                let latInterval = this._currLatInterval,
                    lngInterval = this._currLngInterval;

                let ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.lineWidth = this.options.weight;
                ctx.strokeStyle = this.options.color;
                ctx.fillStyle = this.options.fontColor;

                if (this.options.font) {
                    ctx.font = this.options.font;
                }
                let txtWidth = ctx.measureText('0').width;
                let txtHeight = 12;
                try {
                    let _font_size = ctx.font.split(' ')[0];
                    txtHeight = _parse_px_to_int(_font_size);
                }
                catch (e) { }

                let ww = canvas.width,
                    hh = canvas.height;

                let lt = map.containerPointToLatLng(L.point(0, 0));
                let rt = map.containerPointToLatLng(L.point(ww, 0));
                let rb = map.containerPointToLatLng(L.point(ww, hh));

                let _lat_b = rb.lat,
                    _lat_t = lt.lat;
                let _lon_l = lt.lng,
                    _lon_r = rt.lng;

                let _point_per_lat = (_lat_t - _lat_b) / (hh * 0.2);
                if (isNaN(_point_per_lat)) {
                    return;
                }

                if (_point_per_lat < 1) { _point_per_lat = 1; }
                _lat_b = Math.trunc(_lat_b - _point_per_lat);
                _lat_t = Math.trunc(_lat_t + _point_per_lat);
                var _point_per_lon = (_lon_r - _lon_l) / (ww * 0.2);
                if (_point_per_lon < 1) { _point_per_lon = 1; }
                _lon_r = Math.trunc(_lon_r + _point_per_lon);
                _lon_l = Math.trunc(_lon_l - _point_per_lon);

                var ll, latstr, lngstr;

                function __draw_lat_line(self, lat_tick) {
                    ll = self._latLngToCanvasPoint(L.latLng(lat_tick, _lon_l));
                    latstr = self.__format_lat(lat_tick);
                    txtWidth = ctx.measureText(latstr).width;

                    let __lon_right = _lon_r;
                    let rr = self._latLngToCanvasPoint(L.latLng(lat_tick, __lon_right));

                    /*ctx.beginPath();
                    ctx.moveTo(ll.x + 1, ll.y);
                    ctx.lineTo(rr.x - 1, rr.y);
                    ctx.stroke();*/

                    if (label) {
                        let _yy = ll.y + (txtHeight / 2) - 2;
                        ctx.fillText(latstr, 0, _yy);
                        ctx.fillText(latstr, ww - txtWidth, _yy);
                    }

                };

                if (latInterval > 0) {
                    for (var i = 0; i <= _lat_t; i += latInterval) {
                        if (i >= _lat_b) {
                            __draw_lat_line(this, i);
                        }
                    }
                }

                function __draw_lon_line(self, lon_tick) {
                    lngstr = self.__format_lng(lon_tick);
                    txtWidth = ctx.measureText(lngstr).width;
                    let bb = self._latLngToCanvasPoint(L.latLng(_lat_b, lon_tick));


                    let __lat_top = _lat_t;
                    let tt = self._latLngToCanvasPoint(L.latLng(__lat_top, lon_tick));

                    /*ctx.beginPath();
                    ctx.moveTo(tt.x, tt.y + 1);
                    ctx.lineTo(bb.x, bb.y - 1);
                    ctx.stroke();*/

                    if (label) {
                        ctx.fillText(lngstr, tt.x - (txtWidth / 2), txtHeight + 1);
                        ctx.fillText(lngstr, bb.x - (txtWidth / 2), hh - 3);
                    }

                };

                if (lngInterval > 0) {
                    for (var i = 0; i <= _lon_r; i += lngInterval) {
                        if (i >= _lon_l) {
                            __draw_lon_line(this, i);
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
