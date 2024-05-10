/**
 *  Create a Canvas as ImageOverlay to draw the Lat/Lon Graticule,
 *  and show the axis tick label on the edge of the map.
 *  Author: lanwei@cloudybay.com.tw
 */

(function (window, document, undefined) {

    L.LatLngGraticule = L.Layer.extend({
        includes: L.Evented.prototype,

        options: {
            opacity: 1,
            weight: 0.8,
            color: '#444',
            font: '12px Verdana',
            zoomInterval: [
                { start: 0, end: 10, interval: 1000 }
            ]
        },

        initialize: function (options) {
            L.setOptions(this, options);

            var defaultFontName = 'Verdana';
            var _ff = this.options.font.split(' ');
            if (_ff.length < 2) {
                this.options.font += ' ' + defaultFontName;
            }

            if (!this.options.fontColor) {
                this.options.fontColor = this.options.color;
            }

            if (this.options.zoomInterval) {
                if (this.options.zoomInterval.latitude) {
                    this.options.latInterval = this.options.zoomInterval.latitude;
                    if (!this.options.zoomInterval.longitude) {
                        this.options.lngInterval = this.options.zoomInterval.latitude;
                    }
                }
                if (this.options.zoomInterval.longitude) {
                    this.options.lngInterval = this.options.zoomInterval.longitude;
                    if (!this.options.zoomInterval.latitude) {
                        this.options.latInterval = this.options.zoomInterval.longitude;
                    }
                }
                if (!this.options.latInterval) {
                    this.options.latInterval = this.options.zoomInterval;
                }
                if (!this.options.lngInterval) {
                    this.options.lngInterval = this.options.zoomInterval;
                }
            }
        },

        onAdd: function (map) {
            this._map = map;

            if (!this._container) {
                this._initCanvas();
            }

            map._panes.overlayPane.appendChild(this._container);

            map.on('viewreset', this._reset, this);
            map.on('move', this._reset, this);
            map.on('moveend', this._reset, this);

            this._reset();
        },

        onRemove: function (map) {
            map.getPanes().overlayPane.removeChild(this._container);

            map.off('viewreset', this._reset, this);
            map.off('move', this._reset, this);
            map.off('moveend', this._reset, this);
        },

        addTo: function (map) {
            map.addLayer(this);
            return this;
        },

        setOpacity: function (opacity) {
            this.options.opacity = opacity;
            this._updateOpacity();
            return this;
        },

        bringToFront: function () {
            if (this._canvas) {
                this._map._panes.overlayPane.appendChild(this._canvas);
            }
            return this;
        },

        bringToBack: function () {
            var pane = this._map._panes.overlayPane;
            if (this._canvas) {
                pane.insertBefore(this._canvas, pane.firstChild);
            }
            return this;
        },

        getAttribution: function () {
            return this.options.attribution;
        },

        _initCanvas: function () {
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
        },

        _reset: function () {
            var container = this._container,
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
        },

        _onCanvasLoad: function () {
            this.fire('load');
        },

        _updateOpacity: function () {
            L.DomUtil.setOpacity(this._canvas, this.options.opacity);
        },

        __format_lat: function (lat) {
            var str = "00" + (lat / 1000).toFixed();
            return str.substring(str.length - 2);
        },

        __format_lng: function (lng) {
            var str = "00" + (lng / 1000).toFixed();
            return str.substring(str.length - 2);
        },

        __calcInterval: function () {
            var zoom = this._map.getZoom();
            if (this._currZoom != zoom) {
                this._currLngInterval = 0;
                this._currLatInterval = 0;
                this._currZoom = zoom;
            }

            var interv;

            if (!this._currLngInterval) {
                try {
                    for (var idx in this.options.lngInterval) {
                        var dict = this.options.lngInterval[idx];
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
                    for (var idx in this.options.latInterval) {
                        var dict = this.options.latInterval[idx];
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
        },

        __draw: function (label) {
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

                var latInterval = this._currLatInterval,
                    lngInterval = this._currLngInterval;

                var ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.lineWidth = this.options.weight;
                ctx.strokeStyle = this.options.color;
                ctx.fillStyle = this.options.fontColor;

                if (this.options.font) {
                    ctx.font = this.options.font;
                }
                var txtWidth = ctx.measureText('0').width;
                var txtHeight = 12;
                try {
                    var _font_size = ctx.font.split(' ')[0];
                    txtHeight = _parse_px_to_int(_font_size);
                }
                catch (e) { }

                var ww = canvas.width,
                    hh = canvas.height;

                var lt = map.containerPointToLatLng(L.point(0, 0));
                var rt = map.containerPointToLatLng(L.point(ww, 0));
                var rb = map.containerPointToLatLng(L.point(ww, hh));

                var _lat_b = rb.lat,
                    _lat_t = lt.lat;
                var _lon_l = lt.lng,
                    _lon_r = rt.lng;

                var _point_per_lat = (_lat_t - _lat_b) / (hh * 0.2);
                if (isNaN(_point_per_lat)) {
                    return;
                }

                if (_point_per_lat < 1) { _point_per_lat = 1; }
                _lat_b = parseInt(_lat_b - _point_per_lat, 10);
                _lat_t = parseInt(_lat_t + _point_per_lat, 10);
                var _point_per_lon = (_lon_r - _lon_l) / (ww * 0.2);
                if (_point_per_lon < 1) { _point_per_lon = 1; }
                _lon_r = parseInt(_lon_r + _point_per_lon, 10);
                _lon_l = parseInt(_lon_l - _point_per_lon, 10);

                var ll, latstr, lngstr;

                function __draw_lat_line(self, lat_tick) {
                    ll = self._latLngToCanvasPoint(L.latLng(lat_tick, _lon_l));
                    latstr = self.__format_lat(lat_tick);
                    txtWidth = ctx.measureText(latstr).width;

                    var __lon_right = _lon_r;
                    var rr = self._latLngToCanvasPoint(L.latLng(lat_tick, __lon_right));

                    /*ctx.beginPath();
                    ctx.moveTo(ll.x + 1, ll.y);
                    ctx.lineTo(rr.x - 1, rr.y);
                    ctx.stroke();*/

                    if (label) {
                        var _yy = ll.y + (txtHeight / 2) - 2;
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
                    var bb = self._latLngToCanvasPoint(L.latLng(_lat_b, lon_tick));


                    var __lat_top = _lat_t;
                    var tt = self._latLngToCanvasPoint(L.latLng(__lat_top, lon_tick));

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
        },

        _latLngToCanvasPoint: function (latlng) {
            map = this._map;
            var projectedPoint = map.project(L.latLng(latlng));
            projectedPoint._subtract(map.getPixelOrigin());
            return L.point(projectedPoint).add(map._getMapPanePos());
        }

    });

    L.latlngGraticule = function (options) {
        return new L.LatLngGraticule(options);
    };


}(this, document));

/**
 * Author: jetelain
 */
var GameMapUtils = {

    toCoord: function (num, precision) {
        if (precision === undefined || precision > 5) {
            precision = 4;
        }
        if (num <= 0) {
            return '0'.repeat(precision);
        }
        var numText = "00000" + num.toFixed(0);
        return numText.substr(numText.length - 5, precision);
    },

    toGrid: function (latlng, precision, map) {
        return GameMapUtils.toCoord(latlng.lng, precision) + " - " + GameMapUtils.toCoord(latlng.lat, precision);
    },

    bearing: function (p1, p2, map, useMils = false) {
        if (useMils) {
            return ((Math.atan2(p2.lng - p1.lng, p2.lat - p1.lat) * 3200 / Math.PI) + 6400) % 6400;
        }
        return ((Math.atan2(p2.lng - p1.lng, p2.lat - p1.lat) * 180 / Math.PI) + 360) % 360;
    },

    CRS: function (factorx, factory, tileSize) {
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
    },

    basicInit: function (mapInfos, mapDivId = 'map') {

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

        L.latlngGraticule().addTo(map);

        L.control.scale({ maxWidth: 200, imperial: false }).addTo(map);

        L.control.gridMousePosition().addTo(map);

        return map;
    },

    //

    addCoordinateScaleToMap: function (map, mapInfos) {

        // Apparent size
        const widthInMeters = 1500;
        const heightInMeters = 1500;

        // Apparent size
        const halfWidthInMeters = widthInMeters / 2;
        const halfHeightInMeters = heightInMeters / 2;

        // CoordinateScale itself
        var svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svgElement.setAttribute('xmlns', "http://www.w3.org/2000/svg");
        svgElement.setAttribute('viewBox', "0 0 150 150");
        svgElement.innerHTML = '<style>.cdscs0{fill: none;stroke: #000000FF;stroke-width: 0.2;}.cdscs1{fill: none;stroke: #000000FF;stroke-width: 0.1;}.cdscs2{font: 5px Arial;fill: #000000FF;text-anchor: middle;}.cdscs3{font: 5px Arial;fill: #000000FF;dominant-baseline: middle;}.cdscs4{fill: none;stroke: #80808080;stroke-width: 1;}</style><rect x="0.5" y="0.5" width="149" height="149" rx="5.5" class="cdscs4" /><style>.cdscs5{fill: #F1F1F140;stroke: #000000FF;stroke-width: 0.2;}</style><rect x="1" y="1" width="148" height="148" rx="5" class="cdscs5" /><path class="cdscs0" d="M125,1 l0,148" /><path class="cdscs0" d="M25,1 l0,148" /><path class="cdscs0" d="M1,125 l148,0" /><path class="cdscs0" d="M1,25 l148,0" /><path class="cdscs0" d="M26,21 l0,4" /><path class="cdscs0" d="M125,26 l4,0" /><path class="cdscs0" d="M27,17 l0,8" /><path class="cdscs0" d="M125,27 l8,0" /><path class="cdscs0" d="M28,21 l0,4" /><path class="cdscs0" d="M125,28 l4,0" /><path class="cdscs0" d="M29,17 l0,8" /><path class="cdscs0" d="M125,29 l8,0" /><path class="cdscs0" d="M30,21 l0,4" /><path class="cdscs0" d="M125,30 l4,0" /><path class="cdscs0" d="M31,17 l0,8" /><path class="cdscs0" d="M125,31 l8,0" /><path class="cdscs0" d="M32,21 l0,4" /><path class="cdscs0" d="M125,32 l4,0" /><path class="cdscs0" d="M33,17 l0,8" /><path class="cdscs0" d="M125,33 l8,0" /><path class="cdscs0" d="M34,21 l0,4" /><path class="cdscs0" d="M125,34 l4,0" /><path class="cdscs0" d="M35,13 l0,112" /><path class="cdscs0" d="M25,35 l112,0" /><text class="cdscs2" x="35" y="11">9</text><text class="cdscs3" x="139" y="35">1</text><path class="cdscs0" d="M36,21 l0,4" /><path class="cdscs0" d="M125,36 l4,0" /><path class="cdscs0" d="M37,17 l0,8" /><path class="cdscs0" d="M125,37 l8,0" /><path class="cdscs0" d="M38,21 l0,4" /><path class="cdscs0" d="M125,38 l4,0" /><path class="cdscs0" d="M39,17 l0,8" /><path class="cdscs0" d="M125,39 l8,0" /><path class="cdscs0" d="M40,21 l0,4" /><path class="cdscs0" d="M125,40 l4,0" /><path class="cdscs0" d="M41,17 l0,8" /><path class="cdscs0" d="M125,41 l8,0" /><path class="cdscs0" d="M42,21 l0,4" /><path class="cdscs0" d="M125,42 l4,0" /><path class="cdscs0" d="M43,17 l0,8" /><path class="cdscs0" d="M125,43 l8,0" /><path class="cdscs0" d="M44,21 l0,4" /><path class="cdscs0" d="M125,44 l4,0" /><path class="cdscs0" d="M45,13 l0,112" /><path class="cdscs0" d="M25,45 l112,0" /><text class="cdscs2" x="45" y="11">8</text><text class="cdscs3" x="139" y="45">2</text><path class="cdscs0" d="M46,21 l0,4" /><path class="cdscs0" d="M125,46 l4,0" /><path class="cdscs0" d="M47,17 l0,8" /><path class="cdscs0" d="M125,47 l8,0" /><path class="cdscs0" d="M48,21 l0,4" /><path class="cdscs0" d="M125,48 l4,0" /><path class="cdscs0" d="M49,17 l0,8" /><path class="cdscs0" d="M125,49 l8,0" /><path class="cdscs0" d="M50,21 l0,4" /><path class="cdscs0" d="M125,50 l4,0" /><path class="cdscs0" d="M51,17 l0,8" /><path class="cdscs0" d="M125,51 l8,0" /><path class="cdscs0" d="M52,21 l0,4" /><path class="cdscs0" d="M125,52 l4,0" /><path class="cdscs0" d="M53,17 l0,8" /><path class="cdscs0" d="M125,53 l8,0" /><path class="cdscs0" d="M54,21 l0,4" /><path class="cdscs0" d="M125,54 l4,0" /><path class="cdscs0" d="M55,13 l0,112" /><path class="cdscs0" d="M25,55 l112,0" /><text class="cdscs2" x="55" y="11">7</text><text class="cdscs3" x="139" y="55">3</text><path class="cdscs0" d="M56,21 l0,4" /><path class="cdscs0" d="M125,56 l4,0" /><path class="cdscs0" d="M57,17 l0,8" /><path class="cdscs0" d="M125,57 l8,0" /><path class="cdscs0" d="M58,21 l0,4" /><path class="cdscs0" d="M125,58 l4,0" /><path class="cdscs0" d="M59,17 l0,8" /><path class="cdscs0" d="M125,59 l8,0" /><path class="cdscs0" d="M60,21 l0,4" /><path class="cdscs0" d="M125,60 l4,0" /><path class="cdscs0" d="M61,17 l0,8" /><path class="cdscs0" d="M125,61 l8,0" /><path class="cdscs0" d="M62,21 l0,4" /><path class="cdscs0" d="M125,62 l4,0" /><path class="cdscs0" d="M63,17 l0,8" /><path class="cdscs0" d="M125,63 l8,0" /><path class="cdscs0" d="M64,21 l0,4" /><path class="cdscs0" d="M125,64 l4,0" /><path class="cdscs0" d="M65,13 l0,112" /><path class="cdscs0" d="M25,65 l112,0" /><text class="cdscs2" x="65" y="11">6</text><text class="cdscs3" x="139" y="65">4</text><path class="cdscs0" d="M66,21 l0,4" /><path class="cdscs0" d="M125,66 l4,0" /><path class="cdscs0" d="M67,17 l0,8" /><path class="cdscs0" d="M125,67 l8,0" /><path class="cdscs0" d="M68,21 l0,4" /><path class="cdscs0" d="M125,68 l4,0" /><path class="cdscs0" d="M69,17 l0,8" /><path class="cdscs0" d="M125,69 l8,0" /><path class="cdscs0" d="M70,21 l0,4" /><path class="cdscs0" d="M125,70 l4,0" /><path class="cdscs0" d="M71,17 l0,8" /><path class="cdscs0" d="M125,71 l8,0" /><path class="cdscs0" d="M72,21 l0,4" /><path class="cdscs0" d="M125,72 l4,0" /><path class="cdscs0" d="M73,17 l0,8" /><path class="cdscs0" d="M125,73 l8,0" /><path class="cdscs0" d="M74,21 l0,4" /><path class="cdscs0" d="M125,74 l4,0" /><path class="cdscs0" d="M75,13 l0,112" /><path class="cdscs0" d="M25,75 l112,0" /><text class="cdscs2" x="75" y="11">5</text><text class="cdscs3" x="139" y="75">5</text><path class="cdscs0" d="M76,21 l0,4" /><path class="cdscs0" d="M125,76 l4,0" /><path class="cdscs0" d="M77,17 l0,8" /><path class="cdscs0" d="M125,77 l8,0" /><path class="cdscs0" d="M78,21 l0,4" /><path class="cdscs0" d="M125,78 l4,0" /><path class="cdscs0" d="M79,17 l0,8" /><path class="cdscs0" d="M125,79 l8,0" /><path class="cdscs0" d="M80,21 l0,4" /><path class="cdscs0" d="M125,80 l4,0" /><path class="cdscs0" d="M81,17 l0,8" /><path class="cdscs0" d="M125,81 l8,0" /><path class="cdscs0" d="M82,21 l0,4" /><path class="cdscs0" d="M125,82 l4,0" /><path class="cdscs0" d="M83,17 l0,8" /><path class="cdscs0" d="M125,83 l8,0" /><path class="cdscs0" d="M84,21 l0,4" /><path class="cdscs0" d="M125,84 l4,0" /><path class="cdscs0" d="M85,13 l0,112" /><path class="cdscs0" d="M25,85 l112,0" /><text class="cdscs2" x="85" y="11">4</text><text class="cdscs3" x="139" y="85">6</text><path class="cdscs0" d="M86,21 l0,4" /><path class="cdscs0" d="M125,86 l4,0" /><path class="cdscs0" d="M87,17 l0,8" /><path class="cdscs0" d="M125,87 l8,0" /><path class="cdscs0" d="M88,21 l0,4" /><path class="cdscs0" d="M125,88 l4,0" /><path class="cdscs0" d="M89,17 l0,8" /><path class="cdscs0" d="M125,89 l8,0" /><path class="cdscs0" d="M90,21 l0,4" /><path class="cdscs0" d="M125,90 l4,0" /><path class="cdscs0" d="M91,17 l0,8" /><path class="cdscs0" d="M125,91 l8,0" /><path class="cdscs0" d="M92,21 l0,4" /><path class="cdscs0" d="M125,92 l4,0" /><path class="cdscs0" d="M93,17 l0,8" /><path class="cdscs0" d="M125,93 l8,0" /><path class="cdscs0" d="M94,21 l0,4" /><path class="cdscs0" d="M125,94 l4,0" /><path class="cdscs0" d="M95,13 l0,112" /><path class="cdscs0" d="M25,95 l112,0" /><text class="cdscs2" x="95" y="11">3</text><text class="cdscs3" x="139" y="95">7</text><path class="cdscs0" d="M96,21 l0,4" /><path class="cdscs0" d="M125,96 l4,0" /><path class="cdscs0" d="M97,17 l0,8" /><path class="cdscs0" d="M125,97 l8,0" /><path class="cdscs0" d="M98,21 l0,4" /><path class="cdscs0" d="M125,98 l4,0" /><path class="cdscs0" d="M99,17 l0,8" /><path class="cdscs0" d="M125,99 l8,0" /><path class="cdscs0" d="M100,21 l0,4" /><path class="cdscs0" d="M125,100 l4,0" /><path class="cdscs0" d="M101,17 l0,8" /><path class="cdscs0" d="M125,101 l8,0" /><path class="cdscs0" d="M102,21 l0,4" /><path class="cdscs0" d="M125,102 l4,0" /><path class="cdscs0" d="M103,17 l0,8" /><path class="cdscs0" d="M125,103 l8,0" /><path class="cdscs0" d="M104,21 l0,4" /><path class="cdscs0" d="M125,104 l4,0" /><path class="cdscs0" d="M105,13 l0,112" /><path class="cdscs0" d="M25,105 l112,0" /><text class="cdscs2" x="105" y="11">2</text><text class="cdscs3" x="139" y="105">8</text><path class="cdscs0" d="M106,21 l0,4" /><path class="cdscs0" d="M125,106 l4,0" /><path class="cdscs0" d="M107,17 l0,8" /><path class="cdscs0" d="M125,107 l8,0" /><path class="cdscs0" d="M108,21 l0,4" /><path class="cdscs0" d="M125,108 l4,0" /><path class="cdscs0" d="M109,17 l0,8" /><path class="cdscs0" d="M125,109 l8,0" /><path class="cdscs0" d="M110,21 l0,4" /><path class="cdscs0" d="M125,110 l4,0" /><path class="cdscs0" d="M111,17 l0,8" /><path class="cdscs0" d="M125,111 l8,0" /><path class="cdscs0" d="M112,21 l0,4" /><path class="cdscs0" d="M125,112 l4,0" /><path class="cdscs0" d="M113,17 l0,8" /><path class="cdscs0" d="M125,113 l8,0" /><path class="cdscs0" d="M114,21 l0,4" /><path class="cdscs0" d="M125,114 l4,0" /><path class="cdscs0" d="M115,13 l0,112" /><path class="cdscs0" d="M25,115 l112,0" /><text class="cdscs2" x="115" y="11">1</text><text class="cdscs3" x="139" y="115">9</text><path class="cdscs0" d="M116,21 l0,4" /><path class="cdscs0" d="M125,116 l4,0" /><path class="cdscs0" d="M117,17 l0,8" /><path class="cdscs0" d="M125,117 l8,0" /><path class="cdscs0" d="M118,21 l0,4" /><path class="cdscs0" d="M125,118 l4,0" /><path class="cdscs0" d="M119,17 l0,8" /><path class="cdscs0" d="M125,119 l8,0" /><path class="cdscs0" d="M120,21 l0,4" /><path class="cdscs0" d="M125,120 l4,0" /><path class="cdscs0" d="M121,17 l0,8" /><path class="cdscs0" d="M125,121 l8,0" /><path class="cdscs0" d="M122,21 l0,4" /><path class="cdscs0" d="M125,122 l4,0" /><path class="cdscs0" d="M123,17 l0,8" /><path class="cdscs0" d="M125,123 l8,0" /><path class="cdscs0" d="M124,21 l0,4" /><path class="cdscs0" d="M125,124 l4,0" /><text class="cdscs2" x="25" y="11">10</text><style>.cdscs6{font: 5px Arial;fill: #000000FF;dominant-baseline: hanging;}</style><text class="cdscs6" x="139" y="126">10</text>';
        var svgElementBounds = [[-halfHeightInMeters, -halfWidthInMeters], [halfHeightInMeters, halfWidthInMeters]];
        var svgOverlay = L.svgOverlay(svgElement, svgElementBounds).addTo(map);

        // Invisible marker to drag the coordinateScale
        function createCompassIcon(zoom) {
            var scale = Math.pow(2, zoom);
            var w = mapInfos.factorx * scale * widthInMeters;
            var h = mapInfos.factory * scale * heightInMeters;
            return L.icon({
                iconUrl: '/img/transparent.png',
                iconSize: [w, h],
                iconAnchor: [w / 2, h / 2],
                className: 'protractor-drag'
            });
        }
        var marker = L.marker(
            [0, 0], {
            icon: createCompassIcon(mapInfos.defaultZoom),
            draggable: true,
            autoPanOnFocus: false,
            markerZoomAnimation: false
        }).addTo(map);

        marker.on('drag', function () {
            var pos = marker.getLatLng();
            svgOverlay.setBounds([[pos.lat - halfHeightInMeters, pos.lng - halfWidthInMeters], [pos.lat + halfHeightInMeters, pos.lng + halfWidthInMeters]]);
        });
        map.on('zoomend', function (e) {
            marker.setIcon(createCompassIcon(map.getZoom()));
        });
    },
    addProtractorToMap: function (map, mapInfos) {

        // Apparent size
        const widthInMeters = 1500;
        const heightInMeters = 1500;

        // Apparent size
        const halfWidthInMeters = widthInMeters / 2;
        const halfHeightInMeters = heightInMeters / 2;

        // Protractor itself
        var svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svgElement.setAttribute('xmlns', "http://www.w3.org/2000/svg");
        svgElement.setAttribute('viewBox', "0 0 102 102");
        svgElement.innerHTML = '<g id="protact"><style>.prtts0{fill: none;stroke: #000000FF;stroke-width: 0.2;}.prtts1{fill: none;stroke: #000000FF;stroke-width: 0.1;}.prtts2{font: 2.5px Arial;fill: #000000FF;dominant-baseline: middle;}.prtts3{font: 5px Arial;fill: #FF0000FF;dominant-baseline: middle;font-weight: bold;}.prtts4{fill: none;stroke: #80808080;stroke-width: 1;}</style><circle cx="51" cy="51" r="50.5" class="prtts4" /><style>.prtts5{fill: #F1F1F140;stroke: #000000FF;stroke-width: 0.1;}</style><circle cx="51" cy="51" r="50" class="prtts5" /><path class="prtts0" d="M51,11 l0,5" /><defs><path id="p0" d="M49,18.1 l4,0" /></defs><text class="prtts2"><textPath href="#p0">000</textPath></text><path class="prtts1" d="M51.7,11 l0,2.5" /><path class="prtts1" d="M52.4,11 l-0.1,2.5" /><path class="prtts1" d="M53.1,11.1 l-0.1,2.5" /><path class="prtts1" d="M53.8,11.1 l-0.2,2.5" /><path class="prtts1" d="M54.5,11.2 l-0.4,3.9" /><path class="prtts1" d="M55.2,11.2 l-0.3,2.5" /><path class="prtts1" d="M55.9,11.3 l-0.3,2.5" /><path class="prtts1" d="M56.6,11.4 l-0.4,2.5" /><path class="prtts1" d="M57.3,11.5 l-0.4,2.5" /><path class="prtts0" d="M57.9,11.6 l-0.8,4.9" /><defs><path id="p1" d="M54.7,18.2 l4,0.7" /></defs><text class="prtts2"><textPath href="#p1">010</textPath></text><path class="prtts1" d="M58.6,11.7 l-0.4,2.5" /><path class="prtts1" d="M59.3,11.9 l-0.5,2.4" /><path class="prtts1" d="M60,12 l-0.6,2.5" /><path class="prtts1" d="M60.7,12.2 l-0.6,2.4" /><path class="prtts1" d="M61.4,12.4 l-1.1,3.8" /><path class="prtts1" d="M62,12.5 l-0.7,2.5" /><path class="prtts1" d="M62.7,12.7 l-0.7,2.4" /><path class="prtts1" d="M63.4,13 l-0.8,2.3" /><path class="prtts1" d="M64,13.2 l-0.8,2.3" /><path class="prtts0" d="M64.7,13.4 l-1.7,4.7" /><defs><path id="p2" d="M60.4,19.4 l3.8,1.3" /></defs><text class="prtts2"><textPath href="#p2">020</textPath></text><path class="prtts1" d="M65.3,13.7 l-0.9,2.3" /><path class="prtts1" d="M66,13.9 l-1,2.3" /><path class="prtts1" d="M66.6,14.2 l-0.9,2.3" /><path class="prtts1" d="M67.3,14.5 l-1,2.2" /><path class="prtts1" d="M67.9,14.7 l-1.7,3.7" /><path class="prtts1" d="M68.5,15 l-1.1,2.3" /><path class="prtts1" d="M69.2,15.4 l-1.2,2.2" /><path class="prtts1" d="M69.8,15.7 l-1.2,2.2" /><path class="prtts1" d="M70.4,16 l-1.2,2.2" /><path class="prtts0" d="M71,16.4 l-2.5,4.3" /><defs><path id="p3" d="M65.7,21.5 l3.5,2" /></defs><text class="prtts2"><textPath href="#p3">030</textPath></text><path class="prtts1" d="M71.6,16.7 l-1.3,2.2" /><path class="prtts1" d="M72.2,17.1 l-1.3,2.1" /><path class="prtts1" d="M72.8,17.5 l-1.4,2" /><path class="prtts1" d="M73.4,17.8 l-1.4,2.1" /><path class="prtts1" d="M73.9,18.2 l-2.3,3.3" /><path class="prtts1" d="M74.5,18.6 l-1.5,2.1" /><path class="prtts1" d="M75.1,19.1 l-1.5,2" /><path class="prtts1" d="M75.6,19.5 l-1.5,1.9" /><path class="prtts1" d="M76.2,19.9 l-1.6,2" /><path class="prtts0" d="M76.7,20.4 l-3.2,3.8" /><defs><path id="p4" d="M70.6,24.5 l3.1,2.6" /></defs><text class="prtts2"><textPath href="#p4">040</textPath></text><path class="prtts1" d="M77.2,20.8 l-1.6,1.9" /><path class="prtts1" d="M77.8,21.3 l-1.7,1.8" /><path class="prtts1" d="M78.3,21.7 l-1.7,1.9" /><path class="prtts1" d="M78.8,22.2 l-1.8,1.8" /><path class="prtts1" d="M79.3,22.7 l-2.8,2.8" /><path class="prtts1" d="M79.8,23.2 l-1.8,1.8" /><path class="prtts1" d="M80.3,23.7 l-1.9,1.7" /><path class="prtts1" d="M80.7,24.2 l-1.8,1.7" /><path class="prtts1" d="M81.2,24.8 l-1.9,1.6" /><path class="prtts0" d="M81.6,25.3 l-3.8,3.2" /><defs><path id="p5" d="M74.9,28.3 l2.6,3.1" /></defs><text class="prtts2"><textPath href="#p5">050</textPath></text><path class="prtts1" d="M82.1,25.8 l-2,1.6" /><path class="prtts1" d="M82.5,26.4 l-1.9,1.5" /><path class="prtts1" d="M82.9,26.9 l-2,1.5" /><path class="prtts1" d="M83.4,27.5 l-2.1,1.5" /><path class="prtts1" d="M83.8,28.1 l-3.3,2.3" /><path class="prtts1" d="M84.2,28.6 l-2.1,1.4" /><path class="prtts1" d="M84.5,29.2 l-2,1.4" /><path class="prtts1" d="M84.9,29.8 l-2.1,1.3" /><path class="prtts1" d="M85.3,30.4 l-2.2,1.3" /><path class="prtts0" d="M85.6,31 l-4.3,2.5" /><defs><path id="p6" d="M78.5,32.8 l2,3.5" /></defs><text class="prtts2"><textPath href="#p6">060</textPath></text><path class="prtts1" d="M86,31.6 l-2.2,1.2" /><path class="prtts1" d="M86.3,32.2 l-2.2,1.2" /><path class="prtts1" d="M86.6,32.8 l-2.2,1.2" /><path class="prtts1" d="M87,33.5 l-2.3,1.1" /><path class="prtts1" d="M87.3,34.1 l-3.7,1.7" /><path class="prtts1" d="M87.5,34.7 l-2.2,1" /><path class="prtts1" d="M87.8,35.4 l-2.3,0.9" /><path class="prtts1" d="M88.1,36 l-2.3,1" /><path class="prtts1" d="M88.3,36.7 l-2.3,0.9" /><path class="prtts0" d="M88.6,37.3 l-4.7,1.7" /><defs><path id="p7" d="M81.3,37.8 l1.3,3.8" /></defs><text class="prtts2"><textPath href="#p7">070</textPath></text><path class="prtts1" d="M88.8,38 l-2.3,0.8" /><path class="prtts1" d="M89,38.6 l-2.3,0.8" /><path class="prtts1" d="M89.3,39.3 l-2.4,0.7" /><path class="prtts1" d="M89.5,40 l-2.5,0.7" /><path class="prtts1" d="M89.6,40.6 l-3.8,1.1" /><path class="prtts1" d="M89.8,41.3 l-2.4,0.6" /><path class="prtts1" d="M90,42 l-2.5,0.6" /><path class="prtts1" d="M90.1,42.7 l-2.4,0.5" /><path class="prtts1" d="M90.3,43.4 l-2.5,0.4" /><path class="prtts0" d="M90.4,44.1 l-4.9,0.8" /><defs><path id="p8" d="M83.1,43.3 l0.7,4" /></defs><text class="prtts2"><textPath href="#p8">080</textPath></text><path class="prtts1" d="M90.5,44.7 l-2.5,0.4" /><path class="prtts1" d="M90.6,45.4 l-2.5,0.4" /><path class="prtts1" d="M90.7,46.1 l-2.5,0.3" /><path class="prtts1" d="M90.8,46.8 l-2.5,0.3" /><path class="prtts1" d="M90.8,47.5 l-3.9,0.4" /><path class="prtts1" d="M90.9,48.2 l-2.5,0.2" /><path class="prtts1" d="M90.9,48.9 l-2.5,0.1" /><path class="prtts1" d="M91,49.6 l-2.5,0.1" /><path class="prtts1" d="M91,50.3 l-2.5,0" /><path class="prtts0" d="M91,51 l-5,0" /><defs><path id="p9" d="M83.9,49 l0,4" /></defs><text class="prtts2"><textPath href="#p9">090</textPath></text><path class="prtts1" d="M91,51.7 l-2.5,0" /><path class="prtts1" d="M91,52.4 l-2.5,-0.1" /><path class="prtts1" d="M90.9,53.1 l-2.5,-0.1" /><path class="prtts1" d="M90.9,53.8 l-2.5,-0.2" /><path class="prtts1" d="M90.8,54.5 l-3.9,-0.4" /><path class="prtts1" d="M90.8,55.2 l-2.5,-0.3" /><path class="prtts1" d="M90.7,55.9 l-2.5,-0.3" /><path class="prtts1" d="M90.6,56.6 l-2.5,-0.4" /><path class="prtts1" d="M90.5,57.3 l-2.5,-0.4" /><path class="prtts0" d="M90.4,57.9 l-4.9,-0.8" /><defs><path id="p10" d="M83.8,54.7 l-0.7,4" /></defs><text class="prtts2"><textPath href="#p10">100</textPath></text><path class="prtts1" d="M90.3,58.6 l-2.5,-0.4" /><path class="prtts1" d="M90.1,59.3 l-2.4,-0.5" /><path class="prtts1" d="M90,60 l-2.5,-0.6" /><path class="prtts1" d="M89.8,60.7 l-2.4,-0.6" /><path class="prtts1" d="M89.6,61.4 l-3.8,-1.1" /><path class="prtts1" d="M89.5,62 l-2.5,-0.7" /><path class="prtts1" d="M89.3,62.7 l-2.4,-0.7" /><path class="prtts1" d="M89,63.4 l-2.3,-0.8" /><path class="prtts1" d="M88.8,64 l-2.3,-0.8" /><path class="prtts0" d="M88.6,64.7 l-4.7,-1.7" /><defs><path id="p11" d="M82.6,60.4 l-1.3,3.8" /></defs><text class="prtts2"><textPath href="#p11">110</textPath></text><path class="prtts1" d="M88.3,65.3 l-2.3,-0.9" /><path class="prtts1" d="M88.1,66 l-2.3,-1" /><path class="prtts1" d="M87.8,66.6 l-2.3,-0.9" /><path class="prtts1" d="M87.5,67.3 l-2.2,-1" /><path class="prtts1" d="M87.3,67.9 l-3.7,-1.7" /><path class="prtts1" d="M87,68.5 l-2.3,-1.1" /><path class="prtts1" d="M86.6,69.2 l-2.2,-1.2" /><path class="prtts1" d="M86.3,69.8 l-2.2,-1.2" /><path class="prtts1" d="M86,70.4 l-2.2,-1.2" /><path class="prtts0" d="M85.6,71 l-4.3,-2.5" /><defs><path id="p12" d="M80.5,65.7 l-2,3.5" /></defs><text class="prtts2"><textPath href="#p12">120</textPath></text><path class="prtts1" d="M85.3,71.6 l-2.2,-1.3" /><path class="prtts1" d="M84.9,72.2 l-2.1,-1.3" /><path class="prtts1" d="M84.5,72.8 l-2,-1.4" /><path class="prtts1" d="M84.2,73.4 l-2.1,-1.4" /><path class="prtts1" d="M83.8,73.9 l-3.3,-2.3" /><path class="prtts1" d="M83.4,74.5 l-2.1,-1.5" /><path class="prtts1" d="M82.9,75.1 l-2,-1.5" /><path class="prtts1" d="M82.5,75.6 l-1.9,-1.5" /><path class="prtts1" d="M82.1,76.2 l-2,-1.6" /><path class="prtts0" d="M81.6,76.7 l-3.8,-3.2" /><defs><path id="p13" d="M77.5,70.6 l-2.6,3.1" /></defs><text class="prtts2"><textPath href="#p13">130</textPath></text><path class="prtts1" d="M81.2,77.2 l-1.9,-1.6" /><path class="prtts1" d="M80.7,77.8 l-1.8,-1.7" /><path class="prtts1" d="M80.3,78.3 l-1.9,-1.7" /><path class="prtts1" d="M79.8,78.8 l-1.8,-1.8" /><path class="prtts1" d="M79.3,79.3 l-2.8,-2.8" /><path class="prtts1" d="M78.8,79.8 l-1.8,-1.8" /><path class="prtts1" d="M78.3,80.3 l-1.7,-1.9" /><path class="prtts1" d="M77.8,80.7 l-1.7,-1.8" /><path class="prtts1" d="M77.2,81.2 l-1.6,-1.9" /><path class="prtts0" d="M76.7,81.6 l-3.2,-3.8" /><defs><path id="p14" d="M73.7,74.9 l-3.1,2.6" /></defs><text class="prtts2"><textPath href="#p14">140</textPath></text><path class="prtts1" d="M76.2,82.1 l-1.6,-2" /><path class="prtts1" d="M75.6,82.5 l-1.5,-1.9" /><path class="prtts1" d="M75.1,82.9 l-1.5,-2" /><path class="prtts1" d="M74.5,83.4 l-1.5,-2.1" /><path class="prtts1" d="M73.9,83.8 l-2.3,-3.3" /><path class="prtts1" d="M73.4,84.2 l-1.4,-2.1" /><path class="prtts1" d="M72.8,84.5 l-1.4,-2" /><path class="prtts1" d="M72.2,84.9 l-1.3,-2.1" /><path class="prtts1" d="M71.6,85.3 l-1.3,-2.2" /><path class="prtts0" d="M71,85.6 l-2.5,-4.3" /><defs><path id="p15" d="M69.2,78.5 l-3.5,2" /></defs><text class="prtts2"><textPath href="#p15">150</textPath></text><path class="prtts1" d="M70.4,86 l-1.2,-2.2" /><path class="prtts1" d="M69.8,86.3 l-1.2,-2.2" /><path class="prtts1" d="M69.2,86.6 l-1.2,-2.2" /><path class="prtts1" d="M68.5,87 l-1.1,-2.3" /><path class="prtts1" d="M67.9,87.3 l-1.7,-3.7" /><path class="prtts1" d="M67.3,87.5 l-1,-2.2" /><path class="prtts1" d="M66.6,87.8 l-0.9,-2.3" /><path class="prtts1" d="M66,88.1 l-1,-2.3" /><path class="prtts1" d="M65.3,88.3 l-0.9,-2.3" /><path class="prtts0" d="M64.7,88.6 l-1.7,-4.7" /><defs><path id="p16" d="M64.2,81.3 l-3.8,1.3" /></defs><text class="prtts2"><textPath href="#p16">160</textPath></text><path class="prtts1" d="M64,88.8 l-0.8,-2.3" /><path class="prtts1" d="M63.4,89 l-0.8,-2.3" /><path class="prtts1" d="M62.7,89.3 l-0.7,-2.4" /><path class="prtts1" d="M62,89.5 l-0.7,-2.5" /><path class="prtts1" d="M61.4,89.6 l-1.1,-3.8" /><path class="prtts1" d="M60.7,89.8 l-0.6,-2.4" /><path class="prtts1" d="M60,90 l-0.6,-2.5" /><path class="prtts1" d="M59.3,90.1 l-0.5,-2.4" /><path class="prtts1" d="M58.6,90.3 l-0.4,-2.5" /><path class="prtts0" d="M57.9,90.4 l-0.8,-4.9" /><defs><path id="p17" d="M58.7,83.1 l-4,0.7" /></defs><text class="prtts2"><textPath href="#p17">170</textPath></text><path class="prtts1" d="M57.3,90.5 l-0.4,-2.5" /><path class="prtts1" d="M56.6,90.6 l-0.4,-2.5" /><path class="prtts1" d="M55.9,90.7 l-0.3,-2.5" /><path class="prtts1" d="M55.2,90.8 l-0.3,-2.5" /><path class="prtts1" d="M54.5,90.8 l-0.4,-3.9" /><path class="prtts1" d="M53.8,90.9 l-0.2,-2.5" /><path class="prtts1" d="M53.1,90.9 l-0.1,-2.5" /><path class="prtts1" d="M52.4,91 l-0.1,-2.5" /><path class="prtts1" d="M51.7,91 l0,-2.5" /><path class="prtts0" d="M51,91 l0,-5" /><defs><path id="p18" d="M53,83.9 l-4,0" /></defs><text class="prtts2"><textPath href="#p18">180</textPath></text><path class="prtts1" d="M50.3,91 l0,-2.5" /><path class="prtts1" d="M49.6,91 l0.1,-2.5" /><path class="prtts1" d="M48.9,90.9 l0.1,-2.5" /><path class="prtts1" d="M48.2,90.9 l0.2,-2.5" /><path class="prtts1" d="M47.5,90.8 l0.4,-3.9" /><path class="prtts1" d="M46.8,90.8 l0.3,-2.5" /><path class="prtts1" d="M46.1,90.7 l0.3,-2.5" /><path class="prtts1" d="M45.4,90.6 l0.4,-2.5" /><path class="prtts1" d="M44.7,90.5 l0.4,-2.5" /><path class="prtts0" d="M44.1,90.4 l0.8,-4.9" /><defs><path id="p19" d="M47.3,83.8 l-4,-0.7" /></defs><text class="prtts2"><textPath href="#p19">190</textPath></text><path class="prtts1" d="M43.4,90.3 l0.4,-2.5" /><path class="prtts1" d="M42.7,90.1 l0.5,-2.4" /><path class="prtts1" d="M42,90 l0.6,-2.5" /><path class="prtts1" d="M41.3,89.8 l0.6,-2.4" /><path class="prtts1" d="M40.6,89.6 l1.1,-3.8" /><path class="prtts1" d="M40,89.5 l0.7,-2.5" /><path class="prtts1" d="M39.3,89.3 l0.7,-2.4" /><path class="prtts1" d="M38.6,89 l0.8,-2.3" /><path class="prtts1" d="M38,88.8 l0.8,-2.3" /><path class="prtts0" d="M37.3,88.6 l1.7,-4.7" /><defs><path id="p20" d="M41.6,82.6 l-3.8,-1.3" /></defs><text class="prtts2"><textPath href="#p20">200</textPath></text><path class="prtts1" d="M36.7,88.3 l0.9,-2.3" /><path class="prtts1" d="M36,88.1 l1,-2.3" /><path class="prtts1" d="M35.4,87.8 l0.9,-2.3" /><path class="prtts1" d="M34.7,87.5 l1,-2.2" /><path class="prtts1" d="M34.1,87.3 l1.7,-3.7" /><path class="prtts1" d="M33.5,87 l1.1,-2.3" /><path class="prtts1" d="M32.8,86.6 l1.2,-2.2" /><path class="prtts1" d="M32.2,86.3 l1.2,-2.2" /><path class="prtts1" d="M31.6,86 l1.2,-2.2" /><path class="prtts0" d="M31,85.6 l2.5,-4.3" /><defs><path id="p21" d="M36.3,80.5 l-3.5,-2" /></defs><text class="prtts2"><textPath href="#p21">210</textPath></text><path class="prtts1" d="M30.4,85.3 l1.3,-2.2" /><path class="prtts1" d="M29.8,84.9 l1.3,-2.1" /><path class="prtts1" d="M29.2,84.5 l1.4,-2" /><path class="prtts1" d="M28.6,84.2 l1.4,-2.1" /><path class="prtts1" d="M28.1,83.8 l2.3,-3.3" /><path class="prtts1" d="M27.5,83.4 l1.5,-2.1" /><path class="prtts1" d="M26.9,82.9 l1.5,-2" /><path class="prtts1" d="M26.4,82.5 l1.5,-1.9" /><path class="prtts1" d="M25.8,82.1 l1.6,-2" /><path class="prtts0" d="M25.3,81.6 l3.2,-3.8" /><defs><path id="p22" d="M31.4,77.5 l-3.1,-2.6" /></defs><text class="prtts2"><textPath href="#p22">220</textPath></text><path class="prtts1" d="M24.8,81.2 l1.6,-1.9" /><path class="prtts1" d="M24.2,80.7 l1.7,-1.8" /><path class="prtts1" d="M23.7,80.3 l1.7,-1.9" /><path class="prtts1" d="M23.2,79.8 l1.8,-1.8" /><path class="prtts1" d="M22.7,79.3 l2.8,-2.8" /><path class="prtts1" d="M22.2,78.8 l1.8,-1.8" /><path class="prtts1" d="M21.7,78.3 l1.9,-1.7" /><path class="prtts1" d="M21.3,77.8 l1.8,-1.7" /><path class="prtts1" d="M20.8,77.2 l1.9,-1.6" /><path class="prtts0" d="M20.4,76.7 l3.8,-3.2" /><defs><path id="p23" d="M27.1,73.7 l-2.6,-3.1" /></defs><text class="prtts2"><textPath href="#p23">230</textPath></text><path class="prtts1" d="M19.9,76.2 l2,-1.6" /><path class="prtts1" d="M19.5,75.6 l1.9,-1.5" /><path class="prtts1" d="M19.1,75.1 l2,-1.5" /><path class="prtts1" d="M18.6,74.5 l2.1,-1.5" /><path class="prtts1" d="M18.2,73.9 l3.3,-2.3" /><path class="prtts1" d="M17.8,73.4 l2.1,-1.4" /><path class="prtts1" d="M17.5,72.8 l2,-1.4" /><path class="prtts1" d="M17.1,72.2 l2.1,-1.3" /><path class="prtts1" d="M16.7,71.6 l2.2,-1.3" /><path class="prtts0" d="M16.4,71 l4.3,-2.5" /><defs><path id="p24" d="M23.5,69.2 l-2,-3.5" /></defs><text class="prtts2"><textPath href="#p24">240</textPath></text><path class="prtts1" d="M16,70.4 l2.2,-1.2" /><path class="prtts1" d="M15.7,69.8 l2.2,-1.2" /><path class="prtts1" d="M15.4,69.2 l2.2,-1.2" /><path class="prtts1" d="M15,68.5 l2.3,-1.1" /><path class="prtts1" d="M14.7,67.9 l3.7,-1.7" /><path class="prtts1" d="M14.5,67.3 l2.2,-1" /><path class="prtts1" d="M14.2,66.6 l2.3,-0.9" /><path class="prtts1" d="M13.9,66 l2.3,-1" /><path class="prtts1" d="M13.7,65.3 l2.3,-0.9" /><path class="prtts0" d="M13.4,64.7 l4.7,-1.7" /><defs><path id="p25" d="M20.7,64.2 l-1.3,-3.8" /></defs><text class="prtts2"><textPath href="#p25">250</textPath></text><path class="prtts1" d="M13.2,64 l2.3,-0.8" /><path class="prtts1" d="M13,63.4 l2.3,-0.8" /><path class="prtts1" d="M12.7,62.7 l2.4,-0.7" /><path class="prtts1" d="M12.5,62 l2.5,-0.7" /><path class="prtts1" d="M12.4,61.4 l3.8,-1.1" /><path class="prtts1" d="M12.2,60.7 l2.4,-0.6" /><path class="prtts1" d="M12,60 l2.5,-0.6" /><path class="prtts1" d="M11.9,59.3 l2.4,-0.5" /><path class="prtts1" d="M11.7,58.6 l2.5,-0.4" /><path class="prtts0" d="M11.6,57.9 l4.9,-0.8" /><defs><path id="p26" d="M18.9,58.7 l-0.7,-4" /></defs><text class="prtts2"><textPath href="#p26">260</textPath></text><path class="prtts1" d="M11.5,57.3 l2.5,-0.4" /><path class="prtts1" d="M11.4,56.6 l2.5,-0.4" /><path class="prtts1" d="M11.3,55.9 l2.5,-0.3" /><path class="prtts1" d="M11.2,55.2 l2.5,-0.3" /><path class="prtts1" d="M11.2,54.5 l3.9,-0.4" /><path class="prtts1" d="M11.1,53.8 l2.5,-0.2" /><path class="prtts1" d="M11.1,53.1 l2.5,-0.1" /><path class="prtts1" d="M11,52.4 l2.5,-0.1" /><path class="prtts1" d="M11,51.7 l2.5,0" /><path class="prtts0" d="M11,51 l5,0" /><defs><path id="p27" d="M18.1,53 l0,-4" /></defs><text class="prtts2"><textPath href="#p27">270</textPath></text><path class="prtts1" d="M11,50.3 l2.5,0" /><path class="prtts1" d="M11,49.6 l2.5,0.1" /><path class="prtts1" d="M11.1,48.9 l2.5,0.1" /><path class="prtts1" d="M11.1,48.2 l2.5,0.2" /><path class="prtts1" d="M11.2,47.5 l3.9,0.4" /><path class="prtts1" d="M11.2,46.8 l2.5,0.3" /><path class="prtts1" d="M11.3,46.1 l2.5,0.3" /><path class="prtts1" d="M11.4,45.4 l2.5,0.4" /><path class="prtts1" d="M11.5,44.7 l2.5,0.4" /><path class="prtts0" d="M11.6,44.1 l4.9,0.8" /><defs><path id="p28" d="M18.2,47.3 l0.7,-4" /></defs><text class="prtts2"><textPath href="#p28">280</textPath></text><path class="prtts1" d="M11.7,43.4 l2.5,0.4" /><path class="prtts1" d="M11.9,42.7 l2.4,0.5" /><path class="prtts1" d="M12,42 l2.5,0.6" /><path class="prtts1" d="M12.2,41.3 l2.4,0.6" /><path class="prtts1" d="M12.4,40.6 l3.8,1.1" /><path class="prtts1" d="M12.5,40 l2.5,0.7" /><path class="prtts1" d="M12.7,39.3 l2.4,0.7" /><path class="prtts1" d="M13,38.6 l2.3,0.8" /><path class="prtts1" d="M13.2,38 l2.3,0.8" /><path class="prtts0" d="M13.4,37.3 l4.7,1.7" /><defs><path id="p29" d="M19.4,41.6 l1.3,-3.8" /></defs><text class="prtts2"><textPath href="#p29">290</textPath></text><path class="prtts1" d="M13.7,36.7 l2.3,0.9" /><path class="prtts1" d="M13.9,36 l2.3,1" /><path class="prtts1" d="M14.2,35.4 l2.3,0.9" /><path class="prtts1" d="M14.5,34.7 l2.2,1" /><path class="prtts1" d="M14.7,34.1 l3.7,1.7" /><path class="prtts1" d="M15,33.5 l2.3,1.1" /><path class="prtts1" d="M15.4,32.8 l2.2,1.2" /><path class="prtts1" d="M15.7,32.2 l2.2,1.2" /><path class="prtts1" d="M16,31.6 l2.2,1.2" /><path class="prtts0" d="M16.4,31 l4.3,2.5" /><defs><path id="p30" d="M21.5,36.3 l2,-3.5" /></defs><text class="prtts2"><textPath href="#p30">300</textPath></text><path class="prtts1" d="M16.7,30.4 l2.2,1.3" /><path class="prtts1" d="M17.1,29.8 l2.1,1.3" /><path class="prtts1" d="M17.5,29.2 l2,1.4" /><path class="prtts1" d="M17.8,28.6 l2.1,1.4" /><path class="prtts1" d="M18.2,28.1 l3.3,2.3" /><path class="prtts1" d="M18.6,27.5 l2.1,1.5" /><path class="prtts1" d="M19.1,26.9 l2,1.5" /><path class="prtts1" d="M19.5,26.4 l1.9,1.5" /><path class="prtts1" d="M19.9,25.8 l2,1.6" /><path class="prtts0" d="M20.4,25.3 l3.8,3.2" /><defs><path id="p31" d="M24.5,31.4 l2.6,-3.1" /></defs><text class="prtts2"><textPath href="#p31">310</textPath></text><path class="prtts1" d="M20.8,24.8 l1.9,1.6" /><path class="prtts1" d="M21.3,24.2 l1.8,1.7" /><path class="prtts1" d="M21.7,23.7 l1.9,1.7" /><path class="prtts1" d="M22.2,23.2 l1.8,1.8" /><path class="prtts1" d="M22.7,22.7 l2.8,2.8" /><path class="prtts1" d="M23.2,22.2 l1.8,1.8" /><path class="prtts1" d="M23.7,21.7 l1.7,1.9" /><path class="prtts1" d="M24.2,21.3 l1.7,1.8" /><path class="prtts1" d="M24.8,20.8 l1.6,1.9" /><path class="prtts0" d="M25.3,20.4 l3.2,3.8" /><defs><path id="p32" d="M28.3,27.1 l3.1,-2.6" /></defs><text class="prtts2"><textPath href="#p32">320</textPath></text><path class="prtts1" d="M25.8,19.9 l1.6,2" /><path class="prtts1" d="M26.4,19.5 l1.5,1.9" /><path class="prtts1" d="M26.9,19.1 l1.5,2" /><path class="prtts1" d="M27.5,18.6 l1.5,2.1" /><path class="prtts1" d="M28.1,18.2 l2.3,3.3" /><path class="prtts1" d="M28.6,17.8 l1.4,2.1" /><path class="prtts1" d="M29.2,17.5 l1.4,2" /><path class="prtts1" d="M29.8,17.1 l1.3,2.1" /><path class="prtts1" d="M30.4,16.7 l1.3,2.2" /><path class="prtts0" d="M31,16.4 l2.5,4.3" /><defs><path id="p33" d="M32.8,23.5 l3.5,-2" /></defs><text class="prtts2"><textPath href="#p33">330</textPath></text><path class="prtts1" d="M31.6,16 l1.2,2.2" /><path class="prtts1" d="M32.2,15.7 l1.2,2.2" /><path class="prtts1" d="M32.8,15.4 l1.2,2.2" /><path class="prtts1" d="M33.5,15 l1.1,2.3" /><path class="prtts1" d="M34.1,14.7 l1.7,3.7" /><path class="prtts1" d="M34.7,14.5 l1,2.2" /><path class="prtts1" d="M35.4,14.2 l0.9,2.3" /><path class="prtts1" d="M36,13.9 l1,2.3" /><path class="prtts1" d="M36.7,13.7 l0.9,2.3" /><path class="prtts0" d="M37.3,13.4 l1.7,4.7" /><defs><path id="p34" d="M37.8,20.7 l3.8,-1.3" /></defs><text class="prtts2"><textPath href="#p34">340</textPath></text><path class="prtts1" d="M38,13.2 l0.8,2.3" /><path class="prtts1" d="M38.6,13 l0.8,2.3" /><path class="prtts1" d="M39.3,12.7 l0.7,2.4" /><path class="prtts1" d="M40,12.5 l0.7,2.5" /><path class="prtts1" d="M40.6,12.4 l1.1,3.8" /><path class="prtts1" d="M41.3,12.2 l0.6,2.4" /><path class="prtts1" d="M42,12 l0.6,2.5" /><path class="prtts1" d="M42.7,11.9 l0.5,2.4" /><path class="prtts1" d="M43.4,11.7 l0.4,2.5" /><path class="prtts0" d="M44.1,11.6 l0.8,4.9" /><defs><path id="p35" d="M43.3,18.9 l4,-0.7" /></defs><text class="prtts2"><textPath href="#p35">350</textPath></text><path class="prtts1" d="M44.7,11.5 l0.4,2.5" /><path class="prtts1" d="M45.4,11.4 l0.4,2.5" /><path class="prtts1" d="M46.1,11.3 l0.3,2.5" /><path class="prtts1" d="M46.8,11.2 l0.3,2.5" /><path class="prtts1" d="M47.5,11.2 l0.4,3.9" /><path class="prtts1" d="M48.2,11.1 l0.2,2.5" /><path class="prtts1" d="M48.9,11.1 l0.1,2.5" /><path class="prtts1" d="M49.6,11 l0.1,2.5" /><path class="prtts1" d="M50.3,11 l0,2.5" /><path class="prtts0" d="M51,1 l0,5" /><defs><path id="p36" d="M49.7,8 l2.6,0" /></defs><text class="prtts2"><textPath href="#p36">00</textPath></text><path class="prtts1" d="M51.5,1 l0,1.3" /><path class="prtts1" d="M52,1 l-0.1,2.5" /><path class="prtts1" d="M52.5,1 l-0.1,1.3" /><path class="prtts1" d="M53,1 l-0.1,2.5" /><path class="prtts1" d="M53.5,1.1 l-0.1,1.2" /><path class="prtts1" d="M53.9,1.1 l-0.1,2.5" /><path class="prtts1" d="M54.4,1.1 l-0.1,1.3" /><path class="prtts1" d="M54.9,1.2 l-0.2,2.4" /><path class="prtts1" d="M55.4,1.2 l-0.1,1.2" /><path class="prtts0" d="M55.9,1.2 l-0.5,5" /><defs><path id="p37" d="M54,8.1 l2.5,0.2" /></defs><text class="prtts2"><textPath href="#p37">01</textPath></text><path class="prtts1" d="M56.4,1.3 l-0.1,1.2" /><path class="prtts1" d="M56.9,1.3 l-0.3,2.5" /><path class="prtts1" d="M57.4,1.4 l-0.2,1.2" /><path class="prtts1" d="M57.9,1.5 l-0.4,2.4" /><path class="prtts1" d="M58.3,1.5 l-0.1,1.3" /><path class="prtts1" d="M58.8,1.6 l-0.4,2.5" /><path class="prtts1" d="M59.3,1.7 l-0.2,1.2" /><path class="prtts1" d="M59.8,1.8 l-0.4,2.4" /><path class="prtts1" d="M60.3,1.9 l-0.3,1.2" /><path class="prtts0" d="M60.8,2 l-1,4.9" /><defs><path id="p38" d="M58.1,8.6 l2.5,0.5" /></defs><text class="prtts2"><textPath href="#p38">02</textPath></text><path class="prtts1" d="M61.2,2.1 l-0.2,1.2" /><path class="prtts1" d="M61.7,2.2 l-0.5,2.4" /><path class="prtts1" d="M62.2,2.3 l-0.3,1.2" /><path class="prtts1" d="M62.7,2.4 l-0.6,2.4" /><path class="prtts1" d="M63.1,2.5 l-0.3,1.2" /><path class="prtts1" d="M63.6,2.6 l-0.6,2.4" /><path class="prtts1" d="M64.1,2.7 l-0.3,1.3" /><path class="prtts1" d="M64.6,2.9 l-0.7,2.4" /><path class="prtts1" d="M65,3 l-0.3,1.2" /><path class="prtts0" d="M65.5,3.2 l-1.4,4.7" /><defs><path id="p39" d="M62.3,9.5 l2.4,0.7" /></defs><text class="prtts2"><textPath href="#p39">03</textPath></text><path class="prtts1" d="M66,3.3 l-0.4,1.2" /><path class="prtts1" d="M66.5,3.4 l-0.8,2.4" /><path class="prtts1" d="M66.9,3.6 l-0.4,1.2" /><path class="prtts1" d="M67.4,3.8 l-0.8,2.3" /><path class="prtts1" d="M67.8,3.9 l-0.4,1.2" /><path class="prtts1" d="M68.3,4.1 l-0.9,2.3" /><path class="prtts1" d="M68.8,4.3 l-0.5,1.1" /><path class="prtts1" d="M69.2,4.4 l-0.9,2.4" /><path class="prtts1" d="M69.7,4.6 l-0.5,1.2" /><path class="prtts0" d="M70.1,4.8 l-1.9,4.6" /><defs><path id="p40" d="M66.3,10.8 l2.3,1" /></defs><text class="prtts2"><textPath href="#p40">04</textPath></text><path class="prtts1" d="M70.6,5 l-0.5,1.1" /><path class="prtts1" d="M71,5.2 l-1,2.3" /><path class="prtts1" d="M71.5,5.4 l-0.5,1.1" /><path class="prtts1" d="M71.9,5.6 l-1,2.3" /><path class="prtts1" d="M72.4,5.8 l-0.6,1.1" /><path class="prtts1" d="M72.8,6 l-1.1,2.3" /><path class="prtts1" d="M73.3,6.2 l-0.6,1.1" /><path class="prtts1" d="M73.7,6.4 l-1.1,2.3" /><path class="prtts1" d="M74.1,6.7 l-0.5,1.1" /><path class="prtts0" d="M74.6,6.9 l-2.4,4.4" /><defs><path id="p41" d="M70.1,12.5 l2.3,1.2" /></defs><text class="prtts2"><textPath href="#p41">05</textPath></text><path class="prtts1" d="M75,7.1 l-0.6,1.1" /><path class="prtts1" d="M75.4,7.4 l-1.2,2.2" /><path class="prtts1" d="M75.9,7.6 l-0.7,1.1" /><path class="prtts1" d="M76.3,7.9 l-1.3,2.1" /><path class="prtts1" d="M76.7,8.1 l-0.6,1.1" /><path class="prtts1" d="M77.1,8.4 l-1.3,2.1" /><path class="prtts1" d="M77.5,8.6 l-0.6,1.1" /><path class="prtts1" d="M78,8.9 l-1.4,2.1" /><path class="prtts1" d="M78.4,9.2 l-0.7,1" /><path class="prtts0" d="M78.8,9.4 l-2.8,4.2" /><defs><path id="p42" d="M73.8,14.6 l2.1,1.4" /></defs><text class="prtts2"><textPath href="#p42">06</textPath></text><path class="prtts1" d="M79.2,9.7 l-0.7,1" /><path class="prtts1" d="M79.6,10 l-1.4,2" /><path class="prtts1" d="M80,10.3 l-0.7,1" /><path class="prtts1" d="M80.4,10.5 l-1.5,2.1" /><path class="prtts1" d="M80.8,10.8 l-0.8,1" /><path class="prtts1" d="M81.2,11.1 l-1.5,2" /><path class="prtts1" d="M81.6,11.4 l-0.8,1" /><path class="prtts1" d="M82,11.7 l-1.6,2" /><path class="prtts1" d="M82.3,12 l-0.7,1" /><path class="prtts0" d="M82.7,12.3 l-3.2,3.9" /><defs><path id="p43" d="M77.3,17 l1.9,1.6" /></defs><text class="prtts2"><textPath href="#p43">07</textPath></text><path class="prtts1" d="M83.1,12.7 l-0.8,0.9" /><path class="prtts1" d="M83.5,13 l-1.7,1.9" /><path class="prtts1" d="M83.8,13.3 l-0.8,0.9" /><path class="prtts1" d="M84.2,13.6 l-1.6,1.9" /><path class="prtts1" d="M84.6,14 l-0.9,0.9" /><path class="prtts1" d="M84.9,14.3 l-1.7,1.8" /><path class="prtts1" d="M85.3,14.6 l-0.9,0.9" /><path class="prtts1" d="M85.7,15 l-1.8,1.8" /><path class="prtts1" d="M86,15.3 l-0.9,0.9" /><path class="prtts0" d="M86.4,15.6 l-3.6,3.6" /><defs><path id="p44" d="M80.5,19.7 l1.8,1.8" /></defs><text class="prtts2"><textPath href="#p44">08</textPath></text><path class="prtts1" d="M86.7,16 l-0.9,0.9" /><path class="prtts1" d="M87,16.3 l-1.8,1.8" /><path class="prtts1" d="M87.4,16.7 l-0.9,0.9" /><path class="prtts1" d="M87.7,17.1 l-1.8,1.7" /><path class="prtts1" d="M88,17.4 l-0.9,0.9" /><path class="prtts1" d="M88.4,17.8 l-1.9,1.6" /><path class="prtts1" d="M88.7,18.2 l-0.9,0.8" /><path class="prtts1" d="M89,18.5 l-1.9,1.7" /><path class="prtts1" d="M89.3,18.9 l-0.9,0.8" /><path class="prtts0" d="M89.7,19.3 l-3.9,3.2" /><defs><path id="p45" d="M83.4,22.8 l1.6,1.9" /></defs><text class="prtts2"><textPath href="#p45">09</textPath></text><path class="prtts1" d="M90,19.7 l-1,0.7" /><path class="prtts1" d="M90.3,20 l-2,1.6" /><path class="prtts1" d="M90.6,20.4 l-1,0.8" /><path class="prtts1" d="M90.9,20.8 l-2,1.5" /><path class="prtts1" d="M91.2,21.2 l-1,0.8" /><path class="prtts1" d="M91.5,21.6 l-2.1,1.5" /><path class="prtts1" d="M91.7,22 l-1,0.7" /><path class="prtts1" d="M92,22.4 l-2,1.4" /><path class="prtts1" d="M92.3,22.8 l-1,0.7" /><path class="prtts0" d="M92.6,23.2 l-4.2,2.8" /><defs><path id="p46" d="M86,26.1 l1.4,2.1" /></defs><text class="prtts2"><textPath href="#p46">10</textPath></text><path class="prtts1" d="M92.8,23.6 l-1,0.7" /><path class="prtts1" d="M93.1,24 l-2.1,1.4" /><path class="prtts1" d="M93.4,24.5 l-1.1,0.6" /><path class="prtts1" d="M93.6,24.9 l-2.1,1.3" /><path class="prtts1" d="M93.9,25.3 l-1.1,0.6" /><path class="prtts1" d="M94.1,25.7 l-2.1,1.3" /><path class="prtts1" d="M94.4,26.1 l-1.1,0.7" /><path class="prtts1" d="M94.6,26.6 l-2.2,1.2" /><path class="prtts1" d="M94.9,27 l-1.1,0.6" /><path class="prtts0" d="M95.1,27.4 l-4.4,2.4" /><defs><path id="p47" d="M88.3,29.6 l1.2,2.3" /></defs><text class="prtts2"><textPath href="#p47">11</textPath></text><path class="prtts1" d="M95.3,27.9 l-1.1,0.5" /><path class="prtts1" d="M95.6,28.3 l-2.3,1.1" /><path class="prtts1" d="M95.8,28.7 l-1.1,0.6" /><path class="prtts1" d="M96,29.2 l-2.3,1.1" /><path class="prtts1" d="M96.2,29.6 l-1.1,0.6" /><path class="prtts1" d="M96.4,30.1 l-2.3,1" /><path class="prtts1" d="M96.6,30.5 l-1.1,0.5" /><path class="prtts1" d="M96.8,31 l-2.3,1" /><path class="prtts1" d="M97,31.4 l-1.1,0.5" /><path class="prtts0" d="M97.2,31.9 l-4.6,1.9" /><defs><path id="p48" d="M90.2,33.4 l1,2.3" /></defs><text class="prtts2"><textPath href="#p48">12</textPath></text><path class="prtts1" d="M97.4,32.3 l-1.2,0.5" /><path class="prtts1" d="M97.6,32.8 l-2.4,0.9" /><path class="prtts1" d="M97.7,33.2 l-1.1,0.5" /><path class="prtts1" d="M97.9,33.7 l-2.3,0.9" /><path class="prtts1" d="M98.1,34.2 l-1.2,0.4" /><path class="prtts1" d="M98.2,34.6 l-2.3,0.8" /><path class="prtts1" d="M98.4,35.1 l-1.2,0.4" /><path class="prtts1" d="M98.6,35.5 l-2.4,0.8" /><path class="prtts1" d="M98.7,36 l-1.2,0.4" /><path class="prtts0" d="M98.8,36.5 l-4.7,1.4" /><defs><path id="p49" d="M91.8,37.3 l0.7,2.4" /></defs><text class="prtts2"><textPath href="#p49">13</textPath></text><path class="prtts1" d="M99,37 l-1.2,0.3" /><path class="prtts1" d="M99.1,37.4 l-2.4,0.7" /><path class="prtts1" d="M99.3,37.9 l-1.3,0.3" /><path class="prtts1" d="M99.4,38.4 l-2.4,0.6" /><path class="prtts1" d="M99.5,38.9 l-1.2,0.3" /><path class="prtts1" d="M99.6,39.3 l-2.4,0.6" /><path class="prtts1" d="M99.7,39.8 l-1.2,0.3" /><path class="prtts1" d="M99.8,40.3 l-2.4,0.5" /><path class="prtts1" d="M99.9,40.8 l-1.2,0.2" /><path class="prtts0" d="M100,41.2 l-4.9,1" /><defs><path id="p50" d="M92.9,41.4 l0.5,2.5" /></defs><text class="prtts2"><textPath href="#p50">14</textPath></text><path class="prtts1" d="M100.1,41.7 l-1.2,0.3" /><path class="prtts1" d="M100.2,42.2 l-2.4,0.4" /><path class="prtts1" d="M100.3,42.7 l-1.2,0.2" /><path class="prtts1" d="M100.4,43.2 l-2.5,0.4" /><path class="prtts1" d="M100.5,43.7 l-1.3,0.1" /><path class="prtts1" d="M100.5,44.1 l-2.4,0.4" /><path class="prtts1" d="M100.6,44.6 l-1.2,0.2" /><path class="prtts1" d="M100.7,45.1 l-2.5,0.3" /><path class="prtts1" d="M100.7,45.6 l-1.2,0.1" /><path class="prtts0" d="M100.8,46.1 l-5,0.5" /><defs><path id="p51" d="M93.7,45.5 l0.2,2.5" /></defs><text class="prtts2"><textPath href="#p51">15</textPath></text><path class="prtts1" d="M100.8,46.6 l-1.2,0.1" /><path class="prtts1" d="M100.8,47.1 l-2.4,0.2" /><path class="prtts1" d="M100.9,47.6 l-1.3,0.1" /><path class="prtts1" d="M100.9,48.1 l-2.5,0.1" /><path class="prtts1" d="M100.9,48.5 l-1.2,0.1" /><path class="prtts1" d="M101,49 l-2.5,0.1" /><path class="prtts1" d="M101,49.5 l-1.3,0.1" /><path class="prtts1" d="M101,50 l-2.5,0.1" /><path class="prtts1" d="M101,50.5 l-1.3,0" /><path class="prtts0" d="M101,51 l-5,0" /><defs><path id="p52" d="M94,49.7 l0,2.6" /></defs><text class="prtts2"><textPath href="#p52">16</textPath></text><path class="prtts1" d="M101,51.5 l-1.3,0" /><path class="prtts1" d="M101,52 l-2.5,-0.1" /><path class="prtts1" d="M101,52.5 l-1.3,-0.1" /><path class="prtts1" d="M101,53 l-2.5,-0.1" /><path class="prtts1" d="M100.9,53.5 l-1.2,-0.1" /><path class="prtts1" d="M100.9,53.9 l-2.5,-0.1" /><path class="prtts1" d="M100.9,54.4 l-1.3,-0.1" /><path class="prtts1" d="M100.8,54.9 l-2.4,-0.2" /><path class="prtts1" d="M100.8,55.4 l-1.2,-0.1" /><path class="prtts0" d="M100.8,55.9 l-5,-0.5" /><defs><path id="p53" d="M93.9,54 l-0.2,2.5" /></defs><text class="prtts2"><textPath href="#p53">17</textPath></text><path class="prtts1" d="M100.7,56.4 l-1.2,-0.1" /><path class="prtts1" d="M100.7,56.9 l-2.5,-0.3" /><path class="prtts1" d="M100.6,57.4 l-1.2,-0.2" /><path class="prtts1" d="M100.5,57.9 l-2.4,-0.4" /><path class="prtts1" d="M100.5,58.3 l-1.3,-0.1" /><path class="prtts1" d="M100.4,58.8 l-2.5,-0.4" /><path class="prtts1" d="M100.3,59.3 l-1.2,-0.2" /><path class="prtts1" d="M100.2,59.8 l-2.4,-0.4" /><path class="prtts1" d="M100.1,60.3 l-1.2,-0.3" /><path class="prtts0" d="M100,60.8 l-4.9,-1" /><defs><path id="p54" d="M93.4,58.1 l-0.5,2.5" /></defs><text class="prtts2"><textPath href="#p54">18</textPath></text><path class="prtts1" d="M99.9,61.2 l-1.2,-0.2" /><path class="prtts1" d="M99.8,61.7 l-2.4,-0.5" /><path class="prtts1" d="M99.7,62.2 l-1.2,-0.3" /><path class="prtts1" d="M99.6,62.7 l-2.4,-0.6" /><path class="prtts1" d="M99.5,63.1 l-1.2,-0.3" /><path class="prtts1" d="M99.4,63.6 l-2.4,-0.6" /><path class="prtts1" d="M99.3,64.1 l-1.3,-0.3" /><path class="prtts1" d="M99.1,64.6 l-2.4,-0.7" /><path class="prtts1" d="M99,65 l-1.2,-0.3" /><path class="prtts0" d="M98.8,65.5 l-4.7,-1.4" /><defs><path id="p55" d="M92.5,62.3 l-0.7,2.4" /></defs><text class="prtts2"><textPath href="#p55">19</textPath></text><path class="prtts1" d="M98.7,66 l-1.2,-0.4" /><path class="prtts1" d="M98.6,66.5 l-2.4,-0.8" /><path class="prtts1" d="M98.4,66.9 l-1.2,-0.4" /><path class="prtts1" d="M98.2,67.4 l-2.3,-0.8" /><path class="prtts1" d="M98.1,67.8 l-1.2,-0.4" /><path class="prtts1" d="M97.9,68.3 l-2.3,-0.9" /><path class="prtts1" d="M97.7,68.8 l-1.1,-0.5" /><path class="prtts1" d="M97.6,69.2 l-2.4,-0.9" /><path class="prtts1" d="M97.4,69.7 l-1.2,-0.5" /><path class="prtts0" d="M97.2,70.1 l-4.6,-1.9" /><defs><path id="p56" d="M91.2,66.3 l-1,2.3" /></defs><text class="prtts2"><textPath href="#p56">20</textPath></text><path class="prtts1" d="M97,70.6 l-1.1,-0.5" /><path class="prtts1" d="M96.8,71 l-2.3,-1" /><path class="prtts1" d="M96.6,71.5 l-1.1,-0.5" /><path class="prtts1" d="M96.4,71.9 l-2.3,-1" /><path class="prtts1" d="M96.2,72.4 l-1.1,-0.6" /><path class="prtts1" d="M96,72.8 l-2.3,-1.1" /><path class="prtts1" d="M95.8,73.3 l-1.1,-0.6" /><path class="prtts1" d="M95.6,73.7 l-2.3,-1.1" /><path class="prtts1" d="M95.3,74.1 l-1.1,-0.5" /><path class="prtts0" d="M95.1,74.6 l-4.4,-2.4" /><defs><path id="p57" d="M89.5,70.1 l-1.2,2.3" /></defs><text class="prtts2"><textPath href="#p57">21</textPath></text><path class="prtts1" d="M94.9,75 l-1.1,-0.6" /><path class="prtts1" d="M94.6,75.4 l-2.2,-1.2" /><path class="prtts1" d="M94.4,75.9 l-1.1,-0.7" /><path class="prtts1" d="M94.1,76.3 l-2.1,-1.3" /><path class="prtts1" d="M93.9,76.7 l-1.1,-0.6" /><path class="prtts1" d="M93.6,77.1 l-2.1,-1.3" /><path class="prtts1" d="M93.4,77.5 l-1.1,-0.6" /><path class="prtts1" d="M93.1,78 l-2.1,-1.4" /><path class="prtts1" d="M92.8,78.4 l-1,-0.7" /><path class="prtts0" d="M92.6,78.8 l-4.2,-2.8" /><defs><path id="p58" d="M87.4,73.8 l-1.4,2.1" /></defs><text class="prtts2"><textPath href="#p58">22</textPath></text><path class="prtts1" d="M92.3,79.2 l-1,-0.7" /><path class="prtts1" d="M92,79.6 l-2,-1.4" /><path class="prtts1" d="M91.7,80 l-1,-0.7" /><path class="prtts1" d="M91.5,80.4 l-2.1,-1.5" /><path class="prtts1" d="M91.2,80.8 l-1,-0.8" /><path class="prtts1" d="M90.9,81.2 l-2,-1.5" /><path class="prtts1" d="M90.6,81.6 l-1,-0.8" /><path class="prtts1" d="M90.3,82 l-2,-1.6" /><path class="prtts1" d="M90,82.3 l-1,-0.7" /><path class="prtts0" d="M89.7,82.7 l-3.9,-3.2" /><defs><path id="p59" d="M85,77.3 l-1.6,1.9" /></defs><text class="prtts2"><textPath href="#p59">23</textPath></text><path class="prtts1" d="M89.3,83.1 l-0.9,-0.8" /><path class="prtts1" d="M89,83.5 l-1.9,-1.7" /><path class="prtts1" d="M88.7,83.8 l-0.9,-0.8" /><path class="prtts1" d="M88.4,84.2 l-1.9,-1.6" /><path class="prtts1" d="M88,84.6 l-0.9,-0.9" /><path class="prtts1" d="M87.7,84.9 l-1.8,-1.7" /><path class="prtts1" d="M87.4,85.3 l-0.9,-0.9" /><path class="prtts1" d="M87,85.7 l-1.8,-1.8" /><path class="prtts1" d="M86.7,86 l-0.9,-0.9" /><path class="prtts0" d="M86.4,86.4 l-3.6,-3.6" /><defs><path id="p60" d="M82.3,80.5 l-1.8,1.8" /></defs><text class="prtts2"><textPath href="#p60">24</textPath></text><path class="prtts1" d="M86,86.7 l-0.9,-0.9" /><path class="prtts1" d="M85.7,87 l-1.8,-1.8" /><path class="prtts1" d="M85.3,87.4 l-0.9,-0.9" /><path class="prtts1" d="M84.9,87.7 l-1.7,-1.8" /><path class="prtts1" d="M84.6,88 l-0.9,-0.9" /><path class="prtts1" d="M84.2,88.4 l-1.6,-1.9" /><path class="prtts1" d="M83.8,88.7 l-0.8,-0.9" /><path class="prtts1" d="M83.5,89 l-1.7,-1.9" /><path class="prtts1" d="M83.1,89.3 l-0.8,-0.9" /><path class="prtts0" d="M82.7,89.7 l-3.2,-3.9" /><defs><path id="p61" d="M79.2,83.4 l-1.9,1.6" /></defs><text class="prtts2"><textPath href="#p61">25</textPath></text><path class="prtts1" d="M82.3,90 l-0.7,-1" /><path class="prtts1" d="M82,90.3 l-1.6,-2" /><path class="prtts1" d="M81.6,90.6 l-0.8,-1" /><path class="prtts1" d="M81.2,90.9 l-1.5,-2" /><path class="prtts1" d="M80.8,91.2 l-0.8,-1" /><path class="prtts1" d="M80.4,91.5 l-1.5,-2.1" /><path class="prtts1" d="M80,91.7 l-0.7,-1" /><path class="prtts1" d="M79.6,92 l-1.4,-2" /><path class="prtts1" d="M79.2,92.3 l-0.7,-1" /><path class="prtts0" d="M78.8,92.6 l-2.8,-4.2" /><defs><path id="p62" d="M75.9,86 l-2.1,1.4" /></defs><text class="prtts2"><textPath href="#p62">26</textPath></text><path class="prtts1" d="M78.4,92.8 l-0.7,-1" /><path class="prtts1" d="M78,93.1 l-1.4,-2.1" /><path class="prtts1" d="M77.5,93.4 l-0.6,-1.1" /><path class="prtts1" d="M77.1,93.6 l-1.3,-2.1" /><path class="prtts1" d="M76.7,93.9 l-0.6,-1.1" /><path class="prtts1" d="M76.3,94.1 l-1.3,-2.1" /><path class="prtts1" d="M75.9,94.4 l-0.7,-1.1" /><path class="prtts1" d="M75.4,94.6 l-1.2,-2.2" /><path class="prtts1" d="M75,94.9 l-0.6,-1.1" /><path class="prtts0" d="M74.6,95.1 l-2.4,-4.4" /><defs><path id="p63" d="M72.4,88.3 l-2.3,1.2" /></defs><text class="prtts2"><textPath href="#p63">27</textPath></text><path class="prtts1" d="M74.1,95.3 l-0.5,-1.1" /><path class="prtts1" d="M73.7,95.6 l-1.1,-2.3" /><path class="prtts1" d="M73.3,95.8 l-0.6,-1.1" /><path class="prtts1" d="M72.8,96 l-1.1,-2.3" /><path class="prtts1" d="M72.4,96.2 l-0.6,-1.1" /><path class="prtts1" d="M71.9,96.4 l-1,-2.3" /><path class="prtts1" d="M71.5,96.6 l-0.5,-1.1" /><path class="prtts1" d="M71,96.8 l-1,-2.3" /><path class="prtts1" d="M70.6,97 l-0.5,-1.1" /><path class="prtts0" d="M70.1,97.2 l-1.9,-4.6" /><defs><path id="p64" d="M68.6,90.2 l-2.3,1" /></defs><text class="prtts2"><textPath href="#p64">28</textPath></text><path class="prtts1" d="M69.7,97.4 l-0.5,-1.2" /><path class="prtts1" d="M69.2,97.6 l-0.9,-2.4" /><path class="prtts1" d="M68.8,97.7 l-0.5,-1.1" /><path class="prtts1" d="M68.3,97.9 l-0.9,-2.3" /><path class="prtts1" d="M67.8,98.1 l-0.4,-1.2" /><path class="prtts1" d="M67.4,98.2 l-0.8,-2.3" /><path class="prtts1" d="M66.9,98.4 l-0.4,-1.2" /><path class="prtts1" d="M66.5,98.6 l-0.8,-2.4" /><path class="prtts1" d="M66,98.7 l-0.4,-1.2" /><path class="prtts0" d="M65.5,98.8 l-1.4,-4.7" /><defs><path id="p65" d="M64.7,91.8 l-2.4,0.7" /></defs><text class="prtts2"><textPath href="#p65">29</textPath></text><path class="prtts1" d="M65,99 l-0.3,-1.2" /><path class="prtts1" d="M64.6,99.1 l-0.7,-2.4" /><path class="prtts1" d="M64.1,99.3 l-0.3,-1.3" /><path class="prtts1" d="M63.6,99.4 l-0.6,-2.4" /><path class="prtts1" d="M63.1,99.5 l-0.3,-1.2" /><path class="prtts1" d="M62.7,99.6 l-0.6,-2.4" /><path class="prtts1" d="M62.2,99.7 l-0.3,-1.2" /><path class="prtts1" d="M61.7,99.8 l-0.5,-2.4" /><path class="prtts1" d="M61.2,99.9 l-0.2,-1.2" /><path class="prtts0" d="M60.8,100 l-1,-4.9" /><defs><path id="p66" d="M60.6,92.9 l-2.5,0.5" /></defs><text class="prtts2"><textPath href="#p66">30</textPath></text><path class="prtts1" d="M60.3,100.1 l-0.3,-1.2" /><path class="prtts1" d="M59.8,100.2 l-0.4,-2.4" /><path class="prtts1" d="M59.3,100.3 l-0.2,-1.2" /><path class="prtts1" d="M58.8,100.4 l-0.4,-2.5" /><path class="prtts1" d="M58.3,100.5 l-0.1,-1.3" /><path class="prtts1" d="M57.9,100.5 l-0.4,-2.4" /><path class="prtts1" d="M57.4,100.6 l-0.2,-1.2" /><path class="prtts1" d="M56.9,100.7 l-0.3,-2.5" /><path class="prtts1" d="M56.4,100.7 l-0.1,-1.2" /><path class="prtts0" d="M55.9,100.8 l-0.5,-5" /><defs><path id="p67" d="M56.5,93.7 l-2.5,0.2" /></defs><text class="prtts2"><textPath href="#p67">31</textPath></text><path class="prtts1" d="M55.4,100.8 l-0.1,-1.2" /><path class="prtts1" d="M54.9,100.8 l-0.2,-2.4" /><path class="prtts1" d="M54.4,100.9 l-0.1,-1.3" /><path class="prtts1" d="M53.9,100.9 l-0.1,-2.5" /><path class="prtts1" d="M53.5,100.9 l-0.1,-1.2" /><path class="prtts1" d="M53,101 l-0.1,-2.5" /><path class="prtts1" d="M52.5,101 l-0.1,-1.3" /><path class="prtts1" d="M52,101 l-0.1,-2.5" /><path class="prtts1" d="M51.5,101 l0,-1.3" /><path class="prtts0" d="M51,101 l0,-5" /><defs><path id="p68" d="M52.3,94 l-2.6,0" /></defs><text class="prtts2"><textPath href="#p68">32</textPath></text><path class="prtts1" d="M50.5,101 l0,-1.3" /><path class="prtts1" d="M50,101 l0.1,-2.5" /><path class="prtts1" d="M49.5,101 l0.1,-1.3" /><path class="prtts1" d="M49,101 l0.1,-2.5" /><path class="prtts1" d="M48.5,100.9 l0.1,-1.2" /><path class="prtts1" d="M48.1,100.9 l0.1,-2.5" /><path class="prtts1" d="M47.6,100.9 l0.1,-1.3" /><path class="prtts1" d="M47.1,100.8 l0.2,-2.4" /><path class="prtts1" d="M46.6,100.8 l0.1,-1.2" /><path class="prtts0" d="M46.1,100.8 l0.5,-5" /><defs><path id="p69" d="M48,93.9 l-2.5,-0.2" /></defs><text class="prtts2"><textPath href="#p69">33</textPath></text><path class="prtts1" d="M45.6,100.7 l0.1,-1.2" /><path class="prtts1" d="M45.1,100.7 l0.3,-2.5" /><path class="prtts1" d="M44.6,100.6 l0.2,-1.2" /><path class="prtts1" d="M44.1,100.5 l0.4,-2.4" /><path class="prtts1" d="M43.7,100.5 l0.1,-1.3" /><path class="prtts1" d="M43.2,100.4 l0.4,-2.5" /><path class="prtts1" d="M42.7,100.3 l0.2,-1.2" /><path class="prtts1" d="M42.2,100.2 l0.4,-2.4" /><path class="prtts1" d="M41.7,100.1 l0.3,-1.2" /><path class="prtts0" d="M41.2,100 l1,-4.9" /><defs><path id="p70" d="M43.9,93.4 l-2.5,-0.5" /></defs><text class="prtts2"><textPath href="#p70">34</textPath></text><path class="prtts1" d="M40.8,99.9 l0.2,-1.2" /><path class="prtts1" d="M40.3,99.8 l0.5,-2.4" /><path class="prtts1" d="M39.8,99.7 l0.3,-1.2" /><path class="prtts1" d="M39.3,99.6 l0.6,-2.4" /><path class="prtts1" d="M38.9,99.5 l0.3,-1.2" /><path class="prtts1" d="M38.4,99.4 l0.6,-2.4" /><path class="prtts1" d="M37.9,99.3 l0.3,-1.3" /><path class="prtts1" d="M37.4,99.1 l0.7,-2.4" /><path class="prtts1" d="M37,99 l0.3,-1.2" /><path class="prtts0" d="M36.5,98.8 l1.4,-4.7" /><defs><path id="p71" d="M39.7,92.5 l-2.4,-0.7" /></defs><text class="prtts2"><textPath href="#p71">35</textPath></text><path class="prtts1" d="M36,98.7 l0.4,-1.2" /><path class="prtts1" d="M35.5,98.6 l0.8,-2.4" /><path class="prtts1" d="M35.1,98.4 l0.4,-1.2" /><path class="prtts1" d="M34.6,98.2 l0.8,-2.3" /><path class="prtts1" d="M34.2,98.1 l0.4,-1.2" /><path class="prtts1" d="M33.7,97.9 l0.9,-2.3" /><path class="prtts1" d="M33.2,97.7 l0.5,-1.1" /><path class="prtts1" d="M32.8,97.6 l0.9,-2.4" /><path class="prtts1" d="M32.3,97.4 l0.5,-1.2" /><path class="prtts0" d="M31.9,97.2 l1.9,-4.6" /><defs><path id="p72" d="M35.7,91.2 l-2.3,-1" /></defs><text class="prtts2"><textPath href="#p72">36</textPath></text><path class="prtts1" d="M31.4,97 l0.5,-1.1" /><path class="prtts1" d="M31,96.8 l1,-2.3" /><path class="prtts1" d="M30.5,96.6 l0.5,-1.1" /><path class="prtts1" d="M30.1,96.4 l1,-2.3" /><path class="prtts1" d="M29.6,96.2 l0.6,-1.1" /><path class="prtts1" d="M29.2,96 l1.1,-2.3" /><path class="prtts1" d="M28.7,95.8 l0.6,-1.1" /><path class="prtts1" d="M28.3,95.6 l1.1,-2.3" /><path class="prtts1" d="M27.9,95.3 l0.5,-1.1" /><path class="prtts0" d="M27.4,95.1 l2.4,-4.4" /><defs><path id="p73" d="M31.9,89.5 l-2.3,-1.2" /></defs><text class="prtts2"><textPath href="#p73">37</textPath></text><path class="prtts1" d="M27,94.9 l0.6,-1.1" /><path class="prtts1" d="M26.6,94.6 l1.2,-2.2" /><path class="prtts1" d="M26.1,94.4 l0.7,-1.1" /><path class="prtts1" d="M25.7,94.1 l1.3,-2.1" /><path class="prtts1" d="M25.3,93.9 l0.6,-1.1" /><path class="prtts1" d="M24.9,93.6 l1.3,-2.1" /><path class="prtts1" d="M24.5,93.4 l0.6,-1.1" /><path class="prtts1" d="M24,93.1 l1.4,-2.1" /><path class="prtts1" d="M23.6,92.8 l0.7,-1" /><path class="prtts0" d="M23.2,92.6 l2.8,-4.2" /><defs><path id="p74" d="M28.2,87.4 l-2.1,-1.4" /></defs><text class="prtts2"><textPath href="#p74">38</textPath></text><path class="prtts1" d="M22.8,92.3 l0.7,-1" /><path class="prtts1" d="M22.4,92 l1.4,-2" /><path class="prtts1" d="M22,91.7 l0.7,-1" /><path class="prtts1" d="M21.6,91.5 l1.5,-2.1" /><path class="prtts1" d="M21.2,91.2 l0.8,-1" /><path class="prtts1" d="M20.8,90.9 l1.5,-2" /><path class="prtts1" d="M20.4,90.6 l0.8,-1" /><path class="prtts1" d="M20,90.3 l1.6,-2" /><path class="prtts1" d="M19.7,90 l0.7,-1" /><path class="prtts0" d="M19.3,89.7 l3.2,-3.9" /><defs><path id="p75" d="M24.7,85 l-1.9,-1.6" /></defs><text class="prtts2"><textPath href="#p75">39</textPath></text><path class="prtts1" d="M18.9,89.3 l0.8,-0.9" /><path class="prtts1" d="M18.5,89 l1.7,-1.9" /><path class="prtts1" d="M18.2,88.7 l0.8,-0.9" /><path class="prtts1" d="M17.8,88.4 l1.6,-1.9" /><path class="prtts1" d="M17.4,88 l0.9,-0.9" /><path class="prtts1" d="M17.1,87.7 l1.7,-1.8" /><path class="prtts1" d="M16.7,87.4 l0.9,-0.9" /><path class="prtts1" d="M16.3,87 l1.8,-1.8" /><path class="prtts1" d="M16,86.7 l0.9,-0.9" /><path class="prtts0" d="M15.6,86.4 l3.6,-3.6" /><defs><path id="p76" d="M21.5,82.3 l-1.8,-1.8" /></defs><text class="prtts2"><textPath href="#p76">40</textPath></text><path class="prtts1" d="M15.3,86 l0.9,-0.9" /><path class="prtts1" d="M15,85.7 l1.8,-1.8" /><path class="prtts1" d="M14.6,85.3 l0.9,-0.9" /><path class="prtts1" d="M14.3,84.9 l1.8,-1.7" /><path class="prtts1" d="M14,84.6 l0.9,-0.9" /><path class="prtts1" d="M13.6,84.2 l1.9,-1.6" /><path class="prtts1" d="M13.3,83.8 l0.9,-0.8" /><path class="prtts1" d="M13,83.5 l1.9,-1.7" /><path class="prtts1" d="M12.7,83.1 l0.9,-0.8" /><path class="prtts0" d="M12.3,82.7 l3.9,-3.2" /><defs><path id="p77" d="M18.6,79.2 l-1.6,-1.9" /></defs><text class="prtts2"><textPath href="#p77">41</textPath></text><path class="prtts1" d="M12,82.3 l1,-0.7" /><path class="prtts1" d="M11.7,82 l2,-1.6" /><path class="prtts1" d="M11.4,81.6 l1,-0.8" /><path class="prtts1" d="M11.1,81.2 l2,-1.5" /><path class="prtts1" d="M10.8,80.8 l1,-0.8" /><path class="prtts1" d="M10.5,80.4 l2.1,-1.5" /><path class="prtts1" d="M10.3,80 l1,-0.7" /><path class="prtts1" d="M10,79.6 l2,-1.4" /><path class="prtts1" d="M9.7,79.2 l1,-0.7" /><path class="prtts0" d="M9.4,78.8 l4.2,-2.8" /><defs><path id="p78" d="M16,75.9 l-1.4,-2.1" /></defs><text class="prtts2"><textPath href="#p78">42</textPath></text><path class="prtts1" d="M9.2,78.4 l1,-0.7" /><path class="prtts1" d="M8.9,78 l2.1,-1.4" /><path class="prtts1" d="M8.6,77.5 l1.1,-0.6" /><path class="prtts1" d="M8.4,77.1 l2.1,-1.3" /><path class="prtts1" d="M8.1,76.7 l1.1,-0.6" /><path class="prtts1" d="M7.9,76.3 l2.1,-1.3" /><path class="prtts1" d="M7.6,75.9 l1.1,-0.7" /><path class="prtts1" d="M7.4,75.4 l2.2,-1.2" /><path class="prtts1" d="M7.1,75 l1.1,-0.6" /><path class="prtts0" d="M6.9,74.6 l4.4,-2.4" /><defs><path id="p79" d="M13.7,72.4 l-1.2,-2.3" /></defs><text class="prtts2"><textPath href="#p79">43</textPath></text><path class="prtts1" d="M6.7,74.1 l1.1,-0.5" /><path class="prtts1" d="M6.4,73.7 l2.3,-1.1" /><path class="prtts1" d="M6.2,73.3 l1.1,-0.6" /><path class="prtts1" d="M6,72.8 l2.3,-1.1" /><path class="prtts1" d="M5.8,72.4 l1.1,-0.6" /><path class="prtts1" d="M5.6,71.9 l2.3,-1" /><path class="prtts1" d="M5.4,71.5 l1.1,-0.5" /><path class="prtts1" d="M5.2,71 l2.3,-1" /><path class="prtts1" d="M5,70.6 l1.1,-0.5" /><path class="prtts0" d="M4.8,70.1 l4.6,-1.9" /><defs><path id="p80" d="M11.8,68.6 l-1,-2.3" /></defs><text class="prtts2"><textPath href="#p80">44</textPath></text><path class="prtts1" d="M4.6,69.7 l1.2,-0.5" /><path class="prtts1" d="M4.4,69.2 l2.4,-0.9" /><path class="prtts1" d="M4.3,68.8 l1.1,-0.5" /><path class="prtts1" d="M4.1,68.3 l2.3,-0.9" /><path class="prtts1" d="M3.9,67.8 l1.2,-0.4" /><path class="prtts1" d="M3.8,67.4 l2.3,-0.8" /><path class="prtts1" d="M3.6,66.9 l1.2,-0.4" /><path class="prtts1" d="M3.4,66.5 l2.4,-0.8" /><path class="prtts1" d="M3.3,66 l1.2,-0.4" /><path class="prtts0" d="M3.2,65.5 l4.7,-1.4" /><defs><path id="p81" d="M10.2,64.7 l-0.7,-2.4" /></defs><text class="prtts2"><textPath href="#p81">45</textPath></text><path class="prtts1" d="M3,65 l1.2,-0.3" /><path class="prtts1" d="M2.9,64.6 l2.4,-0.7" /><path class="prtts1" d="M2.7,64.1 l1.3,-0.3" /><path class="prtts1" d="M2.6,63.6 l2.4,-0.6" /><path class="prtts1" d="M2.5,63.1 l1.2,-0.3" /><path class="prtts1" d="M2.4,62.7 l2.4,-0.6" /><path class="prtts1" d="M2.3,62.2 l1.2,-0.3" /><path class="prtts1" d="M2.2,61.7 l2.4,-0.5" /><path class="prtts1" d="M2.1,61.2 l1.2,-0.2" /><path class="prtts0" d="M2,60.8 l4.9,-1" /><defs><path id="p82" d="M9.1,60.6 l-0.5,-2.5" /></defs><text class="prtts2"><textPath href="#p82">46</textPath></text><path class="prtts1" d="M1.9,60.3 l1.2,-0.3" /><path class="prtts1" d="M1.8,59.8 l2.4,-0.4" /><path class="prtts1" d="M1.7,59.3 l1.2,-0.2" /><path class="prtts1" d="M1.6,58.8 l2.5,-0.4" /><path class="prtts1" d="M1.5,58.3 l1.3,-0.1" /><path class="prtts1" d="M1.5,57.9 l2.4,-0.4" /><path class="prtts1" d="M1.4,57.4 l1.2,-0.2" /><path class="prtts1" d="M1.3,56.9 l2.5,-0.3" /><path class="prtts1" d="M1.3,56.4 l1.2,-0.1" /><path class="prtts0" d="M1.2,55.9 l5,-0.5" /><defs><path id="p83" d="M8.3,56.5 l-0.2,-2.5" /></defs><text class="prtts2"><textPath href="#p83">47</textPath></text><path class="prtts1" d="M1.2,55.4 l1.2,-0.1" /><path class="prtts1" d="M1.2,54.9 l2.4,-0.2" /><path class="prtts1" d="M1.1,54.4 l1.3,-0.1" /><path class="prtts1" d="M1.1,53.9 l2.5,-0.1" /><path class="prtts1" d="M1.1,53.5 l1.2,-0.1" /><path class="prtts1" d="M1,53 l2.5,-0.1" /><path class="prtts1" d="M1,52.5 l1.3,-0.1" /><path class="prtts1" d="M1,52 l2.5,-0.1" /><path class="prtts1" d="M1,51.5 l1.3,0" /><path class="prtts0" d="M1,51 l5,0" /><defs><path id="p84" d="M8,52.3 l0,-2.6" /></defs><text class="prtts2"><textPath href="#p84">48</textPath></text><path class="prtts1" d="M1,50.5 l1.3,0" /><path class="prtts1" d="M1,50 l2.5,0.1" /><path class="prtts1" d="M1,49.5 l1.3,0.1" /><path class="prtts1" d="M1,49 l2.5,0.1" /><path class="prtts1" d="M1.1,48.5 l1.2,0.1" /><path class="prtts1" d="M1.1,48.1 l2.5,0.1" /><path class="prtts1" d="M1.1,47.6 l1.3,0.1" /><path class="prtts1" d="M1.2,47.1 l2.4,0.2" /><path class="prtts1" d="M1.2,46.6 l1.2,0.1" /><path class="prtts0" d="M1.2,46.1 l5,0.5" /><defs><path id="p85" d="M8.1,48 l0.2,-2.5" /></defs><text class="prtts2"><textPath href="#p85">49</textPath></text><path class="prtts1" d="M1.3,45.6 l1.2,0.1" /><path class="prtts1" d="M1.3,45.1 l2.5,0.3" /><path class="prtts1" d="M1.4,44.6 l1.2,0.2" /><path class="prtts1" d="M1.5,44.1 l2.4,0.4" /><path class="prtts1" d="M1.5,43.7 l1.3,0.1" /><path class="prtts1" d="M1.6,43.2 l2.5,0.4" /><path class="prtts1" d="M1.7,42.7 l1.2,0.2" /><path class="prtts1" d="M1.8,42.2 l2.4,0.4" /><path class="prtts1" d="M1.9,41.7 l1.2,0.3" /><path class="prtts0" d="M2,41.2 l4.9,1" /><defs><path id="p86" d="M8.6,43.9 l0.5,-2.5" /></defs><text class="prtts2"><textPath href="#p86">50</textPath></text><path class="prtts1" d="M2.1,40.8 l1.2,0.2" /><path class="prtts1" d="M2.2,40.3 l2.4,0.5" /><path class="prtts1" d="M2.3,39.8 l1.2,0.3" /><path class="prtts1" d="M2.4,39.3 l2.4,0.6" /><path class="prtts1" d="M2.5,38.9 l1.2,0.3" /><path class="prtts1" d="M2.6,38.4 l2.4,0.6" /><path class="prtts1" d="M2.7,37.9 l1.3,0.3" /><path class="prtts1" d="M2.9,37.4 l2.4,0.7" /><path class="prtts1" d="M3,37 l1.2,0.3" /><path class="prtts0" d="M3.2,36.5 l4.7,1.4" /><defs><path id="p87" d="M9.5,39.7 l0.7,-2.4" /></defs><text class="prtts2"><textPath href="#p87">51</textPath></text><path class="prtts1" d="M3.3,36 l1.2,0.4" /><path class="prtts1" d="M3.4,35.5 l2.4,0.8" /><path class="prtts1" d="M3.6,35.1 l1.2,0.4" /><path class="prtts1" d="M3.8,34.6 l2.3,0.8" /><path class="prtts1" d="M3.9,34.2 l1.2,0.4" /><path class="prtts1" d="M4.1,33.7 l2.3,0.9" /><path class="prtts1" d="M4.3,33.2 l1.1,0.5" /><path class="prtts1" d="M4.4,32.8 l2.4,0.9" /><path class="prtts1" d="M4.6,32.3 l1.2,0.5" /><path class="prtts0" d="M4.8,31.9 l4.6,1.9" /><defs><path id="p88" d="M10.8,35.7 l1,-2.3" /></defs><text class="prtts2"><textPath href="#p88">52</textPath></text><path class="prtts1" d="M5,31.4 l1.1,0.5" /><path class="prtts1" d="M5.2,31 l2.3,1" /><path class="prtts1" d="M5.4,30.5 l1.1,0.5" /><path class="prtts1" d="M5.6,30.1 l2.3,1" /><path class="prtts1" d="M5.8,29.6 l1.1,0.6" /><path class="prtts1" d="M6,29.2 l2.3,1.1" /><path class="prtts1" d="M6.2,28.7 l1.1,0.6" /><path class="prtts1" d="M6.4,28.3 l2.3,1.1" /><path class="prtts1" d="M6.7,27.9 l1.1,0.5" /><path class="prtts0" d="M6.9,27.4 l4.4,2.4" /><defs><path id="p89" d="M12.5,31.9 l1.2,-2.3" /></defs><text class="prtts2"><textPath href="#p89">53</textPath></text><path class="prtts1" d="M7.1,27 l1.1,0.6" /><path class="prtts1" d="M7.4,26.6 l2.2,1.2" /><path class="prtts1" d="M7.6,26.1 l1.1,0.7" /><path class="prtts1" d="M7.9,25.7 l2.1,1.3" /><path class="prtts1" d="M8.1,25.3 l1.1,0.6" /><path class="prtts1" d="M8.4,24.9 l2.1,1.3" /><path class="prtts1" d="M8.6,24.5 l1.1,0.6" /><path class="prtts1" d="M8.9,24 l2.1,1.4" /><path class="prtts1" d="M9.2,23.6 l1,0.7" /><path class="prtts0" d="M9.4,23.2 l4.2,2.8" /><defs><path id="p90" d="M14.6,28.2 l1.4,-2.1" /></defs><text class="prtts2"><textPath href="#p90">54</textPath></text><path class="prtts1" d="M9.7,22.8 l1,0.7" /><path class="prtts1" d="M10,22.4 l2,1.4" /><path class="prtts1" d="M10.3,22 l1,0.7" /><path class="prtts1" d="M10.5,21.6 l2.1,1.5" /><path class="prtts1" d="M10.8,21.2 l1,0.8" /><path class="prtts1" d="M11.1,20.8 l2,1.5" /><path class="prtts1" d="M11.4,20.4 l1,0.8" /><path class="prtts1" d="M11.7,20 l2,1.6" /><path class="prtts1" d="M12,19.7 l1,0.7" /><path class="prtts0" d="M12.3,19.3 l3.9,3.2" /><defs><path id="p91" d="M17,24.7 l1.6,-1.9" /></defs><text class="prtts2"><textPath href="#p91">55</textPath></text><path class="prtts1" d="M12.7,18.9 l0.9,0.8" /><path class="prtts1" d="M13,18.5 l1.9,1.7" /><path class="prtts1" d="M13.3,18.2 l0.9,0.8" /><path class="prtts1" d="M13.6,17.8 l1.9,1.6" /><path class="prtts1" d="M14,17.4 l0.9,0.9" /><path class="prtts1" d="M14.3,17.1 l1.8,1.7" /><path class="prtts1" d="M14.6,16.7 l0.9,0.9" /><path class="prtts1" d="M15,16.3 l1.8,1.8" /><path class="prtts1" d="M15.3,16 l0.9,0.9" /><path class="prtts0" d="M15.6,15.6 l3.6,3.6" /><defs><path id="p92" d="M19.7,21.5 l1.8,-1.8" /></defs><text class="prtts2"><textPath href="#p92">56</textPath></text><path class="prtts1" d="M16,15.3 l0.9,0.9" /><path class="prtts1" d="M16.3,15 l1.8,1.8" /><path class="prtts1" d="M16.7,14.6 l0.9,0.9" /><path class="prtts1" d="M17.1,14.3 l1.7,1.8" /><path class="prtts1" d="M17.4,14 l0.9,0.9" /><path class="prtts1" d="M17.8,13.6 l1.6,1.9" /><path class="prtts1" d="M18.2,13.3 l0.8,0.9" /><path class="prtts1" d="M18.5,13 l1.7,1.9" /><path class="prtts1" d="M18.9,12.7 l0.8,0.9" /><path class="prtts0" d="M19.3,12.3 l3.2,3.9" /><defs><path id="p93" d="M22.8,18.6 l1.9,-1.6" /></defs><text class="prtts2"><textPath href="#p93">57</textPath></text><path class="prtts1" d="M19.7,12 l0.7,1" /><path class="prtts1" d="M20,11.7 l1.6,2" /><path class="prtts1" d="M20.4,11.4 l0.8,1" /><path class="prtts1" d="M20.8,11.1 l1.5,2" /><path class="prtts1" d="M21.2,10.8 l0.8,1" /><path class="prtts1" d="M21.6,10.5 l1.5,2.1" /><path class="prtts1" d="M22,10.3 l0.7,1" /><path class="prtts1" d="M22.4,10 l1.4,2" /><path class="prtts1" d="M22.8,9.7 l0.7,1" /><path class="prtts0" d="M23.2,9.4 l2.8,4.2" /><defs><path id="p94" d="M26.1,16 l2.1,-1.4" /></defs><text class="prtts2"><textPath href="#p94">58</textPath></text><path class="prtts1" d="M23.6,9.2 l0.7,1" /><path class="prtts1" d="M24,8.9 l1.4,2.1" /><path class="prtts1" d="M24.5,8.6 l0.6,1.1" /><path class="prtts1" d="M24.9,8.4 l1.3,2.1" /><path class="prtts1" d="M25.3,8.1 l0.6,1.1" /><path class="prtts1" d="M25.7,7.9 l1.3,2.1" /><path class="prtts1" d="M26.1,7.6 l0.7,1.1" /><path class="prtts1" d="M26.6,7.4 l1.2,2.2" /><path class="prtts1" d="M27,7.1 l0.6,1.1" /><path class="prtts0" d="M27.4,6.9 l2.4,4.4" /><defs><path id="p95" d="M29.6,13.7 l2.3,-1.2" /></defs><text class="prtts2"><textPath href="#p95">59</textPath></text><path class="prtts1" d="M27.9,6.7 l0.5,1.1" /><path class="prtts1" d="M28.3,6.4 l1.1,2.3" /><path class="prtts1" d="M28.7,6.2 l0.6,1.1" /><path class="prtts1" d="M29.2,6 l1.1,2.3" /><path class="prtts1" d="M29.6,5.8 l0.6,1.1" /><path class="prtts1" d="M30.1,5.6 l1,2.3" /><path class="prtts1" d="M30.5,5.4 l0.5,1.1" /><path class="prtts1" d="M31,5.2 l1,2.3" /><path class="prtts1" d="M31.4,5 l0.5,1.1" /><path class="prtts0" d="M31.9,4.8 l1.9,4.6" /><defs><path id="p96" d="M33.4,11.8 l2.3,-1" /></defs><text class="prtts2"><textPath href="#p96">60</textPath></text><path class="prtts1" d="M32.3,4.6 l0.5,1.2" /><path class="prtts1" d="M32.8,4.4 l0.9,2.4" /><path class="prtts1" d="M33.2,4.3 l0.5,1.1" /><path class="prtts1" d="M33.7,4.1 l0.9,2.3" /><path class="prtts1" d="M34.2,3.9 l0.4,1.2" /><path class="prtts1" d="M34.6,3.8 l0.8,2.3" /><path class="prtts1" d="M35.1,3.6 l0.4,1.2" /><path class="prtts1" d="M35.5,3.4 l0.8,2.4" /><path class="prtts1" d="M36,3.3 l0.4,1.2" /><path class="prtts0" d="M36.5,3.2 l1.4,4.7" /><defs><path id="p97" d="M37.3,10.2 l2.4,-0.7" /></defs><text class="prtts2"><textPath href="#p97">61</textPath></text><path class="prtts1" d="M37,3 l0.3,1.2" /><path class="prtts1" d="M37.4,2.9 l0.7,2.4" /><path class="prtts1" d="M37.9,2.7 l0.3,1.3" /><path class="prtts1" d="M38.4,2.6 l0.6,2.4" /><path class="prtts1" d="M38.9,2.5 l0.3,1.2" /><path class="prtts1" d="M39.3,2.4 l0.6,2.4" /><path class="prtts1" d="M39.8,2.3 l0.3,1.2" /><path class="prtts1" d="M40.3,2.2 l0.5,2.4" /><path class="prtts1" d="M40.8,2.1 l0.2,1.2" /><path class="prtts0" d="M41.2,2 l1,4.9" /><defs><path id="p98" d="M41.4,9.1 l2.5,-0.5" /></defs><text class="prtts2"><textPath href="#p98">62</textPath></text><path class="prtts1" d="M41.7,1.9 l0.3,1.2" /><path class="prtts1" d="M42.2,1.8 l0.4,2.4" /><path class="prtts1" d="M42.7,1.7 l0.2,1.2" /><path class="prtts1" d="M43.2,1.6 l0.4,2.5" /><path class="prtts1" d="M43.7,1.5 l0.1,1.3" /><path class="prtts1" d="M44.1,1.5 l0.4,2.4" /><path class="prtts1" d="M44.6,1.4 l0.2,1.2" /><path class="prtts1" d="M45.1,1.3 l0.3,2.5" /><path class="prtts1" d="M45.6,1.3 l0.1,1.2" /><path class="prtts0" d="M46.1,1.2 l0.5,5" /><defs><path id="p99" d="M45.5,8.3 l2.5,-0.2" /></defs><text class="prtts2"><textPath href="#p99">63</textPath></text><path class="prtts1" d="M46.6,1.2 l0.1,1.2" /><path class="prtts1" d="M47.1,1.2 l0.2,2.4" /><path class="prtts1" d="M47.6,1.1 l0.1,1.3" /><path class="prtts1" d="M48.1,1.1 l0.1,2.5" /><path class="prtts1" d="M48.5,1.1 l0.1,1.2" /><path class="prtts1" d="M49,1 l0.1,2.5" /><path class="prtts1" d="M49.5,1 l0.1,1.3" /><path class="prtts1" d="M50,1 l0.1,2.5" /><path class="prtts1" d="M50.5,1 l0,1.3" /><path class="prtts0" d="M49,51 l4,0" /><path class="prtts0" d="M51,49 l0,4" /><defs><path id="p100" d="M49.5,26 l3,0" /></defs><text class="prtts3"><textPath href="#p100">N</textPath></text><defs><path id="p101" d="M52.5,76 l-3,0" /></defs><text class="prtts3"><textPath href="#p101">S</textPath></text><defs><path id="p102" d="M76,49.5 l0,3" /></defs><text class="prtts3"><textPath href="#p102">E</textPath></text><defs><path id="p103" d="M26,52.5 l0,-3" /></defs><text class="prtts3"><textPath href="#p103">W</textPath></text></g>';
        var svgElementBounds = [[-halfHeightInMeters, -halfWidthInMeters], [halfHeightInMeters, halfWidthInMeters]];
        var svgOverlay = L.svgOverlay(svgElement, svgElementBounds).addTo(map);

        // Invisible marker to drag the protractor
        function createCompassIcon(zoom) {
            var scale = Math.pow(2, zoom);
            var w = mapInfos.factorx * scale * widthInMeters;
            var h = mapInfos.factory * scale * heightInMeters;
            return L.icon({
                iconUrl: '/img/transparent.png',
                iconSize: [w, h],
                iconAnchor: [w / 2, h / 2],
                className: 'protractor-drag'
            });
        }
        var marker = L.marker(
            [0, 0], {
            icon: createCompassIcon(mapInfos.defaultZoom),
            draggable: true,
            autoPanOnFocus: false,
            markerZoomAnimation: false
        }).addTo(map);

        var bearing = 0;

        map.on('zoomend', function (e) {
            marker.setIcon(createCompassIcon(map.getZoom()));
        });

        document.getElementById('protact').setAttribute("transform", "rotate(90,51,51)");

        var marker2 = L.marker(
            [400, 0], {
                icon: L.icon({
                    iconUrl: '/img/rotate.png',
                    iconSize: [32, 32],
                    iconAnchor: [16, 16],
                    className: 'protractor-rotate'
                }),
            draggable: true,
            autoPanOnFocus: false,
                markerZoomAnimation: false,
                zIndexOffset: 1000
        }).addTo(map);

        marker2.on('drag', function () {
            var p1 = marker.getLatLng();
            var p2 = marker2.getLatLng();
            bearing = GameMapUtils.bearing(p1, p2, map);
            document.getElementById('protact').setAttribute("transform", "rotate(" + bearing + ",51,51)");



            marker2.setLatLng(
                [
                    p1.lat + (Math.cos(bearing * Math.PI / 180)*300),
                    p1.lng + (Math.sin(bearing * Math.PI / 180)*300),
                ]
            );
        });

        marker.on('drag', function () {
            var pos = marker.getLatLng();
            svgOverlay.setBounds([[pos.lat - halfHeightInMeters, pos.lng - halfWidthInMeters], [pos.lat + halfHeightInMeters, pos.lng + halfWidthInMeters]]);

            marker2.setLatLng(
                [
                    pos.lat + (Math.cos(bearing * Math.PI / 180) * 300),
                    pos.lng + (Math.sin(bearing * Math.PI / 180) * 300),
                ]
            );
        });


        function update() {
            var p1 = marker.getLatLng();
            var p2 = marker2.getLatLng();
            var bearing = GameMapUtils.bearing(p1, p2, map);
            document.getElementById('protact').setAttribute("transform", "rotate(" + bearing + ",51,51)");
        }

        // TODO: Create a moving part to measure angles and distances
    }

};

/**
 * Display mouse MGRS coordinates on map
 *
 * Author: jetelain
 */
L.Control.GridMousePosition = L.Control.extend({
    options: {
        position: 'topright',
        precision: 4
    },

    onAdd: function (map) {
        this._container = L.DomUtil.create('div', 'leaflet-grid-mouseposition');
        this._map = map;
        L.DomEvent.disableClickPropagation(this._container);
        map.on('mousemove', this._onMouseMove, this);
        var placeHolder = '0'.repeat(this.options.precision);
        this._container.innerHTML = placeHolder + ' - ' + placeHolder;
        return this._container;
    },

    onRemove: function (map) {
        this._map = null;
        map.off('mousemove', this._onMouseMove)
    },

    _onMouseMove: function (e) {
        this._container.innerHTML = GameMapUtils.toGrid(e.latlng, this.options.precision, this._map);
    }

});

L.control.gridMousePosition = function (options) {
    return new L.Control.GridMousePosition(options);
};

/**
 * Display a bootstrap button on map
 *
 * Author: jetelain
 */
L.Control.OverlayButton = L.Control.extend({
    options: {
        position: 'bottomright',
        baseClassName: 'btn',
        className: 'btn-outline-secondary',
        content: '',
        click: null
    },

    _previousClass: '',

    onAdd: function (map) {
        this._previousClass = this.options.className;
        this._container = L.DomUtil.create('button', this.options.baseClassName + ' ' + this.options.className);
        L.DomEvent.disableClickPropagation(this._container);
        this._container.innerHTML = this.options.content;
        if (this.options.click) {
            this._container.addEventListener('click', this.options.click);
        }
        return this._container;
    },

    onRemove: function (map) {

    },

    setClass: function (name) {
        this._container.classList.remove(this._previousClass);
        this._container.classList.add(name);
        this._previousClass = name;
    }
});

L.control.overlayButton = function (options) {
    return new L.Control.OverlayButton(options);
};

/**
 * Display an arbitrary div on map
 *
 * Author: jetelain
 */
L.Control.OverlayDiv = L.Control.extend({
    options: {
        position: 'bottomright',
        content: ''
    },

    onAdd: function (map) {
        this._container = L.DomUtil.create('div', '');
        L.DomEvent.disableClickPropagation(this._container);
        let content = this.options.content;
        if (content === 'string') {
            this._container.innerHTML = content;
        }
        else {
            this._container.appendChild(content);
        }
        return this._container;
    },

    onRemove: function (map) {

    }
});

L.control.overlayDiv = function (options) {
    return new L.Control.OverlayDiv(options);
};