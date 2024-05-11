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


/**
 * Base class for interactive Protractor / Coordinate Scale / Ruler
 *
 * Author: jetelain
 */
GameMapUtils.MapToolBase = L.Layer.extend({

    options: {
        widthInMeters: 1500,
        heightInMeters: 1500,
        dragMarkerClassName: 'map-utils-tools-protractor-drag',
        svgViewBox: '0 0 100 100',
        svgContent: '',
        rotateCenter: '51,51'
    },

    initialize(latlng, options) {
        L.Util.setOptions(this, options);
        this._latlng = L.latLng(latlng);
        this._halfWidthInMeters = this.options.widthInMeters / 2;
        this._halfHeightInMeters = this.options.heightInMeters / 2;
    },

    _bearing: 0,

    _createDragMarkerIcon: function () {
        const zoom = this._map.getZoom();
        const transformation = this._map.options.crs.transformation;
        const scale = this._map.options.crs.scale(zoom);
        const w = Math.abs(transformation._a) * scale * this.options.widthInMeters;
        const h = Math.abs(transformation._c) * scale * this.options.heightInMeters;
        return L.icon({
            iconUrl: '/img/transparent.png',
            iconSize: [w, h],
            iconAnchor: [w / 2, h / 2],
            className: this.options.dragMarkerClassName
        });
    },

    _toSvgBounds: function () {
        return L.latLngBounds(
            L.latLng(this._latlng.lat - this._halfHeightInMeters, this._latlng.lng - this._halfWidthInMeters),
            L.latLng(this._latlng.lat + this._halfHeightInMeters, this._latlng.lng + this._halfWidthInMeters));
    },

    _updateMarkersSize: function () {
        this._dragMarker.setIcon(this._createDragMarkerIcon());
        this._updateRotateMarkerSize();
        this._updateDragMarkerIconTransform();
    },

    _positionChanged: function () {
        this._latlng = this._dragMarker.getLatLng();
        this._updateRotateMarkerPosition(this._latlng);
        this._svgOverlay.setBounds(this._toSvgBounds());
        this._updateDragMarkerIconTransform();
    },

    _updateRotateMarkerPosition: function () {

    },

    _updateRotateMarkerSize: function () {

    },

    _createRotateMarker: function () {
        return null;
    },
    _updateDragMarkerIconTransform: function () {

    },
    setLatLng: function (pos) {
        this._latlng = L.latLng(pos);
        this._dragMarker.setLatLng(this._latlng);
        this._positionChanged();
    },

    getLatLng: function () {
        return this._dragMarker.getLatLng();
    },

    setBearing: function (bearing) {
        this._bearing = bearing;
        if (this._svgRootGroup) {
            this._svgRootGroup.setAttribute("transform", "rotate(" + bearing + "," + this.options.rotateCenter +")");
        }
        if (this._rotateMarker) {
            this._rotateMarker.setLatLng(this._getRotateMarkerPosition());
        }
        this._updateDragMarkerIconTransform();
    },

    getBearing: function () {
        return this._bearing;
    },

    onAdd: function (map) {

        this._map = map;

        if (!this._dragMarker) {
            this._svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            this._svgElement.setAttribute('xmlns', "http://www.w3.org/2000/svg");
            this._svgElement.setAttribute('viewBox', this.options.svgViewBox);
            this._svgElement.innerHTML = '<g>' + this.options.svgContent + '</g>';
            this._svgRootGroup = this._svgElement.childNodes[0];
            this._svgOverlay = L.svgOverlay(this._svgElement, this._toSvgBounds());
            this._dragMarker =
                L.marker(
                    this._latlng,
                    {
                        icon: this._createDragMarkerIcon(),
                        draggable: true,
                        autoPanOnFocus: false,
                        markerZoomAnimation: false
                    })
                    .on('drag', this._positionChanged, this);
            this._rotateMarker = this._createRotateMarker();
        }

        this._svgOverlay.addTo(map);
        this._dragMarker.addTo(map);
        if (this._rotateMarker) {
            this._rotateMarker.addTo(map);
        }
        this._updateDragMarkerIconTransform();
        map.on('zoomend', this._updateMarkersSize, this);
    },

    onRemove: function (map) {
        this._svgOverlay.removeFrom(map);
        this._dragMarker.removeFrom(map);
        if (this._rotateMarker) {
            this._rotateMarker.removeFrom(map);
        }
        map.off('zoomend', this._updateMarkerSize, this);
    }
});

/**
 * Protractor
 *
 * Author: jetelain
 */
GameMapUtils.Protractor = GameMapUtils.MapToolBase.extend({
    options: {
        widthInMeters: 1500,
        heightInMeters: 1500,
        dragMarkerClassName: 'map-utils-tools-protractor-drag',
        rotateCenter: '51,51',
        svgViewBox: '0 0 102 102',
        svgContent: '<style>.prtts0{fill: none;stroke: #000000FF;stroke-width: 0.2;}.prtts1{fill: none;stroke: #000000FF;stroke-width: 0.1;}.prtts2{font: 2.5px Arial;fill: #000000FF;dominant-baseline: middle;}.prtts3{font: 5px Arial;fill: #FF0000FF;dominant-baseline: middle;font-weight: bold;}.prtts4{font: 5px Arial;fill: #FF0000FF;text-anchor: middle;font-weight: bold;}.prtts5{fill: none;stroke: #80808080;stroke-width: 1;}</style><circle cx="51" cy="51" r="50.5" class="prtts5" /><style>.prtts6{fill: #F1F1F140;stroke: #000000FF;stroke-width: 0.1;}</style><circle cx="51" cy="51" r="50" class="prtts6" /><path class="prtts0" d="M51,11 l0,5" /><defs><path id="p0" d="M49,18.1 l4,0" /></defs><text class="prtts2"><textPath href="#p0">000</textPath></text><path class="prtts1" d="M51.7,11 l0,2.5" /><path class="prtts1" d="M52.4,11 l-0.1,2.5" /><path class="prtts1" d="M53.1,11.1 l-0.1,2.5" /><path class="prtts1" d="M53.8,11.1 l-0.2,2.5" /><path class="prtts1" d="M54.5,11.2 l-0.4,3.9" /><path class="prtts1" d="M55.2,11.2 l-0.3,2.5" /><path class="prtts1" d="M55.9,11.3 l-0.3,2.5" /><path class="prtts1" d="M56.6,11.4 l-0.4,2.5" /><path class="prtts1" d="M57.3,11.5 l-0.4,2.5" /><path class="prtts0" d="M57.9,11.6 l-0.8,4.9" /><defs><path id="p1" d="M54.7,18.2 l4,0.7" /></defs><text class="prtts2"><textPath href="#p1">010</textPath></text><path class="prtts1" d="M58.6,11.7 l-0.4,2.5" /><path class="prtts1" d="M59.3,11.9 l-0.5,2.4" /><path class="prtts1" d="M60,12 l-0.6,2.5" /><path class="prtts1" d="M60.7,12.2 l-0.6,2.4" /><path class="prtts1" d="M61.4,12.4 l-1.1,3.8" /><path class="prtts1" d="M62,12.5 l-0.7,2.5" /><path class="prtts1" d="M62.7,12.7 l-0.7,2.4" /><path class="prtts1" d="M63.4,13 l-0.8,2.3" /><path class="prtts1" d="M64,13.2 l-0.8,2.3" /><path class="prtts0" d="M64.7,13.4 l-1.7,4.7" /><defs><path id="p2" d="M60.4,19.4 l3.8,1.3" /></defs><text class="prtts2"><textPath href="#p2">020</textPath></text><path class="prtts1" d="M65.3,13.7 l-0.9,2.3" /><path class="prtts1" d="M66,13.9 l-1,2.3" /><path class="prtts1" d="M66.6,14.2 l-0.9,2.3" /><path class="prtts1" d="M67.3,14.5 l-1,2.2" /><path class="prtts1" d="M67.9,14.7 l-1.7,3.7" /><path class="prtts1" d="M68.5,15 l-1.1,2.3" /><path class="prtts1" d="M69.2,15.4 l-1.2,2.2" /><path class="prtts1" d="M69.8,15.7 l-1.2,2.2" /><path class="prtts1" d="M70.4,16 l-1.2,2.2" /><path class="prtts0" d="M71,16.4 l-2.5,4.3" /><defs><path id="p3" d="M65.7,21.5 l3.5,2" /></defs><text class="prtts2"><textPath href="#p3">030</textPath></text><path class="prtts1" d="M71.6,16.7 l-1.3,2.2" /><path class="prtts1" d="M72.2,17.1 l-1.3,2.1" /><path class="prtts1" d="M72.8,17.5 l-1.4,2" /><path class="prtts1" d="M73.4,17.8 l-1.4,2.1" /><path class="prtts1" d="M73.9,18.2 l-2.3,3.3" /><path class="prtts1" d="M74.5,18.6 l-1.5,2.1" /><path class="prtts1" d="M75.1,19.1 l-1.5,2" /><path class="prtts1" d="M75.6,19.5 l-1.5,1.9" /><path class="prtts1" d="M76.2,19.9 l-1.6,2" /><path class="prtts0" d="M76.7,20.4 l-3.2,3.8" /><defs><path id="p4" d="M70.6,24.5 l3.1,2.6" /></defs><text class="prtts2"><textPath href="#p4">040</textPath></text><path class="prtts1" d="M77.2,20.8 l-1.6,1.9" /><path class="prtts1" d="M77.8,21.3 l-1.7,1.8" /><path class="prtts1" d="M78.3,21.7 l-1.7,1.9" /><path class="prtts1" d="M78.8,22.2 l-1.8,1.8" /><path class="prtts1" d="M79.3,22.7 l-2.8,2.8" /><path class="prtts1" d="M79.8,23.2 l-1.8,1.8" /><path class="prtts1" d="M80.3,23.7 l-1.9,1.7" /><path class="prtts1" d="M80.7,24.2 l-1.8,1.7" /><path class="prtts1" d="M81.2,24.8 l-1.9,1.6" /><path class="prtts0" d="M81.6,25.3 l-3.8,3.2" /><defs><path id="p5" d="M74.9,28.3 l2.6,3.1" /></defs><text class="prtts2"><textPath href="#p5">050</textPath></text><path class="prtts1" d="M82.1,25.8 l-2,1.6" /><path class="prtts1" d="M82.5,26.4 l-1.9,1.5" /><path class="prtts1" d="M82.9,26.9 l-2,1.5" /><path class="prtts1" d="M83.4,27.5 l-2.1,1.5" /><path class="prtts1" d="M83.8,28.1 l-3.3,2.3" /><path class="prtts1" d="M84.2,28.6 l-2.1,1.4" /><path class="prtts1" d="M84.5,29.2 l-2,1.4" /><path class="prtts1" d="M84.9,29.8 l-2.1,1.3" /><path class="prtts1" d="M85.3,30.4 l-2.2,1.3" /><path class="prtts0" d="M85.6,31 l-4.3,2.5" /><defs><path id="p6" d="M78.5,32.8 l2,3.5" /></defs><text class="prtts2"><textPath href="#p6">060</textPath></text><path class="prtts1" d="M86,31.6 l-2.2,1.2" /><path class="prtts1" d="M86.3,32.2 l-2.2,1.2" /><path class="prtts1" d="M86.6,32.8 l-2.2,1.2" /><path class="prtts1" d="M87,33.5 l-2.3,1.1" /><path class="prtts1" d="M87.3,34.1 l-3.7,1.7" /><path class="prtts1" d="M87.5,34.7 l-2.2,1" /><path class="prtts1" d="M87.8,35.4 l-2.3,0.9" /><path class="prtts1" d="M88.1,36 l-2.3,1" /><path class="prtts1" d="M88.3,36.7 l-2.3,0.9" /><path class="prtts0" d="M88.6,37.3 l-4.7,1.7" /><defs><path id="p7" d="M81.3,37.8 l1.3,3.8" /></defs><text class="prtts2"><textPath href="#p7">070</textPath></text><path class="prtts1" d="M88.8,38 l-2.3,0.8" /><path class="prtts1" d="M89,38.6 l-2.3,0.8" /><path class="prtts1" d="M89.3,39.3 l-2.4,0.7" /><path class="prtts1" d="M89.5,40 l-2.5,0.7" /><path class="prtts1" d="M89.6,40.6 l-3.8,1.1" /><path class="prtts1" d="M89.8,41.3 l-2.4,0.6" /><path class="prtts1" d="M90,42 l-2.5,0.6" /><path class="prtts1" d="M90.1,42.7 l-2.4,0.5" /><path class="prtts1" d="M90.3,43.4 l-2.5,0.4" /><path class="prtts0" d="M90.4,44.1 l-4.9,0.8" /><defs><path id="p8" d="M83.1,43.3 l0.7,4" /></defs><text class="prtts2"><textPath href="#p8">080</textPath></text><path class="prtts1" d="M90.5,44.7 l-2.5,0.4" /><path class="prtts1" d="M90.6,45.4 l-2.5,0.4" /><path class="prtts1" d="M90.7,46.1 l-2.5,0.3" /><path class="prtts1" d="M90.8,46.8 l-2.5,0.3" /><path class="prtts1" d="M90.8,47.5 l-3.9,0.4" /><path class="prtts1" d="M90.9,48.2 l-2.5,0.2" /><path class="prtts1" d="M90.9,48.9 l-2.5,0.1" /><path class="prtts1" d="M91,49.6 l-2.5,0.1" /><path class="prtts1" d="M91,50.3 l-2.5,0" /><path class="prtts0" d="M91,51 l-5,0" /><defs><path id="p9" d="M83.9,49 l0,4" /></defs><text class="prtts2"><textPath href="#p9">090</textPath></text><path class="prtts1" d="M91,51.7 l-2.5,0" /><path class="prtts1" d="M91,52.4 l-2.5,-0.1" /><path class="prtts1" d="M90.9,53.1 l-2.5,-0.1" /><path class="prtts1" d="M90.9,53.8 l-2.5,-0.2" /><path class="prtts1" d="M90.8,54.5 l-3.9,-0.4" /><path class="prtts1" d="M90.8,55.2 l-2.5,-0.3" /><path class="prtts1" d="M90.7,55.9 l-2.5,-0.3" /><path class="prtts1" d="M90.6,56.6 l-2.5,-0.4" /><path class="prtts1" d="M90.5,57.3 l-2.5,-0.4" /><path class="prtts0" d="M90.4,57.9 l-4.9,-0.8" /><defs><path id="p10" d="M83.8,54.7 l-0.7,4" /></defs><text class="prtts2"><textPath href="#p10">100</textPath></text><path class="prtts1" d="M90.3,58.6 l-2.5,-0.4" /><path class="prtts1" d="M90.1,59.3 l-2.4,-0.5" /><path class="prtts1" d="M90,60 l-2.5,-0.6" /><path class="prtts1" d="M89.8,60.7 l-2.4,-0.6" /><path class="prtts1" d="M89.6,61.4 l-3.8,-1.1" /><path class="prtts1" d="M89.5,62 l-2.5,-0.7" /><path class="prtts1" d="M89.3,62.7 l-2.4,-0.7" /><path class="prtts1" d="M89,63.4 l-2.3,-0.8" /><path class="prtts1" d="M88.8,64 l-2.3,-0.8" /><path class="prtts0" d="M88.6,64.7 l-4.7,-1.7" /><defs><path id="p11" d="M82.6,60.4 l-1.3,3.8" /></defs><text class="prtts2"><textPath href="#p11">110</textPath></text><path class="prtts1" d="M88.3,65.3 l-2.3,-0.9" /><path class="prtts1" d="M88.1,66 l-2.3,-1" /><path class="prtts1" d="M87.8,66.6 l-2.3,-0.9" /><path class="prtts1" d="M87.5,67.3 l-2.2,-1" /><path class="prtts1" d="M87.3,67.9 l-3.7,-1.7" /><path class="prtts1" d="M87,68.5 l-2.3,-1.1" /><path class="prtts1" d="M86.6,69.2 l-2.2,-1.2" /><path class="prtts1" d="M86.3,69.8 l-2.2,-1.2" /><path class="prtts1" d="M86,70.4 l-2.2,-1.2" /><path class="prtts0" d="M85.6,71 l-4.3,-2.5" /><defs><path id="p12" d="M80.5,65.7 l-2,3.5" /></defs><text class="prtts2"><textPath href="#p12">120</textPath></text><path class="prtts1" d="M85.3,71.6 l-2.2,-1.3" /><path class="prtts1" d="M84.9,72.2 l-2.1,-1.3" /><path class="prtts1" d="M84.5,72.8 l-2,-1.4" /><path class="prtts1" d="M84.2,73.4 l-2.1,-1.4" /><path class="prtts1" d="M83.8,73.9 l-3.3,-2.3" /><path class="prtts1" d="M83.4,74.5 l-2.1,-1.5" /><path class="prtts1" d="M82.9,75.1 l-2,-1.5" /><path class="prtts1" d="M82.5,75.6 l-1.9,-1.5" /><path class="prtts1" d="M82.1,76.2 l-2,-1.6" /><path class="prtts0" d="M81.6,76.7 l-3.8,-3.2" /><defs><path id="p13" d="M77.5,70.6 l-2.6,3.1" /></defs><text class="prtts2"><textPath href="#p13">130</textPath></text><path class="prtts1" d="M81.2,77.2 l-1.9,-1.6" /><path class="prtts1" d="M80.7,77.8 l-1.8,-1.7" /><path class="prtts1" d="M80.3,78.3 l-1.9,-1.7" /><path class="prtts1" d="M79.8,78.8 l-1.8,-1.8" /><path class="prtts1" d="M79.3,79.3 l-2.8,-2.8" /><path class="prtts1" d="M78.8,79.8 l-1.8,-1.8" /><path class="prtts1" d="M78.3,80.3 l-1.7,-1.9" /><path class="prtts1" d="M77.8,80.7 l-1.7,-1.8" /><path class="prtts1" d="M77.2,81.2 l-1.6,-1.9" /><path class="prtts0" d="M76.7,81.6 l-3.2,-3.8" /><defs><path id="p14" d="M73.7,74.9 l-3.1,2.6" /></defs><text class="prtts2"><textPath href="#p14">140</textPath></text><path class="prtts1" d="M76.2,82.1 l-1.6,-2" /><path class="prtts1" d="M75.6,82.5 l-1.5,-1.9" /><path class="prtts1" d="M75.1,82.9 l-1.5,-2" /><path class="prtts1" d="M74.5,83.4 l-1.5,-2.1" /><path class="prtts1" d="M73.9,83.8 l-2.3,-3.3" /><path class="prtts1" d="M73.4,84.2 l-1.4,-2.1" /><path class="prtts1" d="M72.8,84.5 l-1.4,-2" /><path class="prtts1" d="M72.2,84.9 l-1.3,-2.1" /><path class="prtts1" d="M71.6,85.3 l-1.3,-2.2" /><path class="prtts0" d="M71,85.6 l-2.5,-4.3" /><defs><path id="p15" d="M69.2,78.5 l-3.5,2" /></defs><text class="prtts2"><textPath href="#p15">150</textPath></text><path class="prtts1" d="M70.4,86 l-1.2,-2.2" /><path class="prtts1" d="M69.8,86.3 l-1.2,-2.2" /><path class="prtts1" d="M69.2,86.6 l-1.2,-2.2" /><path class="prtts1" d="M68.5,87 l-1.1,-2.3" /><path class="prtts1" d="M67.9,87.3 l-1.7,-3.7" /><path class="prtts1" d="M67.3,87.5 l-1,-2.2" /><path class="prtts1" d="M66.6,87.8 l-0.9,-2.3" /><path class="prtts1" d="M66,88.1 l-1,-2.3" /><path class="prtts1" d="M65.3,88.3 l-0.9,-2.3" /><path class="prtts0" d="M64.7,88.6 l-1.7,-4.7" /><defs><path id="p16" d="M64.2,81.3 l-3.8,1.3" /></defs><text class="prtts2"><textPath href="#p16">160</textPath></text><path class="prtts1" d="M64,88.8 l-0.8,-2.3" /><path class="prtts1" d="M63.4,89 l-0.8,-2.3" /><path class="prtts1" d="M62.7,89.3 l-0.7,-2.4" /><path class="prtts1" d="M62,89.5 l-0.7,-2.5" /><path class="prtts1" d="M61.4,89.6 l-1.1,-3.8" /><path class="prtts1" d="M60.7,89.8 l-0.6,-2.4" /><path class="prtts1" d="M60,90 l-0.6,-2.5" /><path class="prtts1" d="M59.3,90.1 l-0.5,-2.4" /><path class="prtts1" d="M58.6,90.3 l-0.4,-2.5" /><path class="prtts0" d="M57.9,90.4 l-0.8,-4.9" /><defs><path id="p17" d="M58.7,83.1 l-4,0.7" /></defs><text class="prtts2"><textPath href="#p17">170</textPath></text><path class="prtts1" d="M57.3,90.5 l-0.4,-2.5" /><path class="prtts1" d="M56.6,90.6 l-0.4,-2.5" /><path class="prtts1" d="M55.9,90.7 l-0.3,-2.5" /><path class="prtts1" d="M55.2,90.8 l-0.3,-2.5" /><path class="prtts1" d="M54.5,90.8 l-0.4,-3.9" /><path class="prtts1" d="M53.8,90.9 l-0.2,-2.5" /><path class="prtts1" d="M53.1,90.9 l-0.1,-2.5" /><path class="prtts1" d="M52.4,91 l-0.1,-2.5" /><path class="prtts1" d="M51.7,91 l0,-2.5" /><path class="prtts0" d="M51,91 l0,-5" /><defs><path id="p18" d="M53,83.9 l-4,0" /></defs><text class="prtts2"><textPath href="#p18">180</textPath></text><path class="prtts1" d="M50.3,91 l0,-2.5" /><path class="prtts1" d="M49.6,91 l0.1,-2.5" /><path class="prtts1" d="M48.9,90.9 l0.1,-2.5" /><path class="prtts1" d="M48.2,90.9 l0.2,-2.5" /><path class="prtts1" d="M47.5,90.8 l0.4,-3.9" /><path class="prtts1" d="M46.8,90.8 l0.3,-2.5" /><path class="prtts1" d="M46.1,90.7 l0.3,-2.5" /><path class="prtts1" d="M45.4,90.6 l0.4,-2.5" /><path class="prtts1" d="M44.7,90.5 l0.4,-2.5" /><path class="prtts0" d="M44.1,90.4 l0.8,-4.9" /><defs><path id="p19" d="M47.3,83.8 l-4,-0.7" /></defs><text class="prtts2"><textPath href="#p19">190</textPath></text><path class="prtts1" d="M43.4,90.3 l0.4,-2.5" /><path class="prtts1" d="M42.7,90.1 l0.5,-2.4" /><path class="prtts1" d="M42,90 l0.6,-2.5" /><path class="prtts1" d="M41.3,89.8 l0.6,-2.4" /><path class="prtts1" d="M40.6,89.6 l1.1,-3.8" /><path class="prtts1" d="M40,89.5 l0.7,-2.5" /><path class="prtts1" d="M39.3,89.3 l0.7,-2.4" /><path class="prtts1" d="M38.6,89 l0.8,-2.3" /><path class="prtts1" d="M38,88.8 l0.8,-2.3" /><path class="prtts0" d="M37.3,88.6 l1.7,-4.7" /><defs><path id="p20" d="M41.6,82.6 l-3.8,-1.3" /></defs><text class="prtts2"><textPath href="#p20">200</textPath></text><path class="prtts1" d="M36.7,88.3 l0.9,-2.3" /><path class="prtts1" d="M36,88.1 l1,-2.3" /><path class="prtts1" d="M35.4,87.8 l0.9,-2.3" /><path class="prtts1" d="M34.7,87.5 l1,-2.2" /><path class="prtts1" d="M34.1,87.3 l1.7,-3.7" /><path class="prtts1" d="M33.5,87 l1.1,-2.3" /><path class="prtts1" d="M32.8,86.6 l1.2,-2.2" /><path class="prtts1" d="M32.2,86.3 l1.2,-2.2" /><path class="prtts1" d="M31.6,86 l1.2,-2.2" /><path class="prtts0" d="M31,85.6 l2.5,-4.3" /><defs><path id="p21" d="M36.3,80.5 l-3.5,-2" /></defs><text class="prtts2"><textPath href="#p21">210</textPath></text><path class="prtts1" d="M30.4,85.3 l1.3,-2.2" /><path class="prtts1" d="M29.8,84.9 l1.3,-2.1" /><path class="prtts1" d="M29.2,84.5 l1.4,-2" /><path class="prtts1" d="M28.6,84.2 l1.4,-2.1" /><path class="prtts1" d="M28.1,83.8 l2.3,-3.3" /><path class="prtts1" d="M27.5,83.4 l1.5,-2.1" /><path class="prtts1" d="M26.9,82.9 l1.5,-2" /><path class="prtts1" d="M26.4,82.5 l1.5,-1.9" /><path class="prtts1" d="M25.8,82.1 l1.6,-2" /><path class="prtts0" d="M25.3,81.6 l3.2,-3.8" /><defs><path id="p22" d="M31.4,77.5 l-3.1,-2.6" /></defs><text class="prtts2"><textPath href="#p22">220</textPath></text><path class="prtts1" d="M24.8,81.2 l1.6,-1.9" /><path class="prtts1" d="M24.2,80.7 l1.7,-1.8" /><path class="prtts1" d="M23.7,80.3 l1.7,-1.9" /><path class="prtts1" d="M23.2,79.8 l1.8,-1.8" /><path class="prtts1" d="M22.7,79.3 l2.8,-2.8" /><path class="prtts1" d="M22.2,78.8 l1.8,-1.8" /><path class="prtts1" d="M21.7,78.3 l1.9,-1.7" /><path class="prtts1" d="M21.3,77.8 l1.8,-1.7" /><path class="prtts1" d="M20.8,77.2 l1.9,-1.6" /><path class="prtts0" d="M20.4,76.7 l3.8,-3.2" /><defs><path id="p23" d="M27.1,73.7 l-2.6,-3.1" /></defs><text class="prtts2"><textPath href="#p23">230</textPath></text><path class="prtts1" d="M19.9,76.2 l2,-1.6" /><path class="prtts1" d="M19.5,75.6 l1.9,-1.5" /><path class="prtts1" d="M19.1,75.1 l2,-1.5" /><path class="prtts1" d="M18.6,74.5 l2.1,-1.5" /><path class="prtts1" d="M18.2,73.9 l3.3,-2.3" /><path class="prtts1" d="M17.8,73.4 l2.1,-1.4" /><path class="prtts1" d="M17.5,72.8 l2,-1.4" /><path class="prtts1" d="M17.1,72.2 l2.1,-1.3" /><path class="prtts1" d="M16.7,71.6 l2.2,-1.3" /><path class="prtts0" d="M16.4,71 l4.3,-2.5" /><defs><path id="p24" d="M23.5,69.2 l-2,-3.5" /></defs><text class="prtts2"><textPath href="#p24">240</textPath></text><path class="prtts1" d="M16,70.4 l2.2,-1.2" /><path class="prtts1" d="M15.7,69.8 l2.2,-1.2" /><path class="prtts1" d="M15.4,69.2 l2.2,-1.2" /><path class="prtts1" d="M15,68.5 l2.3,-1.1" /><path class="prtts1" d="M14.7,67.9 l3.7,-1.7" /><path class="prtts1" d="M14.5,67.3 l2.2,-1" /><path class="prtts1" d="M14.2,66.6 l2.3,-0.9" /><path class="prtts1" d="M13.9,66 l2.3,-1" /><path class="prtts1" d="M13.7,65.3 l2.3,-0.9" /><path class="prtts0" d="M13.4,64.7 l4.7,-1.7" /><defs><path id="p25" d="M20.7,64.2 l-1.3,-3.8" /></defs><text class="prtts2"><textPath href="#p25">250</textPath></text><path class="prtts1" d="M13.2,64 l2.3,-0.8" /><path class="prtts1" d="M13,63.4 l2.3,-0.8" /><path class="prtts1" d="M12.7,62.7 l2.4,-0.7" /><path class="prtts1" d="M12.5,62 l2.5,-0.7" /><path class="prtts1" d="M12.4,61.4 l3.8,-1.1" /><path class="prtts1" d="M12.2,60.7 l2.4,-0.6" /><path class="prtts1" d="M12,60 l2.5,-0.6" /><path class="prtts1" d="M11.9,59.3 l2.4,-0.5" /><path class="prtts1" d="M11.7,58.6 l2.5,-0.4" /><path class="prtts0" d="M11.6,57.9 l4.9,-0.8" /><defs><path id="p26" d="M18.9,58.7 l-0.7,-4" /></defs><text class="prtts2"><textPath href="#p26">260</textPath></text><path class="prtts1" d="M11.5,57.3 l2.5,-0.4" /><path class="prtts1" d="M11.4,56.6 l2.5,-0.4" /><path class="prtts1" d="M11.3,55.9 l2.5,-0.3" /><path class="prtts1" d="M11.2,55.2 l2.5,-0.3" /><path class="prtts1" d="M11.2,54.5 l3.9,-0.4" /><path class="prtts1" d="M11.1,53.8 l2.5,-0.2" /><path class="prtts1" d="M11.1,53.1 l2.5,-0.1" /><path class="prtts1" d="M11,52.4 l2.5,-0.1" /><path class="prtts1" d="M11,51.7 l2.5,0" /><path class="prtts0" d="M11,51 l5,0" /><defs><path id="p27" d="M18.1,53 l0,-4" /></defs><text class="prtts2"><textPath href="#p27">270</textPath></text><path class="prtts1" d="M11,50.3 l2.5,0" /><path class="prtts1" d="M11,49.6 l2.5,0.1" /><path class="prtts1" d="M11.1,48.9 l2.5,0.1" /><path class="prtts1" d="M11.1,48.2 l2.5,0.2" /><path class="prtts1" d="M11.2,47.5 l3.9,0.4" /><path class="prtts1" d="M11.2,46.8 l2.5,0.3" /><path class="prtts1" d="M11.3,46.1 l2.5,0.3" /><path class="prtts1" d="M11.4,45.4 l2.5,0.4" /><path class="prtts1" d="M11.5,44.7 l2.5,0.4" /><path class="prtts0" d="M11.6,44.1 l4.9,0.8" /><defs><path id="p28" d="M18.2,47.3 l0.7,-4" /></defs><text class="prtts2"><textPath href="#p28">280</textPath></text><path class="prtts1" d="M11.7,43.4 l2.5,0.4" /><path class="prtts1" d="M11.9,42.7 l2.4,0.5" /><path class="prtts1" d="M12,42 l2.5,0.6" /><path class="prtts1" d="M12.2,41.3 l2.4,0.6" /><path class="prtts1" d="M12.4,40.6 l3.8,1.1" /><path class="prtts1" d="M12.5,40 l2.5,0.7" /><path class="prtts1" d="M12.7,39.3 l2.4,0.7" /><path class="prtts1" d="M13,38.6 l2.3,0.8" /><path class="prtts1" d="M13.2,38 l2.3,0.8" /><path class="prtts0" d="M13.4,37.3 l4.7,1.7" /><defs><path id="p29" d="M19.4,41.6 l1.3,-3.8" /></defs><text class="prtts2"><textPath href="#p29">290</textPath></text><path class="prtts1" d="M13.7,36.7 l2.3,0.9" /><path class="prtts1" d="M13.9,36 l2.3,1" /><path class="prtts1" d="M14.2,35.4 l2.3,0.9" /><path class="prtts1" d="M14.5,34.7 l2.2,1" /><path class="prtts1" d="M14.7,34.1 l3.7,1.7" /><path class="prtts1" d="M15,33.5 l2.3,1.1" /><path class="prtts1" d="M15.4,32.8 l2.2,1.2" /><path class="prtts1" d="M15.7,32.2 l2.2,1.2" /><path class="prtts1" d="M16,31.6 l2.2,1.2" /><path class="prtts0" d="M16.4,31 l4.3,2.5" /><defs><path id="p30" d="M21.5,36.3 l2,-3.5" /></defs><text class="prtts2"><textPath href="#p30">300</textPath></text><path class="prtts1" d="M16.7,30.4 l2.2,1.3" /><path class="prtts1" d="M17.1,29.8 l2.1,1.3" /><path class="prtts1" d="M17.5,29.2 l2,1.4" /><path class="prtts1" d="M17.8,28.6 l2.1,1.4" /><path class="prtts1" d="M18.2,28.1 l3.3,2.3" /><path class="prtts1" d="M18.6,27.5 l2.1,1.5" /><path class="prtts1" d="M19.1,26.9 l2,1.5" /><path class="prtts1" d="M19.5,26.4 l1.9,1.5" /><path class="prtts1" d="M19.9,25.8 l2,1.6" /><path class="prtts0" d="M20.4,25.3 l3.8,3.2" /><defs><path id="p31" d="M24.5,31.4 l2.6,-3.1" /></defs><text class="prtts2"><textPath href="#p31">310</textPath></text><path class="prtts1" d="M20.8,24.8 l1.9,1.6" /><path class="prtts1" d="M21.3,24.2 l1.8,1.7" /><path class="prtts1" d="M21.7,23.7 l1.9,1.7" /><path class="prtts1" d="M22.2,23.2 l1.8,1.8" /><path class="prtts1" d="M22.7,22.7 l2.8,2.8" /><path class="prtts1" d="M23.2,22.2 l1.8,1.8" /><path class="prtts1" d="M23.7,21.7 l1.7,1.9" /><path class="prtts1" d="M24.2,21.3 l1.7,1.8" /><path class="prtts1" d="M24.8,20.8 l1.6,1.9" /><path class="prtts0" d="M25.3,20.4 l3.2,3.8" /><defs><path id="p32" d="M28.3,27.1 l3.1,-2.6" /></defs><text class="prtts2"><textPath href="#p32">320</textPath></text><path class="prtts1" d="M25.8,19.9 l1.6,2" /><path class="prtts1" d="M26.4,19.5 l1.5,1.9" /><path class="prtts1" d="M26.9,19.1 l1.5,2" /><path class="prtts1" d="M27.5,18.6 l1.5,2.1" /><path class="prtts1" d="M28.1,18.2 l2.3,3.3" /><path class="prtts1" d="M28.6,17.8 l1.4,2.1" /><path class="prtts1" d="M29.2,17.5 l1.4,2" /><path class="prtts1" d="M29.8,17.1 l1.3,2.1" /><path class="prtts1" d="M30.4,16.7 l1.3,2.2" /><path class="prtts0" d="M31,16.4 l2.5,4.3" /><defs><path id="p33" d="M32.8,23.5 l3.5,-2" /></defs><text class="prtts2"><textPath href="#p33">330</textPath></text><path class="prtts1" d="M31.6,16 l1.2,2.2" /><path class="prtts1" d="M32.2,15.7 l1.2,2.2" /><path class="prtts1" d="M32.8,15.4 l1.2,2.2" /><path class="prtts1" d="M33.5,15 l1.1,2.3" /><path class="prtts1" d="M34.1,14.7 l1.7,3.7" /><path class="prtts1" d="M34.7,14.5 l1,2.2" /><path class="prtts1" d="M35.4,14.2 l0.9,2.3" /><path class="prtts1" d="M36,13.9 l1,2.3" /><path class="prtts1" d="M36.7,13.7 l0.9,2.3" /><path class="prtts0" d="M37.3,13.4 l1.7,4.7" /><defs><path id="p34" d="M37.8,20.7 l3.8,-1.3" /></defs><text class="prtts2"><textPath href="#p34">340</textPath></text><path class="prtts1" d="M38,13.2 l0.8,2.3" /><path class="prtts1" d="M38.6,13 l0.8,2.3" /><path class="prtts1" d="M39.3,12.7 l0.7,2.4" /><path class="prtts1" d="M40,12.5 l0.7,2.5" /><path class="prtts1" d="M40.6,12.4 l1.1,3.8" /><path class="prtts1" d="M41.3,12.2 l0.6,2.4" /><path class="prtts1" d="M42,12 l0.6,2.5" /><path class="prtts1" d="M42.7,11.9 l0.5,2.4" /><path class="prtts1" d="M43.4,11.7 l0.4,2.5" /><path class="prtts0" d="M44.1,11.6 l0.8,4.9" /><defs><path id="p35" d="M43.3,18.9 l4,-0.7" /></defs><text class="prtts2"><textPath href="#p35">350</textPath></text><path class="prtts1" d="M44.7,11.5 l0.4,2.5" /><path class="prtts1" d="M45.4,11.4 l0.4,2.5" /><path class="prtts1" d="M46.1,11.3 l0.3,2.5" /><path class="prtts1" d="M46.8,11.2 l0.3,2.5" /><path class="prtts1" d="M47.5,11.2 l0.4,3.9" /><path class="prtts1" d="M48.2,11.1 l0.2,2.5" /><path class="prtts1" d="M48.9,11.1 l0.1,2.5" /><path class="prtts1" d="M49.6,11 l0.1,2.5" /><path class="prtts1" d="M50.3,11 l0,2.5" /><path class="prtts0" d="M51,1 l0,5" /><defs><path id="p36" d="M49.7,8 l2.6,0" /></defs><text class="prtts2"><textPath href="#p36">00</textPath></text><path class="prtts1" d="M51.5,1 l0,1.3" /><path class="prtts1" d="M52,1 l-0.1,2.5" /><path class="prtts1" d="M52.5,1 l-0.1,1.3" /><path class="prtts1" d="M53,1 l-0.1,2.5" /><path class="prtts1" d="M53.5,1.1 l-0.1,1.2" /><path class="prtts1" d="M53.9,1.1 l-0.1,2.5" /><path class="prtts1" d="M54.4,1.1 l-0.1,1.3" /><path class="prtts1" d="M54.9,1.2 l-0.2,2.4" /><path class="prtts1" d="M55.4,1.2 l-0.1,1.2" /><path class="prtts0" d="M55.9,1.2 l-0.5,5" /><defs><path id="p37" d="M54,8.1 l2.5,0.2" /></defs><text class="prtts2"><textPath href="#p37">01</textPath></text><path class="prtts1" d="M56.4,1.3 l-0.1,1.2" /><path class="prtts1" d="M56.9,1.3 l-0.3,2.5" /><path class="prtts1" d="M57.4,1.4 l-0.2,1.2" /><path class="prtts1" d="M57.9,1.5 l-0.4,2.4" /><path class="prtts1" d="M58.3,1.5 l-0.1,1.3" /><path class="prtts1" d="M58.8,1.6 l-0.4,2.5" /><path class="prtts1" d="M59.3,1.7 l-0.2,1.2" /><path class="prtts1" d="M59.8,1.8 l-0.4,2.4" /><path class="prtts1" d="M60.3,1.9 l-0.3,1.2" /><path class="prtts0" d="M60.8,2 l-1,4.9" /><defs><path id="p38" d="M58.1,8.6 l2.5,0.5" /></defs><text class="prtts2"><textPath href="#p38">02</textPath></text><path class="prtts1" d="M61.2,2.1 l-0.2,1.2" /><path class="prtts1" d="M61.7,2.2 l-0.5,2.4" /><path class="prtts1" d="M62.2,2.3 l-0.3,1.2" /><path class="prtts1" d="M62.7,2.4 l-0.6,2.4" /><path class="prtts1" d="M63.1,2.5 l-0.3,1.2" /><path class="prtts1" d="M63.6,2.6 l-0.6,2.4" /><path class="prtts1" d="M64.1,2.7 l-0.3,1.3" /><path class="prtts1" d="M64.6,2.9 l-0.7,2.4" /><path class="prtts1" d="M65,3 l-0.3,1.2" /><path class="prtts0" d="M65.5,3.2 l-1.4,4.7" /><defs><path id="p39" d="M62.3,9.5 l2.4,0.7" /></defs><text class="prtts2"><textPath href="#p39">03</textPath></text><path class="prtts1" d="M66,3.3 l-0.4,1.2" /><path class="prtts1" d="M66.5,3.4 l-0.8,2.4" /><path class="prtts1" d="M66.9,3.6 l-0.4,1.2" /><path class="prtts1" d="M67.4,3.8 l-0.8,2.3" /><path class="prtts1" d="M67.8,3.9 l-0.4,1.2" /><path class="prtts1" d="M68.3,4.1 l-0.9,2.3" /><path class="prtts1" d="M68.8,4.3 l-0.5,1.1" /><path class="prtts1" d="M69.2,4.4 l-0.9,2.4" /><path class="prtts1" d="M69.7,4.6 l-0.5,1.2" /><path class="prtts0" d="M70.1,4.8 l-1.9,4.6" /><defs><path id="p40" d="M66.3,10.8 l2.3,1" /></defs><text class="prtts2"><textPath href="#p40">04</textPath></text><path class="prtts1" d="M70.6,5 l-0.5,1.1" /><path class="prtts1" d="M71,5.2 l-1,2.3" /><path class="prtts1" d="M71.5,5.4 l-0.5,1.1" /><path class="prtts1" d="M71.9,5.6 l-1,2.3" /><path class="prtts1" d="M72.4,5.8 l-0.6,1.1" /><path class="prtts1" d="M72.8,6 l-1.1,2.3" /><path class="prtts1" d="M73.3,6.2 l-0.6,1.1" /><path class="prtts1" d="M73.7,6.4 l-1.1,2.3" /><path class="prtts1" d="M74.1,6.7 l-0.5,1.1" /><path class="prtts0" d="M74.6,6.9 l-2.4,4.4" /><defs><path id="p41" d="M70.1,12.5 l2.3,1.2" /></defs><text class="prtts2"><textPath href="#p41">05</textPath></text><path class="prtts1" d="M75,7.1 l-0.6,1.1" /><path class="prtts1" d="M75.4,7.4 l-1.2,2.2" /><path class="prtts1" d="M75.9,7.6 l-0.7,1.1" /><path class="prtts1" d="M76.3,7.9 l-1.3,2.1" /><path class="prtts1" d="M76.7,8.1 l-0.6,1.1" /><path class="prtts1" d="M77.1,8.4 l-1.3,2.1" /><path class="prtts1" d="M77.5,8.6 l-0.6,1.1" /><path class="prtts1" d="M78,8.9 l-1.4,2.1" /><path class="prtts1" d="M78.4,9.2 l-0.7,1" /><path class="prtts0" d="M78.8,9.4 l-2.8,4.2" /><defs><path id="p42" d="M73.8,14.6 l2.1,1.4" /></defs><text class="prtts2"><textPath href="#p42">06</textPath></text><path class="prtts1" d="M79.2,9.7 l-0.7,1" /><path class="prtts1" d="M79.6,10 l-1.4,2" /><path class="prtts1" d="M80,10.3 l-0.7,1" /><path class="prtts1" d="M80.4,10.5 l-1.5,2.1" /><path class="prtts1" d="M80.8,10.8 l-0.8,1" /><path class="prtts1" d="M81.2,11.1 l-1.5,2" /><path class="prtts1" d="M81.6,11.4 l-0.8,1" /><path class="prtts1" d="M82,11.7 l-1.6,2" /><path class="prtts1" d="M82.3,12 l-0.7,1" /><path class="prtts0" d="M82.7,12.3 l-3.2,3.9" /><defs><path id="p43" d="M77.3,17 l1.9,1.6" /></defs><text class="prtts2"><textPath href="#p43">07</textPath></text><path class="prtts1" d="M83.1,12.7 l-0.8,0.9" /><path class="prtts1" d="M83.5,13 l-1.7,1.9" /><path class="prtts1" d="M83.8,13.3 l-0.8,0.9" /><path class="prtts1" d="M84.2,13.6 l-1.6,1.9" /><path class="prtts1" d="M84.6,14 l-0.9,0.9" /><path class="prtts1" d="M84.9,14.3 l-1.7,1.8" /><path class="prtts1" d="M85.3,14.6 l-0.9,0.9" /><path class="prtts1" d="M85.7,15 l-1.8,1.8" /><path class="prtts1" d="M86,15.3 l-0.9,0.9" /><path class="prtts0" d="M86.4,15.6 l-3.6,3.6" /><defs><path id="p44" d="M80.5,19.7 l1.8,1.8" /></defs><text class="prtts2"><textPath href="#p44">08</textPath></text><path class="prtts1" d="M86.7,16 l-0.9,0.9" /><path class="prtts1" d="M87,16.3 l-1.8,1.8" /><path class="prtts1" d="M87.4,16.7 l-0.9,0.9" /><path class="prtts1" d="M87.7,17.1 l-1.8,1.7" /><path class="prtts1" d="M88,17.4 l-0.9,0.9" /><path class="prtts1" d="M88.4,17.8 l-1.9,1.6" /><path class="prtts1" d="M88.7,18.2 l-0.9,0.8" /><path class="prtts1" d="M89,18.5 l-1.9,1.7" /><path class="prtts1" d="M89.3,18.9 l-0.9,0.8" /><path class="prtts0" d="M89.7,19.3 l-3.9,3.2" /><defs><path id="p45" d="M83.4,22.8 l1.6,1.9" /></defs><text class="prtts2"><textPath href="#p45">09</textPath></text><path class="prtts1" d="M90,19.7 l-1,0.7" /><path class="prtts1" d="M90.3,20 l-2,1.6" /><path class="prtts1" d="M90.6,20.4 l-1,0.8" /><path class="prtts1" d="M90.9,20.8 l-2,1.5" /><path class="prtts1" d="M91.2,21.2 l-1,0.8" /><path class="prtts1" d="M91.5,21.6 l-2.1,1.5" /><path class="prtts1" d="M91.7,22 l-1,0.7" /><path class="prtts1" d="M92,22.4 l-2,1.4" /><path class="prtts1" d="M92.3,22.8 l-1,0.7" /><path class="prtts0" d="M92.6,23.2 l-4.2,2.8" /><defs><path id="p46" d="M86,26.1 l1.4,2.1" /></defs><text class="prtts2"><textPath href="#p46">10</textPath></text><path class="prtts1" d="M92.8,23.6 l-1,0.7" /><path class="prtts1" d="M93.1,24 l-2.1,1.4" /><path class="prtts1" d="M93.4,24.5 l-1.1,0.6" /><path class="prtts1" d="M93.6,24.9 l-2.1,1.3" /><path class="prtts1" d="M93.9,25.3 l-1.1,0.6" /><path class="prtts1" d="M94.1,25.7 l-2.1,1.3" /><path class="prtts1" d="M94.4,26.1 l-1.1,0.7" /><path class="prtts1" d="M94.6,26.6 l-2.2,1.2" /><path class="prtts1" d="M94.9,27 l-1.1,0.6" /><path class="prtts0" d="M95.1,27.4 l-4.4,2.4" /><defs><path id="p47" d="M88.3,29.6 l1.2,2.3" /></defs><text class="prtts2"><textPath href="#p47">11</textPath></text><path class="prtts1" d="M95.3,27.9 l-1.1,0.5" /><path class="prtts1" d="M95.6,28.3 l-2.3,1.1" /><path class="prtts1" d="M95.8,28.7 l-1.1,0.6" /><path class="prtts1" d="M96,29.2 l-2.3,1.1" /><path class="prtts1" d="M96.2,29.6 l-1.1,0.6" /><path class="prtts1" d="M96.4,30.1 l-2.3,1" /><path class="prtts1" d="M96.6,30.5 l-1.1,0.5" /><path class="prtts1" d="M96.8,31 l-2.3,1" /><path class="prtts1" d="M97,31.4 l-1.1,0.5" /><path class="prtts0" d="M97.2,31.9 l-4.6,1.9" /><defs><path id="p48" d="M90.2,33.4 l1,2.3" /></defs><text class="prtts2"><textPath href="#p48">12</textPath></text><path class="prtts1" d="M97.4,32.3 l-1.2,0.5" /><path class="prtts1" d="M97.6,32.8 l-2.4,0.9" /><path class="prtts1" d="M97.7,33.2 l-1.1,0.5" /><path class="prtts1" d="M97.9,33.7 l-2.3,0.9" /><path class="prtts1" d="M98.1,34.2 l-1.2,0.4" /><path class="prtts1" d="M98.2,34.6 l-2.3,0.8" /><path class="prtts1" d="M98.4,35.1 l-1.2,0.4" /><path class="prtts1" d="M98.6,35.5 l-2.4,0.8" /><path class="prtts1" d="M98.7,36 l-1.2,0.4" /><path class="prtts0" d="M98.8,36.5 l-4.7,1.4" /><defs><path id="p49" d="M91.8,37.3 l0.7,2.4" /></defs><text class="prtts2"><textPath href="#p49">13</textPath></text><path class="prtts1" d="M99,37 l-1.2,0.3" /><path class="prtts1" d="M99.1,37.4 l-2.4,0.7" /><path class="prtts1" d="M99.3,37.9 l-1.3,0.3" /><path class="prtts1" d="M99.4,38.4 l-2.4,0.6" /><path class="prtts1" d="M99.5,38.9 l-1.2,0.3" /><path class="prtts1" d="M99.6,39.3 l-2.4,0.6" /><path class="prtts1" d="M99.7,39.8 l-1.2,0.3" /><path class="prtts1" d="M99.8,40.3 l-2.4,0.5" /><path class="prtts1" d="M99.9,40.8 l-1.2,0.2" /><path class="prtts0" d="M100,41.2 l-4.9,1" /><defs><path id="p50" d="M92.9,41.4 l0.5,2.5" /></defs><text class="prtts2"><textPath href="#p50">14</textPath></text><path class="prtts1" d="M100.1,41.7 l-1.2,0.3" /><path class="prtts1" d="M100.2,42.2 l-2.4,0.4" /><path class="prtts1" d="M100.3,42.7 l-1.2,0.2" /><path class="prtts1" d="M100.4,43.2 l-2.5,0.4" /><path class="prtts1" d="M100.5,43.7 l-1.3,0.1" /><path class="prtts1" d="M100.5,44.1 l-2.4,0.4" /><path class="prtts1" d="M100.6,44.6 l-1.2,0.2" /><path class="prtts1" d="M100.7,45.1 l-2.5,0.3" /><path class="prtts1" d="M100.7,45.6 l-1.2,0.1" /><path class="prtts0" d="M100.8,46.1 l-5,0.5" /><defs><path id="p51" d="M93.7,45.5 l0.2,2.5" /></defs><text class="prtts2"><textPath href="#p51">15</textPath></text><path class="prtts1" d="M100.8,46.6 l-1.2,0.1" /><path class="prtts1" d="M100.8,47.1 l-2.4,0.2" /><path class="prtts1" d="M100.9,47.6 l-1.3,0.1" /><path class="prtts1" d="M100.9,48.1 l-2.5,0.1" /><path class="prtts1" d="M100.9,48.5 l-1.2,0.1" /><path class="prtts1" d="M101,49 l-2.5,0.1" /><path class="prtts1" d="M101,49.5 l-1.3,0.1" /><path class="prtts1" d="M101,50 l-2.5,0.1" /><path class="prtts1" d="M101,50.5 l-1.3,0" /><path class="prtts0" d="M101,51 l-5,0" /><defs><path id="p52" d="M94,49.7 l0,2.6" /></defs><text class="prtts2"><textPath href="#p52">16</textPath></text><path class="prtts1" d="M101,51.5 l-1.3,0" /><path class="prtts1" d="M101,52 l-2.5,-0.1" /><path class="prtts1" d="M101,52.5 l-1.3,-0.1" /><path class="prtts1" d="M101,53 l-2.5,-0.1" /><path class="prtts1" d="M100.9,53.5 l-1.2,-0.1" /><path class="prtts1" d="M100.9,53.9 l-2.5,-0.1" /><path class="prtts1" d="M100.9,54.4 l-1.3,-0.1" /><path class="prtts1" d="M100.8,54.9 l-2.4,-0.2" /><path class="prtts1" d="M100.8,55.4 l-1.2,-0.1" /><path class="prtts0" d="M100.8,55.9 l-5,-0.5" /><defs><path id="p53" d="M93.9,54 l-0.2,2.5" /></defs><text class="prtts2"><textPath href="#p53">17</textPath></text><path class="prtts1" d="M100.7,56.4 l-1.2,-0.1" /><path class="prtts1" d="M100.7,56.9 l-2.5,-0.3" /><path class="prtts1" d="M100.6,57.4 l-1.2,-0.2" /><path class="prtts1" d="M100.5,57.9 l-2.4,-0.4" /><path class="prtts1" d="M100.5,58.3 l-1.3,-0.1" /><path class="prtts1" d="M100.4,58.8 l-2.5,-0.4" /><path class="prtts1" d="M100.3,59.3 l-1.2,-0.2" /><path class="prtts1" d="M100.2,59.8 l-2.4,-0.4" /><path class="prtts1" d="M100.1,60.3 l-1.2,-0.3" /><path class="prtts0" d="M100,60.8 l-4.9,-1" /><defs><path id="p54" d="M93.4,58.1 l-0.5,2.5" /></defs><text class="prtts2"><textPath href="#p54">18</textPath></text><path class="prtts1" d="M99.9,61.2 l-1.2,-0.2" /><path class="prtts1" d="M99.8,61.7 l-2.4,-0.5" /><path class="prtts1" d="M99.7,62.2 l-1.2,-0.3" /><path class="prtts1" d="M99.6,62.7 l-2.4,-0.6" /><path class="prtts1" d="M99.5,63.1 l-1.2,-0.3" /><path class="prtts1" d="M99.4,63.6 l-2.4,-0.6" /><path class="prtts1" d="M99.3,64.1 l-1.3,-0.3" /><path class="prtts1" d="M99.1,64.6 l-2.4,-0.7" /><path class="prtts1" d="M99,65 l-1.2,-0.3" /><path class="prtts0" d="M98.8,65.5 l-4.7,-1.4" /><defs><path id="p55" d="M92.5,62.3 l-0.7,2.4" /></defs><text class="prtts2"><textPath href="#p55">19</textPath></text><path class="prtts1" d="M98.7,66 l-1.2,-0.4" /><path class="prtts1" d="M98.6,66.5 l-2.4,-0.8" /><path class="prtts1" d="M98.4,66.9 l-1.2,-0.4" /><path class="prtts1" d="M98.2,67.4 l-2.3,-0.8" /><path class="prtts1" d="M98.1,67.8 l-1.2,-0.4" /><path class="prtts1" d="M97.9,68.3 l-2.3,-0.9" /><path class="prtts1" d="M97.7,68.8 l-1.1,-0.5" /><path class="prtts1" d="M97.6,69.2 l-2.4,-0.9" /><path class="prtts1" d="M97.4,69.7 l-1.2,-0.5" /><path class="prtts0" d="M97.2,70.1 l-4.6,-1.9" /><defs><path id="p56" d="M91.2,66.3 l-1,2.3" /></defs><text class="prtts2"><textPath href="#p56">20</textPath></text><path class="prtts1" d="M97,70.6 l-1.1,-0.5" /><path class="prtts1" d="M96.8,71 l-2.3,-1" /><path class="prtts1" d="M96.6,71.5 l-1.1,-0.5" /><path class="prtts1" d="M96.4,71.9 l-2.3,-1" /><path class="prtts1" d="M96.2,72.4 l-1.1,-0.6" /><path class="prtts1" d="M96,72.8 l-2.3,-1.1" /><path class="prtts1" d="M95.8,73.3 l-1.1,-0.6" /><path class="prtts1" d="M95.6,73.7 l-2.3,-1.1" /><path class="prtts1" d="M95.3,74.1 l-1.1,-0.5" /><path class="prtts0" d="M95.1,74.6 l-4.4,-2.4" /><defs><path id="p57" d="M89.5,70.1 l-1.2,2.3" /></defs><text class="prtts2"><textPath href="#p57">21</textPath></text><path class="prtts1" d="M94.9,75 l-1.1,-0.6" /><path class="prtts1" d="M94.6,75.4 l-2.2,-1.2" /><path class="prtts1" d="M94.4,75.9 l-1.1,-0.7" /><path class="prtts1" d="M94.1,76.3 l-2.1,-1.3" /><path class="prtts1" d="M93.9,76.7 l-1.1,-0.6" /><path class="prtts1" d="M93.6,77.1 l-2.1,-1.3" /><path class="prtts1" d="M93.4,77.5 l-1.1,-0.6" /><path class="prtts1" d="M93.1,78 l-2.1,-1.4" /><path class="prtts1" d="M92.8,78.4 l-1,-0.7" /><path class="prtts0" d="M92.6,78.8 l-4.2,-2.8" /><defs><path id="p58" d="M87.4,73.8 l-1.4,2.1" /></defs><text class="prtts2"><textPath href="#p58">22</textPath></text><path class="prtts1" d="M92.3,79.2 l-1,-0.7" /><path class="prtts1" d="M92,79.6 l-2,-1.4" /><path class="prtts1" d="M91.7,80 l-1,-0.7" /><path class="prtts1" d="M91.5,80.4 l-2.1,-1.5" /><path class="prtts1" d="M91.2,80.8 l-1,-0.8" /><path class="prtts1" d="M90.9,81.2 l-2,-1.5" /><path class="prtts1" d="M90.6,81.6 l-1,-0.8" /><path class="prtts1" d="M90.3,82 l-2,-1.6" /><path class="prtts1" d="M90,82.3 l-1,-0.7" /><path class="prtts0" d="M89.7,82.7 l-3.9,-3.2" /><defs><path id="p59" d="M85,77.3 l-1.6,1.9" /></defs><text class="prtts2"><textPath href="#p59">23</textPath></text><path class="prtts1" d="M89.3,83.1 l-0.9,-0.8" /><path class="prtts1" d="M89,83.5 l-1.9,-1.7" /><path class="prtts1" d="M88.7,83.8 l-0.9,-0.8" /><path class="prtts1" d="M88.4,84.2 l-1.9,-1.6" /><path class="prtts1" d="M88,84.6 l-0.9,-0.9" /><path class="prtts1" d="M87.7,84.9 l-1.8,-1.7" /><path class="prtts1" d="M87.4,85.3 l-0.9,-0.9" /><path class="prtts1" d="M87,85.7 l-1.8,-1.8" /><path class="prtts1" d="M86.7,86 l-0.9,-0.9" /><path class="prtts0" d="M86.4,86.4 l-3.6,-3.6" /><defs><path id="p60" d="M82.3,80.5 l-1.8,1.8" /></defs><text class="prtts2"><textPath href="#p60">24</textPath></text><path class="prtts1" d="M86,86.7 l-0.9,-0.9" /><path class="prtts1" d="M85.7,87 l-1.8,-1.8" /><path class="prtts1" d="M85.3,87.4 l-0.9,-0.9" /><path class="prtts1" d="M84.9,87.7 l-1.7,-1.8" /><path class="prtts1" d="M84.6,88 l-0.9,-0.9" /><path class="prtts1" d="M84.2,88.4 l-1.6,-1.9" /><path class="prtts1" d="M83.8,88.7 l-0.8,-0.9" /><path class="prtts1" d="M83.5,89 l-1.7,-1.9" /><path class="prtts1" d="M83.1,89.3 l-0.8,-0.9" /><path class="prtts0" d="M82.7,89.7 l-3.2,-3.9" /><defs><path id="p61" d="M79.2,83.4 l-1.9,1.6" /></defs><text class="prtts2"><textPath href="#p61">25</textPath></text><path class="prtts1" d="M82.3,90 l-0.7,-1" /><path class="prtts1" d="M82,90.3 l-1.6,-2" /><path class="prtts1" d="M81.6,90.6 l-0.8,-1" /><path class="prtts1" d="M81.2,90.9 l-1.5,-2" /><path class="prtts1" d="M80.8,91.2 l-0.8,-1" /><path class="prtts1" d="M80.4,91.5 l-1.5,-2.1" /><path class="prtts1" d="M80,91.7 l-0.7,-1" /><path class="prtts1" d="M79.6,92 l-1.4,-2" /><path class="prtts1" d="M79.2,92.3 l-0.7,-1" /><path class="prtts0" d="M78.8,92.6 l-2.8,-4.2" /><defs><path id="p62" d="M75.9,86 l-2.1,1.4" /></defs><text class="prtts2"><textPath href="#p62">26</textPath></text><path class="prtts1" d="M78.4,92.8 l-0.7,-1" /><path class="prtts1" d="M78,93.1 l-1.4,-2.1" /><path class="prtts1" d="M77.5,93.4 l-0.6,-1.1" /><path class="prtts1" d="M77.1,93.6 l-1.3,-2.1" /><path class="prtts1" d="M76.7,93.9 l-0.6,-1.1" /><path class="prtts1" d="M76.3,94.1 l-1.3,-2.1" /><path class="prtts1" d="M75.9,94.4 l-0.7,-1.1" /><path class="prtts1" d="M75.4,94.6 l-1.2,-2.2" /><path class="prtts1" d="M75,94.9 l-0.6,-1.1" /><path class="prtts0" d="M74.6,95.1 l-2.4,-4.4" /><defs><path id="p63" d="M72.4,88.3 l-2.3,1.2" /></defs><text class="prtts2"><textPath href="#p63">27</textPath></text><path class="prtts1" d="M74.1,95.3 l-0.5,-1.1" /><path class="prtts1" d="M73.7,95.6 l-1.1,-2.3" /><path class="prtts1" d="M73.3,95.8 l-0.6,-1.1" /><path class="prtts1" d="M72.8,96 l-1.1,-2.3" /><path class="prtts1" d="M72.4,96.2 l-0.6,-1.1" /><path class="prtts1" d="M71.9,96.4 l-1,-2.3" /><path class="prtts1" d="M71.5,96.6 l-0.5,-1.1" /><path class="prtts1" d="M71,96.8 l-1,-2.3" /><path class="prtts1" d="M70.6,97 l-0.5,-1.1" /><path class="prtts0" d="M70.1,97.2 l-1.9,-4.6" /><defs><path id="p64" d="M68.6,90.2 l-2.3,1" /></defs><text class="prtts2"><textPath href="#p64">28</textPath></text><path class="prtts1" d="M69.7,97.4 l-0.5,-1.2" /><path class="prtts1" d="M69.2,97.6 l-0.9,-2.4" /><path class="prtts1" d="M68.8,97.7 l-0.5,-1.1" /><path class="prtts1" d="M68.3,97.9 l-0.9,-2.3" /><path class="prtts1" d="M67.8,98.1 l-0.4,-1.2" /><path class="prtts1" d="M67.4,98.2 l-0.8,-2.3" /><path class="prtts1" d="M66.9,98.4 l-0.4,-1.2" /><path class="prtts1" d="M66.5,98.6 l-0.8,-2.4" /><path class="prtts1" d="M66,98.7 l-0.4,-1.2" /><path class="prtts0" d="M65.5,98.8 l-1.4,-4.7" /><defs><path id="p65" d="M64.7,91.8 l-2.4,0.7" /></defs><text class="prtts2"><textPath href="#p65">29</textPath></text><path class="prtts1" d="M65,99 l-0.3,-1.2" /><path class="prtts1" d="M64.6,99.1 l-0.7,-2.4" /><path class="prtts1" d="M64.1,99.3 l-0.3,-1.3" /><path class="prtts1" d="M63.6,99.4 l-0.6,-2.4" /><path class="prtts1" d="M63.1,99.5 l-0.3,-1.2" /><path class="prtts1" d="M62.7,99.6 l-0.6,-2.4" /><path class="prtts1" d="M62.2,99.7 l-0.3,-1.2" /><path class="prtts1" d="M61.7,99.8 l-0.5,-2.4" /><path class="prtts1" d="M61.2,99.9 l-0.2,-1.2" /><path class="prtts0" d="M60.8,100 l-1,-4.9" /><defs><path id="p66" d="M60.6,92.9 l-2.5,0.5" /></defs><text class="prtts2"><textPath href="#p66">30</textPath></text><path class="prtts1" d="M60.3,100.1 l-0.3,-1.2" /><path class="prtts1" d="M59.8,100.2 l-0.4,-2.4" /><path class="prtts1" d="M59.3,100.3 l-0.2,-1.2" /><path class="prtts1" d="M58.8,100.4 l-0.4,-2.5" /><path class="prtts1" d="M58.3,100.5 l-0.1,-1.3" /><path class="prtts1" d="M57.9,100.5 l-0.4,-2.4" /><path class="prtts1" d="M57.4,100.6 l-0.2,-1.2" /><path class="prtts1" d="M56.9,100.7 l-0.3,-2.5" /><path class="prtts1" d="M56.4,100.7 l-0.1,-1.2" /><path class="prtts0" d="M55.9,100.8 l-0.5,-5" /><defs><path id="p67" d="M56.5,93.7 l-2.5,0.2" /></defs><text class="prtts2"><textPath href="#p67">31</textPath></text><path class="prtts1" d="M55.4,100.8 l-0.1,-1.2" /><path class="prtts1" d="M54.9,100.8 l-0.2,-2.4" /><path class="prtts1" d="M54.4,100.9 l-0.1,-1.3" /><path class="prtts1" d="M53.9,100.9 l-0.1,-2.5" /><path class="prtts1" d="M53.5,100.9 l-0.1,-1.2" /><path class="prtts1" d="M53,101 l-0.1,-2.5" /><path class="prtts1" d="M52.5,101 l-0.1,-1.3" /><path class="prtts1" d="M52,101 l-0.1,-2.5" /><path class="prtts1" d="M51.5,101 l0,-1.3" /><path class="prtts0" d="M51,101 l0,-5" /><defs><path id="p68" d="M52.3,94 l-2.6,0" /></defs><text class="prtts2"><textPath href="#p68">32</textPath></text><path class="prtts1" d="M50.5,101 l0,-1.3" /><path class="prtts1" d="M50,101 l0.1,-2.5" /><path class="prtts1" d="M49.5,101 l0.1,-1.3" /><path class="prtts1" d="M49,101 l0.1,-2.5" /><path class="prtts1" d="M48.5,100.9 l0.1,-1.2" /><path class="prtts1" d="M48.1,100.9 l0.1,-2.5" /><path class="prtts1" d="M47.6,100.9 l0.1,-1.3" /><path class="prtts1" d="M47.1,100.8 l0.2,-2.4" /><path class="prtts1" d="M46.6,100.8 l0.1,-1.2" /><path class="prtts0" d="M46.1,100.8 l0.5,-5" /><defs><path id="p69" d="M48,93.9 l-2.5,-0.2" /></defs><text class="prtts2"><textPath href="#p69">33</textPath></text><path class="prtts1" d="M45.6,100.7 l0.1,-1.2" /><path class="prtts1" d="M45.1,100.7 l0.3,-2.5" /><path class="prtts1" d="M44.6,100.6 l0.2,-1.2" /><path class="prtts1" d="M44.1,100.5 l0.4,-2.4" /><path class="prtts1" d="M43.7,100.5 l0.1,-1.3" /><path class="prtts1" d="M43.2,100.4 l0.4,-2.5" /><path class="prtts1" d="M42.7,100.3 l0.2,-1.2" /><path class="prtts1" d="M42.2,100.2 l0.4,-2.4" /><path class="prtts1" d="M41.7,100.1 l0.3,-1.2" /><path class="prtts0" d="M41.2,100 l1,-4.9" /><defs><path id="p70" d="M43.9,93.4 l-2.5,-0.5" /></defs><text class="prtts2"><textPath href="#p70">34</textPath></text><path class="prtts1" d="M40.8,99.9 l0.2,-1.2" /><path class="prtts1" d="M40.3,99.8 l0.5,-2.4" /><path class="prtts1" d="M39.8,99.7 l0.3,-1.2" /><path class="prtts1" d="M39.3,99.6 l0.6,-2.4" /><path class="prtts1" d="M38.9,99.5 l0.3,-1.2" /><path class="prtts1" d="M38.4,99.4 l0.6,-2.4" /><path class="prtts1" d="M37.9,99.3 l0.3,-1.3" /><path class="prtts1" d="M37.4,99.1 l0.7,-2.4" /><path class="prtts1" d="M37,99 l0.3,-1.2" /><path class="prtts0" d="M36.5,98.8 l1.4,-4.7" /><defs><path id="p71" d="M39.7,92.5 l-2.4,-0.7" /></defs><text class="prtts2"><textPath href="#p71">35</textPath></text><path class="prtts1" d="M36,98.7 l0.4,-1.2" /><path class="prtts1" d="M35.5,98.6 l0.8,-2.4" /><path class="prtts1" d="M35.1,98.4 l0.4,-1.2" /><path class="prtts1" d="M34.6,98.2 l0.8,-2.3" /><path class="prtts1" d="M34.2,98.1 l0.4,-1.2" /><path class="prtts1" d="M33.7,97.9 l0.9,-2.3" /><path class="prtts1" d="M33.2,97.7 l0.5,-1.1" /><path class="prtts1" d="M32.8,97.6 l0.9,-2.4" /><path class="prtts1" d="M32.3,97.4 l0.5,-1.2" /><path class="prtts0" d="M31.9,97.2 l1.9,-4.6" /><defs><path id="p72" d="M35.7,91.2 l-2.3,-1" /></defs><text class="prtts2"><textPath href="#p72">36</textPath></text><path class="prtts1" d="M31.4,97 l0.5,-1.1" /><path class="prtts1" d="M31,96.8 l1,-2.3" /><path class="prtts1" d="M30.5,96.6 l0.5,-1.1" /><path class="prtts1" d="M30.1,96.4 l1,-2.3" /><path class="prtts1" d="M29.6,96.2 l0.6,-1.1" /><path class="prtts1" d="M29.2,96 l1.1,-2.3" /><path class="prtts1" d="M28.7,95.8 l0.6,-1.1" /><path class="prtts1" d="M28.3,95.6 l1.1,-2.3" /><path class="prtts1" d="M27.9,95.3 l0.5,-1.1" /><path class="prtts0" d="M27.4,95.1 l2.4,-4.4" /><defs><path id="p73" d="M31.9,89.5 l-2.3,-1.2" /></defs><text class="prtts2"><textPath href="#p73">37</textPath></text><path class="prtts1" d="M27,94.9 l0.6,-1.1" /><path class="prtts1" d="M26.6,94.6 l1.2,-2.2" /><path class="prtts1" d="M26.1,94.4 l0.7,-1.1" /><path class="prtts1" d="M25.7,94.1 l1.3,-2.1" /><path class="prtts1" d="M25.3,93.9 l0.6,-1.1" /><path class="prtts1" d="M24.9,93.6 l1.3,-2.1" /><path class="prtts1" d="M24.5,93.4 l0.6,-1.1" /><path class="prtts1" d="M24,93.1 l1.4,-2.1" /><path class="prtts1" d="M23.6,92.8 l0.7,-1" /><path class="prtts0" d="M23.2,92.6 l2.8,-4.2" /><defs><path id="p74" d="M28.2,87.4 l-2.1,-1.4" /></defs><text class="prtts2"><textPath href="#p74">38</textPath></text><path class="prtts1" d="M22.8,92.3 l0.7,-1" /><path class="prtts1" d="M22.4,92 l1.4,-2" /><path class="prtts1" d="M22,91.7 l0.7,-1" /><path class="prtts1" d="M21.6,91.5 l1.5,-2.1" /><path class="prtts1" d="M21.2,91.2 l0.8,-1" /><path class="prtts1" d="M20.8,90.9 l1.5,-2" /><path class="prtts1" d="M20.4,90.6 l0.8,-1" /><path class="prtts1" d="M20,90.3 l1.6,-2" /><path class="prtts1" d="M19.7,90 l0.7,-1" /><path class="prtts0" d="M19.3,89.7 l3.2,-3.9" /><defs><path id="p75" d="M24.7,85 l-1.9,-1.6" /></defs><text class="prtts2"><textPath href="#p75">39</textPath></text><path class="prtts1" d="M18.9,89.3 l0.8,-0.9" /><path class="prtts1" d="M18.5,89 l1.7,-1.9" /><path class="prtts1" d="M18.2,88.7 l0.8,-0.9" /><path class="prtts1" d="M17.8,88.4 l1.6,-1.9" /><path class="prtts1" d="M17.4,88 l0.9,-0.9" /><path class="prtts1" d="M17.1,87.7 l1.7,-1.8" /><path class="prtts1" d="M16.7,87.4 l0.9,-0.9" /><path class="prtts1" d="M16.3,87 l1.8,-1.8" /><path class="prtts1" d="M16,86.7 l0.9,-0.9" /><path class="prtts0" d="M15.6,86.4 l3.6,-3.6" /><defs><path id="p76" d="M21.5,82.3 l-1.8,-1.8" /></defs><text class="prtts2"><textPath href="#p76">40</textPath></text><path class="prtts1" d="M15.3,86 l0.9,-0.9" /><path class="prtts1" d="M15,85.7 l1.8,-1.8" /><path class="prtts1" d="M14.6,85.3 l0.9,-0.9" /><path class="prtts1" d="M14.3,84.9 l1.8,-1.7" /><path class="prtts1" d="M14,84.6 l0.9,-0.9" /><path class="prtts1" d="M13.6,84.2 l1.9,-1.6" /><path class="prtts1" d="M13.3,83.8 l0.9,-0.8" /><path class="prtts1" d="M13,83.5 l1.9,-1.7" /><path class="prtts1" d="M12.7,83.1 l0.9,-0.8" /><path class="prtts0" d="M12.3,82.7 l3.9,-3.2" /><defs><path id="p77" d="M18.6,79.2 l-1.6,-1.9" /></defs><text class="prtts2"><textPath href="#p77">41</textPath></text><path class="prtts1" d="M12,82.3 l1,-0.7" /><path class="prtts1" d="M11.7,82 l2,-1.6" /><path class="prtts1" d="M11.4,81.6 l1,-0.8" /><path class="prtts1" d="M11.1,81.2 l2,-1.5" /><path class="prtts1" d="M10.8,80.8 l1,-0.8" /><path class="prtts1" d="M10.5,80.4 l2.1,-1.5" /><path class="prtts1" d="M10.3,80 l1,-0.7" /><path class="prtts1" d="M10,79.6 l2,-1.4" /><path class="prtts1" d="M9.7,79.2 l1,-0.7" /><path class="prtts0" d="M9.4,78.8 l4.2,-2.8" /><defs><path id="p78" d="M16,75.9 l-1.4,-2.1" /></defs><text class="prtts2"><textPath href="#p78">42</textPath></text><path class="prtts1" d="M9.2,78.4 l1,-0.7" /><path class="prtts1" d="M8.9,78 l2.1,-1.4" /><path class="prtts1" d="M8.6,77.5 l1.1,-0.6" /><path class="prtts1" d="M8.4,77.1 l2.1,-1.3" /><path class="prtts1" d="M8.1,76.7 l1.1,-0.6" /><path class="prtts1" d="M7.9,76.3 l2.1,-1.3" /><path class="prtts1" d="M7.6,75.9 l1.1,-0.7" /><path class="prtts1" d="M7.4,75.4 l2.2,-1.2" /><path class="prtts1" d="M7.1,75 l1.1,-0.6" /><path class="prtts0" d="M6.9,74.6 l4.4,-2.4" /><defs><path id="p79" d="M13.7,72.4 l-1.2,-2.3" /></defs><text class="prtts2"><textPath href="#p79">43</textPath></text><path class="prtts1" d="M6.7,74.1 l1.1,-0.5" /><path class="prtts1" d="M6.4,73.7 l2.3,-1.1" /><path class="prtts1" d="M6.2,73.3 l1.1,-0.6" /><path class="prtts1" d="M6,72.8 l2.3,-1.1" /><path class="prtts1" d="M5.8,72.4 l1.1,-0.6" /><path class="prtts1" d="M5.6,71.9 l2.3,-1" /><path class="prtts1" d="M5.4,71.5 l1.1,-0.5" /><path class="prtts1" d="M5.2,71 l2.3,-1" /><path class="prtts1" d="M5,70.6 l1.1,-0.5" /><path class="prtts0" d="M4.8,70.1 l4.6,-1.9" /><defs><path id="p80" d="M11.8,68.6 l-1,-2.3" /></defs><text class="prtts2"><textPath href="#p80">44</textPath></text><path class="prtts1" d="M4.6,69.7 l1.2,-0.5" /><path class="prtts1" d="M4.4,69.2 l2.4,-0.9" /><path class="prtts1" d="M4.3,68.8 l1.1,-0.5" /><path class="prtts1" d="M4.1,68.3 l2.3,-0.9" /><path class="prtts1" d="M3.9,67.8 l1.2,-0.4" /><path class="prtts1" d="M3.8,67.4 l2.3,-0.8" /><path class="prtts1" d="M3.6,66.9 l1.2,-0.4" /><path class="prtts1" d="M3.4,66.5 l2.4,-0.8" /><path class="prtts1" d="M3.3,66 l1.2,-0.4" /><path class="prtts0" d="M3.2,65.5 l4.7,-1.4" /><defs><path id="p81" d="M10.2,64.7 l-0.7,-2.4" /></defs><text class="prtts2"><textPath href="#p81">45</textPath></text><path class="prtts1" d="M3,65 l1.2,-0.3" /><path class="prtts1" d="M2.9,64.6 l2.4,-0.7" /><path class="prtts1" d="M2.7,64.1 l1.3,-0.3" /><path class="prtts1" d="M2.6,63.6 l2.4,-0.6" /><path class="prtts1" d="M2.5,63.1 l1.2,-0.3" /><path class="prtts1" d="M2.4,62.7 l2.4,-0.6" /><path class="prtts1" d="M2.3,62.2 l1.2,-0.3" /><path class="prtts1" d="M2.2,61.7 l2.4,-0.5" /><path class="prtts1" d="M2.1,61.2 l1.2,-0.2" /><path class="prtts0" d="M2,60.8 l4.9,-1" /><defs><path id="p82" d="M9.1,60.6 l-0.5,-2.5" /></defs><text class="prtts2"><textPath href="#p82">46</textPath></text><path class="prtts1" d="M1.9,60.3 l1.2,-0.3" /><path class="prtts1" d="M1.8,59.8 l2.4,-0.4" /><path class="prtts1" d="M1.7,59.3 l1.2,-0.2" /><path class="prtts1" d="M1.6,58.8 l2.5,-0.4" /><path class="prtts1" d="M1.5,58.3 l1.3,-0.1" /><path class="prtts1" d="M1.5,57.9 l2.4,-0.4" /><path class="prtts1" d="M1.4,57.4 l1.2,-0.2" /><path class="prtts1" d="M1.3,56.9 l2.5,-0.3" /><path class="prtts1" d="M1.3,56.4 l1.2,-0.1" /><path class="prtts0" d="M1.2,55.9 l5,-0.5" /><defs><path id="p83" d="M8.3,56.5 l-0.2,-2.5" /></defs><text class="prtts2"><textPath href="#p83">47</textPath></text><path class="prtts1" d="M1.2,55.4 l1.2,-0.1" /><path class="prtts1" d="M1.2,54.9 l2.4,-0.2" /><path class="prtts1" d="M1.1,54.4 l1.3,-0.1" /><path class="prtts1" d="M1.1,53.9 l2.5,-0.1" /><path class="prtts1" d="M1.1,53.5 l1.2,-0.1" /><path class="prtts1" d="M1,53 l2.5,-0.1" /><path class="prtts1" d="M1,52.5 l1.3,-0.1" /><path class="prtts1" d="M1,52 l2.5,-0.1" /><path class="prtts1" d="M1,51.5 l1.3,0" /><path class="prtts0" d="M1,51 l5,0" /><defs><path id="p84" d="M8,52.3 l0,-2.6" /></defs><text class="prtts2"><textPath href="#p84">48</textPath></text><path class="prtts1" d="M1,50.5 l1.3,0" /><path class="prtts1" d="M1,50 l2.5,0.1" /><path class="prtts1" d="M1,49.5 l1.3,0.1" /><path class="prtts1" d="M1,49 l2.5,0.1" /><path class="prtts1" d="M1.1,48.5 l1.2,0.1" /><path class="prtts1" d="M1.1,48.1 l2.5,0.1" /><path class="prtts1" d="M1.1,47.6 l1.3,0.1" /><path class="prtts1" d="M1.2,47.1 l2.4,0.2" /><path class="prtts1" d="M1.2,46.6 l1.2,0.1" /><path class="prtts0" d="M1.2,46.1 l5,0.5" /><defs><path id="p85" d="M8.1,48 l0.2,-2.5" /></defs><text class="prtts2"><textPath href="#p85">49</textPath></text><path class="prtts1" d="M1.3,45.6 l1.2,0.1" /><path class="prtts1" d="M1.3,45.1 l2.5,0.3" /><path class="prtts1" d="M1.4,44.6 l1.2,0.2" /><path class="prtts1" d="M1.5,44.1 l2.4,0.4" /><path class="prtts1" d="M1.5,43.7 l1.3,0.1" /><path class="prtts1" d="M1.6,43.2 l2.5,0.4" /><path class="prtts1" d="M1.7,42.7 l1.2,0.2" /><path class="prtts1" d="M1.8,42.2 l2.4,0.4" /><path class="prtts1" d="M1.9,41.7 l1.2,0.3" /><path class="prtts0" d="M2,41.2 l4.9,1" /><defs><path id="p86" d="M8.6,43.9 l0.5,-2.5" /></defs><text class="prtts2"><textPath href="#p86">50</textPath></text><path class="prtts1" d="M2.1,40.8 l1.2,0.2" /><path class="prtts1" d="M2.2,40.3 l2.4,0.5" /><path class="prtts1" d="M2.3,39.8 l1.2,0.3" /><path class="prtts1" d="M2.4,39.3 l2.4,0.6" /><path class="prtts1" d="M2.5,38.9 l1.2,0.3" /><path class="prtts1" d="M2.6,38.4 l2.4,0.6" /><path class="prtts1" d="M2.7,37.9 l1.3,0.3" /><path class="prtts1" d="M2.9,37.4 l2.4,0.7" /><path class="prtts1" d="M3,37 l1.2,0.3" /><path class="prtts0" d="M3.2,36.5 l4.7,1.4" /><defs><path id="p87" d="M9.5,39.7 l0.7,-2.4" /></defs><text class="prtts2"><textPath href="#p87">51</textPath></text><path class="prtts1" d="M3.3,36 l1.2,0.4" /><path class="prtts1" d="M3.4,35.5 l2.4,0.8" /><path class="prtts1" d="M3.6,35.1 l1.2,0.4" /><path class="prtts1" d="M3.8,34.6 l2.3,0.8" /><path class="prtts1" d="M3.9,34.2 l1.2,0.4" /><path class="prtts1" d="M4.1,33.7 l2.3,0.9" /><path class="prtts1" d="M4.3,33.2 l1.1,0.5" /><path class="prtts1" d="M4.4,32.8 l2.4,0.9" /><path class="prtts1" d="M4.6,32.3 l1.2,0.5" /><path class="prtts0" d="M4.8,31.9 l4.6,1.9" /><defs><path id="p88" d="M10.8,35.7 l1,-2.3" /></defs><text class="prtts2"><textPath href="#p88">52</textPath></text><path class="prtts1" d="M5,31.4 l1.1,0.5" /><path class="prtts1" d="M5.2,31 l2.3,1" /><path class="prtts1" d="M5.4,30.5 l1.1,0.5" /><path class="prtts1" d="M5.6,30.1 l2.3,1" /><path class="prtts1" d="M5.8,29.6 l1.1,0.6" /><path class="prtts1" d="M6,29.2 l2.3,1.1" /><path class="prtts1" d="M6.2,28.7 l1.1,0.6" /><path class="prtts1" d="M6.4,28.3 l2.3,1.1" /><path class="prtts1" d="M6.7,27.9 l1.1,0.5" /><path class="prtts0" d="M6.9,27.4 l4.4,2.4" /><defs><path id="p89" d="M12.5,31.9 l1.2,-2.3" /></defs><text class="prtts2"><textPath href="#p89">53</textPath></text><path class="prtts1" d="M7.1,27 l1.1,0.6" /><path class="prtts1" d="M7.4,26.6 l2.2,1.2" /><path class="prtts1" d="M7.6,26.1 l1.1,0.7" /><path class="prtts1" d="M7.9,25.7 l2.1,1.3" /><path class="prtts1" d="M8.1,25.3 l1.1,0.6" /><path class="prtts1" d="M8.4,24.9 l2.1,1.3" /><path class="prtts1" d="M8.6,24.5 l1.1,0.6" /><path class="prtts1" d="M8.9,24 l2.1,1.4" /><path class="prtts1" d="M9.2,23.6 l1,0.7" /><path class="prtts0" d="M9.4,23.2 l4.2,2.8" /><defs><path id="p90" d="M14.6,28.2 l1.4,-2.1" /></defs><text class="prtts2"><textPath href="#p90">54</textPath></text><path class="prtts1" d="M9.7,22.8 l1,0.7" /><path class="prtts1" d="M10,22.4 l2,1.4" /><path class="prtts1" d="M10.3,22 l1,0.7" /><path class="prtts1" d="M10.5,21.6 l2.1,1.5" /><path class="prtts1" d="M10.8,21.2 l1,0.8" /><path class="prtts1" d="M11.1,20.8 l2,1.5" /><path class="prtts1" d="M11.4,20.4 l1,0.8" /><path class="prtts1" d="M11.7,20 l2,1.6" /><path class="prtts1" d="M12,19.7 l1,0.7" /><path class="prtts0" d="M12.3,19.3 l3.9,3.2" /><defs><path id="p91" d="M17,24.7 l1.6,-1.9" /></defs><text class="prtts2"><textPath href="#p91">55</textPath></text><path class="prtts1" d="M12.7,18.9 l0.9,0.8" /><path class="prtts1" d="M13,18.5 l1.9,1.7" /><path class="prtts1" d="M13.3,18.2 l0.9,0.8" /><path class="prtts1" d="M13.6,17.8 l1.9,1.6" /><path class="prtts1" d="M14,17.4 l0.9,0.9" /><path class="prtts1" d="M14.3,17.1 l1.8,1.7" /><path class="prtts1" d="M14.6,16.7 l0.9,0.9" /><path class="prtts1" d="M15,16.3 l1.8,1.8" /><path class="prtts1" d="M15.3,16 l0.9,0.9" /><path class="prtts0" d="M15.6,15.6 l3.6,3.6" /><defs><path id="p92" d="M19.7,21.5 l1.8,-1.8" /></defs><text class="prtts2"><textPath href="#p92">56</textPath></text><path class="prtts1" d="M16,15.3 l0.9,0.9" /><path class="prtts1" d="M16.3,15 l1.8,1.8" /><path class="prtts1" d="M16.7,14.6 l0.9,0.9" /><path class="prtts1" d="M17.1,14.3 l1.7,1.8" /><path class="prtts1" d="M17.4,14 l0.9,0.9" /><path class="prtts1" d="M17.8,13.6 l1.6,1.9" /><path class="prtts1" d="M18.2,13.3 l0.8,0.9" /><path class="prtts1" d="M18.5,13 l1.7,1.9" /><path class="prtts1" d="M18.9,12.7 l0.8,0.9" /><path class="prtts0" d="M19.3,12.3 l3.2,3.9" /><defs><path id="p93" d="M22.8,18.6 l1.9,-1.6" /></defs><text class="prtts2"><textPath href="#p93">57</textPath></text><path class="prtts1" d="M19.7,12 l0.7,1" /><path class="prtts1" d="M20,11.7 l1.6,2" /><path class="prtts1" d="M20.4,11.4 l0.8,1" /><path class="prtts1" d="M20.8,11.1 l1.5,2" /><path class="prtts1" d="M21.2,10.8 l0.8,1" /><path class="prtts1" d="M21.6,10.5 l1.5,2.1" /><path class="prtts1" d="M22,10.3 l0.7,1" /><path class="prtts1" d="M22.4,10 l1.4,2" /><path class="prtts1" d="M22.8,9.7 l0.7,1" /><path class="prtts0" d="M23.2,9.4 l2.8,4.2" /><defs><path id="p94" d="M26.1,16 l2.1,-1.4" /></defs><text class="prtts2"><textPath href="#p94">58</textPath></text><path class="prtts1" d="M23.6,9.2 l0.7,1" /><path class="prtts1" d="M24,8.9 l1.4,2.1" /><path class="prtts1" d="M24.5,8.6 l0.6,1.1" /><path class="prtts1" d="M24.9,8.4 l1.3,2.1" /><path class="prtts1" d="M25.3,8.1 l0.6,1.1" /><path class="prtts1" d="M25.7,7.9 l1.3,2.1" /><path class="prtts1" d="M26.1,7.6 l0.7,1.1" /><path class="prtts1" d="M26.6,7.4 l1.2,2.2" /><path class="prtts1" d="M27,7.1 l0.6,1.1" /><path class="prtts0" d="M27.4,6.9 l2.4,4.4" /><defs><path id="p95" d="M29.6,13.7 l2.3,-1.2" /></defs><text class="prtts2"><textPath href="#p95">59</textPath></text><path class="prtts1" d="M27.9,6.7 l0.5,1.1" /><path class="prtts1" d="M28.3,6.4 l1.1,2.3" /><path class="prtts1" d="M28.7,6.2 l0.6,1.1" /><path class="prtts1" d="M29.2,6 l1.1,2.3" /><path class="prtts1" d="M29.6,5.8 l0.6,1.1" /><path class="prtts1" d="M30.1,5.6 l1,2.3" /><path class="prtts1" d="M30.5,5.4 l0.5,1.1" /><path class="prtts1" d="M31,5.2 l1,2.3" /><path class="prtts1" d="M31.4,5 l0.5,1.1" /><path class="prtts0" d="M31.9,4.8 l1.9,4.6" /><defs><path id="p96" d="M33.4,11.8 l2.3,-1" /></defs><text class="prtts2"><textPath href="#p96">60</textPath></text><path class="prtts1" d="M32.3,4.6 l0.5,1.2" /><path class="prtts1" d="M32.8,4.4 l0.9,2.4" /><path class="prtts1" d="M33.2,4.3 l0.5,1.1" /><path class="prtts1" d="M33.7,4.1 l0.9,2.3" /><path class="prtts1" d="M34.2,3.9 l0.4,1.2" /><path class="prtts1" d="M34.6,3.8 l0.8,2.3" /><path class="prtts1" d="M35.1,3.6 l0.4,1.2" /><path class="prtts1" d="M35.5,3.4 l0.8,2.4" /><path class="prtts1" d="M36,3.3 l0.4,1.2" /><path class="prtts0" d="M36.5,3.2 l1.4,4.7" /><defs><path id="p97" d="M37.3,10.2 l2.4,-0.7" /></defs><text class="prtts2"><textPath href="#p97">61</textPath></text><path class="prtts1" d="M37,3 l0.3,1.2" /><path class="prtts1" d="M37.4,2.9 l0.7,2.4" /><path class="prtts1" d="M37.9,2.7 l0.3,1.3" /><path class="prtts1" d="M38.4,2.6 l0.6,2.4" /><path class="prtts1" d="M38.9,2.5 l0.3,1.2" /><path class="prtts1" d="M39.3,2.4 l0.6,2.4" /><path class="prtts1" d="M39.8,2.3 l0.3,1.2" /><path class="prtts1" d="M40.3,2.2 l0.5,2.4" /><path class="prtts1" d="M40.8,2.1 l0.2,1.2" /><path class="prtts0" d="M41.2,2 l1,4.9" /><defs><path id="p98" d="M41.4,9.1 l2.5,-0.5" /></defs><text class="prtts2"><textPath href="#p98">62</textPath></text><path class="prtts1" d="M41.7,1.9 l0.3,1.2" /><path class="prtts1" d="M42.2,1.8 l0.4,2.4" /><path class="prtts1" d="M42.7,1.7 l0.2,1.2" /><path class="prtts1" d="M43.2,1.6 l0.4,2.5" /><path class="prtts1" d="M43.7,1.5 l0.1,1.3" /><path class="prtts1" d="M44.1,1.5 l0.4,2.4" /><path class="prtts1" d="M44.6,1.4 l0.2,1.2" /><path class="prtts1" d="M45.1,1.3 l0.3,2.5" /><path class="prtts1" d="M45.6,1.3 l0.1,1.2" /><path class="prtts0" d="M46.1,1.2 l0.5,5" /><defs><path id="p99" d="M45.5,8.3 l2.5,-0.2" /></defs><text class="prtts2"><textPath href="#p99">63</textPath></text><path class="prtts1" d="M46.6,1.2 l0.1,1.2" /><path class="prtts1" d="M47.1,1.2 l0.2,2.4" /><path class="prtts1" d="M47.6,1.1 l0.1,1.3" /><path class="prtts1" d="M48.1,1.1 l0.1,2.5" /><path class="prtts1" d="M48.5,1.1 l0.1,1.2" /><path class="prtts1" d="M49,1 l0.1,2.5" /><path class="prtts1" d="M49.5,1 l0.1,1.3" /><path class="prtts1" d="M50,1 l0.1,2.5" /><path class="prtts1" d="M50.5,1 l0,1.3" /><path class="prtts0" d="M49,51 l4,0" /><path class="prtts0" d="M51,49 l0,4" /><defs><path id="p100" d="M52.5,76 l-3,0" /></defs><text class="prtts3"><textPath href="#p100">S</textPath></text><defs><path id="p101" d="M76,49.5 l0,3" /></defs><text class="prtts3"><textPath href="#p101">E</textPath></text><defs><path id="p102" d="M26,52.5 l0,-3" /></defs><text class="prtts3"><textPath href="#p102">W</textPath></text><text class="prtts4" x="51" y="27.5">N</text><circle cx="51" cy="26" r="5" class="prtts5" /><circle cx="51" cy="26" r="5.5" class="prtts1" />'

    },

    _createRotateMarkerIcon: function () {
        const zoom = this._map.getZoom();
        const size = 11 / 102;
        const transformation = this._map.options.crs.transformation;
        const scale = this._map.options.crs.scale(zoom);
        const w = Math.abs(transformation._a) * scale * this.options.widthInMeters * size;
        const h = Math.abs(transformation._c) * scale * this.options.heightInMeters * size;
        return L.icon({
            iconUrl: '/img/transparent.png',
            iconSize: [w, h],
            iconAnchor: [w / 2, h / 2],
            className: 'map-utils-tools-protractor-rotate'
        });
    },

    _getRotateMarkerPosition: function () {
        const rel = this.options.heightInMeters * 25 / 102;
        return [
            this._latlng.lat + (Math.cos(this._bearing * Math.PI / 180) * rel),
            this._latlng.lng + (Math.sin(this._bearing * Math.PI / 180) * rel),
        ];
    },

    _updateRotateMarkerPosition: function () {
        if (this._rotateMarker) {
            this._rotateMarker.setLatLng(this._getRotateMarkerPosition());
        }
    },

    _updateRotateMarkerSize: function () {
        this._rotateMarker.setIcon(this._createRotateMarkerIcon());
    },

    _onRotateMarkerDrag: function () {
        this.setBearing(GameMapUtils.bearing(this._latlng, this._rotateMarker.getLatLng(), this._map));
    },

    _resetBearing: function () {
        this.setBearing(0);
        return false;
    },

    _createRotateMarker: function () {
        return L.marker(
            this._getRotateMarkerPosition(),
            {
                icon: this._createRotateMarkerIcon(),
                draggable: true,
                autoPanOnFocus: false,
                markerZoomAnimation: false,
                zIndexOffset: 1000,
                title: 'Drag to rotate the protractor. Double click to reset to North.'
            })
            .on('drag', this._onRotateMarkerDrag, this)
            .on('dblclick', this._resetBearing, this);
    }

});

GameMapUtils.protractor = function (latLng, options) {
    return new GameMapUtils.Protractor(latLng, options);
}

/**
 * Coordinate Scale
 *
 * Author: jetelain
 */
GameMapUtils.CoordinateScale = GameMapUtils.MapToolBase.extend({
    options: {
        widthInMeters: 1500,
        heightInMeters: 1500,
        dragMarkerClassName: 'map-utils-tools-coordinatescale-drag',
        svgViewBox: '0 0 150 150',
        svgContent: '<style>.cdscs0{fill: none;stroke: #000000FF;stroke-width: 0.2;}.cdscs1{fill: none;stroke: #000000FF;stroke-width: 0.1;}.cdscs2{font: 5px Arial;fill: #000000FF;text-anchor: middle;}.cdscs3{font: 5px Arial;fill: #000000FF;dominant-baseline: middle;}.cdscs4{fill: none;stroke: #80808080;stroke-width: 1;}</style><rect x="0.5" y="0.5" width="149" height="149" rx="5.5" class="cdscs4" /><style>.cdscs5{fill: #F1F1F140;stroke: #000000FF;stroke-width: 0.2;}</style><rect x="1" y="1" width="148" height="148" rx="5" class="cdscs5" /><path class="cdscs0" d="M125,1 l0,148" /><path class="cdscs0" d="M25,1 l0,148" /><path class="cdscs0" d="M1,125 l148,0" /><path class="cdscs0" d="M1,25 l148,0" /><path class="cdscs0" d="M26,21 l0,4" /><path class="cdscs0" d="M125,26 l4,0" /><path class="cdscs0" d="M27,17 l0,8" /><path class="cdscs0" d="M125,27 l8,0" /><path class="cdscs0" d="M28,21 l0,4" /><path class="cdscs0" d="M125,28 l4,0" /><path class="cdscs0" d="M29,17 l0,8" /><path class="cdscs0" d="M125,29 l8,0" /><path class="cdscs0" d="M30,21 l0,4" /><path class="cdscs0" d="M125,30 l4,0" /><path class="cdscs0" d="M31,17 l0,8" /><path class="cdscs0" d="M125,31 l8,0" /><path class="cdscs0" d="M32,21 l0,4" /><path class="cdscs0" d="M125,32 l4,0" /><path class="cdscs0" d="M33,17 l0,8" /><path class="cdscs0" d="M125,33 l8,0" /><path class="cdscs0" d="M34,21 l0,4" /><path class="cdscs0" d="M125,34 l4,0" /><path class="cdscs0" d="M35,13 l0,112" /><path class="cdscs0" d="M25,35 l112,0" /><text class="cdscs2" x="35" y="11">9</text><text class="cdscs3" x="139" y="35">1</text><path class="cdscs0" d="M36,21 l0,4" /><path class="cdscs0" d="M125,36 l4,0" /><path class="cdscs0" d="M37,17 l0,8" /><path class="cdscs0" d="M125,37 l8,0" /><path class="cdscs0" d="M38,21 l0,4" /><path class="cdscs0" d="M125,38 l4,0" /><path class="cdscs0" d="M39,17 l0,8" /><path class="cdscs0" d="M125,39 l8,0" /><path class="cdscs0" d="M40,21 l0,4" /><path class="cdscs0" d="M125,40 l4,0" /><path class="cdscs0" d="M41,17 l0,8" /><path class="cdscs0" d="M125,41 l8,0" /><path class="cdscs0" d="M42,21 l0,4" /><path class="cdscs0" d="M125,42 l4,0" /><path class="cdscs0" d="M43,17 l0,8" /><path class="cdscs0" d="M125,43 l8,0" /><path class="cdscs0" d="M44,21 l0,4" /><path class="cdscs0" d="M125,44 l4,0" /><path class="cdscs0" d="M45,13 l0,112" /><path class="cdscs0" d="M25,45 l112,0" /><text class="cdscs2" x="45" y="11">8</text><text class="cdscs3" x="139" y="45">2</text><path class="cdscs0" d="M46,21 l0,4" /><path class="cdscs0" d="M125,46 l4,0" /><path class="cdscs0" d="M47,17 l0,8" /><path class="cdscs0" d="M125,47 l8,0" /><path class="cdscs0" d="M48,21 l0,4" /><path class="cdscs0" d="M125,48 l4,0" /><path class="cdscs0" d="M49,17 l0,8" /><path class="cdscs0" d="M125,49 l8,0" /><path class="cdscs0" d="M50,21 l0,4" /><path class="cdscs0" d="M125,50 l4,0" /><path class="cdscs0" d="M51,17 l0,8" /><path class="cdscs0" d="M125,51 l8,0" /><path class="cdscs0" d="M52,21 l0,4" /><path class="cdscs0" d="M125,52 l4,0" /><path class="cdscs0" d="M53,17 l0,8" /><path class="cdscs0" d="M125,53 l8,0" /><path class="cdscs0" d="M54,21 l0,4" /><path class="cdscs0" d="M125,54 l4,0" /><path class="cdscs0" d="M55,13 l0,112" /><path class="cdscs0" d="M25,55 l112,0" /><text class="cdscs2" x="55" y="11">7</text><text class="cdscs3" x="139" y="55">3</text><path class="cdscs0" d="M56,21 l0,4" /><path class="cdscs0" d="M125,56 l4,0" /><path class="cdscs0" d="M57,17 l0,8" /><path class="cdscs0" d="M125,57 l8,0" /><path class="cdscs0" d="M58,21 l0,4" /><path class="cdscs0" d="M125,58 l4,0" /><path class="cdscs0" d="M59,17 l0,8" /><path class="cdscs0" d="M125,59 l8,0" /><path class="cdscs0" d="M60,21 l0,4" /><path class="cdscs0" d="M125,60 l4,0" /><path class="cdscs0" d="M61,17 l0,8" /><path class="cdscs0" d="M125,61 l8,0" /><path class="cdscs0" d="M62,21 l0,4" /><path class="cdscs0" d="M125,62 l4,0" /><path class="cdscs0" d="M63,17 l0,8" /><path class="cdscs0" d="M125,63 l8,0" /><path class="cdscs0" d="M64,21 l0,4" /><path class="cdscs0" d="M125,64 l4,0" /><path class="cdscs0" d="M65,13 l0,112" /><path class="cdscs0" d="M25,65 l112,0" /><text class="cdscs2" x="65" y="11">6</text><text class="cdscs3" x="139" y="65">4</text><path class="cdscs0" d="M66,21 l0,4" /><path class="cdscs0" d="M125,66 l4,0" /><path class="cdscs0" d="M67,17 l0,8" /><path class="cdscs0" d="M125,67 l8,0" /><path class="cdscs0" d="M68,21 l0,4" /><path class="cdscs0" d="M125,68 l4,0" /><path class="cdscs0" d="M69,17 l0,8" /><path class="cdscs0" d="M125,69 l8,0" /><path class="cdscs0" d="M70,21 l0,4" /><path class="cdscs0" d="M125,70 l4,0" /><path class="cdscs0" d="M71,17 l0,8" /><path class="cdscs0" d="M125,71 l8,0" /><path class="cdscs0" d="M72,21 l0,4" /><path class="cdscs0" d="M125,72 l4,0" /><path class="cdscs0" d="M73,17 l0,8" /><path class="cdscs0" d="M125,73 l8,0" /><path class="cdscs0" d="M74,21 l0,4" /><path class="cdscs0" d="M125,74 l4,0" /><path class="cdscs0" d="M75,13 l0,112" /><path class="cdscs0" d="M25,75 l112,0" /><text class="cdscs2" x="75" y="11">5</text><text class="cdscs3" x="139" y="75">5</text><path class="cdscs0" d="M76,21 l0,4" /><path class="cdscs0" d="M125,76 l4,0" /><path class="cdscs0" d="M77,17 l0,8" /><path class="cdscs0" d="M125,77 l8,0" /><path class="cdscs0" d="M78,21 l0,4" /><path class="cdscs0" d="M125,78 l4,0" /><path class="cdscs0" d="M79,17 l0,8" /><path class="cdscs0" d="M125,79 l8,0" /><path class="cdscs0" d="M80,21 l0,4" /><path class="cdscs0" d="M125,80 l4,0" /><path class="cdscs0" d="M81,17 l0,8" /><path class="cdscs0" d="M125,81 l8,0" /><path class="cdscs0" d="M82,21 l0,4" /><path class="cdscs0" d="M125,82 l4,0" /><path class="cdscs0" d="M83,17 l0,8" /><path class="cdscs0" d="M125,83 l8,0" /><path class="cdscs0" d="M84,21 l0,4" /><path class="cdscs0" d="M125,84 l4,0" /><path class="cdscs0" d="M85,13 l0,112" /><path class="cdscs0" d="M25,85 l112,0" /><text class="cdscs2" x="85" y="11">4</text><text class="cdscs3" x="139" y="85">6</text><path class="cdscs0" d="M86,21 l0,4" /><path class="cdscs0" d="M125,86 l4,0" /><path class="cdscs0" d="M87,17 l0,8" /><path class="cdscs0" d="M125,87 l8,0" /><path class="cdscs0" d="M88,21 l0,4" /><path class="cdscs0" d="M125,88 l4,0" /><path class="cdscs0" d="M89,17 l0,8" /><path class="cdscs0" d="M125,89 l8,0" /><path class="cdscs0" d="M90,21 l0,4" /><path class="cdscs0" d="M125,90 l4,0" /><path class="cdscs0" d="M91,17 l0,8" /><path class="cdscs0" d="M125,91 l8,0" /><path class="cdscs0" d="M92,21 l0,4" /><path class="cdscs0" d="M125,92 l4,0" /><path class="cdscs0" d="M93,17 l0,8" /><path class="cdscs0" d="M125,93 l8,0" /><path class="cdscs0" d="M94,21 l0,4" /><path class="cdscs0" d="M125,94 l4,0" /><path class="cdscs0" d="M95,13 l0,112" /><path class="cdscs0" d="M25,95 l112,0" /><text class="cdscs2" x="95" y="11">3</text><text class="cdscs3" x="139" y="95">7</text><path class="cdscs0" d="M96,21 l0,4" /><path class="cdscs0" d="M125,96 l4,0" /><path class="cdscs0" d="M97,17 l0,8" /><path class="cdscs0" d="M125,97 l8,0" /><path class="cdscs0" d="M98,21 l0,4" /><path class="cdscs0" d="M125,98 l4,0" /><path class="cdscs0" d="M99,17 l0,8" /><path class="cdscs0" d="M125,99 l8,0" /><path class="cdscs0" d="M100,21 l0,4" /><path class="cdscs0" d="M125,100 l4,0" /><path class="cdscs0" d="M101,17 l0,8" /><path class="cdscs0" d="M125,101 l8,0" /><path class="cdscs0" d="M102,21 l0,4" /><path class="cdscs0" d="M125,102 l4,0" /><path class="cdscs0" d="M103,17 l0,8" /><path class="cdscs0" d="M125,103 l8,0" /><path class="cdscs0" d="M104,21 l0,4" /><path class="cdscs0" d="M125,104 l4,0" /><path class="cdscs0" d="M105,13 l0,112" /><path class="cdscs0" d="M25,105 l112,0" /><text class="cdscs2" x="105" y="11">2</text><text class="cdscs3" x="139" y="105">8</text><path class="cdscs0" d="M106,21 l0,4" /><path class="cdscs0" d="M125,106 l4,0" /><path class="cdscs0" d="M107,17 l0,8" /><path class="cdscs0" d="M125,107 l8,0" /><path class="cdscs0" d="M108,21 l0,4" /><path class="cdscs0" d="M125,108 l4,0" /><path class="cdscs0" d="M109,17 l0,8" /><path class="cdscs0" d="M125,109 l8,0" /><path class="cdscs0" d="M110,21 l0,4" /><path class="cdscs0" d="M125,110 l4,0" /><path class="cdscs0" d="M111,17 l0,8" /><path class="cdscs0" d="M125,111 l8,0" /><path class="cdscs0" d="M112,21 l0,4" /><path class="cdscs0" d="M125,112 l4,0" /><path class="cdscs0" d="M113,17 l0,8" /><path class="cdscs0" d="M125,113 l8,0" /><path class="cdscs0" d="M114,21 l0,4" /><path class="cdscs0" d="M125,114 l4,0" /><path class="cdscs0" d="M115,13 l0,112" /><path class="cdscs0" d="M25,115 l112,0" /><text class="cdscs2" x="115" y="11">1</text><text class="cdscs3" x="139" y="115">9</text><path class="cdscs0" d="M116,21 l0,4" /><path class="cdscs0" d="M125,116 l4,0" /><path class="cdscs0" d="M117,17 l0,8" /><path class="cdscs0" d="M125,117 l8,0" /><path class="cdscs0" d="M118,21 l0,4" /><path class="cdscs0" d="M125,118 l4,0" /><path class="cdscs0" d="M119,17 l0,8" /><path class="cdscs0" d="M125,119 l8,0" /><path class="cdscs0" d="M120,21 l0,4" /><path class="cdscs0" d="M125,120 l4,0" /><path class="cdscs0" d="M121,17 l0,8" /><path class="cdscs0" d="M125,121 l8,0" /><path class="cdscs0" d="M122,21 l0,4" /><path class="cdscs0" d="M125,122 l4,0" /><path class="cdscs0" d="M123,17 l0,8" /><path class="cdscs0" d="M125,123 l8,0" /><path class="cdscs0" d="M124,21 l0,4" /><path class="cdscs0" d="M125,124 l4,0" /><text class="cdscs2" x="25" y="11">10</text><style>.cdscs6{font: 5px Arial;fill: #000000FF;dominant-baseline: hanging;}</style><text class="cdscs6" x="139" y="126">10</text>'
    }
});

GameMapUtils.coordinateScale = function (latLng, options) {
    return new GameMapUtils.CoordinateScale(latLng, options);
}

/**
 * Ruler
 *
 * Author: jetelain
 */
GameMapUtils.Ruler = GameMapUtils.MapToolBase.extend({
    options: {
        widthInMeters: 8120,
        heightInMeters: 8120,
        dragMarkerClassName: 'map-utils-tools-ruler-drag',
        svgViewBox: '0 0 812 812',
        rotateCenter: '406,406',
        svgContent: '<style>.rulrs0{fill: none;stroke: #000000FF;stroke-width: 0.2;}.rulrs1{fill: none;stroke: #FF0000FF;stroke-width: 0.3;}.rulrs2{fill: none;stroke: #000000FF;stroke-width: 0.1;}.rulrs3{fill: none;stroke: #80808080;stroke-width: 1;}.rulrs4{fill: #F1F1F140;stroke: #000000FF;stroke-width: 0.2;}.rulrs5{font: 5px Arial;fill: #000000FF;dominant-baseline: hanging;text-anchor: middle;}.rulrs6{font: 5px Arial;fill: #000000FF;text-anchor: middle;}</style><rect x="200.5" y="385.5" width="611" height="41" rx="5.5" class="rulrs3" /><rect x="201" y="386" width="610" height="40" rx="5" class="rulrs4" /><path class="rulrs0" d="M206,386 l0,8" /><text class="rulrs5" x="206" y="395">0</text><path class="rulrs0" d="M206,426 l0,-8" /><text class="rulrs6" x="206" y="417">0</text><path class="rulrs2" d="M207,386 l0,2" /><path class="rulrs2" d="M207,426 l0,-2" /><path class="rulrs2" d="M208,386 l0,2" /><path class="rulrs2" d="M208,426 l0,-2" /><path class="rulrs2" d="M209,386 l0,2" /><path class="rulrs2" d="M209,426 l0,-2" /><path class="rulrs2" d="M210,386 l0,2" /><path class="rulrs2" d="M210,426 l0,-2" /><path class="rulrs2" d="M211,386 l0,2" /><path class="rulrs2" d="M211,426 l0,-2" /><path class="rulrs2" d="M212,386 l0,2" /><path class="rulrs2" d="M212,426 l0,-2" /><path class="rulrs2" d="M213,386 l0,2" /><path class="rulrs2" d="M213,426 l0,-2" /><path class="rulrs2" d="M214,386 l0,2" /><path class="rulrs2" d="M214,426 l0,-2" /><path class="rulrs2" d="M215,386 l0,2" /><path class="rulrs2" d="M215,426 l0,-2" /><path class="rulrs2" d="M216,386 l0,4" /><path class="rulrs2" d="M216,426 l0,-4" /><path class="rulrs2" d="M217,386 l0,2" /><path class="rulrs2" d="M217,426 l0,-2" /><path class="rulrs2" d="M218,386 l0,2" /><path class="rulrs2" d="M218,426 l0,-2" /><path class="rulrs2" d="M219,386 l0,2" /><path class="rulrs2" d="M219,426 l0,-2" /><path class="rulrs2" d="M220,386 l0,2" /><path class="rulrs2" d="M220,426 l0,-2" /><path class="rulrs2" d="M221,386 l0,2" /><path class="rulrs2" d="M221,426 l0,-2" /><path class="rulrs2" d="M222,386 l0,2" /><path class="rulrs2" d="M222,426 l0,-2" /><path class="rulrs2" d="M223,386 l0,2" /><path class="rulrs2" d="M223,426 l0,-2" /><path class="rulrs2" d="M224,386 l0,2" /><path class="rulrs2" d="M224,426 l0,-2" /><path class="rulrs2" d="M225,386 l0,2" /><path class="rulrs2" d="M225,426 l0,-2" /><path class="rulrs2" d="M226,386 l0,4" /><path class="rulrs2" d="M226,426 l0,-4" /><path class="rulrs2" d="M227,386 l0,2" /><path class="rulrs2" d="M227,426 l0,-2" /><path class="rulrs2" d="M228,386 l0,2" /><path class="rulrs2" d="M228,426 l0,-2" /><path class="rulrs2" d="M229,386 l0,2" /><path class="rulrs2" d="M229,426 l0,-2" /><path class="rulrs2" d="M230,386 l0,2" /><path class="rulrs2" d="M230,426 l0,-2" /><path class="rulrs2" d="M231,386 l0,2" /><path class="rulrs2" d="M231,426 l0,-2" /><path class="rulrs2" d="M232,386 l0,2" /><path class="rulrs2" d="M232,426 l0,-2" /><path class="rulrs2" d="M233,386 l0,2" /><path class="rulrs2" d="M233,426 l0,-2" /><path class="rulrs2" d="M234,386 l0,2" /><path class="rulrs2" d="M234,426 l0,-2" /><path class="rulrs2" d="M235,386 l0,2" /><path class="rulrs2" d="M235,426 l0,-2" /><path class="rulrs2" d="M236,386 l0,4" /><path class="rulrs2" d="M236,426 l0,-4" /><path class="rulrs2" d="M237,386 l0,2" /><path class="rulrs2" d="M237,426 l0,-2" /><path class="rulrs2" d="M238,386 l0,2" /><path class="rulrs2" d="M238,426 l0,-2" /><path class="rulrs2" d="M239,386 l0,2" /><path class="rulrs2" d="M239,426 l0,-2" /><path class="rulrs2" d="M240,386 l0,2" /><path class="rulrs2" d="M240,426 l0,-2" /><path class="rulrs2" d="M241,386 l0,2" /><path class="rulrs2" d="M241,426 l0,-2" /><path class="rulrs2" d="M242,386 l0,2" /><path class="rulrs2" d="M242,426 l0,-2" /><path class="rulrs2" d="M243,386 l0,2" /><path class="rulrs2" d="M243,426 l0,-2" /><path class="rulrs2" d="M244,386 l0,2" /><path class="rulrs2" d="M244,426 l0,-2" /><path class="rulrs2" d="M245,386 l0,2" /><path class="rulrs2" d="M245,426 l0,-2" /><path class="rulrs2" d="M246,386 l0,4" /><path class="rulrs2" d="M246,426 l0,-4" /><path class="rulrs2" d="M247,386 l0,2" /><path class="rulrs2" d="M247,426 l0,-2" /><path class="rulrs2" d="M248,386 l0,2" /><path class="rulrs2" d="M248,426 l0,-2" /><path class="rulrs2" d="M249,386 l0,2" /><path class="rulrs2" d="M249,426 l0,-2" /><path class="rulrs2" d="M250,386 l0,2" /><path class="rulrs2" d="M250,426 l0,-2" /><path class="rulrs2" d="M251,386 l0,2" /><path class="rulrs2" d="M251,426 l0,-2" /><path class="rulrs2" d="M252,386 l0,2" /><path class="rulrs2" d="M252,426 l0,-2" /><path class="rulrs2" d="M253,386 l0,2" /><path class="rulrs2" d="M253,426 l0,-2" /><path class="rulrs2" d="M254,386 l0,2" /><path class="rulrs2" d="M254,426 l0,-2" /><path class="rulrs2" d="M255,386 l0,2" /><path class="rulrs2" d="M255,426 l0,-2" /><path class="rulrs2" d="M256,386 l0,6" /><path class="rulrs2" d="M256,426 l0,-6" /><path class="rulrs2" d="M257,386 l0,2" /><path class="rulrs2" d="M257,426 l0,-2" /><path class="rulrs2" d="M258,386 l0,2" /><path class="rulrs2" d="M258,426 l0,-2" /><path class="rulrs2" d="M259,386 l0,2" /><path class="rulrs2" d="M259,426 l0,-2" /><path class="rulrs2" d="M260,386 l0,2" /><path class="rulrs2" d="M260,426 l0,-2" /><path class="rulrs2" d="M261,386 l0,2" /><path class="rulrs2" d="M261,426 l0,-2" /><path class="rulrs2" d="M262,386 l0,2" /><path class="rulrs2" d="M262,426 l0,-2" /><path class="rulrs2" d="M263,386 l0,2" /><path class="rulrs2" d="M263,426 l0,-2" /><path class="rulrs2" d="M264,386 l0,2" /><path class="rulrs2" d="M264,426 l0,-2" /><path class="rulrs2" d="M265,386 l0,2" /><path class="rulrs2" d="M265,426 l0,-2" /><path class="rulrs2" d="M266,386 l0,4" /><path class="rulrs2" d="M266,426 l0,-4" /><path class="rulrs2" d="M267,386 l0,2" /><path class="rulrs2" d="M267,426 l0,-2" /><path class="rulrs2" d="M268,386 l0,2" /><path class="rulrs2" d="M268,426 l0,-2" /><path class="rulrs2" d="M269,386 l0,2" /><path class="rulrs2" d="M269,426 l0,-2" /><path class="rulrs2" d="M270,386 l0,2" /><path class="rulrs2" d="M270,426 l0,-2" /><path class="rulrs2" d="M271,386 l0,2" /><path class="rulrs2" d="M271,426 l0,-2" /><path class="rulrs2" d="M272,386 l0,2" /><path class="rulrs2" d="M272,426 l0,-2" /><path class="rulrs2" d="M273,386 l0,2" /><path class="rulrs2" d="M273,426 l0,-2" /><path class="rulrs2" d="M274,386 l0,2" /><path class="rulrs2" d="M274,426 l0,-2" /><path class="rulrs2" d="M275,386 l0,2" /><path class="rulrs2" d="M275,426 l0,-2" /><path class="rulrs2" d="M276,386 l0,4" /><path class="rulrs2" d="M276,426 l0,-4" /><path class="rulrs2" d="M277,386 l0,2" /><path class="rulrs2" d="M277,426 l0,-2" /><path class="rulrs2" d="M278,386 l0,2" /><path class="rulrs2" d="M278,426 l0,-2" /><path class="rulrs2" d="M279,386 l0,2" /><path class="rulrs2" d="M279,426 l0,-2" /><path class="rulrs2" d="M280,386 l0,2" /><path class="rulrs2" d="M280,426 l0,-2" /><path class="rulrs2" d="M281,386 l0,2" /><path class="rulrs2" d="M281,426 l0,-2" /><path class="rulrs2" d="M282,386 l0,2" /><path class="rulrs2" d="M282,426 l0,-2" /><path class="rulrs2" d="M283,386 l0,2" /><path class="rulrs2" d="M283,426 l0,-2" /><path class="rulrs2" d="M284,386 l0,2" /><path class="rulrs2" d="M284,426 l0,-2" /><path class="rulrs2" d="M285,386 l0,2" /><path class="rulrs2" d="M285,426 l0,-2" /><path class="rulrs2" d="M286,386 l0,4" /><path class="rulrs2" d="M286,426 l0,-4" /><path class="rulrs2" d="M287,386 l0,2" /><path class="rulrs2" d="M287,426 l0,-2" /><path class="rulrs2" d="M288,386 l0,2" /><path class="rulrs2" d="M288,426 l0,-2" /><path class="rulrs2" d="M289,386 l0,2" /><path class="rulrs2" d="M289,426 l0,-2" /><path class="rulrs2" d="M290,386 l0,2" /><path class="rulrs2" d="M290,426 l0,-2" /><path class="rulrs2" d="M291,386 l0,2" /><path class="rulrs2" d="M291,426 l0,-2" /><path class="rulrs2" d="M292,386 l0,2" /><path class="rulrs2" d="M292,426 l0,-2" /><path class="rulrs2" d="M293,386 l0,2" /><path class="rulrs2" d="M293,426 l0,-2" /><path class="rulrs2" d="M294,386 l0,2" /><path class="rulrs2" d="M294,426 l0,-2" /><path class="rulrs2" d="M295,386 l0,2" /><path class="rulrs2" d="M295,426 l0,-2" /><path class="rulrs2" d="M296,386 l0,4" /><path class="rulrs2" d="M296,426 l0,-4" /><path class="rulrs2" d="M297,386 l0,2" /><path class="rulrs2" d="M297,426 l0,-2" /><path class="rulrs2" d="M298,386 l0,2" /><path class="rulrs2" d="M298,426 l0,-2" /><path class="rulrs2" d="M299,386 l0,2" /><path class="rulrs2" d="M299,426 l0,-2" /><path class="rulrs2" d="M300,386 l0,2" /><path class="rulrs2" d="M300,426 l0,-2" /><path class="rulrs2" d="M301,386 l0,2" /><path class="rulrs2" d="M301,426 l0,-2" /><path class="rulrs2" d="M302,386 l0,2" /><path class="rulrs2" d="M302,426 l0,-2" /><path class="rulrs2" d="M303,386 l0,2" /><path class="rulrs2" d="M303,426 l0,-2" /><path class="rulrs2" d="M304,386 l0,2" /><path class="rulrs2" d="M304,426 l0,-2" /><path class="rulrs2" d="M305,386 l0,2" /><path class="rulrs2" d="M305,426 l0,-2" /><path class="rulrs0" d="M306,386 l0,8" /><text class="rulrs5" x="306" y="395">1</text><path class="rulrs0" d="M306,426 l0,-8" /><text class="rulrs6" x="306" y="417">1</text><path class="rulrs2" d="M307,386 l0,2" /><path class="rulrs2" d="M307,426 l0,-2" /><path class="rulrs2" d="M308,386 l0,2" /><path class="rulrs2" d="M308,426 l0,-2" /><path class="rulrs2" d="M309,386 l0,2" /><path class="rulrs2" d="M309,426 l0,-2" /><path class="rulrs2" d="M310,386 l0,2" /><path class="rulrs2" d="M310,426 l0,-2" /><path class="rulrs2" d="M311,386 l0,2" /><path class="rulrs2" d="M311,426 l0,-2" /><path class="rulrs2" d="M312,386 l0,2" /><path class="rulrs2" d="M312,426 l0,-2" /><path class="rulrs2" d="M313,386 l0,2" /><path class="rulrs2" d="M313,426 l0,-2" /><path class="rulrs2" d="M314,386 l0,2" /><path class="rulrs2" d="M314,426 l0,-2" /><path class="rulrs2" d="M315,386 l0,2" /><path class="rulrs2" d="M315,426 l0,-2" /><path class="rulrs2" d="M316,386 l0,4" /><path class="rulrs2" d="M316,426 l0,-4" /><path class="rulrs2" d="M317,386 l0,2" /><path class="rulrs2" d="M317,426 l0,-2" /><path class="rulrs2" d="M318,386 l0,2" /><path class="rulrs2" d="M318,426 l0,-2" /><path class="rulrs2" d="M319,386 l0,2" /><path class="rulrs2" d="M319,426 l0,-2" /><path class="rulrs2" d="M320,386 l0,2" /><path class="rulrs2" d="M320,426 l0,-2" /><path class="rulrs2" d="M321,386 l0,2" /><path class="rulrs2" d="M321,426 l0,-2" /><path class="rulrs2" d="M322,386 l0,2" /><path class="rulrs2" d="M322,426 l0,-2" /><path class="rulrs2" d="M323,386 l0,2" /><path class="rulrs2" d="M323,426 l0,-2" /><path class="rulrs2" d="M324,386 l0,2" /><path class="rulrs2" d="M324,426 l0,-2" /><path class="rulrs2" d="M325,386 l0,2" /><path class="rulrs2" d="M325,426 l0,-2" /><path class="rulrs2" d="M326,386 l0,4" /><path class="rulrs2" d="M326,426 l0,-4" /><path class="rulrs2" d="M327,386 l0,2" /><path class="rulrs2" d="M327,426 l0,-2" /><path class="rulrs2" d="M328,386 l0,2" /><path class="rulrs2" d="M328,426 l0,-2" /><path class="rulrs2" d="M329,386 l0,2" /><path class="rulrs2" d="M329,426 l0,-2" /><path class="rulrs2" d="M330,386 l0,2" /><path class="rulrs2" d="M330,426 l0,-2" /><path class="rulrs2" d="M331,386 l0,2" /><path class="rulrs2" d="M331,426 l0,-2" /><path class="rulrs2" d="M332,386 l0,2" /><path class="rulrs2" d="M332,426 l0,-2" /><path class="rulrs2" d="M333,386 l0,2" /><path class="rulrs2" d="M333,426 l0,-2" /><path class="rulrs2" d="M334,386 l0,2" /><path class="rulrs2" d="M334,426 l0,-2" /><path class="rulrs2" d="M335,386 l0,2" /><path class="rulrs2" d="M335,426 l0,-2" /><path class="rulrs2" d="M336,386 l0,4" /><path class="rulrs2" d="M336,426 l0,-4" /><path class="rulrs2" d="M337,386 l0,2" /><path class="rulrs2" d="M337,426 l0,-2" /><path class="rulrs2" d="M338,386 l0,2" /><path class="rulrs2" d="M338,426 l0,-2" /><path class="rulrs2" d="M339,386 l0,2" /><path class="rulrs2" d="M339,426 l0,-2" /><path class="rulrs2" d="M340,386 l0,2" /><path class="rulrs2" d="M340,426 l0,-2" /><path class="rulrs2" d="M341,386 l0,2" /><path class="rulrs2" d="M341,426 l0,-2" /><path class="rulrs2" d="M342,386 l0,2" /><path class="rulrs2" d="M342,426 l0,-2" /><path class="rulrs2" d="M343,386 l0,2" /><path class="rulrs2" d="M343,426 l0,-2" /><path class="rulrs2" d="M344,386 l0,2" /><path class="rulrs2" d="M344,426 l0,-2" /><path class="rulrs2" d="M345,386 l0,2" /><path class="rulrs2" d="M345,426 l0,-2" /><path class="rulrs2" d="M346,386 l0,4" /><path class="rulrs2" d="M346,426 l0,-4" /><path class="rulrs2" d="M347,386 l0,2" /><path class="rulrs2" d="M347,426 l0,-2" /><path class="rulrs2" d="M348,386 l0,2" /><path class="rulrs2" d="M348,426 l0,-2" /><path class="rulrs2" d="M349,386 l0,2" /><path class="rulrs2" d="M349,426 l0,-2" /><path class="rulrs2" d="M350,386 l0,2" /><path class="rulrs2" d="M350,426 l0,-2" /><path class="rulrs2" d="M351,386 l0,2" /><path class="rulrs2" d="M351,426 l0,-2" /><path class="rulrs2" d="M352,386 l0,2" /><path class="rulrs2" d="M352,426 l0,-2" /><path class="rulrs2" d="M353,386 l0,2" /><path class="rulrs2" d="M353,426 l0,-2" /><path class="rulrs2" d="M354,386 l0,2" /><path class="rulrs2" d="M354,426 l0,-2" /><path class="rulrs2" d="M355,386 l0,2" /><path class="rulrs2" d="M355,426 l0,-2" /><path class="rulrs2" d="M356,386 l0,6" /><path class="rulrs2" d="M356,426 l0,-6" /><path class="rulrs2" d="M357,386 l0,2" /><path class="rulrs2" d="M357,426 l0,-2" /><path class="rulrs2" d="M358,386 l0,2" /><path class="rulrs2" d="M358,426 l0,-2" /><path class="rulrs2" d="M359,386 l0,2" /><path class="rulrs2" d="M359,426 l0,-2" /><path class="rulrs2" d="M360,386 l0,2" /><path class="rulrs2" d="M360,426 l0,-2" /><path class="rulrs2" d="M361,386 l0,2" /><path class="rulrs2" d="M361,426 l0,-2" /><path class="rulrs2" d="M362,386 l0,2" /><path class="rulrs2" d="M362,426 l0,-2" /><path class="rulrs2" d="M363,386 l0,2" /><path class="rulrs2" d="M363,426 l0,-2" /><path class="rulrs2" d="M364,386 l0,2" /><path class="rulrs2" d="M364,426 l0,-2" /><path class="rulrs2" d="M365,386 l0,2" /><path class="rulrs2" d="M365,426 l0,-2" /><path class="rulrs2" d="M366,386 l0,4" /><path class="rulrs2" d="M366,426 l0,-4" /><path class="rulrs2" d="M367,386 l0,2" /><path class="rulrs2" d="M367,426 l0,-2" /><path class="rulrs2" d="M368,386 l0,2" /><path class="rulrs2" d="M368,426 l0,-2" /><path class="rulrs2" d="M369,386 l0,2" /><path class="rulrs2" d="M369,426 l0,-2" /><path class="rulrs2" d="M370,386 l0,2" /><path class="rulrs2" d="M370,426 l0,-2" /><path class="rulrs2" d="M371,386 l0,2" /><path class="rulrs2" d="M371,426 l0,-2" /><path class="rulrs2" d="M372,386 l0,2" /><path class="rulrs2" d="M372,426 l0,-2" /><path class="rulrs2" d="M373,386 l0,2" /><path class="rulrs2" d="M373,426 l0,-2" /><path class="rulrs2" d="M374,386 l0,2" /><path class="rulrs2" d="M374,426 l0,-2" /><path class="rulrs2" d="M375,386 l0,2" /><path class="rulrs2" d="M375,426 l0,-2" /><path class="rulrs2" d="M376,386 l0,4" /><path class="rulrs2" d="M376,426 l0,-4" /><path class="rulrs2" d="M377,386 l0,2" /><path class="rulrs2" d="M377,426 l0,-2" /><path class="rulrs2" d="M378,386 l0,2" /><path class="rulrs2" d="M378,426 l0,-2" /><path class="rulrs2" d="M379,386 l0,2" /><path class="rulrs2" d="M379,426 l0,-2" /><path class="rulrs2" d="M380,386 l0,2" /><path class="rulrs2" d="M380,426 l0,-2" /><path class="rulrs2" d="M381,386 l0,2" /><path class="rulrs2" d="M381,426 l0,-2" /><path class="rulrs2" d="M382,386 l0,2" /><path class="rulrs2" d="M382,426 l0,-2" /><path class="rulrs2" d="M383,386 l0,2" /><path class="rulrs2" d="M383,426 l0,-2" /><path class="rulrs2" d="M384,386 l0,2" /><path class="rulrs2" d="M384,426 l0,-2" /><path class="rulrs2" d="M385,386 l0,2" /><path class="rulrs2" d="M385,426 l0,-2" /><path class="rulrs2" d="M386,386 l0,4" /><path class="rulrs2" d="M386,426 l0,-4" /><path class="rulrs2" d="M387,386 l0,2" /><path class="rulrs2" d="M387,426 l0,-2" /><path class="rulrs2" d="M388,386 l0,2" /><path class="rulrs2" d="M388,426 l0,-2" /><path class="rulrs2" d="M389,386 l0,2" /><path class="rulrs2" d="M389,426 l0,-2" /><path class="rulrs2" d="M390,386 l0,2" /><path class="rulrs2" d="M390,426 l0,-2" /><path class="rulrs2" d="M391,386 l0,2" /><path class="rulrs2" d="M391,426 l0,-2" /><path class="rulrs2" d="M392,386 l0,2" /><path class="rulrs2" d="M392,426 l0,-2" /><path class="rulrs2" d="M393,386 l0,2" /><path class="rulrs2" d="M393,426 l0,-2" /><path class="rulrs2" d="M394,386 l0,2" /><path class="rulrs2" d="M394,426 l0,-2" /><path class="rulrs2" d="M395,386 l0,2" /><path class="rulrs2" d="M395,426 l0,-2" /><path class="rulrs2" d="M396,386 l0,4" /><path class="rulrs2" d="M396,426 l0,-4" /><path class="rulrs2" d="M397,386 l0,2" /><path class="rulrs2" d="M397,426 l0,-2" /><path class="rulrs2" d="M398,386 l0,2" /><path class="rulrs2" d="M398,426 l0,-2" /><path class="rulrs2" d="M399,386 l0,2" /><path class="rulrs2" d="M399,426 l0,-2" /><path class="rulrs2" d="M400,386 l0,2" /><path class="rulrs2" d="M400,426 l0,-2" /><path class="rulrs2" d="M401,386 l0,2" /><path class="rulrs2" d="M401,426 l0,-2" /><path class="rulrs2" d="M402,386 l0,2" /><path class="rulrs2" d="M402,426 l0,-2" /><path class="rulrs2" d="M403,386 l0,2" /><path class="rulrs2" d="M403,426 l0,-2" /><path class="rulrs2" d="M404,386 l0,2" /><path class="rulrs2" d="M404,426 l0,-2" /><path class="rulrs2" d="M405,386 l0,2" /><path class="rulrs2" d="M405,426 l0,-2" /><path class="rulrs0" d="M406,386 l0,8" /><text class="rulrs5" x="406" y="395">2</text><path class="rulrs0" d="M406,426 l0,-8" /><text class="rulrs6" x="406" y="417">2</text><path class="rulrs2" d="M407,386 l0,2" /><path class="rulrs2" d="M407,426 l0,-2" /><path class="rulrs2" d="M408,386 l0,2" /><path class="rulrs2" d="M408,426 l0,-2" /><path class="rulrs2" d="M409,386 l0,2" /><path class="rulrs2" d="M409,426 l0,-2" /><path class="rulrs2" d="M410,386 l0,2" /><path class="rulrs2" d="M410,426 l0,-2" /><path class="rulrs2" d="M411,386 l0,2" /><path class="rulrs2" d="M411,426 l0,-2" /><path class="rulrs2" d="M412,386 l0,2" /><path class="rulrs2" d="M412,426 l0,-2" /><path class="rulrs2" d="M413,386 l0,2" /><path class="rulrs2" d="M413,426 l0,-2" /><path class="rulrs2" d="M414,386 l0,2" /><path class="rulrs2" d="M414,426 l0,-2" /><path class="rulrs2" d="M415,386 l0,2" /><path class="rulrs2" d="M415,426 l0,-2" /><path class="rulrs2" d="M416,386 l0,4" /><path class="rulrs2" d="M416,426 l0,-4" /><path class="rulrs2" d="M417,386 l0,2" /><path class="rulrs2" d="M417,426 l0,-2" /><path class="rulrs2" d="M418,386 l0,2" /><path class="rulrs2" d="M418,426 l0,-2" /><path class="rulrs2" d="M419,386 l0,2" /><path class="rulrs2" d="M419,426 l0,-2" /><path class="rulrs2" d="M420,386 l0,2" /><path class="rulrs2" d="M420,426 l0,-2" /><path class="rulrs2" d="M421,386 l0,2" /><path class="rulrs2" d="M421,426 l0,-2" /><path class="rulrs2" d="M422,386 l0,2" /><path class="rulrs2" d="M422,426 l0,-2" /><path class="rulrs2" d="M423,386 l0,2" /><path class="rulrs2" d="M423,426 l0,-2" /><path class="rulrs2" d="M424,386 l0,2" /><path class="rulrs2" d="M424,426 l0,-2" /><path class="rulrs2" d="M425,386 l0,2" /><path class="rulrs2" d="M425,426 l0,-2" /><path class="rulrs2" d="M426,386 l0,4" /><path class="rulrs2" d="M426,426 l0,-4" /><path class="rulrs2" d="M427,386 l0,2" /><path class="rulrs2" d="M427,426 l0,-2" /><path class="rulrs2" d="M428,386 l0,2" /><path class="rulrs2" d="M428,426 l0,-2" /><path class="rulrs2" d="M429,386 l0,2" /><path class="rulrs2" d="M429,426 l0,-2" /><path class="rulrs2" d="M430,386 l0,2" /><path class="rulrs2" d="M430,426 l0,-2" /><path class="rulrs2" d="M431,386 l0,2" /><path class="rulrs2" d="M431,426 l0,-2" /><path class="rulrs2" d="M432,386 l0,2" /><path class="rulrs2" d="M432,426 l0,-2" /><path class="rulrs2" d="M433,386 l0,2" /><path class="rulrs2" d="M433,426 l0,-2" /><path class="rulrs2" d="M434,386 l0,2" /><path class="rulrs2" d="M434,426 l0,-2" /><path class="rulrs2" d="M435,386 l0,2" /><path class="rulrs2" d="M435,426 l0,-2" /><path class="rulrs2" d="M436,386 l0,4" /><path class="rulrs2" d="M436,426 l0,-4" /><path class="rulrs2" d="M437,386 l0,2" /><path class="rulrs2" d="M437,426 l0,-2" /><path class="rulrs2" d="M438,386 l0,2" /><path class="rulrs2" d="M438,426 l0,-2" /><path class="rulrs2" d="M439,386 l0,2" /><path class="rulrs2" d="M439,426 l0,-2" /><path class="rulrs2" d="M440,386 l0,2" /><path class="rulrs2" d="M440,426 l0,-2" /><path class="rulrs2" d="M441,386 l0,2" /><path class="rulrs2" d="M441,426 l0,-2" /><path class="rulrs2" d="M442,386 l0,2" /><path class="rulrs2" d="M442,426 l0,-2" /><path class="rulrs2" d="M443,386 l0,2" /><path class="rulrs2" d="M443,426 l0,-2" /><path class="rulrs2" d="M444,386 l0,2" /><path class="rulrs2" d="M444,426 l0,-2" /><path class="rulrs2" d="M445,386 l0,2" /><path class="rulrs2" d="M445,426 l0,-2" /><path class="rulrs2" d="M446,386 l0,4" /><path class="rulrs2" d="M446,426 l0,-4" /><path class="rulrs2" d="M447,386 l0,2" /><path class="rulrs2" d="M447,426 l0,-2" /><path class="rulrs2" d="M448,386 l0,2" /><path class="rulrs2" d="M448,426 l0,-2" /><path class="rulrs2" d="M449,386 l0,2" /><path class="rulrs2" d="M449,426 l0,-2" /><path class="rulrs2" d="M450,386 l0,2" /><path class="rulrs2" d="M450,426 l0,-2" /><path class="rulrs2" d="M451,386 l0,2" /><path class="rulrs2" d="M451,426 l0,-2" /><path class="rulrs2" d="M452,386 l0,2" /><path class="rulrs2" d="M452,426 l0,-2" /><path class="rulrs2" d="M453,386 l0,2" /><path class="rulrs2" d="M453,426 l0,-2" /><path class="rulrs2" d="M454,386 l0,2" /><path class="rulrs2" d="M454,426 l0,-2" /><path class="rulrs2" d="M455,386 l0,2" /><path class="rulrs2" d="M455,426 l0,-2" /><path class="rulrs2" d="M456,386 l0,6" /><path class="rulrs2" d="M456,426 l0,-6" /><path class="rulrs2" d="M457,386 l0,2" /><path class="rulrs2" d="M457,426 l0,-2" /><path class="rulrs2" d="M458,386 l0,2" /><path class="rulrs2" d="M458,426 l0,-2" /><path class="rulrs2" d="M459,386 l0,2" /><path class="rulrs2" d="M459,426 l0,-2" /><path class="rulrs2" d="M460,386 l0,2" /><path class="rulrs2" d="M460,426 l0,-2" /><path class="rulrs2" d="M461,386 l0,2" /><path class="rulrs2" d="M461,426 l0,-2" /><path class="rulrs2" d="M462,386 l0,2" /><path class="rulrs2" d="M462,426 l0,-2" /><path class="rulrs2" d="M463,386 l0,2" /><path class="rulrs2" d="M463,426 l0,-2" /><path class="rulrs2" d="M464,386 l0,2" /><path class="rulrs2" d="M464,426 l0,-2" /><path class="rulrs2" d="M465,386 l0,2" /><path class="rulrs2" d="M465,426 l0,-2" /><path class="rulrs2" d="M466,386 l0,4" /><path class="rulrs2" d="M466,426 l0,-4" /><path class="rulrs2" d="M467,386 l0,2" /><path class="rulrs2" d="M467,426 l0,-2" /><path class="rulrs2" d="M468,386 l0,2" /><path class="rulrs2" d="M468,426 l0,-2" /><path class="rulrs2" d="M469,386 l0,2" /><path class="rulrs2" d="M469,426 l0,-2" /><path class="rulrs2" d="M470,386 l0,2" /><path class="rulrs2" d="M470,426 l0,-2" /><path class="rulrs2" d="M471,386 l0,2" /><path class="rulrs2" d="M471,426 l0,-2" /><path class="rulrs2" d="M472,386 l0,2" /><path class="rulrs2" d="M472,426 l0,-2" /><path class="rulrs2" d="M473,386 l0,2" /><path class="rulrs2" d="M473,426 l0,-2" /><path class="rulrs2" d="M474,386 l0,2" /><path class="rulrs2" d="M474,426 l0,-2" /><path class="rulrs2" d="M475,386 l0,2" /><path class="rulrs2" d="M475,426 l0,-2" /><path class="rulrs2" d="M476,386 l0,4" /><path class="rulrs2" d="M476,426 l0,-4" /><path class="rulrs2" d="M477,386 l0,2" /><path class="rulrs2" d="M477,426 l0,-2" /><path class="rulrs2" d="M478,386 l0,2" /><path class="rulrs2" d="M478,426 l0,-2" /><path class="rulrs2" d="M479,386 l0,2" /><path class="rulrs2" d="M479,426 l0,-2" /><path class="rulrs2" d="M480,386 l0,2" /><path class="rulrs2" d="M480,426 l0,-2" /><path class="rulrs2" d="M481,386 l0,2" /><path class="rulrs2" d="M481,426 l0,-2" /><path class="rulrs2" d="M482,386 l0,2" /><path class="rulrs2" d="M482,426 l0,-2" /><path class="rulrs2" d="M483,386 l0,2" /><path class="rulrs2" d="M483,426 l0,-2" /><path class="rulrs2" d="M484,386 l0,2" /><path class="rulrs2" d="M484,426 l0,-2" /><path class="rulrs2" d="M485,386 l0,2" /><path class="rulrs2" d="M485,426 l0,-2" /><path class="rulrs2" d="M486,386 l0,4" /><path class="rulrs2" d="M486,426 l0,-4" /><path class="rulrs2" d="M487,386 l0,2" /><path class="rulrs2" d="M487,426 l0,-2" /><path class="rulrs2" d="M488,386 l0,2" /><path class="rulrs2" d="M488,426 l0,-2" /><path class="rulrs2" d="M489,386 l0,2" /><path class="rulrs2" d="M489,426 l0,-2" /><path class="rulrs2" d="M490,386 l0,2" /><path class="rulrs2" d="M490,426 l0,-2" /><path class="rulrs2" d="M491,386 l0,2" /><path class="rulrs2" d="M491,426 l0,-2" /><path class="rulrs2" d="M492,386 l0,2" /><path class="rulrs2" d="M492,426 l0,-2" /><path class="rulrs2" d="M493,386 l0,2" /><path class="rulrs2" d="M493,426 l0,-2" /><path class="rulrs2" d="M494,386 l0,2" /><path class="rulrs2" d="M494,426 l0,-2" /><path class="rulrs2" d="M495,386 l0,2" /><path class="rulrs2" d="M495,426 l0,-2" /><path class="rulrs2" d="M496,386 l0,4" /><path class="rulrs2" d="M496,426 l0,-4" /><path class="rulrs2" d="M497,386 l0,2" /><path class="rulrs2" d="M497,426 l0,-2" /><path class="rulrs2" d="M498,386 l0,2" /><path class="rulrs2" d="M498,426 l0,-2" /><path class="rulrs2" d="M499,386 l0,2" /><path class="rulrs2" d="M499,426 l0,-2" /><path class="rulrs2" d="M500,386 l0,2" /><path class="rulrs2" d="M500,426 l0,-2" /><path class="rulrs2" d="M501,386 l0,2" /><path class="rulrs2" d="M501,426 l0,-2" /><path class="rulrs2" d="M502,386 l0,2" /><path class="rulrs2" d="M502,426 l0,-2" /><path class="rulrs2" d="M503,386 l0,2" /><path class="rulrs2" d="M503,426 l0,-2" /><path class="rulrs2" d="M504,386 l0,2" /><path class="rulrs2" d="M504,426 l0,-2" /><path class="rulrs2" d="M505,386 l0,2" /><path class="rulrs2" d="M505,426 l0,-2" /><path class="rulrs0" d="M506,386 l0,8" /><text class="rulrs5" x="506" y="395">3</text><path class="rulrs0" d="M506,426 l0,-8" /><text class="rulrs6" x="506" y="417">3</text><path class="rulrs2" d="M507,386 l0,2" /><path class="rulrs2" d="M507,426 l0,-2" /><path class="rulrs2" d="M508,386 l0,2" /><path class="rulrs2" d="M508,426 l0,-2" /><path class="rulrs2" d="M509,386 l0,2" /><path class="rulrs2" d="M509,426 l0,-2" /><path class="rulrs2" d="M510,386 l0,2" /><path class="rulrs2" d="M510,426 l0,-2" /><path class="rulrs2" d="M511,386 l0,2" /><path class="rulrs2" d="M511,426 l0,-2" /><path class="rulrs2" d="M512,386 l0,2" /><path class="rulrs2" d="M512,426 l0,-2" /><path class="rulrs2" d="M513,386 l0,2" /><path class="rulrs2" d="M513,426 l0,-2" /><path class="rulrs2" d="M514,386 l0,2" /><path class="rulrs2" d="M514,426 l0,-2" /><path class="rulrs2" d="M515,386 l0,2" /><path class="rulrs2" d="M515,426 l0,-2" /><path class="rulrs2" d="M516,386 l0,4" /><path class="rulrs2" d="M516,426 l0,-4" /><path class="rulrs2" d="M517,386 l0,2" /><path class="rulrs2" d="M517,426 l0,-2" /><path class="rulrs2" d="M518,386 l0,2" /><path class="rulrs2" d="M518,426 l0,-2" /><path class="rulrs2" d="M519,386 l0,2" /><path class="rulrs2" d="M519,426 l0,-2" /><path class="rulrs2" d="M520,386 l0,2" /><path class="rulrs2" d="M520,426 l0,-2" /><path class="rulrs2" d="M521,386 l0,2" /><path class="rulrs2" d="M521,426 l0,-2" /><path class="rulrs2" d="M522,386 l0,2" /><path class="rulrs2" d="M522,426 l0,-2" /><path class="rulrs2" d="M523,386 l0,2" /><path class="rulrs2" d="M523,426 l0,-2" /><path class="rulrs2" d="M524,386 l0,2" /><path class="rulrs2" d="M524,426 l0,-2" /><path class="rulrs2" d="M525,386 l0,2" /><path class="rulrs2" d="M525,426 l0,-2" /><path class="rulrs2" d="M526,386 l0,4" /><path class="rulrs2" d="M526,426 l0,-4" /><path class="rulrs2" d="M527,386 l0,2" /><path class="rulrs2" d="M527,426 l0,-2" /><path class="rulrs2" d="M528,386 l0,2" /><path class="rulrs2" d="M528,426 l0,-2" /><path class="rulrs2" d="M529,386 l0,2" /><path class="rulrs2" d="M529,426 l0,-2" /><path class="rulrs2" d="M530,386 l0,2" /><path class="rulrs2" d="M530,426 l0,-2" /><path class="rulrs2" d="M531,386 l0,2" /><path class="rulrs2" d="M531,426 l0,-2" /><path class="rulrs2" d="M532,386 l0,2" /><path class="rulrs2" d="M532,426 l0,-2" /><path class="rulrs2" d="M533,386 l0,2" /><path class="rulrs2" d="M533,426 l0,-2" /><path class="rulrs2" d="M534,386 l0,2" /><path class="rulrs2" d="M534,426 l0,-2" /><path class="rulrs2" d="M535,386 l0,2" /><path class="rulrs2" d="M535,426 l0,-2" /><path class="rulrs2" d="M536,386 l0,4" /><path class="rulrs2" d="M536,426 l0,-4" /><path class="rulrs2" d="M537,386 l0,2" /><path class="rulrs2" d="M537,426 l0,-2" /><path class="rulrs2" d="M538,386 l0,2" /><path class="rulrs2" d="M538,426 l0,-2" /><path class="rulrs2" d="M539,386 l0,2" /><path class="rulrs2" d="M539,426 l0,-2" /><path class="rulrs2" d="M540,386 l0,2" /><path class="rulrs2" d="M540,426 l0,-2" /><path class="rulrs2" d="M541,386 l0,2" /><path class="rulrs2" d="M541,426 l0,-2" /><path class="rulrs2" d="M542,386 l0,2" /><path class="rulrs2" d="M542,426 l0,-2" /><path class="rulrs2" d="M543,386 l0,2" /><path class="rulrs2" d="M543,426 l0,-2" /><path class="rulrs2" d="M544,386 l0,2" /><path class="rulrs2" d="M544,426 l0,-2" /><path class="rulrs2" d="M545,386 l0,2" /><path class="rulrs2" d="M545,426 l0,-2" /><path class="rulrs2" d="M546,386 l0,4" /><path class="rulrs2" d="M546,426 l0,-4" /><path class="rulrs2" d="M547,386 l0,2" /><path class="rulrs2" d="M547,426 l0,-2" /><path class="rulrs2" d="M548,386 l0,2" /><path class="rulrs2" d="M548,426 l0,-2" /><path class="rulrs2" d="M549,386 l0,2" /><path class="rulrs2" d="M549,426 l0,-2" /><path class="rulrs2" d="M550,386 l0,2" /><path class="rulrs2" d="M550,426 l0,-2" /><path class="rulrs2" d="M551,386 l0,2" /><path class="rulrs2" d="M551,426 l0,-2" /><path class="rulrs2" d="M552,386 l0,2" /><path class="rulrs2" d="M552,426 l0,-2" /><path class="rulrs2" d="M553,386 l0,2" /><path class="rulrs2" d="M553,426 l0,-2" /><path class="rulrs2" d="M554,386 l0,2" /><path class="rulrs2" d="M554,426 l0,-2" /><path class="rulrs2" d="M555,386 l0,2" /><path class="rulrs2" d="M555,426 l0,-2" /><path class="rulrs2" d="M556,386 l0,6" /><path class="rulrs2" d="M556,426 l0,-6" /><path class="rulrs2" d="M557,386 l0,2" /><path class="rulrs2" d="M557,426 l0,-2" /><path class="rulrs2" d="M558,386 l0,2" /><path class="rulrs2" d="M558,426 l0,-2" /><path class="rulrs2" d="M559,386 l0,2" /><path class="rulrs2" d="M559,426 l0,-2" /><path class="rulrs2" d="M560,386 l0,2" /><path class="rulrs2" d="M560,426 l0,-2" /><path class="rulrs2" d="M561,386 l0,2" /><path class="rulrs2" d="M561,426 l0,-2" /><path class="rulrs2" d="M562,386 l0,2" /><path class="rulrs2" d="M562,426 l0,-2" /><path class="rulrs2" d="M563,386 l0,2" /><path class="rulrs2" d="M563,426 l0,-2" /><path class="rulrs2" d="M564,386 l0,2" /><path class="rulrs2" d="M564,426 l0,-2" /><path class="rulrs2" d="M565,386 l0,2" /><path class="rulrs2" d="M565,426 l0,-2" /><path class="rulrs2" d="M566,386 l0,4" /><path class="rulrs2" d="M566,426 l0,-4" /><path class="rulrs2" d="M567,386 l0,2" /><path class="rulrs2" d="M567,426 l0,-2" /><path class="rulrs2" d="M568,386 l0,2" /><path class="rulrs2" d="M568,426 l0,-2" /><path class="rulrs2" d="M569,386 l0,2" /><path class="rulrs2" d="M569,426 l0,-2" /><path class="rulrs2" d="M570,386 l0,2" /><path class="rulrs2" d="M570,426 l0,-2" /><path class="rulrs2" d="M571,386 l0,2" /><path class="rulrs2" d="M571,426 l0,-2" /><path class="rulrs2" d="M572,386 l0,2" /><path class="rulrs2" d="M572,426 l0,-2" /><path class="rulrs2" d="M573,386 l0,2" /><path class="rulrs2" d="M573,426 l0,-2" /><path class="rulrs2" d="M574,386 l0,2" /><path class="rulrs2" d="M574,426 l0,-2" /><path class="rulrs2" d="M575,386 l0,2" /><path class="rulrs2" d="M575,426 l0,-2" /><path class="rulrs2" d="M576,386 l0,4" /><path class="rulrs2" d="M576,426 l0,-4" /><path class="rulrs2" d="M577,386 l0,2" /><path class="rulrs2" d="M577,426 l0,-2" /><path class="rulrs2" d="M578,386 l0,2" /><path class="rulrs2" d="M578,426 l0,-2" /><path class="rulrs2" d="M579,386 l0,2" /><path class="rulrs2" d="M579,426 l0,-2" /><path class="rulrs2" d="M580,386 l0,2" /><path class="rulrs2" d="M580,426 l0,-2" /><path class="rulrs2" d="M581,386 l0,2" /><path class="rulrs2" d="M581,426 l0,-2" /><path class="rulrs2" d="M582,386 l0,2" /><path class="rulrs2" d="M582,426 l0,-2" /><path class="rulrs2" d="M583,386 l0,2" /><path class="rulrs2" d="M583,426 l0,-2" /><path class="rulrs2" d="M584,386 l0,2" /><path class="rulrs2" d="M584,426 l0,-2" /><path class="rulrs2" d="M585,386 l0,2" /><path class="rulrs2" d="M585,426 l0,-2" /><path class="rulrs2" d="M586,386 l0,4" /><path class="rulrs2" d="M586,426 l0,-4" /><path class="rulrs2" d="M587,386 l0,2" /><path class="rulrs2" d="M587,426 l0,-2" /><path class="rulrs2" d="M588,386 l0,2" /><path class="rulrs2" d="M588,426 l0,-2" /><path class="rulrs2" d="M589,386 l0,2" /><path class="rulrs2" d="M589,426 l0,-2" /><path class="rulrs2" d="M590,386 l0,2" /><path class="rulrs2" d="M590,426 l0,-2" /><path class="rulrs2" d="M591,386 l0,2" /><path class="rulrs2" d="M591,426 l0,-2" /><path class="rulrs2" d="M592,386 l0,2" /><path class="rulrs2" d="M592,426 l0,-2" /><path class="rulrs2" d="M593,386 l0,2" /><path class="rulrs2" d="M593,426 l0,-2" /><path class="rulrs2" d="M594,386 l0,2" /><path class="rulrs2" d="M594,426 l0,-2" /><path class="rulrs2" d="M595,386 l0,2" /><path class="rulrs2" d="M595,426 l0,-2" /><path class="rulrs2" d="M596,386 l0,4" /><path class="rulrs2" d="M596,426 l0,-4" /><path class="rulrs2" d="M597,386 l0,2" /><path class="rulrs2" d="M597,426 l0,-2" /><path class="rulrs2" d="M598,386 l0,2" /><path class="rulrs2" d="M598,426 l0,-2" /><path class="rulrs2" d="M599,386 l0,2" /><path class="rulrs2" d="M599,426 l0,-2" /><path class="rulrs2" d="M600,386 l0,2" /><path class="rulrs2" d="M600,426 l0,-2" /><path class="rulrs2" d="M601,386 l0,2" /><path class="rulrs2" d="M601,426 l0,-2" /><path class="rulrs2" d="M602,386 l0,2" /><path class="rulrs2" d="M602,426 l0,-2" /><path class="rulrs2" d="M603,386 l0,2" /><path class="rulrs2" d="M603,426 l0,-2" /><path class="rulrs2" d="M604,386 l0,2" /><path class="rulrs2" d="M604,426 l0,-2" /><path class="rulrs2" d="M605,386 l0,2" /><path class="rulrs2" d="M605,426 l0,-2" /><path class="rulrs0" d="M606,386 l0,8" /><text class="rulrs5" x="606" y="395">4</text><path class="rulrs0" d="M606,426 l0,-8" /><text class="rulrs6" x="606" y="417">4</text><path class="rulrs2" d="M607,386 l0,2" /><path class="rulrs2" d="M607,426 l0,-2" /><path class="rulrs2" d="M608,386 l0,2" /><path class="rulrs2" d="M608,426 l0,-2" /><path class="rulrs2" d="M609,386 l0,2" /><path class="rulrs2" d="M609,426 l0,-2" /><path class="rulrs2" d="M610,386 l0,2" /><path class="rulrs2" d="M610,426 l0,-2" /><path class="rulrs2" d="M611,386 l0,2" /><path class="rulrs2" d="M611,426 l0,-2" /><path class="rulrs2" d="M612,386 l0,2" /><path class="rulrs2" d="M612,426 l0,-2" /><path class="rulrs2" d="M613,386 l0,2" /><path class="rulrs2" d="M613,426 l0,-2" /><path class="rulrs2" d="M614,386 l0,2" /><path class="rulrs2" d="M614,426 l0,-2" /><path class="rulrs2" d="M615,386 l0,2" /><path class="rulrs2" d="M615,426 l0,-2" /><path class="rulrs2" d="M616,386 l0,4" /><path class="rulrs2" d="M616,426 l0,-4" /><path class="rulrs2" d="M617,386 l0,2" /><path class="rulrs2" d="M617,426 l0,-2" /><path class="rulrs2" d="M618,386 l0,2" /><path class="rulrs2" d="M618,426 l0,-2" /><path class="rulrs2" d="M619,386 l0,2" /><path class="rulrs2" d="M619,426 l0,-2" /><path class="rulrs2" d="M620,386 l0,2" /><path class="rulrs2" d="M620,426 l0,-2" /><path class="rulrs2" d="M621,386 l0,2" /><path class="rulrs2" d="M621,426 l0,-2" /><path class="rulrs2" d="M622,386 l0,2" /><path class="rulrs2" d="M622,426 l0,-2" /><path class="rulrs2" d="M623,386 l0,2" /><path class="rulrs2" d="M623,426 l0,-2" /><path class="rulrs2" d="M624,386 l0,2" /><path class="rulrs2" d="M624,426 l0,-2" /><path class="rulrs2" d="M625,386 l0,2" /><path class="rulrs2" d="M625,426 l0,-2" /><path class="rulrs2" d="M626,386 l0,4" /><path class="rulrs2" d="M626,426 l0,-4" /><path class="rulrs2" d="M627,386 l0,2" /><path class="rulrs2" d="M627,426 l0,-2" /><path class="rulrs2" d="M628,386 l0,2" /><path class="rulrs2" d="M628,426 l0,-2" /><path class="rulrs2" d="M629,386 l0,2" /><path class="rulrs2" d="M629,426 l0,-2" /><path class="rulrs2" d="M630,386 l0,2" /><path class="rulrs2" d="M630,426 l0,-2" /><path class="rulrs2" d="M631,386 l0,2" /><path class="rulrs2" d="M631,426 l0,-2" /><path class="rulrs2" d="M632,386 l0,2" /><path class="rulrs2" d="M632,426 l0,-2" /><path class="rulrs2" d="M633,386 l0,2" /><path class="rulrs2" d="M633,426 l0,-2" /><path class="rulrs2" d="M634,386 l0,2" /><path class="rulrs2" d="M634,426 l0,-2" /><path class="rulrs2" d="M635,386 l0,2" /><path class="rulrs2" d="M635,426 l0,-2" /><path class="rulrs2" d="M636,386 l0,4" /><path class="rulrs2" d="M636,426 l0,-4" /><path class="rulrs2" d="M637,386 l0,2" /><path class="rulrs2" d="M637,426 l0,-2" /><path class="rulrs2" d="M638,386 l0,2" /><path class="rulrs2" d="M638,426 l0,-2" /><path class="rulrs2" d="M639,386 l0,2" /><path class="rulrs2" d="M639,426 l0,-2" /><path class="rulrs2" d="M640,386 l0,2" /><path class="rulrs2" d="M640,426 l0,-2" /><path class="rulrs2" d="M641,386 l0,2" /><path class="rulrs2" d="M641,426 l0,-2" /><path class="rulrs2" d="M642,386 l0,2" /><path class="rulrs2" d="M642,426 l0,-2" /><path class="rulrs2" d="M643,386 l0,2" /><path class="rulrs2" d="M643,426 l0,-2" /><path class="rulrs2" d="M644,386 l0,2" /><path class="rulrs2" d="M644,426 l0,-2" /><path class="rulrs2" d="M645,386 l0,2" /><path class="rulrs2" d="M645,426 l0,-2" /><path class="rulrs2" d="M646,386 l0,4" /><path class="rulrs2" d="M646,426 l0,-4" /><path class="rulrs2" d="M647,386 l0,2" /><path class="rulrs2" d="M647,426 l0,-2" /><path class="rulrs2" d="M648,386 l0,2" /><path class="rulrs2" d="M648,426 l0,-2" /><path class="rulrs2" d="M649,386 l0,2" /><path class="rulrs2" d="M649,426 l0,-2" /><path class="rulrs2" d="M650,386 l0,2" /><path class="rulrs2" d="M650,426 l0,-2" /><path class="rulrs2" d="M651,386 l0,2" /><path class="rulrs2" d="M651,426 l0,-2" /><path class="rulrs2" d="M652,386 l0,2" /><path class="rulrs2" d="M652,426 l0,-2" /><path class="rulrs2" d="M653,386 l0,2" /><path class="rulrs2" d="M653,426 l0,-2" /><path class="rulrs2" d="M654,386 l0,2" /><path class="rulrs2" d="M654,426 l0,-2" /><path class="rulrs2" d="M655,386 l0,2" /><path class="rulrs2" d="M655,426 l0,-2" /><path class="rulrs2" d="M656,386 l0,6" /><path class="rulrs2" d="M656,426 l0,-6" /><path class="rulrs2" d="M657,386 l0,2" /><path class="rulrs2" d="M657,426 l0,-2" /><path class="rulrs2" d="M658,386 l0,2" /><path class="rulrs2" d="M658,426 l0,-2" /><path class="rulrs2" d="M659,386 l0,2" /><path class="rulrs2" d="M659,426 l0,-2" /><path class="rulrs2" d="M660,386 l0,2" /><path class="rulrs2" d="M660,426 l0,-2" /><path class="rulrs2" d="M661,386 l0,2" /><path class="rulrs2" d="M661,426 l0,-2" /><path class="rulrs2" d="M662,386 l0,2" /><path class="rulrs2" d="M662,426 l0,-2" /><path class="rulrs2" d="M663,386 l0,2" /><path class="rulrs2" d="M663,426 l0,-2" /><path class="rulrs2" d="M664,386 l0,2" /><path class="rulrs2" d="M664,426 l0,-2" /><path class="rulrs2" d="M665,386 l0,2" /><path class="rulrs2" d="M665,426 l0,-2" /><path class="rulrs2" d="M666,386 l0,4" /><path class="rulrs2" d="M666,426 l0,-4" /><path class="rulrs2" d="M667,386 l0,2" /><path class="rulrs2" d="M667,426 l0,-2" /><path class="rulrs2" d="M668,386 l0,2" /><path class="rulrs2" d="M668,426 l0,-2" /><path class="rulrs2" d="M669,386 l0,2" /><path class="rulrs2" d="M669,426 l0,-2" /><path class="rulrs2" d="M670,386 l0,2" /><path class="rulrs2" d="M670,426 l0,-2" /><path class="rulrs2" d="M671,386 l0,2" /><path class="rulrs2" d="M671,426 l0,-2" /><path class="rulrs2" d="M672,386 l0,2" /><path class="rulrs2" d="M672,426 l0,-2" /><path class="rulrs2" d="M673,386 l0,2" /><path class="rulrs2" d="M673,426 l0,-2" /><path class="rulrs2" d="M674,386 l0,2" /><path class="rulrs2" d="M674,426 l0,-2" /><path class="rulrs2" d="M675,386 l0,2" /><path class="rulrs2" d="M675,426 l0,-2" /><path class="rulrs2" d="M676,386 l0,4" /><path class="rulrs2" d="M676,426 l0,-4" /><path class="rulrs2" d="M677,386 l0,2" /><path class="rulrs2" d="M677,426 l0,-2" /><path class="rulrs2" d="M678,386 l0,2" /><path class="rulrs2" d="M678,426 l0,-2" /><path class="rulrs2" d="M679,386 l0,2" /><path class="rulrs2" d="M679,426 l0,-2" /><path class="rulrs2" d="M680,386 l0,2" /><path class="rulrs2" d="M680,426 l0,-2" /><path class="rulrs2" d="M681,386 l0,2" /><path class="rulrs2" d="M681,426 l0,-2" /><path class="rulrs2" d="M682,386 l0,2" /><path class="rulrs2" d="M682,426 l0,-2" /><path class="rulrs2" d="M683,386 l0,2" /><path class="rulrs2" d="M683,426 l0,-2" /><path class="rulrs2" d="M684,386 l0,2" /><path class="rulrs2" d="M684,426 l0,-2" /><path class="rulrs2" d="M685,386 l0,2" /><path class="rulrs2" d="M685,426 l0,-2" /><path class="rulrs2" d="M686,386 l0,4" /><path class="rulrs2" d="M686,426 l0,-4" /><path class="rulrs2" d="M687,386 l0,2" /><path class="rulrs2" d="M687,426 l0,-2" /><path class="rulrs2" d="M688,386 l0,2" /><path class="rulrs2" d="M688,426 l0,-2" /><path class="rulrs2" d="M689,386 l0,2" /><path class="rulrs2" d="M689,426 l0,-2" /><path class="rulrs2" d="M690,386 l0,2" /><path class="rulrs2" d="M690,426 l0,-2" /><path class="rulrs2" d="M691,386 l0,2" /><path class="rulrs2" d="M691,426 l0,-2" /><path class="rulrs2" d="M692,386 l0,2" /><path class="rulrs2" d="M692,426 l0,-2" /><path class="rulrs2" d="M693,386 l0,2" /><path class="rulrs2" d="M693,426 l0,-2" /><path class="rulrs2" d="M694,386 l0,2" /><path class="rulrs2" d="M694,426 l0,-2" /><path class="rulrs2" d="M695,386 l0,2" /><path class="rulrs2" d="M695,426 l0,-2" /><path class="rulrs2" d="M696,386 l0,4" /><path class="rulrs2" d="M696,426 l0,-4" /><path class="rulrs2" d="M697,386 l0,2" /><path class="rulrs2" d="M697,426 l0,-2" /><path class="rulrs2" d="M698,386 l0,2" /><path class="rulrs2" d="M698,426 l0,-2" /><path class="rulrs2" d="M699,386 l0,2" /><path class="rulrs2" d="M699,426 l0,-2" /><path class="rulrs2" d="M700,386 l0,2" /><path class="rulrs2" d="M700,426 l0,-2" /><path class="rulrs2" d="M701,386 l0,2" /><path class="rulrs2" d="M701,426 l0,-2" /><path class="rulrs2" d="M702,386 l0,2" /><path class="rulrs2" d="M702,426 l0,-2" /><path class="rulrs2" d="M703,386 l0,2" /><path class="rulrs2" d="M703,426 l0,-2" /><path class="rulrs2" d="M704,386 l0,2" /><path class="rulrs2" d="M704,426 l0,-2" /><path class="rulrs2" d="M705,386 l0,2" /><path class="rulrs2" d="M705,426 l0,-2" /><path class="rulrs0" d="M706,386 l0,8" /><text class="rulrs5" x="706" y="395">5</text><path class="rulrs0" d="M706,426 l0,-8" /><text class="rulrs6" x="706" y="417">5</text><path class="rulrs2" d="M707,386 l0,2" /><path class="rulrs2" d="M707,426 l0,-2" /><path class="rulrs2" d="M708,386 l0,2" /><path class="rulrs2" d="M708,426 l0,-2" /><path class="rulrs2" d="M709,386 l0,2" /><path class="rulrs2" d="M709,426 l0,-2" /><path class="rulrs2" d="M710,386 l0,2" /><path class="rulrs2" d="M710,426 l0,-2" /><path class="rulrs2" d="M711,386 l0,2" /><path class="rulrs2" d="M711,426 l0,-2" /><path class="rulrs2" d="M712,386 l0,2" /><path class="rulrs2" d="M712,426 l0,-2" /><path class="rulrs2" d="M713,386 l0,2" /><path class="rulrs2" d="M713,426 l0,-2" /><path class="rulrs2" d="M714,386 l0,2" /><path class="rulrs2" d="M714,426 l0,-2" /><path class="rulrs2" d="M715,386 l0,2" /><path class="rulrs2" d="M715,426 l0,-2" /><path class="rulrs2" d="M716,386 l0,4" /><path class="rulrs2" d="M716,426 l0,-4" /><path class="rulrs2" d="M717,386 l0,2" /><path class="rulrs2" d="M717,426 l0,-2" /><path class="rulrs2" d="M718,386 l0,2" /><path class="rulrs2" d="M718,426 l0,-2" /><path class="rulrs2" d="M719,386 l0,2" /><path class="rulrs2" d="M719,426 l0,-2" /><path class="rulrs2" d="M720,386 l0,2" /><path class="rulrs2" d="M720,426 l0,-2" /><path class="rulrs2" d="M721,386 l0,2" /><path class="rulrs2" d="M721,426 l0,-2" /><path class="rulrs2" d="M722,386 l0,2" /><path class="rulrs2" d="M722,426 l0,-2" /><path class="rulrs2" d="M723,386 l0,2" /><path class="rulrs2" d="M723,426 l0,-2" /><path class="rulrs2" d="M724,386 l0,2" /><path class="rulrs2" d="M724,426 l0,-2" /><path class="rulrs2" d="M725,386 l0,2" /><path class="rulrs2" d="M725,426 l0,-2" /><path class="rulrs2" d="M726,386 l0,4" /><path class="rulrs2" d="M726,426 l0,-4" /><path class="rulrs2" d="M727,386 l0,2" /><path class="rulrs2" d="M727,426 l0,-2" /><path class="rulrs2" d="M728,386 l0,2" /><path class="rulrs2" d="M728,426 l0,-2" /><path class="rulrs2" d="M729,386 l0,2" /><path class="rulrs2" d="M729,426 l0,-2" /><path class="rulrs2" d="M730,386 l0,2" /><path class="rulrs2" d="M730,426 l0,-2" /><path class="rulrs2" d="M731,386 l0,2" /><path class="rulrs2" d="M731,426 l0,-2" /><path class="rulrs2" d="M732,386 l0,2" /><path class="rulrs2" d="M732,426 l0,-2" /><path class="rulrs2" d="M733,386 l0,2" /><path class="rulrs2" d="M733,426 l0,-2" /><path class="rulrs2" d="M734,386 l0,2" /><path class="rulrs2" d="M734,426 l0,-2" /><path class="rulrs2" d="M735,386 l0,2" /><path class="rulrs2" d="M735,426 l0,-2" /><path class="rulrs2" d="M736,386 l0,4" /><path class="rulrs2" d="M736,426 l0,-4" /><path class="rulrs2" d="M737,386 l0,2" /><path class="rulrs2" d="M737,426 l0,-2" /><path class="rulrs2" d="M738,386 l0,2" /><path class="rulrs2" d="M738,426 l0,-2" /><path class="rulrs2" d="M739,386 l0,2" /><path class="rulrs2" d="M739,426 l0,-2" /><path class="rulrs2" d="M740,386 l0,2" /><path class="rulrs2" d="M740,426 l0,-2" /><path class="rulrs2" d="M741,386 l0,2" /><path class="rulrs2" d="M741,426 l0,-2" /><path class="rulrs2" d="M742,386 l0,2" /><path class="rulrs2" d="M742,426 l0,-2" /><path class="rulrs2" d="M743,386 l0,2" /><path class="rulrs2" d="M743,426 l0,-2" /><path class="rulrs2" d="M744,386 l0,2" /><path class="rulrs2" d="M744,426 l0,-2" /><path class="rulrs2" d="M745,386 l0,2" /><path class="rulrs2" d="M745,426 l0,-2" /><path class="rulrs2" d="M746,386 l0,4" /><path class="rulrs2" d="M746,426 l0,-4" /><path class="rulrs2" d="M747,386 l0,2" /><path class="rulrs2" d="M747,426 l0,-2" /><path class="rulrs2" d="M748,386 l0,2" /><path class="rulrs2" d="M748,426 l0,-2" /><path class="rulrs2" d="M749,386 l0,2" /><path class="rulrs2" d="M749,426 l0,-2" /><path class="rulrs2" d="M750,386 l0,2" /><path class="rulrs2" d="M750,426 l0,-2" /><path class="rulrs2" d="M751,386 l0,2" /><path class="rulrs2" d="M751,426 l0,-2" /><path class="rulrs2" d="M752,386 l0,2" /><path class="rulrs2" d="M752,426 l0,-2" /><path class="rulrs2" d="M753,386 l0,2" /><path class="rulrs2" d="M753,426 l0,-2" /><path class="rulrs2" d="M754,386 l0,2" /><path class="rulrs2" d="M754,426 l0,-2" /><path class="rulrs2" d="M755,386 l0,2" /><path class="rulrs2" d="M755,426 l0,-2" /><path class="rulrs2" d="M756,386 l0,6" /><path class="rulrs2" d="M756,426 l0,-6" /><path class="rulrs2" d="M757,386 l0,2" /><path class="rulrs2" d="M757,426 l0,-2" /><path class="rulrs2" d="M758,386 l0,2" /><path class="rulrs2" d="M758,426 l0,-2" /><path class="rulrs2" d="M759,386 l0,2" /><path class="rulrs2" d="M759,426 l0,-2" /><path class="rulrs2" d="M760,386 l0,2" /><path class="rulrs2" d="M760,426 l0,-2" /><path class="rulrs2" d="M761,386 l0,2" /><path class="rulrs2" d="M761,426 l0,-2" /><path class="rulrs2" d="M762,386 l0,2" /><path class="rulrs2" d="M762,426 l0,-2" /><path class="rulrs2" d="M763,386 l0,2" /><path class="rulrs2" d="M763,426 l0,-2" /><path class="rulrs2" d="M764,386 l0,2" /><path class="rulrs2" d="M764,426 l0,-2" /><path class="rulrs2" d="M765,386 l0,2" /><path class="rulrs2" d="M765,426 l0,-2" /><path class="rulrs2" d="M766,386 l0,4" /><path class="rulrs2" d="M766,426 l0,-4" /><path class="rulrs2" d="M767,386 l0,2" /><path class="rulrs2" d="M767,426 l0,-2" /><path class="rulrs2" d="M768,386 l0,2" /><path class="rulrs2" d="M768,426 l0,-2" /><path class="rulrs2" d="M769,386 l0,2" /><path class="rulrs2" d="M769,426 l0,-2" /><path class="rulrs2" d="M770,386 l0,2" /><path class="rulrs2" d="M770,426 l0,-2" /><path class="rulrs2" d="M771,386 l0,2" /><path class="rulrs2" d="M771,426 l0,-2" /><path class="rulrs2" d="M772,386 l0,2" /><path class="rulrs2" d="M772,426 l0,-2" /><path class="rulrs2" d="M773,386 l0,2" /><path class="rulrs2" d="M773,426 l0,-2" /><path class="rulrs2" d="M774,386 l0,2" /><path class="rulrs2" d="M774,426 l0,-2" /><path class="rulrs2" d="M775,386 l0,2" /><path class="rulrs2" d="M775,426 l0,-2" /><path class="rulrs2" d="M776,386 l0,4" /><path class="rulrs2" d="M776,426 l0,-4" /><path class="rulrs2" d="M777,386 l0,2" /><path class="rulrs2" d="M777,426 l0,-2" /><path class="rulrs2" d="M778,386 l0,2" /><path class="rulrs2" d="M778,426 l0,-2" /><path class="rulrs2" d="M779,386 l0,2" /><path class="rulrs2" d="M779,426 l0,-2" /><path class="rulrs2" d="M780,386 l0,2" /><path class="rulrs2" d="M780,426 l0,-2" /><path class="rulrs2" d="M781,386 l0,2" /><path class="rulrs2" d="M781,426 l0,-2" /><path class="rulrs2" d="M782,386 l0,2" /><path class="rulrs2" d="M782,426 l0,-2" /><path class="rulrs2" d="M783,386 l0,2" /><path class="rulrs2" d="M783,426 l0,-2" /><path class="rulrs2" d="M784,386 l0,2" /><path class="rulrs2" d="M784,426 l0,-2" /><path class="rulrs2" d="M785,386 l0,2" /><path class="rulrs2" d="M785,426 l0,-2" /><path class="rulrs2" d="M786,386 l0,4" /><path class="rulrs2" d="M786,426 l0,-4" /><path class="rulrs2" d="M787,386 l0,2" /><path class="rulrs2" d="M787,426 l0,-2" /><path class="rulrs2" d="M788,386 l0,2" /><path class="rulrs2" d="M788,426 l0,-2" /><path class="rulrs2" d="M789,386 l0,2" /><path class="rulrs2" d="M789,426 l0,-2" /><path class="rulrs2" d="M790,386 l0,2" /><path class="rulrs2" d="M790,426 l0,-2" /><path class="rulrs2" d="M791,386 l0,2" /><path class="rulrs2" d="M791,426 l0,-2" /><path class="rulrs2" d="M792,386 l0,2" /><path class="rulrs2" d="M792,426 l0,-2" /><path class="rulrs2" d="M793,386 l0,2" /><path class="rulrs2" d="M793,426 l0,-2" /><path class="rulrs2" d="M794,386 l0,2" /><path class="rulrs2" d="M794,426 l0,-2" /><path class="rulrs2" d="M795,386 l0,2" /><path class="rulrs2" d="M795,426 l0,-2" /><path class="rulrs2" d="M796,386 l0,4" /><path class="rulrs2" d="M796,426 l0,-4" /><path class="rulrs2" d="M797,386 l0,2" /><path class="rulrs2" d="M797,426 l0,-2" /><path class="rulrs2" d="M798,386 l0,2" /><path class="rulrs2" d="M798,426 l0,-2" /><path class="rulrs2" d="M799,386 l0,2" /><path class="rulrs2" d="M799,426 l0,-2" /><path class="rulrs2" d="M800,386 l0,2" /><path class="rulrs2" d="M800,426 l0,-2" /><path class="rulrs2" d="M801,386 l0,2" /><path class="rulrs2" d="M801,426 l0,-2" /><path class="rulrs2" d="M802,386 l0,2" /><path class="rulrs2" d="M802,426 l0,-2" /><path class="rulrs2" d="M803,386 l0,2" /><path class="rulrs2" d="M803,426 l0,-2" /><path class="rulrs2" d="M804,386 l0,2" /><path class="rulrs2" d="M804,426 l0,-2" /><path class="rulrs2" d="M805,386 l0,2" /><path class="rulrs2" d="M805,426 l0,-2" /><path class="rulrs0" d="M806,386 l0,8" /><text class="rulrs5" x="806" y="395">6</text><path class="rulrs0" d="M806,426 l0,-8" /><text class="rulrs6" x="806" y="417">6</text><circle cx="606" cy="406" r="5" class="rulrs3" /><circle cx="606" cy="406" r="5.5" class="rulrs0" /><path class="rulrs1" d="M206,406 l394,0" /><path class="rulrs1" d="M612,406 l194,0" /><path class="rulrs1" d="M406,402 l0,8" />'

    },
    _createDragMarkerIcon: function () {
        const zoom = this._map.getZoom();
        const transformation = this._map.options.crs.transformation;
        const scale = this._map.options.crs.scale(zoom);
        const w = Math.abs(transformation._a) * scale * this.options.widthInMeters * 610 / 812;
        const h = Math.abs(transformation._c) * scale * this.options.heightInMeters * 40 / 812;

        const x = Math.abs(transformation._a) * scale * this.options.widthInMeters * 205 / 812;
        const y = Math.abs(transformation._c) * scale * this.options.heightInMeters * 20 / 812;

        return L.icon({
            iconUrl: '/img/transparent.png',
            iconSize: [w, h],
            iconAnchor: [x, y],
            className: this.options.dragMarkerClassName
        });
    },

    _createRotateMarkerIcon: function () {
        const zoom = this._map.getZoom();
        const size = 11 / 812;
        const transformation = this._map.options.crs.transformation;
        const scale = this._map.options.crs.scale(zoom);
        const w = Math.abs(transformation._a) * scale * this.options.widthInMeters * size;
        const h = Math.abs(transformation._c) * scale * this.options.heightInMeters * size;
        return L.icon({
            iconUrl: '/img/transparent.png',
            iconSize: [w, h],
            iconAnchor: [w / 2, h / 2],
            className: 'map-utils-tools-ruler-rotate'
        });
    },

    _getRotateMarkerPosition: function () {
        const rel = this.options.widthInMeters * 200 / 812;
        return [
            this._latlng.lat + (Math.cos((this._bearing+90) * Math.PI / 180) * rel),
            this._latlng.lng + (Math.sin((this._bearing+90) * Math.PI / 180) * rel),
        ];
    },

    _updateRotateMarkerPosition: function () {
        if (this._rotateMarker) {
            this._rotateMarker.setLatLng(this._getRotateMarkerPosition());
        }
    },

    _updateRotateMarkerSize: function () {
        this._rotateMarker.setIcon(this._createRotateMarkerIcon());
    },

    _onRotateMarkerDrag: function () {
        this.setBearing(GameMapUtils.bearing(this._latlng, this._rotateMarker.getLatLng(), this._map) - 90);
    },

    _updateDragMarkerIconTransform: function () {
        const icon = this._dragMarker._icon;
        const idx = icon.style.transform.indexOf('rotateZ');
        if (idx != -1) {
            icon.style.transform = icon.style.transform.substring(0, idx) + 'rotateZ(' + this._bearing + 'deg)';
        } else {
            icon.style.transform += ' rotateZ(' + this._bearing + 'deg)';
        }
        const a = this._dragMarker.options.icon.options.iconAnchor;
        icon.style.transformOrigin = a[0] + "px " + a[1] + "px";
    },

    _resetBearing: function () {
        this.setBearing(0);
        return false;
    },

    _createRotateMarker: function () {
        return L.marker(
            this._getRotateMarkerPosition(),
            {
                icon: this._createRotateMarkerIcon(),
                draggable: true,
                autoPanOnFocus: false,
                markerZoomAnimation: false,
                zIndexOffset: 1000,
                title: 'Drag to rotate the ruler. Double click to reset to West-East.'
            })
            .on('drag', this._onRotateMarkerDrag, this)
            .on('dblclick', this._resetBearing, this);
    }

});

GameMapUtils.ruler = function (latLng, options) {
    return new GameMapUtils.Ruler(latLng, options);
}



GameMapUtils.ToggleToolButton = L.Control.extend({
    options: {
        position: 'topleft',
        baseClassName: 'btn btn-sm',
        offClassName: 'btn-outline-secondary',
        onClassName: 'btn-primary',
        tool: GameMapUtils.ruler,
        content: 'Ruler'
    },

    _toolInstance: null,

    _toolActive: false,

    onAdd: function (map) {
        this._map = map;
        this._container = L.DomUtil.create('button', this.options.baseClassName + ' ' + this.options.offClassName);
        L.DomEvent.disableClickPropagation(this._container);
        this._container.innerHTML = this.options.content;
        L.DomEvent.on(this._container, 'click', this._toggleTool, this);
        return this._container;
    },

    onRemove: function (map) {
        if (this._toolActive) {
            this._toolInstance.removeFrom(this._map);
        }
    },

    _toggleTool: function (e) {
        this._toolActive = !this._toolActive;
        if (this._toolActive) {
            if (!this._toolInstance) {
                this._toolInstance = this.options.tool(this._map.getCenter());
            }
            this._toolInstance.addTo(this._map);

            this._container.classList.remove(this.options.offClassName);
            this._container.classList.add(this.options.onClassName);
        } else {
            if (this._toolInstance) {
                this._toolInstance.removeFrom(this._map);
            }

            this._container.classList.remove(this.options.onClassName);
            this._container.classList.add(this.options.offClassName);
        }
        //this._container.className = this._toolActive ? this.options.onClassName : this.options.offClassName;
    }
});

GameMapUtils.toggleToolButton = function (options) {
    return new GameMapUtils.ToggleToolButton(options);
};