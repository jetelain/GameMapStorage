/// <reference path="../types/leaflet.d.ts" />
/// <reference path="GameMapUtils.ts" />
var GameMapUtils;
(function (GameMapUtils) {
    /**
     *  Create a Canvas as ImageOverlay to draw the Lat/Lon Graticule,
     *  and show the axis tick label on the edge of the map.
     *  Intitial version author: lanwei@cloudybay.com.tw
     */
    class LatLngGraticule extends L.Layer {
        constructor(options) {
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
        }
        initialize(options) {
            L.Util.setOptions(this, options);
        }
        onAdd(map) {
            this._map = map;
            this._grid = map.grid;
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
        onRemove(map) {
            this._grid = null;
            map.getPanes().overlayPane.removeChild(this._container);
            map.off('viewreset', this._reset, this);
            map.off('move', this._reset, this);
            map.off('moveend', this._reset, this);
            return this;
        }
        addTo(map) {
            map.addLayer(this);
            return this;
        }
        setOpacity(opacity) {
            this.options.opacity = opacity;
            this._updateOpacity();
            return this;
        }
        bringToFront() {
            if (this._canvas) {
                this._map.getPane('overlayPane').appendChild(this._canvas);
            }
            return this;
        }
        bringToBack() {
            var pane = this._map.getPane('overlayPane');
            if (this._canvas) {
                pane.insertBefore(this._canvas, pane.firstChild);
            }
            return this;
        }
        getAttribution() {
            return this.options.attribution;
        }
        _initCanvas() {
            this._container = L.DomUtil.create('div', 'leaflet-image-layer');
            this._canvas = L.DomUtil.create('canvas', '');
            if (this._map.options.zoomAnimation && L.Browser.any3d) {
                L.DomUtil.addClass(this._canvas, 'leaflet-zoom-animated');
            }
            else {
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
        _reset() {
            let container = this._container, canvas = this._canvas, size = this._map.getSize(), lt = this._map.containerPointToLayerPoint([0, 0]);
            L.DomUtil.setPosition(container, lt);
            container.style.width = size.x + 'px';
            container.style.height = size.y + 'px';
            canvas.width = size.x;
            canvas.height = size.y;
            canvas.style.width = size.x + 'px';
            canvas.style.height = size.y + 'px';
            this.__draw(true);
        }
        _onCanvasLoad() {
            this.fire('load');
        }
        _updateOpacity() {
            L.DomUtil.setOpacity(this._canvas, this.options.opacity);
        }
        __draw(label) {
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
            }
            ;
            const canvas = this._canvas, map = this._map, grid = this._grid;
            if (L.Browser.canvas && map) {
                const latInterval = 1000, lngInterval = 1000, ww = canvas.width, hh = canvas.height, originX = grid.options.originX, originY = grid.options.originY, sizeInMeters = grid.options.sizeInMeters;
                const latGap = (-originY) % latInterval, lngGap = (-originX) % lngInterval;
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
                let startLat = rb.lat, endLat = lt.lat;
                let startLng = lt.lng, endLng = rt.lng;
                const pointPerLat = Math.max(1, (endLat - startLat) / (hh * 0.2));
                if (isNaN(pointPerLat)) {
                    return;
                }
                startLat = Math.trunc(startLat - pointPerLat);
                endLat = Math.trunc(endLat + pointPerLat);
                const pointPerLon = Math.max(1, (endLng - startLng) / (ww * 0.2));
                endLng = Math.trunc(endLng + pointPerLon);
                startLng = Math.trunc(startLng - pointPerLon);
                function drawLatLine(self, lat_tick) {
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
                }
                ;
                if (latInterval > 0) {
                    for (let lat = latGap; lat <= endLat; lat += latInterval) {
                        if (lat >= startLat && lat <= sizeInMeters) {
                            drawLatLine(this, lat);
                        }
                    }
                }
                function drawLngLine(self, lon_tick) {
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
                }
                ;
                if (lngInterval > 0) {
                    for (let lng = lngGap; lng <= endLng; lng += lngInterval) {
                        if (lng >= startLng && lng <= sizeInMeters) {
                            drawLngLine(this, lng);
                        }
                    }
                }
            }
        }
        _latLngToCanvasPoint(latlng) {
            let map = this._map;
            var projectedPoint = map.project(L.latLng(latlng));
            projectedPoint._subtract(map.getPixelOrigin());
            return L.point(projectedPoint).add(map._getMapPanePos());
        }
    }
    GameMapUtils.LatLngGraticule = LatLngGraticule;
    function latlngGraticule(options) {
        return new GameMapUtils.LatLngGraticule(options);
    }
    GameMapUtils.latlngGraticule = latlngGraticule;
    ;
})(GameMapUtils || (GameMapUtils = {}));
/// <reference path="../types/leaflet.d.ts" /> 
/// <reference path="GameMapUtils.ts" /> 
var GameMapUtils;
(function (GameMapUtils) {
    /**
     * Display mouse coordinates on map
     *
     * Author: jetelain
     */
    class GridMousePosition extends L.Control {
        constructor(options) {
            super(L.extend({
                position: 'topright',
                precision: 4
            }, options));
        }
        onAdd(map) {
            this._container = L.DomUtil.create('div', 'leaflet-grid-mouseposition');
            this._map = map;
            L.DomEvent.disableClickPropagation(this._container);
            map.on('mousemove', this._onMouseMove, this);
            this._container.innerHTML = GameMapUtils.toGridCoordinates(L.latLng(0, 0), this.options.precision, this._map);
            return this._container;
        }
        onRemove(map) {
            this._map = null;
            map.off('mousemove', this._onMouseMove);
        }
        _onMouseMove(e) {
            this._container.innerHTML = GameMapUtils.toGridCoordinates(e.latlng, this.options.precision, this._map);
        }
    }
    GameMapUtils.GridMousePosition = GridMousePosition;
    function gridMousePosition(options) {
        return new GameMapUtils.GridMousePosition(options);
    }
    GameMapUtils.gridMousePosition = gridMousePosition;
    ;
    /**
     * Display a bootstrap button on map
     *
     * Author: jetelain
     */
    class OverlayButton extends L.Control {
        constructor(options) {
            super(L.extend({
                position: 'bottomright',
                baseClassName: 'btn',
                className: 'btn-outline-secondary',
                content: ''
            }, options));
            this._previousClass = '';
        }
        onAdd(map) {
            this._previousClass = this.options.className;
            this._container = L.DomUtil.create('button', this.options.baseClassName + ' ' + this.options.className);
            L.DomEvent.disableClickPropagation(this._container);
            this._container.innerHTML = this.options.content;
            return this._container;
        }
        on(type, listener) {
            this._container.addEventListener(type, listener);
            return this;
        }
        onRemove(map) {
        }
        setClass(name) {
            this._container.classList.remove(this._previousClass);
            this._container.classList.add(name);
            this._previousClass = name;
        }
    }
    GameMapUtils.OverlayButton = OverlayButton;
    ;
    function overlayButton(options) {
        return new GameMapUtils.OverlayButton(options);
    }
    GameMapUtils.overlayButton = overlayButton;
    ;
    /**
     * Display an arbitrary div on map
     *
     * Author: jetelain
     */
    class OverlayDiv extends L.Control {
        constructor(options) {
            super(L.extend({
                position: 'bottomright',
                content: ''
            }, options));
        }
        onAdd(map) {
            this._container = L.DomUtil.create('div', '');
            L.DomEvent.disableClickPropagation(this._container);
            let content = this.options.content;
            if (typeof content === 'string') {
                this._container.innerHTML = content;
            }
            else {
                this._container.appendChild(content);
            }
            return this._container;
        }
        onRemove(map) {
        }
    }
    GameMapUtils.OverlayDiv = OverlayDiv;
    function overlayDiv(options) {
        return new GameMapUtils.OverlayDiv(options);
    }
    GameMapUtils.overlayDiv = overlayDiv;
    ;
    class ToggleButtonGroup {
        constructor() {
            this._buttons = new Array();
        }
        add(btn) {
            this._buttons.push(btn);
            if (this._buttons.length == 1) {
                btn._setActive(true);
            }
        }
        remove(btn) {
            const index = this._buttons.indexOf(btn);
            if (index != -1) {
                this._buttons.splice(index, 1);
            }
        }
        setActive(btn) {
            this._buttons.forEach((item) => {
                if (item != btn) {
                    item._setActive(false);
                }
            });
            btn._setActive(true);
        }
        getActive() {
            return this._buttons.find(item => item._isActive);
        }
    }
    GameMapUtils.ToggleButtonGroup = ToggleButtonGroup;
    function toggleButtonGroup() {
        return new GameMapUtils.ToggleButtonGroup();
    }
    GameMapUtils.toggleButtonGroup = toggleButtonGroup;
    ;
    class ToggleButton extends L.Control {
        constructor(options) {
            super(L.extend({
                position: 'topleft',
                baseClassName: 'btn btn-sm',
                offClassName: 'btn-outline-secondary',
                onClassName: 'btn-primary',
                content: ''
            }, options));
        }
        onAdd(map) {
            this._map = map;
            this._container = L.DomUtil.create('button', this.options.baseClassName + ' ' + this.options.offClassName);
            L.DomEvent.disableClickPropagation(this._container);
            this._container.innerHTML = this.options.content;
            L.DomEvent.on(this._container, 'click', this._clickHandler, this);
            if (this.options.group) {
                this.options.group.add(this);
            }
            return this._container;
        }
        onRemove(map) {
            if (this._isActive) {
                this.onDisable(this._map);
            }
            if (this.options.group) {
                this.options.group.remove(this);
            }
        }
        _setActive(_isActive) {
            if (this._isActive == _isActive) {
                return;
            }
            this._isActive = _isActive;
            if (this._isActive) {
                this.onEnable(this._map);
                this._container.classList.remove(this.options.offClassName);
                this._container.classList.add(this.options.onClassName);
            }
            else {
                this.onDisable(this._map);
                this._container.classList.remove(this.options.onClassName);
                this._container.classList.add(this.options.offClassName);
            }
        }
        _clickHandler(e) {
            if (this.options.group) {
                this.options.group.setActive(this);
            }
            else {
                this._setActive(!this._isActive);
            }
        }
    }
    GameMapUtils.ToggleButton = ToggleButton;
    class ButtonGroupBlock extends L.Control {
        constructor(options) {
            super(L.extend({
                position: 'topleft',
                className: 'btn-group-vertical'
            }, options));
            this._buttons = [];
        }
        onAdd(map) {
            this._container = L.DomUtil.create('div', this.options.className);
            L.DomEvent.disableClickPropagation(this._container);
            this._buttons.forEach(btn => this._container.append(btn.onAdd(map)));
            return this._container;
        }
        onRemove(map) {
            this._buttons.forEach(btn => btn.onRemove(map));
        }
        add(...btns) {
            this._buttons.push(...btns);
            if (this._map) {
                btns.forEach(btn => this._container.append(btn.onAdd(this._map)));
            }
            return this;
        }
    }
    GameMapUtils.ButtonGroupBlock = ButtonGroupBlock;
    function buttonGroupBlock(options) {
        return new GameMapUtils.ButtonGroupBlock(options);
    }
    GameMapUtils.buttonGroupBlock = buttonGroupBlock;
    ;
})(GameMapUtils || (GameMapUtils = {}));
;
/// <reference path="../types/leaflet.d.ts" />
/// <reference path="LatLngGraticule.ts" />
/// <reference path="Overlays.ts" /> 
var GameMapUtils;
(function (GameMapUtils) {
    function formatCoordinate(num, precision) {
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
    GameMapUtils.formatCoordinate = formatCoordinate;
    class MapGrid {
        constructor(options) {
            this.options = options;
        }
        toCoordinates(latlng, precision) {
            if (!precision) {
                precision = this.options.defaultPrecision;
            }
            return formatCoordinate(latlng.lng + this.options.originX, precision)
                + " - " + formatCoordinate(latlng.lat + this.options.originY, precision);
        }
    }
    GameMapUtils.MapGrid = MapGrid;
    function toGridCoordinates(latlng, precision, map) {
        if (map.grid) {
            return map.grid.toCoordinates(latlng, precision);
        }
        return formatCoordinate(latlng.lng, precision) + " - " + formatCoordinate(latlng.lat, precision);
    }
    GameMapUtils.toGridCoordinates = toGridCoordinates;
    function computeBearingMils(p1, p2, map) {
        return ((Math.atan2(p2.lng - p1.lng, p2.lat - p1.lat) * 3200 / Math.PI) + 6400) % 6400;
    }
    GameMapUtils.computeBearingMils = computeBearingMils;
    function computeBearingDegrees(p1, p2, map) {
        return ((Math.atan2(p2.lng - p1.lng, p2.lat - p1.lat) * 180 / Math.PI) + 360) % 360;
    }
    GameMapUtils.computeBearingDegrees = computeBearingDegrees;
    function computeAndFormatBearing(p1, p2, map, useMils = false) {
        if (useMils) {
            return computeBearingMils(p1, p2, map).toFixed() + ' mil';
        }
        return computeBearingDegrees(p1, p2, map).toFixed(1) + '°';
    }
    GameMapUtils.computeAndFormatBearing = computeAndFormatBearing;
    function CRS(factorx, factory, tileSize) {
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
                var dx = latlng2.lng - latlng1.lng, dy = latlng2.lat - latlng1.lat;
                return Math.sqrt(dx * dx + dy * dy);
            },
            infinite: true
        });
    }
    GameMapUtils.CRS = CRS;
    function basicInit(mapInfos, mapDivId = 'map') {
        var map = L.map(mapDivId, {
            minZoom: mapInfos.minZoom,
            maxZoom: mapInfos.maxZoom,
            crs: GameMapUtils.CRS(mapInfos.factorX, mapInfos.factorY, mapInfos.tileSize),
            zoomDelta: 0.5,
            zoomSnap: 0.25
        });
        map.grid = new MapGrid({
            sizeInMeters: mapInfos.sizeInMeters || (mapInfos.tileSize / mapInfos.factorX),
            originX: mapInfos.originX || 0,
            originY: mapInfos.originY || 0,
            defaultPrecision: 4
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
    GameMapUtils.basicInit = basicInit;
    async function basicInitFromAPI(gameName, mapName, mapDivId = 'map', apiBasePath = "https://atlas.plan-ops.fr/api/v1/") {
        const response = await fetch(`${apiBasePath}games/${encodeURIComponent(gameName)}/maps/${encodeURIComponent(mapName)}`);
        const map = await response.json();
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
            sizeInMeters: map.sizeInMeters
        }, mapDivId);
    }
    GameMapUtils.basicInitFromAPI = basicInitFromAPI;
})(GameMapUtils || (GameMapUtils = {}));
;
/// <reference path="../types/leaflet.d.ts" />
/// <reference path="GameMapUtils.ts" />
/// <reference path="Overlays.ts" /> 
var GameMapUtils;
(function (GameMapUtils) {
    ;
    /**
     * Base class for interactive Protractor / Coordinate Scale / Ruler
     *
     * Author: jetelain
     */
    class MapToolBase extends L.Layer {
        constructor(latlng, options) {
            super(options);
            this._bearing = 0;
            this._latlng = L.latLng(latlng);
            this._halfWidthInMeters = options.widthInMeters / 2;
            this._halfHeightInMeters = options.heightInMeters / 2;
        }
        initialize(options) {
            L.Util.setOptions(this, options);
        }
        _getTransformation() {
            return this._map.options.crs.transformation;
        }
        _createDragMarkerIcon() {
            const zoom = this._map.getZoom();
            const transformation = this._getTransformation();
            const scale = this._map.options.crs.scale(zoom);
            const w = Math.abs(transformation._a) * scale * this.options.widthInMeters;
            const h = Math.abs(transformation._c) * scale * this.options.heightInMeters;
            return L.icon({
                iconUrl: '/img/transparent.png',
                iconSize: [w, h],
                iconAnchor: [w / 2, h / 2],
                className: this.options.dragMarkerClassName
            });
        }
        _toSvgBounds() {
            return L.latLngBounds(L.latLng(this._latlng.lat - this._halfHeightInMeters, this._latlng.lng - this._halfWidthInMeters), L.latLng(this._latlng.lat + this._halfHeightInMeters, this._latlng.lng + this._halfWidthInMeters));
        }
        _updateMarkersSize() {
            this._dragMarker.setIcon(this._createDragMarkerIcon());
            this._updateRotateMarkerSize();
            this._updateDragMarkerIconTransform();
        }
        _positionChanged() {
            this._latlng = this._dragMarker.getLatLng();
            this._updateRotateMarkerPosition(this._latlng);
            this._svgOverlay.setBounds(this._toSvgBounds());
            this._updateDragMarkerIconTransform();
        }
        _updateRotateMarkerPosition(pos) {
        }
        _updateRotateMarkerSize() {
        }
        _createRotateMarker() {
            return null;
        }
        _updateDragMarkerIconTransform() {
        }
        setLatLng(pos) {
            this._latlng = L.latLng(pos);
            this._dragMarker.setLatLng(this._latlng);
            this._positionChanged();
        }
        getLatLng() {
            return this._dragMarker.getLatLng();
        }
        setBearing(bearing) {
            this._bearing = bearing;
            if (this._svgRootGroup) {
                this._svgRootGroup.setAttribute("transform", "rotate(" + bearing + "," + this.options.rotateCenter + ")");
            }
            if (this._rotateMarker) {
                this._rotateMarker.setLatLng(this._getRotateMarkerPosition());
            }
            this._updateDragMarkerIconTransform();
        }
        getBearing() {
            return this._bearing;
        }
        onAdd(map) {
            this._map = map;
            if (!this._dragMarker) {
                this._svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                this._svgElement.setAttribute('xmlns', "http://www.w3.org/2000/svg");
                this._svgElement.setAttribute('viewBox', this.options.svgViewBox);
                this._svgElement.innerHTML = '<g>' + this.options.svgContent + '</g>';
                this._svgRootGroup = this._svgElement.childNodes[0];
                this._svgOverlay = L.svgOverlay(this._svgElement, this._toSvgBounds());
                this._dragMarker =
                    L.marker(this._latlng, {
                        icon: this._createDragMarkerIcon(),
                        draggable: true,
                        autoPanOnFocus: false
                    })
                        .on('drag', this._positionChanged, this);
                this._rotateMarker = this._createRotateMarker();
            }
            else {
                this._dragMarker.setIcon(this._createDragMarkerIcon());
                this._updateRotateMarkerSize();
            }
            this._svgOverlay.addTo(map);
            this._dragMarker.addTo(map);
            if (this._rotateMarker) {
                this._rotateMarker.addTo(map);
            }
            this._updateDragMarkerIconTransform();
            map.on('zoomend', this._updateMarkersSize, this);
            return this;
        }
        onRemove(map) {
            this._svgOverlay.removeFrom(map);
            this._dragMarker.removeFrom(map);
            if (this._rotateMarker) {
                this._rotateMarker.removeFrom(map);
            }
            map.off('zoomend', this._updateMarkersSize, this);
            return this;
        }
        _getRotateMarkerPosition() {
            return L.latLng(0, 0);
        }
    }
    GameMapUtils.MapToolBase = MapToolBase;
    /**
     * Protractor
     *
     * Author: jetelain
     */
    class Protractor extends GameMapUtils.MapToolBase {
        constructor(latlng) {
            super(latlng, {
                widthInMeters: 1500,
                heightInMeters: 1500,
                dragMarkerClassName: 'map-utils-tools-protractor-drag',
                rotateCenter: '75,75',
                svgViewBox: '0 0 150 150',
                svgContent: '<style>.prtts0{fill: none;stroke: #000000FF;stroke-width: 0.3;}.prtts1{fill: none;stroke: #000000FF;stroke-width: 0.15;}.prtts2{font: 3.75px Arial;fill: #000000FF;dominant-baseline: middle;}.prtts3{font: 7.5px Arial;fill: #FF0000FF;dominant-baseline: middle;font-weight: bold;}.prtts4{font: 7.5px Arial;fill: #FF0000FF;text-anchor: middle;font-weight: bold;}.prtts5{fill: none;stroke: #80808080;stroke-width: 1;}.prtts6{fill: #F1F1F140;stroke: #000000FF;stroke-width: 0.1;}.prtts7{fill: none;stroke: #F1F1F180;filter: blur(1px);stroke-width: 3;}</style><circle cx="75" cy="75" r="74" class="prtts6" /><circle cx="75" cy="75" r="72.5" class="prtts7" /><circle cx="75" cy="75" r="57.5" class="prtts7" /><circle cx="75" cy="75" r="63.875" class="prtts7" /><circle cx="75" cy="75" r="48.875" class="prtts7" /><circle cx="75" cy="75" r="74.5" class="prtts5" /><path class="prtts0" d="M75,16 l0,7.5" /><defs><path id="p0" d="M72,26.6 l6,0" /></defs><text class="prtts2"><textPath href="#p0">000</textPath></text><path class="prtts1" d="M76,16 l0,3.8" /><path class="prtts1" d="M77.1,16 l-0.2,3.8" /><path class="prtts1" d="M78.1,16.1 l-0.2,3.7" /><path class="prtts1" d="M79.1,16.1 l-0.2,3.8" /><path class="prtts1" d="M80.1,16.2 l-0.5,6" /><path class="prtts1" d="M81.2,16.3 l-0.4,3.8" /><path class="prtts1" d="M82.2,16.4 l-0.5,3.8" /><path class="prtts1" d="M83.2,16.6 l-0.5,3.7" /><path class="prtts1" d="M84.2,16.7 l-0.6,3.7" /><path class="prtts0" d="M85.2,16.9 l-1.3,7.4" /><defs><path id="p1" d="M80.5,26.8 l5.8,1" /></defs><text class="prtts2"><textPath href="#p1">010</textPath></text><path class="prtts1" d="M86.3,17.1 l-0.8,3.7" /><path class="prtts1" d="M87.3,17.3 l-0.8,3.7" /><path class="prtts1" d="M88.3,17.5 l-0.9,3.7" /><path class="prtts1" d="M89.3,17.8 l-0.9,3.6" /><path class="prtts1" d="M90.3,18 l-1.6,5.8" /><path class="prtts1" d="M91.3,18.3 l-1.1,3.6" /><path class="prtts1" d="M92.2,18.6 l-1,3.6" /><path class="prtts1" d="M93.2,18.9 l-1.1,3.6" /><path class="prtts1" d="M94.2,19.2 l-1.2,3.6" /><path class="prtts0" d="M95.2,19.6 l-2.6,7" /><defs><path id="p2" d="M88.8,28.5 l5.5,2" /></defs><text class="prtts2"><textPath href="#p2">020</textPath></text><path class="prtts1" d="M96.1,19.9 l-1.3,3.5" /><path class="prtts1" d="M97.1,20.3 l-1.4,3.5" /><path class="prtts1" d="M98.1,20.7 l-1.5,3.4" /><path class="prtts1" d="M99,21.1 l-1.5,3.4" /><path class="prtts1" d="M99.9,21.5 l-2.5,5.5" /><path class="prtts1" d="M100.9,22 l-1.7,3.3" /><path class="prtts1" d="M101.8,22.4 l-1.7,3.4" /><path class="prtts1" d="M102.7,22.9 l-1.8,3.3" /><path class="prtts1" d="M103.6,23.4 l-1.8,3.3" /><path class="prtts0" d="M104.5,23.9 l-3.7,6.5" /><defs><path id="p3" d="M96.6,31.6 l5.2,3" /></defs><text class="prtts2"><textPath href="#p3">030</textPath></text><path class="prtts1" d="M105.4,24.4 l-1.9,3.2" /><path class="prtts1" d="M106.3,25 l-2,3.1" /><path class="prtts1" d="M107.1,25.5 l-2,3.2" /><path class="prtts1" d="M108,26.1 l-2.1,3.1" /><path class="prtts1" d="M108.8,26.7 l-3.4,4.9" /><path class="prtts1" d="M109.7,27.3 l-2.2,3" /><path class="prtts1" d="M110.5,27.9 l-2.2,3" /><path class="prtts1" d="M111.3,28.5 l-2.3,3" /><path class="prtts1" d="M112.1,29.1 l-2.3,3" /><path class="prtts0" d="M112.9,29.8 l-4.8,5.7" /><defs><path id="p4" d="M103.8,36 l4.6,3.8" /></defs><text class="prtts2"><textPath href="#p4">040</textPath></text><path class="prtts1" d="M113.7,30.5 l-2.5,2.8" /><path class="prtts1" d="M114.5,31.2 l-2.5,2.7" /><path class="prtts1" d="M115.2,31.9 l-2.5,2.7" /><path class="prtts1" d="M116,32.6 l-2.6,2.7" /><path class="prtts1" d="M116.7,33.3 l-4.2,4.2" /><path class="prtts1" d="M117.4,34 l-2.7,2.6" /><path class="prtts1" d="M118.1,34.8 l-2.7,2.5" /><path class="prtts1" d="M118.8,35.5 l-2.7,2.5" /><path class="prtts1" d="M119.5,36.3 l-2.8,2.5" /><path class="prtts0" d="M120.2,37.1 l-5.7,4.8" /><defs><path id="p5" d="M110.2,41.6 l3.8,4.6" /></defs><text class="prtts2"><textPath href="#p5">050</textPath></text><path class="prtts1" d="M120.9,37.9 l-3,2.3" /><path class="prtts1" d="M121.5,38.7 l-3,2.3" /><path class="prtts1" d="M122.1,39.5 l-3,2.2" /><path class="prtts1" d="M122.7,40.3 l-3,2.2" /><path class="prtts1" d="M123.3,41.2 l-4.9,3.4" /><path class="prtts1" d="M123.9,42 l-3.1,2.1" /><path class="prtts1" d="M124.5,42.9 l-3.2,2" /><path class="prtts1" d="M125,43.7 l-3.1,2" /><path class="prtts1" d="M125.6,44.6 l-3.2,1.9" /><path class="prtts0" d="M126.1,45.5 l-6.5,3.7" /><defs><path id="p6" d="M115.4,48.2 l3,5.2" /></defs><text class="prtts2"><textPath href="#p6">060</textPath></text><path class="prtts1" d="M126.6,46.4 l-3.3,1.8" /><path class="prtts1" d="M127.1,47.3 l-3.3,1.8" /><path class="prtts1" d="M127.6,48.2 l-3.4,1.7" /><path class="prtts1" d="M128,49.1 l-3.3,1.7" /><path class="prtts1" d="M128.5,50.1 l-5.5,2.5" /><path class="prtts1" d="M128.9,51 l-3.4,1.5" /><path class="prtts1" d="M129.3,51.9 l-3.4,1.5" /><path class="prtts1" d="M129.7,52.9 l-3.5,1.4" /><path class="prtts1" d="M130.1,53.9 l-3.5,1.3" /><path class="prtts0" d="M130.4,54.8 l-7,2.6" /><defs><path id="p7" d="M119.5,55.7 l2,5.5" /></defs><text class="prtts2"><textPath href="#p7">070</textPath></text><path class="prtts1" d="M130.8,55.8 l-3.6,1.2" /><path class="prtts1" d="M131.1,56.8 l-3.6,1.1" /><path class="prtts1" d="M131.4,57.8 l-3.6,1" /><path class="prtts1" d="M131.7,58.7 l-3.6,1.1" /><path class="prtts1" d="M132,59.7 l-5.8,1.6" /><path class="prtts1" d="M132.2,60.7 l-3.6,0.9" /><path class="prtts1" d="M132.5,61.7 l-3.7,0.9" /><path class="prtts1" d="M132.7,62.7 l-3.7,0.8" /><path class="prtts1" d="M132.9,63.7 l-3.7,0.8" /><path class="prtts0" d="M133.1,64.8 l-7.4,1.3" /><defs><path id="p8" d="M122.2,63.7 l1,5.8" /></defs><text class="prtts2"><textPath href="#p8">080</textPath></text><path class="prtts1" d="M133.3,65.8 l-3.7,0.6" /><path class="prtts1" d="M133.4,66.8 l-3.7,0.5" /><path class="prtts1" d="M133.6,67.8 l-3.8,0.5" /><path class="prtts1" d="M133.7,68.8 l-3.8,0.4" /><path class="prtts1" d="M133.8,69.9 l-6,0.5" /><path class="prtts1" d="M133.9,70.9 l-3.8,0.2" /><path class="prtts1" d="M133.9,71.9 l-3.7,0.2" /><path class="prtts1" d="M134,72.9 l-3.8,0.2" /><path class="prtts1" d="M134,74 l-3.8,0" /><path class="prtts0" d="M134,75 l-7.5,0" /><defs><path id="p9" d="M123.4,72 l0,6" /></defs><text class="prtts2"><textPath href="#p9">090</textPath></text><path class="prtts1" d="M134,76 l-3.8,0" /><path class="prtts1" d="M134,77.1 l-3.8,-0.2" /><path class="prtts1" d="M133.9,78.1 l-3.7,-0.2" /><path class="prtts1" d="M133.9,79.1 l-3.8,-0.2" /><path class="prtts1" d="M133.8,80.1 l-6,-0.5" /><path class="prtts1" d="M133.7,81.2 l-3.8,-0.4" /><path class="prtts1" d="M133.6,82.2 l-3.8,-0.5" /><path class="prtts1" d="M133.4,83.2 l-3.7,-0.5" /><path class="prtts1" d="M133.3,84.2 l-3.7,-0.6" /><path class="prtts0" d="M133.1,85.2 l-7.4,-1.3" /><defs><path id="p10" d="M123.2,80.5 l-1,5.8" /></defs><text class="prtts2"><textPath href="#p10">100</textPath></text><path class="prtts1" d="M132.9,86.3 l-3.7,-0.8" /><path class="prtts1" d="M132.7,87.3 l-3.7,-0.8" /><path class="prtts1" d="M132.5,88.3 l-3.7,-0.9" /><path class="prtts1" d="M132.2,89.3 l-3.6,-0.9" /><path class="prtts1" d="M132,90.3 l-5.8,-1.6" /><path class="prtts1" d="M131.7,91.3 l-3.6,-1.1" /><path class="prtts1" d="M131.4,92.2 l-3.6,-1" /><path class="prtts1" d="M131.1,93.2 l-3.6,-1.1" /><path class="prtts1" d="M130.8,94.2 l-3.6,-1.2" /><path class="prtts0" d="M130.4,95.2 l-7,-2.6" /><defs><path id="p11" d="M121.5,88.8 l-2,5.5" /></defs><text class="prtts2"><textPath href="#p11">110</textPath></text><path class="prtts1" d="M130.1,96.1 l-3.5,-1.3" /><path class="prtts1" d="M129.7,97.1 l-3.5,-1.4" /><path class="prtts1" d="M129.3,98.1 l-3.4,-1.5" /><path class="prtts1" d="M128.9,99 l-3.4,-1.5" /><path class="prtts1" d="M128.5,99.9 l-5.5,-2.5" /><path class="prtts1" d="M128,100.9 l-3.3,-1.7" /><path class="prtts1" d="M127.6,101.8 l-3.4,-1.7" /><path class="prtts1" d="M127.1,102.7 l-3.3,-1.8" /><path class="prtts1" d="M126.6,103.6 l-3.3,-1.8" /><path class="prtts0" d="M126.1,104.5 l-6.5,-3.7" /><defs><path id="p12" d="M118.4,96.6 l-3,5.2" /></defs><text class="prtts2"><textPath href="#p12">120</textPath></text><path class="prtts1" d="M125.6,105.4 l-3.2,-1.9" /><path class="prtts1" d="M125,106.3 l-3.1,-2" /><path class="prtts1" d="M124.5,107.1 l-3.2,-2" /><path class="prtts1" d="M123.9,108 l-3.1,-2.1" /><path class="prtts1" d="M123.3,108.8 l-4.9,-3.4" /><path class="prtts1" d="M122.7,109.7 l-3,-2.2" /><path class="prtts1" d="M122.1,110.5 l-3,-2.2" /><path class="prtts1" d="M121.5,111.3 l-3,-2.3" /><path class="prtts1" d="M120.9,112.1 l-3,-2.3" /><path class="prtts0" d="M120.2,112.9 l-5.7,-4.8" /><defs><path id="p13" d="M114,103.8 l-3.8,4.6" /></defs><text class="prtts2"><textPath href="#p13">130</textPath></text><path class="prtts1" d="M119.5,113.7 l-2.8,-2.5" /><path class="prtts1" d="M118.8,114.5 l-2.7,-2.5" /><path class="prtts1" d="M118.1,115.2 l-2.7,-2.5" /><path class="prtts1" d="M117.4,116 l-2.7,-2.6" /><path class="prtts1" d="M116.7,116.7 l-4.2,-4.2" /><path class="prtts1" d="M116,117.4 l-2.6,-2.7" /><path class="prtts1" d="M115.2,118.1 l-2.5,-2.7" /><path class="prtts1" d="M114.5,118.8 l-2.5,-2.7" /><path class="prtts1" d="M113.7,119.5 l-2.5,-2.8" /><path class="prtts0" d="M112.9,120.2 l-4.8,-5.7" /><defs><path id="p14" d="M108.4,110.2 l-4.6,3.8" /></defs><text class="prtts2"><textPath href="#p14">140</textPath></text><path class="prtts1" d="M112.1,120.9 l-2.3,-3" /><path class="prtts1" d="M111.3,121.5 l-2.3,-3" /><path class="prtts1" d="M110.5,122.1 l-2.2,-3" /><path class="prtts1" d="M109.7,122.7 l-2.2,-3" /><path class="prtts1" d="M108.8,123.3 l-3.4,-4.9" /><path class="prtts1" d="M108,123.9 l-2.1,-3.1" /><path class="prtts1" d="M107.1,124.5 l-2,-3.2" /><path class="prtts1" d="M106.3,125 l-2,-3.1" /><path class="prtts1" d="M105.4,125.6 l-1.9,-3.2" /><path class="prtts0" d="M104.5,126.1 l-3.7,-6.5" /><defs><path id="p15" d="M101.8,115.4 l-5.2,3" /></defs><text class="prtts2"><textPath href="#p15">150</textPath></text><path class="prtts1" d="M103.6,126.6 l-1.8,-3.3" /><path class="prtts1" d="M102.7,127.1 l-1.8,-3.3" /><path class="prtts1" d="M101.8,127.6 l-1.7,-3.4" /><path class="prtts1" d="M100.9,128 l-1.7,-3.3" /><path class="prtts1" d="M99.9,128.5 l-2.5,-5.5" /><path class="prtts1" d="M99,128.9 l-1.5,-3.4" /><path class="prtts1" d="M98.1,129.3 l-1.5,-3.4" /><path class="prtts1" d="M97.1,129.7 l-1.4,-3.5" /><path class="prtts1" d="M96.1,130.1 l-1.3,-3.5" /><path class="prtts0" d="M95.2,130.4 l-2.6,-7" /><defs><path id="p16" d="M94.3,119.5 l-5.5,2" /></defs><text class="prtts2"><textPath href="#p16">160</textPath></text><path class="prtts1" d="M94.2,130.8 l-1.2,-3.6" /><path class="prtts1" d="M93.2,131.1 l-1.1,-3.6" /><path class="prtts1" d="M92.2,131.4 l-1,-3.6" /><path class="prtts1" d="M91.3,131.7 l-1.1,-3.6" /><path class="prtts1" d="M90.3,132 l-1.6,-5.8" /><path class="prtts1" d="M89.3,132.2 l-0.9,-3.6" /><path class="prtts1" d="M88.3,132.5 l-0.9,-3.7" /><path class="prtts1" d="M87.3,132.7 l-0.8,-3.7" /><path class="prtts1" d="M86.3,132.9 l-0.8,-3.7" /><path class="prtts0" d="M85.2,133.1 l-1.3,-7.4" /><defs><path id="p17" d="M86.3,122.2 l-5.8,1" /></defs><text class="prtts2"><textPath href="#p17">170</textPath></text><path class="prtts1" d="M84.2,133.3 l-0.6,-3.7" /><path class="prtts1" d="M83.2,133.4 l-0.5,-3.7" /><path class="prtts1" d="M82.2,133.6 l-0.5,-3.8" /><path class="prtts1" d="M81.2,133.7 l-0.4,-3.8" /><path class="prtts1" d="M80.1,133.8 l-0.5,-6" /><path class="prtts1" d="M79.1,133.9 l-0.2,-3.8" /><path class="prtts1" d="M78.1,133.9 l-0.2,-3.7" /><path class="prtts1" d="M77.1,134 l-0.2,-3.8" /><path class="prtts1" d="M76,134 l0,-3.8" /><path class="prtts0" d="M75,134 l0,-7.5" /><defs><path id="p18" d="M78,123.4 l-6,0" /></defs><text class="prtts2"><textPath href="#p18">180</textPath></text><path class="prtts1" d="M74,134 l0,-3.8" /><path class="prtts1" d="M72.9,134 l0.2,-3.8" /><path class="prtts1" d="M71.9,133.9 l0.2,-3.7" /><path class="prtts1" d="M70.9,133.9 l0.2,-3.8" /><path class="prtts1" d="M69.9,133.8 l0.5,-6" /><path class="prtts1" d="M68.8,133.7 l0.4,-3.8" /><path class="prtts1" d="M67.8,133.6 l0.5,-3.8" /><path class="prtts1" d="M66.8,133.4 l0.5,-3.7" /><path class="prtts1" d="M65.8,133.3 l0.6,-3.7" /><path class="prtts0" d="M64.8,133.1 l1.3,-7.4" /><defs><path id="p19" d="M69.5,123.2 l-5.8,-1" /></defs><text class="prtts2"><textPath href="#p19">190</textPath></text><path class="prtts1" d="M63.7,132.9 l0.8,-3.7" /><path class="prtts1" d="M62.7,132.7 l0.8,-3.7" /><path class="prtts1" d="M61.7,132.5 l0.9,-3.7" /><path class="prtts1" d="M60.7,132.2 l0.9,-3.6" /><path class="prtts1" d="M59.7,132 l1.6,-5.8" /><path class="prtts1" d="M58.7,131.7 l1.1,-3.6" /><path class="prtts1" d="M57.8,131.4 l1,-3.6" /><path class="prtts1" d="M56.8,131.1 l1.1,-3.6" /><path class="prtts1" d="M55.8,130.8 l1.2,-3.6" /><path class="prtts0" d="M54.8,130.4 l2.6,-7" /><defs><path id="p20" d="M61.2,121.5 l-5.5,-2" /></defs><text class="prtts2"><textPath href="#p20">200</textPath></text><path class="prtts1" d="M53.9,130.1 l1.3,-3.5" /><path class="prtts1" d="M52.9,129.7 l1.4,-3.5" /><path class="prtts1" d="M51.9,129.3 l1.5,-3.4" /><path class="prtts1" d="M51,128.9 l1.5,-3.4" /><path class="prtts1" d="M50.1,128.5 l2.5,-5.5" /><path class="prtts1" d="M49.1,128 l1.7,-3.3" /><path class="prtts1" d="M48.2,127.6 l1.7,-3.4" /><path class="prtts1" d="M47.3,127.1 l1.8,-3.3" /><path class="prtts1" d="M46.4,126.6 l1.8,-3.3" /><path class="prtts0" d="M45.5,126.1 l3.7,-6.5" /><defs><path id="p21" d="M53.4,118.4 l-5.2,-3" /></defs><text class="prtts2"><textPath href="#p21">210</textPath></text><path class="prtts1" d="M44.6,125.6 l1.9,-3.2" /><path class="prtts1" d="M43.7,125 l2,-3.1" /><path class="prtts1" d="M42.9,124.5 l2,-3.2" /><path class="prtts1" d="M42,123.9 l2.1,-3.1" /><path class="prtts1" d="M41.2,123.3 l3.4,-4.9" /><path class="prtts1" d="M40.3,122.7 l2.2,-3" /><path class="prtts1" d="M39.5,122.1 l2.2,-3" /><path class="prtts1" d="M38.7,121.5 l2.3,-3" /><path class="prtts1" d="M37.9,120.9 l2.3,-3" /><path class="prtts0" d="M37.1,120.2 l4.8,-5.7" /><defs><path id="p22" d="M46.2,114 l-4.6,-3.8" /></defs><text class="prtts2"><textPath href="#p22">220</textPath></text><path class="prtts1" d="M36.3,119.5 l2.5,-2.8" /><path class="prtts1" d="M35.5,118.8 l2.5,-2.7" /><path class="prtts1" d="M34.8,118.1 l2.5,-2.7" /><path class="prtts1" d="M34,117.4 l2.6,-2.7" /><path class="prtts1" d="M33.3,116.7 l4.2,-4.2" /><path class="prtts1" d="M32.6,116 l2.7,-2.6" /><path class="prtts1" d="M31.9,115.2 l2.7,-2.5" /><path class="prtts1" d="M31.2,114.5 l2.7,-2.5" /><path class="prtts1" d="M30.5,113.7 l2.8,-2.5" /><path class="prtts0" d="M29.8,112.9 l5.7,-4.8" /><defs><path id="p23" d="M39.8,108.4 l-3.8,-4.6" /></defs><text class="prtts2"><textPath href="#p23">230</textPath></text><path class="prtts1" d="M29.1,112.1 l3,-2.3" /><path class="prtts1" d="M28.5,111.3 l3,-2.3" /><path class="prtts1" d="M27.9,110.5 l3,-2.2" /><path class="prtts1" d="M27.3,109.7 l3,-2.2" /><path class="prtts1" d="M26.7,108.8 l4.9,-3.4" /><path class="prtts1" d="M26.1,108 l3.1,-2.1" /><path class="prtts1" d="M25.5,107.1 l3.2,-2" /><path class="prtts1" d="M25,106.3 l3.1,-2" /><path class="prtts1" d="M24.4,105.4 l3.2,-1.9" /><path class="prtts0" d="M23.9,104.5 l6.5,-3.7" /><defs><path id="p24" d="M34.6,101.8 l-3,-5.2" /></defs><text class="prtts2"><textPath href="#p24">240</textPath></text><path class="prtts1" d="M23.4,103.6 l3.3,-1.8" /><path class="prtts1" d="M22.9,102.7 l3.3,-1.8" /><path class="prtts1" d="M22.4,101.8 l3.4,-1.7" /><path class="prtts1" d="M22,100.9 l3.3,-1.7" /><path class="prtts1" d="M21.5,99.9 l5.5,-2.5" /><path class="prtts1" d="M21.1,99 l3.4,-1.5" /><path class="prtts1" d="M20.7,98.1 l3.4,-1.5" /><path class="prtts1" d="M20.3,97.1 l3.5,-1.4" /><path class="prtts1" d="M19.9,96.1 l3.5,-1.3" /><path class="prtts0" d="M19.6,95.2 l7,-2.6" /><defs><path id="p25" d="M30.5,94.3 l-2,-5.5" /></defs><text class="prtts2"><textPath href="#p25">250</textPath></text><path class="prtts1" d="M19.2,94.2 l3.6,-1.2" /><path class="prtts1" d="M18.9,93.2 l3.6,-1.1" /><path class="prtts1" d="M18.6,92.2 l3.6,-1" /><path class="prtts1" d="M18.3,91.3 l3.6,-1.1" /><path class="prtts1" d="M18,90.3 l5.8,-1.6" /><path class="prtts1" d="M17.8,89.3 l3.6,-0.9" /><path class="prtts1" d="M17.5,88.3 l3.7,-0.9" /><path class="prtts1" d="M17.3,87.3 l3.7,-0.8" /><path class="prtts1" d="M17.1,86.3 l3.7,-0.8" /><path class="prtts0" d="M16.9,85.2 l7.4,-1.3" /><defs><path id="p26" d="M27.8,86.3 l-1,-5.8" /></defs><text class="prtts2"><textPath href="#p26">260</textPath></text><path class="prtts1" d="M16.7,84.2 l3.7,-0.6" /><path class="prtts1" d="M16.6,83.2 l3.7,-0.5" /><path class="prtts1" d="M16.4,82.2 l3.8,-0.5" /><path class="prtts1" d="M16.3,81.2 l3.8,-0.4" /><path class="prtts1" d="M16.2,80.1 l6,-0.5" /><path class="prtts1" d="M16.1,79.1 l3.8,-0.2" /><path class="prtts1" d="M16.1,78.1 l3.7,-0.2" /><path class="prtts1" d="M16,77.1 l3.8,-0.2" /><path class="prtts1" d="M16,76 l3.8,0" /><path class="prtts0" d="M16,75 l7.5,0" /><defs><path id="p27" d="M26.6,78 l0,-6" /></defs><text class="prtts2"><textPath href="#p27">270</textPath></text><path class="prtts1" d="M16,74 l3.8,0" /><path class="prtts1" d="M16,72.9 l3.8,0.2" /><path class="prtts1" d="M16.1,71.9 l3.7,0.2" /><path class="prtts1" d="M16.1,70.9 l3.8,0.2" /><path class="prtts1" d="M16.2,69.9 l6,0.5" /><path class="prtts1" d="M16.3,68.8 l3.8,0.4" /><path class="prtts1" d="M16.4,67.8 l3.8,0.5" /><path class="prtts1" d="M16.6,66.8 l3.7,0.5" /><path class="prtts1" d="M16.7,65.8 l3.7,0.6" /><path class="prtts0" d="M16.9,64.8 l7.4,1.3" /><defs><path id="p28" d="M26.8,69.5 l1,-5.8" /></defs><text class="prtts2"><textPath href="#p28">280</textPath></text><path class="prtts1" d="M17.1,63.7 l3.7,0.8" /><path class="prtts1" d="M17.3,62.7 l3.7,0.8" /><path class="prtts1" d="M17.5,61.7 l3.7,0.9" /><path class="prtts1" d="M17.8,60.7 l3.6,0.9" /><path class="prtts1" d="M18,59.7 l5.8,1.6" /><path class="prtts1" d="M18.3,58.7 l3.6,1.1" /><path class="prtts1" d="M18.6,57.8 l3.6,1" /><path class="prtts1" d="M18.9,56.8 l3.6,1.1" /><path class="prtts1" d="M19.2,55.8 l3.6,1.2" /><path class="prtts0" d="M19.6,54.8 l7,2.6" /><defs><path id="p29" d="M28.5,61.2 l2,-5.5" /></defs><text class="prtts2"><textPath href="#p29">290</textPath></text><path class="prtts1" d="M19.9,53.9 l3.5,1.3" /><path class="prtts1" d="M20.3,52.9 l3.5,1.4" /><path class="prtts1" d="M20.7,51.9 l3.4,1.5" /><path class="prtts1" d="M21.1,51 l3.4,1.5" /><path class="prtts1" d="M21.5,50.1 l5.5,2.5" /><path class="prtts1" d="M22,49.1 l3.3,1.7" /><path class="prtts1" d="M22.4,48.2 l3.4,1.7" /><path class="prtts1" d="M22.9,47.3 l3.3,1.8" /><path class="prtts1" d="M23.4,46.4 l3.3,1.8" /><path class="prtts0" d="M23.9,45.5 l6.5,3.7" /><defs><path id="p30" d="M31.6,53.4 l3,-5.2" /></defs><text class="prtts2"><textPath href="#p30">300</textPath></text><path class="prtts1" d="M24.4,44.6 l3.2,1.9" /><path class="prtts1" d="M25,43.7 l3.1,2" /><path class="prtts1" d="M25.5,42.9 l3.2,2" /><path class="prtts1" d="M26.1,42 l3.1,2.1" /><path class="prtts1" d="M26.7,41.2 l4.9,3.4" /><path class="prtts1" d="M27.3,40.3 l3,2.2" /><path class="prtts1" d="M27.9,39.5 l3,2.2" /><path class="prtts1" d="M28.5,38.7 l3,2.3" /><path class="prtts1" d="M29.1,37.9 l3,2.3" /><path class="prtts0" d="M29.8,37.1 l5.7,4.8" /><defs><path id="p31" d="M36,46.2 l3.8,-4.6" /></defs><text class="prtts2"><textPath href="#p31">310</textPath></text><path class="prtts1" d="M30.5,36.3 l2.8,2.5" /><path class="prtts1" d="M31.2,35.5 l2.7,2.5" /><path class="prtts1" d="M31.9,34.8 l2.7,2.5" /><path class="prtts1" d="M32.6,34 l2.7,2.6" /><path class="prtts1" d="M33.3,33.3 l4.2,4.2" /><path class="prtts1" d="M34,32.6 l2.6,2.7" /><path class="prtts1" d="M34.8,31.9 l2.5,2.7" /><path class="prtts1" d="M35.5,31.2 l2.5,2.7" /><path class="prtts1" d="M36.3,30.5 l2.5,2.8" /><path class="prtts0" d="M37.1,29.8 l4.8,5.7" /><defs><path id="p32" d="M41.6,39.8 l4.6,-3.8" /></defs><text class="prtts2"><textPath href="#p32">320</textPath></text><path class="prtts1" d="M37.9,29.1 l2.3,3" /><path class="prtts1" d="M38.7,28.5 l2.3,3" /><path class="prtts1" d="M39.5,27.9 l2.2,3" /><path class="prtts1" d="M40.3,27.3 l2.2,3" /><path class="prtts1" d="M41.2,26.7 l3.4,4.9" /><path class="prtts1" d="M42,26.1 l2.1,3.1" /><path class="prtts1" d="M42.9,25.5 l2,3.2" /><path class="prtts1" d="M43.7,25 l2,3.1" /><path class="prtts1" d="M44.6,24.4 l1.9,3.2" /><path class="prtts0" d="M45.5,23.9 l3.7,6.5" /><defs><path id="p33" d="M48.2,34.6 l5.2,-3" /></defs><text class="prtts2"><textPath href="#p33">330</textPath></text><path class="prtts1" d="M46.4,23.4 l1.8,3.3" /><path class="prtts1" d="M47.3,22.9 l1.8,3.3" /><path class="prtts1" d="M48.2,22.4 l1.7,3.4" /><path class="prtts1" d="M49.1,22 l1.7,3.3" /><path class="prtts1" d="M50.1,21.5 l2.5,5.5" /><path class="prtts1" d="M51,21.1 l1.5,3.4" /><path class="prtts1" d="M51.9,20.7 l1.5,3.4" /><path class="prtts1" d="M52.9,20.3 l1.4,3.5" /><path class="prtts1" d="M53.9,19.9 l1.3,3.5" /><path class="prtts0" d="M54.8,19.6 l2.6,7" /><defs><path id="p34" d="M55.7,30.5 l5.5,-2" /></defs><text class="prtts2"><textPath href="#p34">340</textPath></text><path class="prtts1" d="M55.8,19.2 l1.2,3.6" /><path class="prtts1" d="M56.8,18.9 l1.1,3.6" /><path class="prtts1" d="M57.8,18.6 l1,3.6" /><path class="prtts1" d="M58.7,18.3 l1.1,3.6" /><path class="prtts1" d="M59.7,18 l1.6,5.8" /><path class="prtts1" d="M60.7,17.8 l0.9,3.6" /><path class="prtts1" d="M61.7,17.5 l0.9,3.7" /><path class="prtts1" d="M62.7,17.3 l0.8,3.7" /><path class="prtts1" d="M63.7,17.1 l0.8,3.7" /><path class="prtts0" d="M64.8,16.9 l1.3,7.4" /><defs><path id="p35" d="M63.7,27.8 l5.8,-1" /></defs><text class="prtts2"><textPath href="#p35">350</textPath></text><path class="prtts1" d="M65.8,16.7 l0.6,3.7" /><path class="prtts1" d="M66.8,16.6 l0.5,3.7" /><path class="prtts1" d="M67.8,16.4 l0.5,3.8" /><path class="prtts1" d="M68.8,16.3 l0.4,3.8" /><path class="prtts1" d="M69.9,16.2 l0.5,6" /><path class="prtts1" d="M70.9,16.1 l0.2,3.8" /><path class="prtts1" d="M71.9,16.1 l0.2,3.7" /><path class="prtts1" d="M72.9,16 l0.2,3.8" /><path class="prtts1" d="M74,16 l0,3.8" /><path class="prtts0" d="M75,1 l0,7" /><defs><path id="p36" d="M73.1,11.5 l3.8,0" /></defs><text class="prtts2"><textPath href="#p36">00</textPath></text><path class="prtts1" d="M75.7,1 l0,1.9" /><path class="prtts1" d="M76.5,1 l-0.1,3.8" /><path class="prtts1" d="M77.2,1 l-0.1,1.9" /><path class="prtts1" d="M77.9,1.1 l-0.1,3.7" /><path class="prtts1" d="M78.6,1.1 l-0.1,1.9" /><path class="prtts1" d="M79.4,1.1 l-0.3,3.8" /><path class="prtts1" d="M80.1,1.2 l-0.1,1.8" /><path class="prtts1" d="M80.8,1.2 l-0.3,3.8" /><path class="prtts1" d="M81.5,1.3 l-0.1,1.9" /><path class="prtts0" d="M82.3,1.4 l-0.7,6.9" /><defs><path id="p37" d="M79.4,11.6 l3.7,0.4" /></defs><text class="prtts2"><textPath href="#p37">01</textPath></text><path class="prtts1" d="M83,1.4 l-0.2,1.9" /><path class="prtts1" d="M83.7,1.5 l-0.4,3.7" /><path class="prtts1" d="M84.4,1.6 l-0.2,1.9" /><path class="prtts1" d="M85.1,1.7 l-0.5,3.7" /><path class="prtts1" d="M85.9,1.8 l-0.3,1.9" /><path class="prtts1" d="M86.6,1.9 l-0.6,3.7" /><path class="prtts1" d="M87.3,2 l-0.3,1.9" /><path class="prtts1" d="M88,2.2 l-0.7,3.6" /><path class="prtts1" d="M88.7,2.3 l-0.3,1.8" /><path class="prtts0" d="M89.4,2.4 l-1.3,6.9" /><defs><path id="p38" d="M85.5,12.4 l3.7,0.7" /></defs><text class="prtts2"><textPath href="#p38">02</textPath></text><path class="prtts1" d="M90.1,2.6 l-0.3,1.8" /><path class="prtts1" d="M90.9,2.7 l-0.8,3.7" /><path class="prtts1" d="M91.6,2.9 l-0.5,1.8" /><path class="prtts1" d="M92.3,3 l-0.9,3.7" /><path class="prtts1" d="M93,3.2 l-0.5,1.8" /><path class="prtts1" d="M93.7,3.4 l-1,3.6" /><path class="prtts1" d="M94.4,3.6 l-0.5,1.8" /><path class="prtts1" d="M95.1,3.8 l-1,3.6" /><path class="prtts1" d="M95.8,4 l-0.5,1.8" /><path class="prtts0" d="M96.5,4.2 l-2.1,6.7" /><defs><path id="p39" d="M91.6,13.7 l3.6,1.1" /></defs><text class="prtts2"><textPath href="#p39">03</textPath></text><path class="prtts1" d="M97.2,4.4 l-0.6,1.8" /><path class="prtts1" d="M97.9,4.6 l-1.2,3.6" /><path class="prtts1" d="M98.6,4.8 l-0.6,1.8" /><path class="prtts1" d="M99.2,5.1 l-1.2,3.5" /><path class="prtts1" d="M99.9,5.3 l-0.6,1.8" /><path class="prtts1" d="M100.6,5.6 l-1.3,3.5" /><path class="prtts1" d="M101.3,5.8 l-0.7,1.8" /><path class="prtts1" d="M102,6.1 l-1.4,3.5" /><path class="prtts1" d="M102.6,6.4 l-0.7,1.7" /><path class="prtts0" d="M103.3,6.6 l-2.7,6.5" /><defs><path id="p40" d="M97.6,15.6 l3.4,1.5" /></defs><text class="prtts2"><textPath href="#p40">04</textPath></text><path class="prtts1" d="M104,6.9 l-0.7,1.7" /><path class="prtts1" d="M104.7,7.2 l-1.5,3.4" /><path class="prtts1" d="M105.3,7.5 l-0.7,1.7" /><path class="prtts1" d="M106,7.8 l-1.6,3.4" /><path class="prtts1" d="M106.6,8.1 l-0.8,1.7" /><path class="prtts1" d="M107.3,8.4 l-1.6,3.4" /><path class="prtts1" d="M107.9,8.7 l-0.8,1.7" /><path class="prtts1" d="M108.6,9.1 l-1.7,3.3" /><path class="prtts1" d="M109.2,9.4 l-0.8,1.7" /><path class="prtts0" d="M109.9,9.7 l-3.3,6.2" /><defs><path id="p41" d="M103.3,18.1 l3.3,1.8" /></defs><text class="prtts2"><textPath href="#p41">05</textPath></text><path class="prtts1" d="M110.5,10.1 l-0.9,1.6" /><path class="prtts1" d="M111.2,10.4 l-1.9,3.3" /><path class="prtts1" d="M111.8,10.8 l-0.9,1.6" /><path class="prtts1" d="M112.4,11.2 l-1.9,3.2" /><path class="prtts1" d="M113,11.5 l-0.9,1.6" /><path class="prtts1" d="M113.7,11.9 l-2,3.2" /><path class="prtts1" d="M114.3,12.3 l-1,1.6" /><path class="prtts1" d="M114.9,12.7 l-2,3.1" /><path class="prtts1" d="M115.5,13.1 l-1,1.5" /><path class="prtts0" d="M116.1,13.5 l-3.9,5.8" /><defs><path id="p42" d="M108.7,21.2 l3.1,2.1" /></defs><text class="prtts2"><textPath href="#p42">06</textPath></text><path class="prtts1" d="M116.7,13.9 l-1,1.5" /><path class="prtts1" d="M117.3,14.3 l-2.1,3.1" /><path class="prtts1" d="M117.9,14.7 l-1.1,1.5" /><path class="prtts1" d="M118.5,15.1 l-2.2,3.1" /><path class="prtts1" d="M119.1,15.6 l-1.1,1.5" /><path class="prtts1" d="M119.7,16 l-2.3,3" /><path class="prtts1" d="M120.2,16.4 l-1.1,1.5" /><path class="prtts1" d="M120.8,16.9 l-2.3,2.9" /><path class="prtts1" d="M121.4,17.3 l-1.2,1.5" /><path class="prtts0" d="M121.9,17.8 l-4.4,5.4" /><defs><path id="p43" d="M113.8,24.7 l2.9,2.4" /></defs><text class="prtts2"><textPath href="#p43">07</textPath></text><path class="prtts1" d="M122.5,18.3 l-1.2,1.4" /><path class="prtts1" d="M123.1,18.7 l-2.5,2.9" /><path class="prtts1" d="M123.6,19.2 l-1.2,1.4" /><path class="prtts1" d="M124.2,19.7 l-2.5,2.8" /><path class="prtts1" d="M124.7,20.2 l-1.3,1.4" /><path class="prtts1" d="M125.2,20.7 l-2.5,2.7" /><path class="prtts1" d="M125.8,21.2 l-1.3,1.3" /><path class="prtts1" d="M126.3,21.7 l-2.6,2.7" /><path class="prtts1" d="M126.8,22.2 l-1.3,1.3" /><path class="prtts0" d="M127.3,22.7 l-4.9,4.9" /><defs><path id="p44" d="M118.6,28.8 l2.6,2.6" /></defs><text class="prtts2"><textPath href="#p44">08</textPath></text><path class="prtts1" d="M127.8,23.2 l-1.3,1.3" /><path class="prtts1" d="M128.3,23.7 l-2.7,2.6" /><path class="prtts1" d="M128.8,24.2 l-1.3,1.3" /><path class="prtts1" d="M129.3,24.8 l-2.7,2.5" /><path class="prtts1" d="M129.8,25.3 l-1.4,1.3" /><path class="prtts1" d="M130.3,25.8 l-2.8,2.5" /><path class="prtts1" d="M130.8,26.4 l-1.4,1.2" /><path class="prtts1" d="M131.3,26.9 l-2.9,2.5" /><path class="prtts1" d="M131.7,27.5 l-1.4,1.2" /><path class="prtts0" d="M132.2,28.1 l-5.4,4.4" /><defs><path id="p45" d="M122.9,33.3 l2.4,2.9" /></defs><text class="prtts2"><textPath href="#p45">09</textPath></text><path class="prtts1" d="M132.7,28.6 l-1.5,1.2" /><path class="prtts1" d="M133.1,29.2 l-2.9,2.3" /><path class="prtts1" d="M133.6,29.8 l-1.5,1.1" /><path class="prtts1" d="M134,30.3 l-3,2.3" /><path class="prtts1" d="M134.4,30.9 l-1.5,1.1" /><path class="prtts1" d="M134.9,31.5 l-3.1,2.2" /><path class="prtts1" d="M135.3,32.1 l-1.5,1.1" /><path class="prtts1" d="M135.7,32.7 l-3.1,2.1" /><path class="prtts1" d="M136.1,33.3 l-1.5,1" /><path class="prtts0" d="M136.5,33.9 l-5.8,3.9" /><defs><path id="p46" d="M126.7,38.2 l2.1,3.1" /></defs><text class="prtts2"><textPath href="#p46">10</textPath></text><path class="prtts1" d="M136.9,34.5 l-1.5,1" /><path class="prtts1" d="M137.3,35.1 l-3.1,2" /><path class="prtts1" d="M137.7,35.7 l-1.6,1" /><path class="prtts1" d="M138.1,36.3 l-3.2,2" /><path class="prtts1" d="M138.5,37 l-1.6,0.9" /><path class="prtts1" d="M138.8,37.6 l-3.2,1.9" /><path class="prtts1" d="M139.2,38.2 l-1.6,0.9" /><path class="prtts1" d="M139.6,38.8 l-3.3,1.9" /><path class="prtts1" d="M139.9,39.5 l-1.6,0.9" /><path class="prtts0" d="M140.3,40.1 l-6.2,3.3" /><defs><path id="p47" d="M130.1,43.4 l1.8,3.3" /></defs><text class="prtts2"><textPath href="#p47">11</textPath></text><path class="prtts1" d="M140.6,40.8 l-1.7,0.8" /><path class="prtts1" d="M140.9,41.4 l-3.3,1.7" /><path class="prtts1" d="M141.3,42.1 l-1.7,0.8" /><path class="prtts1" d="M141.6,42.7 l-3.4,1.6" /><path class="prtts1" d="M141.9,43.4 l-1.7,0.8" /><path class="prtts1" d="M142.2,44 l-3.4,1.6" /><path class="prtts1" d="M142.5,44.7 l-1.7,0.7" /><path class="prtts1" d="M142.8,45.3 l-3.4,1.5" /><path class="prtts1" d="M143.1,46 l-1.7,0.7" /><path class="prtts0" d="M143.4,46.7 l-6.5,2.7" /><defs><path id="p48" d="M132.9,49 l1.5,3.4" /></defs><text class="prtts2"><textPath href="#p48">12</textPath></text><path class="prtts1" d="M143.6,47.4 l-1.7,0.7" /><path class="prtts1" d="M143.9,48 l-3.5,1.4" /><path class="prtts1" d="M144.2,48.7 l-1.8,0.7" /><path class="prtts1" d="M144.4,49.4 l-3.5,1.3" /><path class="prtts1" d="M144.7,50.1 l-1.8,0.6" /><path class="prtts1" d="M144.9,50.8 l-3.5,1.2" /><path class="prtts1" d="M145.2,51.4 l-1.8,0.6" /><path class="prtts1" d="M145.4,52.1 l-3.6,1.2" /><path class="prtts1" d="M145.6,52.8 l-1.8,0.6" /><path class="prtts0" d="M145.8,53.5 l-6.7,2.1" /><defs><path id="p49" d="M135.2,54.8 l1.1,3.6" /></defs><text class="prtts2"><textPath href="#p49">13</textPath></text><path class="prtts1" d="M146,54.2 l-1.8,0.5" /><path class="prtts1" d="M146.2,54.9 l-3.6,1" /><path class="prtts1" d="M146.4,55.6 l-1.8,0.5" /><path class="prtts1" d="M146.6,56.3 l-3.6,1" /><path class="prtts1" d="M146.8,57 l-1.8,0.5" /><path class="prtts1" d="M147,57.7 l-3.7,0.9" /><path class="prtts1" d="M147.1,58.4 l-1.8,0.5" /><path class="prtts1" d="M147.3,59.1 l-3.7,0.8" /><path class="prtts1" d="M147.4,59.9 l-1.8,0.3" /><path class="prtts0" d="M147.6,60.6 l-6.9,1.3" /><defs><path id="p50" d="M136.9,60.8 l0.7,3.7" /></defs><text class="prtts2"><textPath href="#p50">14</textPath></text><path class="prtts1" d="M147.7,61.3 l-1.8,0.3" /><path class="prtts1" d="M147.8,62 l-3.6,0.7" /><path class="prtts1" d="M148,62.7 l-1.9,0.3" /><path class="prtts1" d="M148.1,63.4 l-3.7,0.6" /><path class="prtts1" d="M148.2,64.1 l-1.9,0.3" /><path class="prtts1" d="M148.3,64.9 l-3.7,0.5" /><path class="prtts1" d="M148.4,65.6 l-1.9,0.2" /><path class="prtts1" d="M148.5,66.3 l-3.7,0.4" /><path class="prtts1" d="M148.6,67 l-1.9,0.2" /><path class="prtts0" d="M148.6,67.7 l-6.9,0.7" /><defs><path id="p51" d="M138,66.9 l0.4,3.7" /></defs><text class="prtts2"><textPath href="#p51">15</textPath></text><path class="prtts1" d="M148.7,68.5 l-1.9,0.1" /><path class="prtts1" d="M148.8,69.2 l-3.8,0.3" /><path class="prtts1" d="M148.8,69.9 l-1.8,0.1" /><path class="prtts1" d="M148.9,70.6 l-3.8,0.3" /><path class="prtts1" d="M148.9,71.4 l-1.9,0.1" /><path class="prtts1" d="M148.9,72.1 l-3.7,0.1" /><path class="prtts1" d="M149,72.8 l-1.9,0.1" /><path class="prtts1" d="M149,73.5 l-3.8,0.1" /><path class="prtts1" d="M149,74.3 l-1.9,0" /><path class="prtts0" d="M149,75 l-7,0" /><defs><path id="p52" d="M138.5,73.1 l0,3.8" /></defs><text class="prtts2"><textPath href="#p52">16</textPath></text><path class="prtts1" d="M149,75.7 l-1.9,0" /><path class="prtts1" d="M149,76.5 l-3.8,-0.1" /><path class="prtts1" d="M149,77.2 l-1.9,-0.1" /><path class="prtts1" d="M148.9,77.9 l-3.7,-0.1" /><path class="prtts1" d="M148.9,78.6 l-1.9,-0.1" /><path class="prtts1" d="M148.9,79.4 l-3.8,-0.3" /><path class="prtts1" d="M148.8,80.1 l-1.8,-0.1" /><path class="prtts1" d="M148.8,80.8 l-3.8,-0.3" /><path class="prtts1" d="M148.7,81.5 l-1.9,-0.1" /><path class="prtts0" d="M148.6,82.3 l-6.9,-0.7" /><defs><path id="p53" d="M138.4,79.4 l-0.4,3.7" /></defs><text class="prtts2"><textPath href="#p53">17</textPath></text><path class="prtts1" d="M148.6,83 l-1.9,-0.2" /><path class="prtts1" d="M148.5,83.7 l-3.7,-0.4" /><path class="prtts1" d="M148.4,84.4 l-1.9,-0.2" /><path class="prtts1" d="M148.3,85.1 l-3.7,-0.5" /><path class="prtts1" d="M148.2,85.9 l-1.9,-0.3" /><path class="prtts1" d="M148.1,86.6 l-3.7,-0.6" /><path class="prtts1" d="M148,87.3 l-1.9,-0.3" /><path class="prtts1" d="M147.8,88 l-3.6,-0.7" /><path class="prtts1" d="M147.7,88.7 l-1.8,-0.3" /><path class="prtts0" d="M147.6,89.4 l-6.9,-1.3" /><defs><path id="p54" d="M137.6,85.5 l-0.7,3.7" /></defs><text class="prtts2"><textPath href="#p54">18</textPath></text><path class="prtts1" d="M147.4,90.1 l-1.8,-0.3" /><path class="prtts1" d="M147.3,90.9 l-3.7,-0.8" /><path class="prtts1" d="M147.1,91.6 l-1.8,-0.5" /><path class="prtts1" d="M147,92.3 l-3.7,-0.9" /><path class="prtts1" d="M146.8,93 l-1.8,-0.5" /><path class="prtts1" d="M146.6,93.7 l-3.6,-1" /><path class="prtts1" d="M146.4,94.4 l-1.8,-0.5" /><path class="prtts1" d="M146.2,95.1 l-3.6,-1" /><path class="prtts1" d="M146,95.8 l-1.8,-0.5" /><path class="prtts0" d="M145.8,96.5 l-6.7,-2.1" /><defs><path id="p55" d="M136.3,91.6 l-1.1,3.6" /></defs><text class="prtts2"><textPath href="#p55">19</textPath></text><path class="prtts1" d="M145.6,97.2 l-1.8,-0.6" /><path class="prtts1" d="M145.4,97.9 l-3.6,-1.2" /><path class="prtts1" d="M145.2,98.6 l-1.8,-0.6" /><path class="prtts1" d="M144.9,99.2 l-3.5,-1.2" /><path class="prtts1" d="M144.7,99.9 l-1.8,-0.6" /><path class="prtts1" d="M144.4,100.6 l-3.5,-1.3" /><path class="prtts1" d="M144.2,101.3 l-1.8,-0.7" /><path class="prtts1" d="M143.9,102 l-3.5,-1.4" /><path class="prtts1" d="M143.6,102.6 l-1.7,-0.7" /><path class="prtts0" d="M143.4,103.3 l-6.5,-2.7" /><defs><path id="p56" d="M134.4,97.6 l-1.5,3.4" /></defs><text class="prtts2"><textPath href="#p56">20</textPath></text><path class="prtts1" d="M143.1,104 l-1.7,-0.7" /><path class="prtts1" d="M142.8,104.7 l-3.4,-1.5" /><path class="prtts1" d="M142.5,105.3 l-1.7,-0.7" /><path class="prtts1" d="M142.2,106 l-3.4,-1.6" /><path class="prtts1" d="M141.9,106.6 l-1.7,-0.8" /><path class="prtts1" d="M141.6,107.3 l-3.4,-1.6" /><path class="prtts1" d="M141.3,107.9 l-1.7,-0.8" /><path class="prtts1" d="M140.9,108.6 l-3.3,-1.7" /><path class="prtts1" d="M140.6,109.2 l-1.7,-0.8" /><path class="prtts0" d="M140.3,109.9 l-6.2,-3.3" /><defs><path id="p57" d="M131.9,103.3 l-1.8,3.3" /></defs><text class="prtts2"><textPath href="#p57">21</textPath></text><path class="prtts1" d="M139.9,110.5 l-1.6,-0.9" /><path class="prtts1" d="M139.6,111.2 l-3.3,-1.9" /><path class="prtts1" d="M139.2,111.8 l-1.6,-0.9" /><path class="prtts1" d="M138.8,112.4 l-3.2,-1.9" /><path class="prtts1" d="M138.5,113 l-1.6,-0.9" /><path class="prtts1" d="M138.1,113.7 l-3.2,-2" /><path class="prtts1" d="M137.7,114.3 l-1.6,-1" /><path class="prtts1" d="M137.3,114.9 l-3.1,-2" /><path class="prtts1" d="M136.9,115.5 l-1.5,-1" /><path class="prtts0" d="M136.5,116.1 l-5.8,-3.9" /><defs><path id="p58" d="M128.8,108.7 l-2.1,3.1" /></defs><text class="prtts2"><textPath href="#p58">22</textPath></text><path class="prtts1" d="M136.1,116.7 l-1.5,-1" /><path class="prtts1" d="M135.7,117.3 l-3.1,-2.1" /><path class="prtts1" d="M135.3,117.9 l-1.5,-1.1" /><path class="prtts1" d="M134.9,118.5 l-3.1,-2.2" /><path class="prtts1" d="M134.4,119.1 l-1.5,-1.1" /><path class="prtts1" d="M134,119.7 l-3,-2.3" /><path class="prtts1" d="M133.6,120.2 l-1.5,-1.1" /><path class="prtts1" d="M133.1,120.8 l-2.9,-2.3" /><path class="prtts1" d="M132.7,121.4 l-1.5,-1.2" /><path class="prtts0" d="M132.2,121.9 l-5.4,-4.4" /><defs><path id="p59" d="M125.3,113.8 l-2.4,2.9" /></defs><text class="prtts2"><textPath href="#p59">23</textPath></text><path class="prtts1" d="M131.7,122.5 l-1.4,-1.2" /><path class="prtts1" d="M131.3,123.1 l-2.9,-2.5" /><path class="prtts1" d="M130.8,123.6 l-1.4,-1.2" /><path class="prtts1" d="M130.3,124.2 l-2.8,-2.5" /><path class="prtts1" d="M129.8,124.7 l-1.4,-1.3" /><path class="prtts1" d="M129.3,125.2 l-2.7,-2.5" /><path class="prtts1" d="M128.8,125.8 l-1.3,-1.3" /><path class="prtts1" d="M128.3,126.3 l-2.7,-2.6" /><path class="prtts1" d="M127.8,126.8 l-1.3,-1.3" /><path class="prtts0" d="M127.3,127.3 l-4.9,-4.9" /><defs><path id="p60" d="M121.2,118.6 l-2.6,2.6" /></defs><text class="prtts2"><textPath href="#p60">24</textPath></text><path class="prtts1" d="M126.8,127.8 l-1.3,-1.3" /><path class="prtts1" d="M126.3,128.3 l-2.6,-2.7" /><path class="prtts1" d="M125.8,128.8 l-1.3,-1.3" /><path class="prtts1" d="M125.2,129.3 l-2.5,-2.7" /><path class="prtts1" d="M124.7,129.8 l-1.3,-1.4" /><path class="prtts1" d="M124.2,130.3 l-2.5,-2.8" /><path class="prtts1" d="M123.6,130.8 l-1.2,-1.4" /><path class="prtts1" d="M123.1,131.3 l-2.5,-2.9" /><path class="prtts1" d="M122.5,131.7 l-1.2,-1.4" /><path class="prtts0" d="M121.9,132.2 l-4.4,-5.4" /><defs><path id="p61" d="M116.7,122.9 l-2.9,2.4" /></defs><text class="prtts2"><textPath href="#p61">25</textPath></text><path class="prtts1" d="M121.4,132.7 l-1.2,-1.5" /><path class="prtts1" d="M120.8,133.1 l-2.3,-2.9" /><path class="prtts1" d="M120.2,133.6 l-1.1,-1.5" /><path class="prtts1" d="M119.7,134 l-2.3,-3" /><path class="prtts1" d="M119.1,134.4 l-1.1,-1.5" /><path class="prtts1" d="M118.5,134.9 l-2.2,-3.1" /><path class="prtts1" d="M117.9,135.3 l-1.1,-1.5" /><path class="prtts1" d="M117.3,135.7 l-2.1,-3.1" /><path class="prtts1" d="M116.7,136.1 l-1,-1.5" /><path class="prtts0" d="M116.1,136.5 l-3.9,-5.8" /><defs><path id="p62" d="M111.8,126.7 l-3.1,2.1" /></defs><text class="prtts2"><textPath href="#p62">26</textPath></text><path class="prtts1" d="M115.5,136.9 l-1,-1.5" /><path class="prtts1" d="M114.9,137.3 l-2,-3.1" /><path class="prtts1" d="M114.3,137.7 l-1,-1.6" /><path class="prtts1" d="M113.7,138.1 l-2,-3.2" /><path class="prtts1" d="M113,138.5 l-0.9,-1.6" /><path class="prtts1" d="M112.4,138.8 l-1.9,-3.2" /><path class="prtts1" d="M111.8,139.2 l-0.9,-1.6" /><path class="prtts1" d="M111.2,139.6 l-1.9,-3.3" /><path class="prtts1" d="M110.5,139.9 l-0.9,-1.6" /><path class="prtts0" d="M109.9,140.3 l-3.3,-6.2" /><defs><path id="p63" d="M106.6,130.1 l-3.3,1.8" /></defs><text class="prtts2"><textPath href="#p63">27</textPath></text><path class="prtts1" d="M109.2,140.6 l-0.8,-1.7" /><path class="prtts1" d="M108.6,140.9 l-1.7,-3.3" /><path class="prtts1" d="M107.9,141.3 l-0.8,-1.7" /><path class="prtts1" d="M107.3,141.6 l-1.6,-3.4" /><path class="prtts1" d="M106.6,141.9 l-0.8,-1.7" /><path class="prtts1" d="M106,142.2 l-1.6,-3.4" /><path class="prtts1" d="M105.3,142.5 l-0.7,-1.7" /><path class="prtts1" d="M104.7,142.8 l-1.5,-3.4" /><path class="prtts1" d="M104,143.1 l-0.7,-1.7" /><path class="prtts0" d="M103.3,143.4 l-2.7,-6.5" /><defs><path id="p64" d="M101,132.9 l-3.4,1.5" /></defs><text class="prtts2"><textPath href="#p64">28</textPath></text><path class="prtts1" d="M102.6,143.6 l-0.7,-1.7" /><path class="prtts1" d="M102,143.9 l-1.4,-3.5" /><path class="prtts1" d="M101.3,144.2 l-0.7,-1.8" /><path class="prtts1" d="M100.6,144.4 l-1.3,-3.5" /><path class="prtts1" d="M99.9,144.7 l-0.6,-1.8" /><path class="prtts1" d="M99.2,144.9 l-1.2,-3.5" /><path class="prtts1" d="M98.6,145.2 l-0.6,-1.8" /><path class="prtts1" d="M97.9,145.4 l-1.2,-3.6" /><path class="prtts1" d="M97.2,145.6 l-0.6,-1.8" /><path class="prtts0" d="M96.5,145.8 l-2.1,-6.7" /><defs><path id="p65" d="M95.2,135.2 l-3.6,1.1" /></defs><text class="prtts2"><textPath href="#p65">29</textPath></text><path class="prtts1" d="M95.8,146 l-0.5,-1.8" /><path class="prtts1" d="M95.1,146.2 l-1,-3.6" /><path class="prtts1" d="M94.4,146.4 l-0.5,-1.8" /><path class="prtts1" d="M93.7,146.6 l-1,-3.6" /><path class="prtts1" d="M93,146.8 l-0.5,-1.8" /><path class="prtts1" d="M92.3,147 l-0.9,-3.7" /><path class="prtts1" d="M91.6,147.1 l-0.5,-1.8" /><path class="prtts1" d="M90.9,147.3 l-0.8,-3.7" /><path class="prtts1" d="M90.1,147.4 l-0.3,-1.8" /><path class="prtts0" d="M89.4,147.6 l-1.3,-6.9" /><defs><path id="p66" d="M89.2,136.9 l-3.7,0.7" /></defs><text class="prtts2"><textPath href="#p66">30</textPath></text><path class="prtts1" d="M88.7,147.7 l-0.3,-1.8" /><path class="prtts1" d="M88,147.8 l-0.7,-3.6" /><path class="prtts1" d="M87.3,148 l-0.3,-1.9" /><path class="prtts1" d="M86.6,148.1 l-0.6,-3.7" /><path class="prtts1" d="M85.9,148.2 l-0.3,-1.9" /><path class="prtts1" d="M85.1,148.3 l-0.5,-3.7" /><path class="prtts1" d="M84.4,148.4 l-0.2,-1.9" /><path class="prtts1" d="M83.7,148.5 l-0.4,-3.7" /><path class="prtts1" d="M83,148.6 l-0.2,-1.9" /><path class="prtts0" d="M82.3,148.6 l-0.7,-6.9" /><defs><path id="p67" d="M83.1,138 l-3.7,0.4" /></defs><text class="prtts2"><textPath href="#p67">31</textPath></text><path class="prtts1" d="M81.5,148.7 l-0.1,-1.9" /><path class="prtts1" d="M80.8,148.8 l-0.3,-3.8" /><path class="prtts1" d="M80.1,148.8 l-0.1,-1.8" /><path class="prtts1" d="M79.4,148.9 l-0.3,-3.8" /><path class="prtts1" d="M78.6,148.9 l-0.1,-1.9" /><path class="prtts1" d="M77.9,148.9 l-0.1,-3.7" /><path class="prtts1" d="M77.2,149 l-0.1,-1.9" /><path class="prtts1" d="M76.5,149 l-0.1,-3.8" /><path class="prtts1" d="M75.7,149 l0,-1.9" /><path class="prtts0" d="M75,149 l0,-7" /><defs><path id="p68" d="M76.9,138.5 l-3.8,0" /></defs><text class="prtts2"><textPath href="#p68">32</textPath></text><path class="prtts1" d="M74.3,149 l0,-1.9" /><path class="prtts1" d="M73.5,149 l0.1,-3.8" /><path class="prtts1" d="M72.8,149 l0.1,-1.9" /><path class="prtts1" d="M72.1,148.9 l0.1,-3.7" /><path class="prtts1" d="M71.4,148.9 l0.1,-1.9" /><path class="prtts1" d="M70.6,148.9 l0.3,-3.8" /><path class="prtts1" d="M69.9,148.8 l0.1,-1.8" /><path class="prtts1" d="M69.2,148.8 l0.3,-3.8" /><path class="prtts1" d="M68.5,148.7 l0.1,-1.9" /><path class="prtts0" d="M67.7,148.6 l0.7,-6.9" /><defs><path id="p69" d="M70.6,138.4 l-3.7,-0.4" /></defs><text class="prtts2"><textPath href="#p69">33</textPath></text><path class="prtts1" d="M67,148.6 l0.2,-1.9" /><path class="prtts1" d="M66.3,148.5 l0.4,-3.7" /><path class="prtts1" d="M65.6,148.4 l0.2,-1.9" /><path class="prtts1" d="M64.9,148.3 l0.5,-3.7" /><path class="prtts1" d="M64.1,148.2 l0.3,-1.9" /><path class="prtts1" d="M63.4,148.1 l0.6,-3.7" /><path class="prtts1" d="M62.7,148 l0.3,-1.9" /><path class="prtts1" d="M62,147.8 l0.7,-3.6" /><path class="prtts1" d="M61.3,147.7 l0.3,-1.8" /><path class="prtts0" d="M60.6,147.6 l1.3,-6.9" /><defs><path id="p70" d="M64.5,137.6 l-3.7,-0.7" /></defs><text class="prtts2"><textPath href="#p70">34</textPath></text><path class="prtts1" d="M59.9,147.4 l0.3,-1.8" /><path class="prtts1" d="M59.1,147.3 l0.8,-3.7" /><path class="prtts1" d="M58.4,147.1 l0.5,-1.8" /><path class="prtts1" d="M57.7,147 l0.9,-3.7" /><path class="prtts1" d="M57,146.8 l0.5,-1.8" /><path class="prtts1" d="M56.3,146.6 l1,-3.6" /><path class="prtts1" d="M55.6,146.4 l0.5,-1.8" /><path class="prtts1" d="M54.9,146.2 l1,-3.6" /><path class="prtts1" d="M54.2,146 l0.5,-1.8" /><path class="prtts0" d="M53.5,145.8 l2.1,-6.7" /><defs><path id="p71" d="M58.4,136.3 l-3.6,-1.1" /></defs><text class="prtts2"><textPath href="#p71">35</textPath></text><path class="prtts1" d="M52.8,145.6 l0.6,-1.8" /><path class="prtts1" d="M52.1,145.4 l1.2,-3.6" /><path class="prtts1" d="M51.4,145.2 l0.6,-1.8" /><path class="prtts1" d="M50.8,144.9 l1.2,-3.5" /><path class="prtts1" d="M50.1,144.7 l0.6,-1.8" /><path class="prtts1" d="M49.4,144.4 l1.3,-3.5" /><path class="prtts1" d="M48.7,144.2 l0.7,-1.8" /><path class="prtts1" d="M48,143.9 l1.4,-3.5" /><path class="prtts1" d="M47.4,143.6 l0.7,-1.7" /><path class="prtts0" d="M46.7,143.4 l2.7,-6.5" /><defs><path id="p72" d="M52.4,134.4 l-3.4,-1.5" /></defs><text class="prtts2"><textPath href="#p72">36</textPath></text><path class="prtts1" d="M46,143.1 l0.7,-1.7" /><path class="prtts1" d="M45.3,142.8 l1.5,-3.4" /><path class="prtts1" d="M44.7,142.5 l0.7,-1.7" /><path class="prtts1" d="M44,142.2 l1.6,-3.4" /><path class="prtts1" d="M43.4,141.9 l0.8,-1.7" /><path class="prtts1" d="M42.7,141.6 l1.6,-3.4" /><path class="prtts1" d="M42.1,141.3 l0.8,-1.7" /><path class="prtts1" d="M41.4,140.9 l1.7,-3.3" /><path class="prtts1" d="M40.8,140.6 l0.8,-1.7" /><path class="prtts0" d="M40.1,140.3 l3.3,-6.2" /><defs><path id="p73" d="M46.7,131.9 l-3.3,-1.8" /></defs><text class="prtts2"><textPath href="#p73">37</textPath></text><path class="prtts1" d="M39.5,139.9 l0.9,-1.6" /><path class="prtts1" d="M38.8,139.6 l1.9,-3.3" /><path class="prtts1" d="M38.2,139.2 l0.9,-1.6" /><path class="prtts1" d="M37.6,138.8 l1.9,-3.2" /><path class="prtts1" d="M37,138.5 l0.9,-1.6" /><path class="prtts1" d="M36.3,138.1 l2,-3.2" /><path class="prtts1" d="M35.7,137.7 l1,-1.6" /><path class="prtts1" d="M35.1,137.3 l2,-3.1" /><path class="prtts1" d="M34.5,136.9 l1,-1.5" /><path class="prtts0" d="M33.9,136.5 l3.9,-5.8" /><defs><path id="p74" d="M41.3,128.8 l-3.1,-2.1" /></defs><text class="prtts2"><textPath href="#p74">38</textPath></text><path class="prtts1" d="M33.3,136.1 l1,-1.5" /><path class="prtts1" d="M32.7,135.7 l2.1,-3.1" /><path class="prtts1" d="M32.1,135.3 l1.1,-1.5" /><path class="prtts1" d="M31.5,134.9 l2.2,-3.1" /><path class="prtts1" d="M30.9,134.4 l1.1,-1.5" /><path class="prtts1" d="M30.3,134 l2.3,-3" /><path class="prtts1" d="M29.8,133.6 l1.1,-1.5" /><path class="prtts1" d="M29.2,133.1 l2.3,-2.9" /><path class="prtts1" d="M28.6,132.7 l1.2,-1.5" /><path class="prtts0" d="M28.1,132.2 l4.4,-5.4" /><defs><path id="p75" d="M36.2,125.3 l-2.9,-2.4" /></defs><text class="prtts2"><textPath href="#p75">39</textPath></text><path class="prtts1" d="M27.5,131.7 l1.2,-1.4" /><path class="prtts1" d="M26.9,131.3 l2.5,-2.9" /><path class="prtts1" d="M26.4,130.8 l1.2,-1.4" /><path class="prtts1" d="M25.8,130.3 l2.5,-2.8" /><path class="prtts1" d="M25.3,129.8 l1.3,-1.4" /><path class="prtts1" d="M24.8,129.3 l2.5,-2.7" /><path class="prtts1" d="M24.2,128.8 l1.3,-1.3" /><path class="prtts1" d="M23.7,128.3 l2.6,-2.7" /><path class="prtts1" d="M23.2,127.8 l1.3,-1.3" /><path class="prtts0" d="M22.7,127.3 l4.9,-4.9" /><defs><path id="p76" d="M31.4,121.2 l-2.6,-2.6" /></defs><text class="prtts2"><textPath href="#p76">40</textPath></text><path class="prtts1" d="M22.2,126.8 l1.3,-1.3" /><path class="prtts1" d="M21.7,126.3 l2.7,-2.6" /><path class="prtts1" d="M21.2,125.8 l1.3,-1.3" /><path class="prtts1" d="M20.7,125.2 l2.7,-2.5" /><path class="prtts1" d="M20.2,124.7 l1.4,-1.3" /><path class="prtts1" d="M19.7,124.2 l2.8,-2.5" /><path class="prtts1" d="M19.2,123.6 l1.4,-1.2" /><path class="prtts1" d="M18.7,123.1 l2.9,-2.5" /><path class="prtts1" d="M18.3,122.5 l1.4,-1.2" /><path class="prtts0" d="M17.8,121.9 l5.4,-4.4" /><defs><path id="p77" d="M27.1,116.7 l-2.4,-2.9" /></defs><text class="prtts2"><textPath href="#p77">41</textPath></text><path class="prtts1" d="M17.3,121.4 l1.5,-1.2" /><path class="prtts1" d="M16.9,120.8 l2.9,-2.3" /><path class="prtts1" d="M16.4,120.2 l1.5,-1.1" /><path class="prtts1" d="M16,119.7 l3,-2.3" /><path class="prtts1" d="M15.6,119.1 l1.5,-1.1" /><path class="prtts1" d="M15.1,118.5 l3.1,-2.2" /><path class="prtts1" d="M14.7,117.9 l1.5,-1.1" /><path class="prtts1" d="M14.3,117.3 l3.1,-2.1" /><path class="prtts1" d="M13.9,116.7 l1.5,-1" /><path class="prtts0" d="M13.5,116.1 l5.8,-3.9" /><defs><path id="p78" d="M23.3,111.8 l-2.1,-3.1" /></defs><text class="prtts2"><textPath href="#p78">42</textPath></text><path class="prtts1" d="M13.1,115.5 l1.5,-1" /><path class="prtts1" d="M12.7,114.9 l3.1,-2" /><path class="prtts1" d="M12.3,114.3 l1.6,-1" /><path class="prtts1" d="M11.9,113.7 l3.2,-2" /><path class="prtts1" d="M11.5,113 l1.6,-0.9" /><path class="prtts1" d="M11.2,112.4 l3.2,-1.9" /><path class="prtts1" d="M10.8,111.8 l1.6,-0.9" /><path class="prtts1" d="M10.4,111.2 l3.3,-1.9" /><path class="prtts1" d="M10.1,110.5 l1.6,-0.9" /><path class="prtts0" d="M9.7,109.9 l6.2,-3.3" /><defs><path id="p79" d="M19.9,106.6 l-1.8,-3.3" /></defs><text class="prtts2"><textPath href="#p79">43</textPath></text><path class="prtts1" d="M9.4,109.2 l1.7,-0.8" /><path class="prtts1" d="M9.1,108.6 l3.3,-1.7" /><path class="prtts1" d="M8.7,107.9 l1.7,-0.8" /><path class="prtts1" d="M8.4,107.3 l3.4,-1.6" /><path class="prtts1" d="M8.1,106.6 l1.7,-0.8" /><path class="prtts1" d="M7.8,106 l3.4,-1.6" /><path class="prtts1" d="M7.5,105.3 l1.7,-0.7" /><path class="prtts1" d="M7.2,104.7 l3.4,-1.5" /><path class="prtts1" d="M6.9,104 l1.7,-0.7" /><path class="prtts0" d="M6.6,103.3 l6.5,-2.7" /><defs><path id="p80" d="M17.1,101 l-1.5,-3.4" /></defs><text class="prtts2"><textPath href="#p80">44</textPath></text><path class="prtts1" d="M6.4,102.6 l1.7,-0.7" /><path class="prtts1" d="M6.1,102 l3.5,-1.4" /><path class="prtts1" d="M5.8,101.3 l1.8,-0.7" /><path class="prtts1" d="M5.6,100.6 l3.5,-1.3" /><path class="prtts1" d="M5.3,99.9 l1.8,-0.6" /><path class="prtts1" d="M5.1,99.2 l3.5,-1.2" /><path class="prtts1" d="M4.8,98.6 l1.8,-0.6" /><path class="prtts1" d="M4.6,97.9 l3.6,-1.2" /><path class="prtts1" d="M4.4,97.2 l1.8,-0.6" /><path class="prtts0" d="M4.2,96.5 l6.7,-2.1" /><defs><path id="p81" d="M14.8,95.2 l-1.1,-3.6" /></defs><text class="prtts2"><textPath href="#p81">45</textPath></text><path class="prtts1" d="M4,95.8 l1.8,-0.5" /><path class="prtts1" d="M3.8,95.1 l3.6,-1" /><path class="prtts1" d="M3.6,94.4 l1.8,-0.5" /><path class="prtts1" d="M3.4,93.7 l3.6,-1" /><path class="prtts1" d="M3.2,93 l1.8,-0.5" /><path class="prtts1" d="M3,92.3 l3.7,-0.9" /><path class="prtts1" d="M2.9,91.6 l1.8,-0.5" /><path class="prtts1" d="M2.7,90.9 l3.7,-0.8" /><path class="prtts1" d="M2.6,90.1 l1.8,-0.3" /><path class="prtts0" d="M2.4,89.4 l6.9,-1.3" /><defs><path id="p82" d="M13.1,89.2 l-0.7,-3.7" /></defs><text class="prtts2"><textPath href="#p82">46</textPath></text><path class="prtts1" d="M2.3,88.7 l1.8,-0.3" /><path class="prtts1" d="M2.2,88 l3.6,-0.7" /><path class="prtts1" d="M2,87.3 l1.9,-0.3" /><path class="prtts1" d="M1.9,86.6 l3.7,-0.6" /><path class="prtts1" d="M1.8,85.9 l1.9,-0.3" /><path class="prtts1" d="M1.7,85.1 l3.7,-0.5" /><path class="prtts1" d="M1.6,84.4 l1.9,-0.2" /><path class="prtts1" d="M1.5,83.7 l3.7,-0.4" /><path class="prtts1" d="M1.4,83 l1.9,-0.2" /><path class="prtts0" d="M1.4,82.3 l6.9,-0.7" /><defs><path id="p83" d="M12,83.1 l-0.4,-3.7" /></defs><text class="prtts2"><textPath href="#p83">47</textPath></text><path class="prtts1" d="M1.3,81.5 l1.9,-0.1" /><path class="prtts1" d="M1.2,80.8 l3.8,-0.3" /><path class="prtts1" d="M1.2,80.1 l1.8,-0.1" /><path class="prtts1" d="M1.1,79.4 l3.8,-0.3" /><path class="prtts1" d="M1.1,78.6 l1.9,-0.1" /><path class="prtts1" d="M1.1,77.9 l3.7,-0.1" /><path class="prtts1" d="M1,77.2 l1.9,-0.1" /><path class="prtts1" d="M1,76.5 l3.8,-0.1" /><path class="prtts1" d="M1,75.7 l1.9,0" /><path class="prtts0" d="M1,75 l7,0" /><defs><path id="p84" d="M11.5,76.9 l0,-3.8" /></defs><text class="prtts2"><textPath href="#p84">48</textPath></text><path class="prtts1" d="M1,74.3 l1.9,0" /><path class="prtts1" d="M1,73.5 l3.8,0.1" /><path class="prtts1" d="M1,72.8 l1.9,0.1" /><path class="prtts1" d="M1.1,72.1 l3.7,0.1" /><path class="prtts1" d="M1.1,71.4 l1.9,0.1" /><path class="prtts1" d="M1.1,70.6 l3.8,0.3" /><path class="prtts1" d="M1.2,69.9 l1.8,0.1" /><path class="prtts1" d="M1.2,69.2 l3.8,0.3" /><path class="prtts1" d="M1.3,68.5 l1.9,0.1" /><path class="prtts0" d="M1.4,67.7 l6.9,0.7" /><defs><path id="p85" d="M11.6,70.6 l0.4,-3.7" /></defs><text class="prtts2"><textPath href="#p85">49</textPath></text><path class="prtts1" d="M1.4,67 l1.9,0.2" /><path class="prtts1" d="M1.5,66.3 l3.7,0.4" /><path class="prtts1" d="M1.6,65.6 l1.9,0.2" /><path class="prtts1" d="M1.7,64.9 l3.7,0.5" /><path class="prtts1" d="M1.8,64.1 l1.9,0.3" /><path class="prtts1" d="M1.9,63.4 l3.7,0.6" /><path class="prtts1" d="M2,62.7 l1.9,0.3" /><path class="prtts1" d="M2.2,62 l3.6,0.7" /><path class="prtts1" d="M2.3,61.3 l1.8,0.3" /><path class="prtts0" d="M2.4,60.6 l6.9,1.3" /><defs><path id="p86" d="M12.4,64.5 l0.7,-3.7" /></defs><text class="prtts2"><textPath href="#p86">50</textPath></text><path class="prtts1" d="M2.6,59.9 l1.8,0.3" /><path class="prtts1" d="M2.7,59.1 l3.7,0.8" /><path class="prtts1" d="M2.9,58.4 l1.8,0.5" /><path class="prtts1" d="M3,57.7 l3.7,0.9" /><path class="prtts1" d="M3.2,57 l1.8,0.5" /><path class="prtts1" d="M3.4,56.3 l3.6,1" /><path class="prtts1" d="M3.6,55.6 l1.8,0.5" /><path class="prtts1" d="M3.8,54.9 l3.6,1" /><path class="prtts1" d="M4,54.2 l1.8,0.5" /><path class="prtts0" d="M4.2,53.5 l6.7,2.1" /><defs><path id="p87" d="M13.7,58.4 l1.1,-3.6" /></defs><text class="prtts2"><textPath href="#p87">51</textPath></text><path class="prtts1" d="M4.4,52.8 l1.8,0.6" /><path class="prtts1" d="M4.6,52.1 l3.6,1.2" /><path class="prtts1" d="M4.8,51.4 l1.8,0.6" /><path class="prtts1" d="M5.1,50.8 l3.5,1.2" /><path class="prtts1" d="M5.3,50.1 l1.8,0.6" /><path class="prtts1" d="M5.6,49.4 l3.5,1.3" /><path class="prtts1" d="M5.8,48.7 l1.8,0.7" /><path class="prtts1" d="M6.1,48 l3.5,1.4" /><path class="prtts1" d="M6.4,47.4 l1.7,0.7" /><path class="prtts0" d="M6.6,46.7 l6.5,2.7" /><defs><path id="p88" d="M15.6,52.4 l1.5,-3.4" /></defs><text class="prtts2"><textPath href="#p88">52</textPath></text><path class="prtts1" d="M6.9,46 l1.7,0.7" /><path class="prtts1" d="M7.2,45.3 l3.4,1.5" /><path class="prtts1" d="M7.5,44.7 l1.7,0.7" /><path class="prtts1" d="M7.8,44 l3.4,1.6" /><path class="prtts1" d="M8.1,43.4 l1.7,0.8" /><path class="prtts1" d="M8.4,42.7 l3.4,1.6" /><path class="prtts1" d="M8.7,42.1 l1.7,0.8" /><path class="prtts1" d="M9.1,41.4 l3.3,1.7" /><path class="prtts1" d="M9.4,40.8 l1.7,0.8" /><path class="prtts0" d="M9.7,40.1 l6.2,3.3" /><defs><path id="p89" d="M18.1,46.7 l1.8,-3.3" /></defs><text class="prtts2"><textPath href="#p89">53</textPath></text><path class="prtts1" d="M10.1,39.5 l1.6,0.9" /><path class="prtts1" d="M10.4,38.8 l3.3,1.9" /><path class="prtts1" d="M10.8,38.2 l1.6,0.9" /><path class="prtts1" d="M11.2,37.6 l3.2,1.9" /><path class="prtts1" d="M11.5,37 l1.6,0.9" /><path class="prtts1" d="M11.9,36.3 l3.2,2" /><path class="prtts1" d="M12.3,35.7 l1.6,1" /><path class="prtts1" d="M12.7,35.1 l3.1,2" /><path class="prtts1" d="M13.1,34.5 l1.5,1" /><path class="prtts0" d="M13.5,33.9 l5.8,3.9" /><defs><path id="p90" d="M21.2,41.3 l2.1,-3.1" /></defs><text class="prtts2"><textPath href="#p90">54</textPath></text><path class="prtts1" d="M13.9,33.3 l1.5,1" /><path class="prtts1" d="M14.3,32.7 l3.1,2.1" /><path class="prtts1" d="M14.7,32.1 l1.5,1.1" /><path class="prtts1" d="M15.1,31.5 l3.1,2.2" /><path class="prtts1" d="M15.6,30.9 l1.5,1.1" /><path class="prtts1" d="M16,30.3 l3,2.3" /><path class="prtts1" d="M16.4,29.8 l1.5,1.1" /><path class="prtts1" d="M16.9,29.2 l2.9,2.3" /><path class="prtts1" d="M17.3,28.6 l1.5,1.2" /><path class="prtts0" d="M17.8,28.1 l5.4,4.4" /><defs><path id="p91" d="M24.7,36.2 l2.4,-2.9" /></defs><text class="prtts2"><textPath href="#p91">55</textPath></text><path class="prtts1" d="M18.3,27.5 l1.4,1.2" /><path class="prtts1" d="M18.7,26.9 l2.9,2.5" /><path class="prtts1" d="M19.2,26.4 l1.4,1.2" /><path class="prtts1" d="M19.7,25.8 l2.8,2.5" /><path class="prtts1" d="M20.2,25.3 l1.4,1.3" /><path class="prtts1" d="M20.7,24.8 l2.7,2.5" /><path class="prtts1" d="M21.2,24.2 l1.3,1.3" /><path class="prtts1" d="M21.7,23.7 l2.7,2.6" /><path class="prtts1" d="M22.2,23.2 l1.3,1.3" /><path class="prtts0" d="M22.7,22.7 l4.9,4.9" /><defs><path id="p92" d="M28.8,31.4 l2.6,-2.6" /></defs><text class="prtts2"><textPath href="#p92">56</textPath></text><path class="prtts1" d="M23.2,22.2 l1.3,1.3" /><path class="prtts1" d="M23.7,21.7 l2.6,2.7" /><path class="prtts1" d="M24.2,21.2 l1.3,1.3" /><path class="prtts1" d="M24.8,20.7 l2.5,2.7" /><path class="prtts1" d="M25.3,20.2 l1.3,1.4" /><path class="prtts1" d="M25.8,19.7 l2.5,2.8" /><path class="prtts1" d="M26.4,19.2 l1.2,1.4" /><path class="prtts1" d="M26.9,18.7 l2.5,2.9" /><path class="prtts1" d="M27.5,18.3 l1.2,1.4" /><path class="prtts0" d="M28.1,17.8 l4.4,5.4" /><defs><path id="p93" d="M33.3,27.1 l2.9,-2.4" /></defs><text class="prtts2"><textPath href="#p93">57</textPath></text><path class="prtts1" d="M28.6,17.3 l1.2,1.5" /><path class="prtts1" d="M29.2,16.9 l2.3,2.9" /><path class="prtts1" d="M29.8,16.4 l1.1,1.5" /><path class="prtts1" d="M30.3,16 l2.3,3" /><path class="prtts1" d="M30.9,15.6 l1.1,1.5" /><path class="prtts1" d="M31.5,15.1 l2.2,3.1" /><path class="prtts1" d="M32.1,14.7 l1.1,1.5" /><path class="prtts1" d="M32.7,14.3 l2.1,3.1" /><path class="prtts1" d="M33.3,13.9 l1,1.5" /><path class="prtts0" d="M33.9,13.5 l3.9,5.8" /><defs><path id="p94" d="M38.2,23.3 l3.1,-2.1" /></defs><text class="prtts2"><textPath href="#p94">58</textPath></text><path class="prtts1" d="M34.5,13.1 l1,1.5" /><path class="prtts1" d="M35.1,12.7 l2,3.1" /><path class="prtts1" d="M35.7,12.3 l1,1.6" /><path class="prtts1" d="M36.3,11.9 l2,3.2" /><path class="prtts1" d="M37,11.5 l0.9,1.6" /><path class="prtts1" d="M37.6,11.2 l1.9,3.2" /><path class="prtts1" d="M38.2,10.8 l0.9,1.6" /><path class="prtts1" d="M38.8,10.4 l1.9,3.3" /><path class="prtts1" d="M39.5,10.1 l0.9,1.6" /><path class="prtts0" d="M40.1,9.7 l3.3,6.2" /><defs><path id="p95" d="M43.4,19.9 l3.3,-1.8" /></defs><text class="prtts2"><textPath href="#p95">59</textPath></text><path class="prtts1" d="M40.8,9.4 l0.8,1.7" /><path class="prtts1" d="M41.4,9.1 l1.7,3.3" /><path class="prtts1" d="M42.1,8.7 l0.8,1.7" /><path class="prtts1" d="M42.7,8.4 l1.6,3.4" /><path class="prtts1" d="M43.4,8.1 l0.8,1.7" /><path class="prtts1" d="M44,7.8 l1.6,3.4" /><path class="prtts1" d="M44.7,7.5 l0.7,1.7" /><path class="prtts1" d="M45.3,7.2 l1.5,3.4" /><path class="prtts1" d="M46,6.9 l0.7,1.7" /><path class="prtts0" d="M46.7,6.6 l2.7,6.5" /><defs><path id="p96" d="M49,17.1 l3.4,-1.5" /></defs><text class="prtts2"><textPath href="#p96">60</textPath></text><path class="prtts1" d="M47.4,6.4 l0.7,1.7" /><path class="prtts1" d="M48,6.1 l1.4,3.5" /><path class="prtts1" d="M48.7,5.8 l0.7,1.8" /><path class="prtts1" d="M49.4,5.6 l1.3,3.5" /><path class="prtts1" d="M50.1,5.3 l0.6,1.8" /><path class="prtts1" d="M50.8,5.1 l1.2,3.5" /><path class="prtts1" d="M51.4,4.8 l0.6,1.8" /><path class="prtts1" d="M52.1,4.6 l1.2,3.6" /><path class="prtts1" d="M52.8,4.4 l0.6,1.8" /><path class="prtts0" d="M53.5,4.2 l2.1,6.7" /><defs><path id="p97" d="M54.8,14.8 l3.6,-1.1" /></defs><text class="prtts2"><textPath href="#p97">61</textPath></text><path class="prtts1" d="M54.2,4 l0.5,1.8" /><path class="prtts1" d="M54.9,3.8 l1,3.6" /><path class="prtts1" d="M55.6,3.6 l0.5,1.8" /><path class="prtts1" d="M56.3,3.4 l1,3.6" /><path class="prtts1" d="M57,3.2 l0.5,1.8" /><path class="prtts1" d="M57.7,3 l0.9,3.7" /><path class="prtts1" d="M58.4,2.9 l0.5,1.8" /><path class="prtts1" d="M59.1,2.7 l0.8,3.7" /><path class="prtts1" d="M59.9,2.6 l0.3,1.8" /><path class="prtts0" d="M60.6,2.4 l1.3,6.9" /><defs><path id="p98" d="M60.8,13.1 l3.7,-0.7" /></defs><text class="prtts2"><textPath href="#p98">62</textPath></text><path class="prtts1" d="M61.3,2.3 l0.3,1.8" /><path class="prtts1" d="M62,2.2 l0.7,3.6" /><path class="prtts1" d="M62.7,2 l0.3,1.9" /><path class="prtts1" d="M63.4,1.9 l0.6,3.7" /><path class="prtts1" d="M64.1,1.8 l0.3,1.9" /><path class="prtts1" d="M64.9,1.7 l0.5,3.7" /><path class="prtts1" d="M65.6,1.6 l0.2,1.9" /><path class="prtts1" d="M66.3,1.5 l0.4,3.7" /><path class="prtts1" d="M67,1.4 l0.2,1.9" /><path class="prtts0" d="M67.7,1.4 l0.7,6.9" /><defs><path id="p99" d="M66.9,12 l3.7,-0.4" /></defs><text class="prtts2"><textPath href="#p99">63</textPath></text><path class="prtts1" d="M68.5,1.3 l0.1,1.9" /><path class="prtts1" d="M69.2,1.2 l0.3,3.8" /><path class="prtts1" d="M69.9,1.2 l0.1,1.8" /><path class="prtts1" d="M70.6,1.1 l0.3,3.8" /><path class="prtts1" d="M71.4,1.1 l0.1,1.9" /><path class="prtts1" d="M72.1,1.1 l0.1,3.7" /><path class="prtts1" d="M72.8,1 l0.1,1.9" /><path class="prtts1" d="M73.5,1 l0.1,3.8" /><path class="prtts1" d="M74.3,1 l0,1.9" /><path class="prtts0" d="M72,75 l6,0" /><path class="prtts0" d="M75,72 l0,6" /><text class="prtts4" x="75" y="40.3">N</text><defs><path id="p100" d="M77.2,112.5 l-4.4,0" /></defs><text class="prtts3"><textPath href="#p100">S</textPath></text><defs><path id="p101" d="M112.5,72.8 l0,4.4" /></defs><text class="prtts3"><textPath href="#p101">E</textPath></text><defs><path id="p102" d="M37.5,77.2 l0,-4.4" /></defs><text class="prtts3"><textPath href="#p102">W</textPath></text><circle cx="75" cy="37.5" r="7.5" class="prtts5" /><circle cx="75" cy="37.5" r="8" class="prtts1" />'
            });
        }
        _createRotateMarkerIcon() {
            const zoom = this._map.getZoom();
            const size = 15 / 150;
            const transformation = this._getTransformation();
            const scale = this._map.options.crs.scale(zoom);
            const w = Math.abs(transformation._a) * scale * this.options.widthInMeters * size;
            const h = Math.abs(transformation._c) * scale * this.options.heightInMeters * size;
            return L.icon({
                iconUrl: '/img/transparent.png',
                iconSize: [w, h],
                iconAnchor: [w / 2, h / 2],
                className: 'map-utils-tools-protractor-rotate'
            });
        }
        _getRotateMarkerPosition() {
            const rel = this.options.heightInMeters * 37.5 / 150;
            return [
                this._latlng.lat + (Math.cos(this._bearing * Math.PI / 180) * rel),
                this._latlng.lng + (Math.sin(this._bearing * Math.PI / 180) * rel),
            ];
        }
        _updateRotateMarkerPosition() {
            if (this._rotateMarker) {
                this._rotateMarker.setLatLng(this._getRotateMarkerPosition());
            }
        }
        _updateRotateMarkerSize() {
            this._rotateMarker.setIcon(this._createRotateMarkerIcon());
        }
        _onRotateMarkerDrag() {
            this.setBearing(GameMapUtils.computeBearingDegrees(this._latlng, this._rotateMarker.getLatLng(), this._map));
        }
        _resetBearing() {
            this.setBearing(0);
            return false;
        }
        _createRotateMarker() {
            return L.marker(this._getRotateMarkerPosition(), {
                icon: this._createRotateMarkerIcon(),
                draggable: true,
                autoPanOnFocus: false,
                zIndexOffset: 1000,
                title: 'Drag to rotate the protractor. Double click to reset to North.'
            })
                .on('drag', this._onRotateMarkerDrag, this)
                .on('dblclick', this._resetBearing, this);
        }
    }
    GameMapUtils.Protractor = Protractor;
    function protractor(latLng) {
        return new GameMapUtils.Protractor(latLng);
    }
    GameMapUtils.protractor = protractor;
    /**
     * Coordinate Scale
     *
     * Author: jetelain
     */
    class CoordinateScale extends GameMapUtils.MapToolBase {
        constructor(latlng) {
            super(latlng, {
                widthInMeters: 1500,
                heightInMeters: 1500,
                dragMarkerClassName: 'map-utils-tools-coordinatescale-drag',
                rotateCenter: '75,75',
                svgViewBox: '0 0 150 150',
                svgContent: '<style>.cdscs0{fill: none;stroke: #000000FF;stroke-width: 0.2;}.cdscs1{font: 5px Arial;fill: #000000FF;text-anchor: middle;}.cdscs2{font: 5px Arial;fill: #000000FF;dominant-baseline: middle;}.cdscs3{fill: none;stroke: #80808080;stroke-width: 1;}.cdscs4{fill: #F1F1F140;stroke: #000000FF;stroke-width: 0.2;}.cdscs5{fill: none;stroke: #F1F1F180;filter: blur(1px);stroke-width: 3;}.cdscs6{font: 5px Arial;fill: #000000FF;dominant-baseline: hanging;}</style><rect x="0.5" y="0.5" width="149" height="149" rx="5.5" class="cdscs3" /><rect x="1" y="1" width="148" height="148" rx="5" class="cdscs4" /><path class="cdscs5" d="M25,23.5 l100,0" /><path class="cdscs5" d="M126.5,25 l0,100" /><path class="cdscs0" d="M125,1 l0,148" /><path class="cdscs0" d="M25,1 l0,148" /><path class="cdscs0" d="M1,125 l148,0" /><path class="cdscs0" d="M1,25 l148,0" /><path class="cdscs0" d="M26,21 l0,4" /><path class="cdscs0" d="M125,26 l4,0" /><path class="cdscs0" d="M27,17 l0,8" /><path class="cdscs0" d="M125,27 l8,0" /><path class="cdscs0" d="M28,21 l0,4" /><path class="cdscs0" d="M125,28 l4,0" /><path class="cdscs0" d="M29,17 l0,8" /><path class="cdscs0" d="M125,29 l8,0" /><path class="cdscs0" d="M30,21 l0,4" /><path class="cdscs0" d="M125,30 l4,0" /><path class="cdscs0" d="M31,17 l0,8" /><path class="cdscs0" d="M125,31 l8,0" /><path class="cdscs0" d="M32,21 l0,4" /><path class="cdscs0" d="M125,32 l4,0" /><path class="cdscs0" d="M33,17 l0,8" /><path class="cdscs0" d="M125,33 l8,0" /><path class="cdscs0" d="M34,21 l0,4" /><path class="cdscs0" d="M125,34 l4,0" /><path class="cdscs0" d="M35,13 l0,112" /><path class="cdscs0" d="M25,35 l112,0" /><text class="cdscs1" x="35" y="11">9</text><text class="cdscs2" x="139" y="35">1</text><path class="cdscs0" d="M36,21 l0,4" /><path class="cdscs0" d="M125,36 l4,0" /><path class="cdscs0" d="M37,17 l0,8" /><path class="cdscs0" d="M125,37 l8,0" /><path class="cdscs0" d="M38,21 l0,4" /><path class="cdscs0" d="M125,38 l4,0" /><path class="cdscs0" d="M39,17 l0,8" /><path class="cdscs0" d="M125,39 l8,0" /><path class="cdscs0" d="M40,21 l0,4" /><path class="cdscs0" d="M125,40 l4,0" /><path class="cdscs0" d="M41,17 l0,8" /><path class="cdscs0" d="M125,41 l8,0" /><path class="cdscs0" d="M42,21 l0,4" /><path class="cdscs0" d="M125,42 l4,0" /><path class="cdscs0" d="M43,17 l0,8" /><path class="cdscs0" d="M125,43 l8,0" /><path class="cdscs0" d="M44,21 l0,4" /><path class="cdscs0" d="M125,44 l4,0" /><path class="cdscs0" d="M45,13 l0,112" /><path class="cdscs0" d="M25,45 l112,0" /><text class="cdscs1" x="45" y="11">8</text><text class="cdscs2" x="139" y="45">2</text><path class="cdscs0" d="M46,21 l0,4" /><path class="cdscs0" d="M125,46 l4,0" /><path class="cdscs0" d="M47,17 l0,8" /><path class="cdscs0" d="M125,47 l8,0" /><path class="cdscs0" d="M48,21 l0,4" /><path class="cdscs0" d="M125,48 l4,0" /><path class="cdscs0" d="M49,17 l0,8" /><path class="cdscs0" d="M125,49 l8,0" /><path class="cdscs0" d="M50,21 l0,4" /><path class="cdscs0" d="M125,50 l4,0" /><path class="cdscs0" d="M51,17 l0,8" /><path class="cdscs0" d="M125,51 l8,0" /><path class="cdscs0" d="M52,21 l0,4" /><path class="cdscs0" d="M125,52 l4,0" /><path class="cdscs0" d="M53,17 l0,8" /><path class="cdscs0" d="M125,53 l8,0" /><path class="cdscs0" d="M54,21 l0,4" /><path class="cdscs0" d="M125,54 l4,0" /><path class="cdscs0" d="M55,13 l0,112" /><path class="cdscs0" d="M25,55 l112,0" /><text class="cdscs1" x="55" y="11">7</text><text class="cdscs2" x="139" y="55">3</text><path class="cdscs0" d="M56,21 l0,4" /><path class="cdscs0" d="M125,56 l4,0" /><path class="cdscs0" d="M57,17 l0,8" /><path class="cdscs0" d="M125,57 l8,0" /><path class="cdscs0" d="M58,21 l0,4" /><path class="cdscs0" d="M125,58 l4,0" /><path class="cdscs0" d="M59,17 l0,8" /><path class="cdscs0" d="M125,59 l8,0" /><path class="cdscs0" d="M60,21 l0,4" /><path class="cdscs0" d="M125,60 l4,0" /><path class="cdscs0" d="M61,17 l0,8" /><path class="cdscs0" d="M125,61 l8,0" /><path class="cdscs0" d="M62,21 l0,4" /><path class="cdscs0" d="M125,62 l4,0" /><path class="cdscs0" d="M63,17 l0,8" /><path class="cdscs0" d="M125,63 l8,0" /><path class="cdscs0" d="M64,21 l0,4" /><path class="cdscs0" d="M125,64 l4,0" /><path class="cdscs0" d="M65,13 l0,112" /><path class="cdscs0" d="M25,65 l112,0" /><text class="cdscs1" x="65" y="11">6</text><text class="cdscs2" x="139" y="65">4</text><path class="cdscs0" d="M66,21 l0,4" /><path class="cdscs0" d="M125,66 l4,0" /><path class="cdscs0" d="M67,17 l0,8" /><path class="cdscs0" d="M125,67 l8,0" /><path class="cdscs0" d="M68,21 l0,4" /><path class="cdscs0" d="M125,68 l4,0" /><path class="cdscs0" d="M69,17 l0,8" /><path class="cdscs0" d="M125,69 l8,0" /><path class="cdscs0" d="M70,21 l0,4" /><path class="cdscs0" d="M125,70 l4,0" /><path class="cdscs0" d="M71,17 l0,8" /><path class="cdscs0" d="M125,71 l8,0" /><path class="cdscs0" d="M72,21 l0,4" /><path class="cdscs0" d="M125,72 l4,0" /><path class="cdscs0" d="M73,17 l0,8" /><path class="cdscs0" d="M125,73 l8,0" /><path class="cdscs0" d="M74,21 l0,4" /><path class="cdscs0" d="M125,74 l4,0" /><path class="cdscs0" d="M75,13 l0,112" /><path class="cdscs0" d="M25,75 l112,0" /><text class="cdscs1" x="75" y="11">5</text><text class="cdscs2" x="139" y="75">5</text><path class="cdscs0" d="M76,21 l0,4" /><path class="cdscs0" d="M125,76 l4,0" /><path class="cdscs0" d="M77,17 l0,8" /><path class="cdscs0" d="M125,77 l8,0" /><path class="cdscs0" d="M78,21 l0,4" /><path class="cdscs0" d="M125,78 l4,0" /><path class="cdscs0" d="M79,17 l0,8" /><path class="cdscs0" d="M125,79 l8,0" /><path class="cdscs0" d="M80,21 l0,4" /><path class="cdscs0" d="M125,80 l4,0" /><path class="cdscs0" d="M81,17 l0,8" /><path class="cdscs0" d="M125,81 l8,0" /><path class="cdscs0" d="M82,21 l0,4" /><path class="cdscs0" d="M125,82 l4,0" /><path class="cdscs0" d="M83,17 l0,8" /><path class="cdscs0" d="M125,83 l8,0" /><path class="cdscs0" d="M84,21 l0,4" /><path class="cdscs0" d="M125,84 l4,0" /><path class="cdscs0" d="M85,13 l0,112" /><path class="cdscs0" d="M25,85 l112,0" /><text class="cdscs1" x="85" y="11">4</text><text class="cdscs2" x="139" y="85">6</text><path class="cdscs0" d="M86,21 l0,4" /><path class="cdscs0" d="M125,86 l4,0" /><path class="cdscs0" d="M87,17 l0,8" /><path class="cdscs0" d="M125,87 l8,0" /><path class="cdscs0" d="M88,21 l0,4" /><path class="cdscs0" d="M125,88 l4,0" /><path class="cdscs0" d="M89,17 l0,8" /><path class="cdscs0" d="M125,89 l8,0" /><path class="cdscs0" d="M90,21 l0,4" /><path class="cdscs0" d="M125,90 l4,0" /><path class="cdscs0" d="M91,17 l0,8" /><path class="cdscs0" d="M125,91 l8,0" /><path class="cdscs0" d="M92,21 l0,4" /><path class="cdscs0" d="M125,92 l4,0" /><path class="cdscs0" d="M93,17 l0,8" /><path class="cdscs0" d="M125,93 l8,0" /><path class="cdscs0" d="M94,21 l0,4" /><path class="cdscs0" d="M125,94 l4,0" /><path class="cdscs0" d="M95,13 l0,112" /><path class="cdscs0" d="M25,95 l112,0" /><text class="cdscs1" x="95" y="11">3</text><text class="cdscs2" x="139" y="95">7</text><path class="cdscs0" d="M96,21 l0,4" /><path class="cdscs0" d="M125,96 l4,0" /><path class="cdscs0" d="M97,17 l0,8" /><path class="cdscs0" d="M125,97 l8,0" /><path class="cdscs0" d="M98,21 l0,4" /><path class="cdscs0" d="M125,98 l4,0" /><path class="cdscs0" d="M99,17 l0,8" /><path class="cdscs0" d="M125,99 l8,0" /><path class="cdscs0" d="M100,21 l0,4" /><path class="cdscs0" d="M125,100 l4,0" /><path class="cdscs0" d="M101,17 l0,8" /><path class="cdscs0" d="M125,101 l8,0" /><path class="cdscs0" d="M102,21 l0,4" /><path class="cdscs0" d="M125,102 l4,0" /><path class="cdscs0" d="M103,17 l0,8" /><path class="cdscs0" d="M125,103 l8,0" /><path class="cdscs0" d="M104,21 l0,4" /><path class="cdscs0" d="M125,104 l4,0" /><path class="cdscs0" d="M105,13 l0,112" /><path class="cdscs0" d="M25,105 l112,0" /><text class="cdscs1" x="105" y="11">2</text><text class="cdscs2" x="139" y="105">8</text><path class="cdscs0" d="M106,21 l0,4" /><path class="cdscs0" d="M125,106 l4,0" /><path class="cdscs0" d="M107,17 l0,8" /><path class="cdscs0" d="M125,107 l8,0" /><path class="cdscs0" d="M108,21 l0,4" /><path class="cdscs0" d="M125,108 l4,0" /><path class="cdscs0" d="M109,17 l0,8" /><path class="cdscs0" d="M125,109 l8,0" /><path class="cdscs0" d="M110,21 l0,4" /><path class="cdscs0" d="M125,110 l4,0" /><path class="cdscs0" d="M111,17 l0,8" /><path class="cdscs0" d="M125,111 l8,0" /><path class="cdscs0" d="M112,21 l0,4" /><path class="cdscs0" d="M125,112 l4,0" /><path class="cdscs0" d="M113,17 l0,8" /><path class="cdscs0" d="M125,113 l8,0" /><path class="cdscs0" d="M114,21 l0,4" /><path class="cdscs0" d="M125,114 l4,0" /><path class="cdscs0" d="M115,13 l0,112" /><path class="cdscs0" d="M25,115 l112,0" /><text class="cdscs1" x="115" y="11">1</text><text class="cdscs2" x="139" y="115">9</text><path class="cdscs0" d="M116,21 l0,4" /><path class="cdscs0" d="M125,116 l4,0" /><path class="cdscs0" d="M117,17 l0,8" /><path class="cdscs0" d="M125,117 l8,0" /><path class="cdscs0" d="M118,21 l0,4" /><path class="cdscs0" d="M125,118 l4,0" /><path class="cdscs0" d="M119,17 l0,8" /><path class="cdscs0" d="M125,119 l8,0" /><path class="cdscs0" d="M120,21 l0,4" /><path class="cdscs0" d="M125,120 l4,0" /><path class="cdscs0" d="M121,17 l0,8" /><path class="cdscs0" d="M125,121 l8,0" /><path class="cdscs0" d="M122,21 l0,4" /><path class="cdscs0" d="M125,122 l4,0" /><path class="cdscs0" d="M123,17 l0,8" /><path class="cdscs0" d="M125,123 l8,0" /><path class="cdscs0" d="M124,21 l0,4" /><path class="cdscs0" d="M125,124 l4,0" /><text class="cdscs1" x="25" y="11">10</text><text class="cdscs6" x="139" y="126">10</text>'
            });
        }
    }
    GameMapUtils.CoordinateScale = CoordinateScale;
    function coordinateScale(latLng) {
        return new GameMapUtils.CoordinateScale(latLng);
    }
    GameMapUtils.coordinateScale = coordinateScale;
    /**
     * Ruler
     *
     * Author: jetelain
     */
    class Ruler extends GameMapUtils.MapToolBase {
        constructor(latlng) {
            super(latlng, {
                widthInMeters: 8120,
                heightInMeters: 8120,
                dragMarkerClassName: 'map-utils-tools-ruler-drag',
                svgViewBox: '0 0 812 812',
                rotateCenter: '406,406',
                svgContent: '<style>.rulrs0{fill: none;stroke: #000000FF;stroke-width: 0.3;}.rulrs1{fill: none;stroke: #FF0000FF;stroke-width: 0.3;}.rulrs2{fill: none;stroke: #000000FF;stroke-width: 0.15;}.rulrs3{fill: none;stroke: #80808080;stroke-width: 1;}.rulrs4{fill: #F1F1F140;stroke: #000000FF;stroke-width: 0.2;}.rulrs5{font: 5px Arial;fill: #000000FF;dominant-baseline: hanging;text-anchor: middle;}.rulrs6{font: 5px Arial;fill: #000000FF;text-anchor: middle;}.rulrs7{fill: none;stroke: #F1F1F180;filter: blur(1px);stroke-width: 3;}</style><rect x="201" y="386" width="610" height="40" rx="5" class="rulrs4" /><path class="rulrs7" d="M206,387.5 l600,0" /><path class="rulrs7" d="M206,424.5 l600,0" /><rect x="200.5" y="385.5" width="611" height="41" rx="5.5" class="rulrs3" /><path class="rulrs0" d="M206,386 l0,8" /><text class="rulrs5" x="206" y="395">0</text><path class="rulrs0" d="M206,426 l0,-8" /><text class="rulrs6" x="206" y="417">0</text><path class="rulrs2" d="M207,386 l0,2" /><path class="rulrs2" d="M207,426 l0,-2" /><path class="rulrs2" d="M208,386 l0,2" /><path class="rulrs2" d="M208,426 l0,-2" /><path class="rulrs2" d="M209,386 l0,2" /><path class="rulrs2" d="M209,426 l0,-2" /><path class="rulrs2" d="M210,386 l0,2" /><path class="rulrs2" d="M210,426 l0,-2" /><path class="rulrs2" d="M211,386 l0,2" /><path class="rulrs2" d="M211,426 l0,-2" /><path class="rulrs2" d="M212,386 l0,2" /><path class="rulrs2" d="M212,426 l0,-2" /><path class="rulrs2" d="M213,386 l0,2" /><path class="rulrs2" d="M213,426 l0,-2" /><path class="rulrs2" d="M214,386 l0,2" /><path class="rulrs2" d="M214,426 l0,-2" /><path class="rulrs2" d="M215,386 l0,2" /><path class="rulrs2" d="M215,426 l0,-2" /><path class="rulrs2" d="M216,386 l0,4" /><path class="rulrs2" d="M216,426 l0,-4" /><path class="rulrs2" d="M217,386 l0,2" /><path class="rulrs2" d="M217,426 l0,-2" /><path class="rulrs2" d="M218,386 l0,2" /><path class="rulrs2" d="M218,426 l0,-2" /><path class="rulrs2" d="M219,386 l0,2" /><path class="rulrs2" d="M219,426 l0,-2" /><path class="rulrs2" d="M220,386 l0,2" /><path class="rulrs2" d="M220,426 l0,-2" /><path class="rulrs2" d="M221,386 l0,2" /><path class="rulrs2" d="M221,426 l0,-2" /><path class="rulrs2" d="M222,386 l0,2" /><path class="rulrs2" d="M222,426 l0,-2" /><path class="rulrs2" d="M223,386 l0,2" /><path class="rulrs2" d="M223,426 l0,-2" /><path class="rulrs2" d="M224,386 l0,2" /><path class="rulrs2" d="M224,426 l0,-2" /><path class="rulrs2" d="M225,386 l0,2" /><path class="rulrs2" d="M225,426 l0,-2" /><path class="rulrs2" d="M226,386 l0,4" /><path class="rulrs2" d="M226,426 l0,-4" /><path class="rulrs2" d="M227,386 l0,2" /><path class="rulrs2" d="M227,426 l0,-2" /><path class="rulrs2" d="M228,386 l0,2" /><path class="rulrs2" d="M228,426 l0,-2" /><path class="rulrs2" d="M229,386 l0,2" /><path class="rulrs2" d="M229,426 l0,-2" /><path class="rulrs2" d="M230,386 l0,2" /><path class="rulrs2" d="M230,426 l0,-2" /><path class="rulrs2" d="M231,386 l0,2" /><path class="rulrs2" d="M231,426 l0,-2" /><path class="rulrs2" d="M232,386 l0,2" /><path class="rulrs2" d="M232,426 l0,-2" /><path class="rulrs2" d="M233,386 l0,2" /><path class="rulrs2" d="M233,426 l0,-2" /><path class="rulrs2" d="M234,386 l0,2" /><path class="rulrs2" d="M234,426 l0,-2" /><path class="rulrs2" d="M235,386 l0,2" /><path class="rulrs2" d="M235,426 l0,-2" /><path class="rulrs2" d="M236,386 l0,4" /><path class="rulrs2" d="M236,426 l0,-4" /><path class="rulrs2" d="M237,386 l0,2" /><path class="rulrs2" d="M237,426 l0,-2" /><path class="rulrs2" d="M238,386 l0,2" /><path class="rulrs2" d="M238,426 l0,-2" /><path class="rulrs2" d="M239,386 l0,2" /><path class="rulrs2" d="M239,426 l0,-2" /><path class="rulrs2" d="M240,386 l0,2" /><path class="rulrs2" d="M240,426 l0,-2" /><path class="rulrs2" d="M241,386 l0,2" /><path class="rulrs2" d="M241,426 l0,-2" /><path class="rulrs2" d="M242,386 l0,2" /><path class="rulrs2" d="M242,426 l0,-2" /><path class="rulrs2" d="M243,386 l0,2" /><path class="rulrs2" d="M243,426 l0,-2" /><path class="rulrs2" d="M244,386 l0,2" /><path class="rulrs2" d="M244,426 l0,-2" /><path class="rulrs2" d="M245,386 l0,2" /><path class="rulrs2" d="M245,426 l0,-2" /><path class="rulrs2" d="M246,386 l0,4" /><path class="rulrs2" d="M246,426 l0,-4" /><path class="rulrs2" d="M247,386 l0,2" /><path class="rulrs2" d="M247,426 l0,-2" /><path class="rulrs2" d="M248,386 l0,2" /><path class="rulrs2" d="M248,426 l0,-2" /><path class="rulrs2" d="M249,386 l0,2" /><path class="rulrs2" d="M249,426 l0,-2" /><path class="rulrs2" d="M250,386 l0,2" /><path class="rulrs2" d="M250,426 l0,-2" /><path class="rulrs2" d="M251,386 l0,2" /><path class="rulrs2" d="M251,426 l0,-2" /><path class="rulrs2" d="M252,386 l0,2" /><path class="rulrs2" d="M252,426 l0,-2" /><path class="rulrs2" d="M253,386 l0,2" /><path class="rulrs2" d="M253,426 l0,-2" /><path class="rulrs2" d="M254,386 l0,2" /><path class="rulrs2" d="M254,426 l0,-2" /><path class="rulrs2" d="M255,386 l0,2" /><path class="rulrs2" d="M255,426 l0,-2" /><path class="rulrs2" d="M256,386 l0,6" /><path class="rulrs2" d="M256,426 l0,-6" /><path class="rulrs2" d="M257,386 l0,2" /><path class="rulrs2" d="M257,426 l0,-2" /><path class="rulrs2" d="M258,386 l0,2" /><path class="rulrs2" d="M258,426 l0,-2" /><path class="rulrs2" d="M259,386 l0,2" /><path class="rulrs2" d="M259,426 l0,-2" /><path class="rulrs2" d="M260,386 l0,2" /><path class="rulrs2" d="M260,426 l0,-2" /><path class="rulrs2" d="M261,386 l0,2" /><path class="rulrs2" d="M261,426 l0,-2" /><path class="rulrs2" d="M262,386 l0,2" /><path class="rulrs2" d="M262,426 l0,-2" /><path class="rulrs2" d="M263,386 l0,2" /><path class="rulrs2" d="M263,426 l0,-2" /><path class="rulrs2" d="M264,386 l0,2" /><path class="rulrs2" d="M264,426 l0,-2" /><path class="rulrs2" d="M265,386 l0,2" /><path class="rulrs2" d="M265,426 l0,-2" /><path class="rulrs2" d="M266,386 l0,4" /><path class="rulrs2" d="M266,426 l0,-4" /><path class="rulrs2" d="M267,386 l0,2" /><path class="rulrs2" d="M267,426 l0,-2" /><path class="rulrs2" d="M268,386 l0,2" /><path class="rulrs2" d="M268,426 l0,-2" /><path class="rulrs2" d="M269,386 l0,2" /><path class="rulrs2" d="M269,426 l0,-2" /><path class="rulrs2" d="M270,386 l0,2" /><path class="rulrs2" d="M270,426 l0,-2" /><path class="rulrs2" d="M271,386 l0,2" /><path class="rulrs2" d="M271,426 l0,-2" /><path class="rulrs2" d="M272,386 l0,2" /><path class="rulrs2" d="M272,426 l0,-2" /><path class="rulrs2" d="M273,386 l0,2" /><path class="rulrs2" d="M273,426 l0,-2" /><path class="rulrs2" d="M274,386 l0,2" /><path class="rulrs2" d="M274,426 l0,-2" /><path class="rulrs2" d="M275,386 l0,2" /><path class="rulrs2" d="M275,426 l0,-2" /><path class="rulrs2" d="M276,386 l0,4" /><path class="rulrs2" d="M276,426 l0,-4" /><path class="rulrs2" d="M277,386 l0,2" /><path class="rulrs2" d="M277,426 l0,-2" /><path class="rulrs2" d="M278,386 l0,2" /><path class="rulrs2" d="M278,426 l0,-2" /><path class="rulrs2" d="M279,386 l0,2" /><path class="rulrs2" d="M279,426 l0,-2" /><path class="rulrs2" d="M280,386 l0,2" /><path class="rulrs2" d="M280,426 l0,-2" /><path class="rulrs2" d="M281,386 l0,2" /><path class="rulrs2" d="M281,426 l0,-2" /><path class="rulrs2" d="M282,386 l0,2" /><path class="rulrs2" d="M282,426 l0,-2" /><path class="rulrs2" d="M283,386 l0,2" /><path class="rulrs2" d="M283,426 l0,-2" /><path class="rulrs2" d="M284,386 l0,2" /><path class="rulrs2" d="M284,426 l0,-2" /><path class="rulrs2" d="M285,386 l0,2" /><path class="rulrs2" d="M285,426 l0,-2" /><path class="rulrs2" d="M286,386 l0,4" /><path class="rulrs2" d="M286,426 l0,-4" /><path class="rulrs2" d="M287,386 l0,2" /><path class="rulrs2" d="M287,426 l0,-2" /><path class="rulrs2" d="M288,386 l0,2" /><path class="rulrs2" d="M288,426 l0,-2" /><path class="rulrs2" d="M289,386 l0,2" /><path class="rulrs2" d="M289,426 l0,-2" /><path class="rulrs2" d="M290,386 l0,2" /><path class="rulrs2" d="M290,426 l0,-2" /><path class="rulrs2" d="M291,386 l0,2" /><path class="rulrs2" d="M291,426 l0,-2" /><path class="rulrs2" d="M292,386 l0,2" /><path class="rulrs2" d="M292,426 l0,-2" /><path class="rulrs2" d="M293,386 l0,2" /><path class="rulrs2" d="M293,426 l0,-2" /><path class="rulrs2" d="M294,386 l0,2" /><path class="rulrs2" d="M294,426 l0,-2" /><path class="rulrs2" d="M295,386 l0,2" /><path class="rulrs2" d="M295,426 l0,-2" /><path class="rulrs2" d="M296,386 l0,4" /><path class="rulrs2" d="M296,426 l0,-4" /><path class="rulrs2" d="M297,386 l0,2" /><path class="rulrs2" d="M297,426 l0,-2" /><path class="rulrs2" d="M298,386 l0,2" /><path class="rulrs2" d="M298,426 l0,-2" /><path class="rulrs2" d="M299,386 l0,2" /><path class="rulrs2" d="M299,426 l0,-2" /><path class="rulrs2" d="M300,386 l0,2" /><path class="rulrs2" d="M300,426 l0,-2" /><path class="rulrs2" d="M301,386 l0,2" /><path class="rulrs2" d="M301,426 l0,-2" /><path class="rulrs2" d="M302,386 l0,2" /><path class="rulrs2" d="M302,426 l0,-2" /><path class="rulrs2" d="M303,386 l0,2" /><path class="rulrs2" d="M303,426 l0,-2" /><path class="rulrs2" d="M304,386 l0,2" /><path class="rulrs2" d="M304,426 l0,-2" /><path class="rulrs2" d="M305,386 l0,2" /><path class="rulrs2" d="M305,426 l0,-2" /><path class="rulrs0" d="M306,386 l0,8" /><text class="rulrs5" x="306" y="395">1</text><path class="rulrs0" d="M306,426 l0,-8" /><text class="rulrs6" x="306" y="417">1</text><path class="rulrs2" d="M307,386 l0,2" /><path class="rulrs2" d="M307,426 l0,-2" /><path class="rulrs2" d="M308,386 l0,2" /><path class="rulrs2" d="M308,426 l0,-2" /><path class="rulrs2" d="M309,386 l0,2" /><path class="rulrs2" d="M309,426 l0,-2" /><path class="rulrs2" d="M310,386 l0,2" /><path class="rulrs2" d="M310,426 l0,-2" /><path class="rulrs2" d="M311,386 l0,2" /><path class="rulrs2" d="M311,426 l0,-2" /><path class="rulrs2" d="M312,386 l0,2" /><path class="rulrs2" d="M312,426 l0,-2" /><path class="rulrs2" d="M313,386 l0,2" /><path class="rulrs2" d="M313,426 l0,-2" /><path class="rulrs2" d="M314,386 l0,2" /><path class="rulrs2" d="M314,426 l0,-2" /><path class="rulrs2" d="M315,386 l0,2" /><path class="rulrs2" d="M315,426 l0,-2" /><path class="rulrs2" d="M316,386 l0,4" /><path class="rulrs2" d="M316,426 l0,-4" /><path class="rulrs2" d="M317,386 l0,2" /><path class="rulrs2" d="M317,426 l0,-2" /><path class="rulrs2" d="M318,386 l0,2" /><path class="rulrs2" d="M318,426 l0,-2" /><path class="rulrs2" d="M319,386 l0,2" /><path class="rulrs2" d="M319,426 l0,-2" /><path class="rulrs2" d="M320,386 l0,2" /><path class="rulrs2" d="M320,426 l0,-2" /><path class="rulrs2" d="M321,386 l0,2" /><path class="rulrs2" d="M321,426 l0,-2" /><path class="rulrs2" d="M322,386 l0,2" /><path class="rulrs2" d="M322,426 l0,-2" /><path class="rulrs2" d="M323,386 l0,2" /><path class="rulrs2" d="M323,426 l0,-2" /><path class="rulrs2" d="M324,386 l0,2" /><path class="rulrs2" d="M324,426 l0,-2" /><path class="rulrs2" d="M325,386 l0,2" /><path class="rulrs2" d="M325,426 l0,-2" /><path class="rulrs2" d="M326,386 l0,4" /><path class="rulrs2" d="M326,426 l0,-4" /><path class="rulrs2" d="M327,386 l0,2" /><path class="rulrs2" d="M327,426 l0,-2" /><path class="rulrs2" d="M328,386 l0,2" /><path class="rulrs2" d="M328,426 l0,-2" /><path class="rulrs2" d="M329,386 l0,2" /><path class="rulrs2" d="M329,426 l0,-2" /><path class="rulrs2" d="M330,386 l0,2" /><path class="rulrs2" d="M330,426 l0,-2" /><path class="rulrs2" d="M331,386 l0,2" /><path class="rulrs2" d="M331,426 l0,-2" /><path class="rulrs2" d="M332,386 l0,2" /><path class="rulrs2" d="M332,426 l0,-2" /><path class="rulrs2" d="M333,386 l0,2" /><path class="rulrs2" d="M333,426 l0,-2" /><path class="rulrs2" d="M334,386 l0,2" /><path class="rulrs2" d="M334,426 l0,-2" /><path class="rulrs2" d="M335,386 l0,2" /><path class="rulrs2" d="M335,426 l0,-2" /><path class="rulrs2" d="M336,386 l0,4" /><path class="rulrs2" d="M336,426 l0,-4" /><path class="rulrs2" d="M337,386 l0,2" /><path class="rulrs2" d="M337,426 l0,-2" /><path class="rulrs2" d="M338,386 l0,2" /><path class="rulrs2" d="M338,426 l0,-2" /><path class="rulrs2" d="M339,386 l0,2" /><path class="rulrs2" d="M339,426 l0,-2" /><path class="rulrs2" d="M340,386 l0,2" /><path class="rulrs2" d="M340,426 l0,-2" /><path class="rulrs2" d="M341,386 l0,2" /><path class="rulrs2" d="M341,426 l0,-2" /><path class="rulrs2" d="M342,386 l0,2" /><path class="rulrs2" d="M342,426 l0,-2" /><path class="rulrs2" d="M343,386 l0,2" /><path class="rulrs2" d="M343,426 l0,-2" /><path class="rulrs2" d="M344,386 l0,2" /><path class="rulrs2" d="M344,426 l0,-2" /><path class="rulrs2" d="M345,386 l0,2" /><path class="rulrs2" d="M345,426 l0,-2" /><path class="rulrs2" d="M346,386 l0,4" /><path class="rulrs2" d="M346,426 l0,-4" /><path class="rulrs2" d="M347,386 l0,2" /><path class="rulrs2" d="M347,426 l0,-2" /><path class="rulrs2" d="M348,386 l0,2" /><path class="rulrs2" d="M348,426 l0,-2" /><path class="rulrs2" d="M349,386 l0,2" /><path class="rulrs2" d="M349,426 l0,-2" /><path class="rulrs2" d="M350,386 l0,2" /><path class="rulrs2" d="M350,426 l0,-2" /><path class="rulrs2" d="M351,386 l0,2" /><path class="rulrs2" d="M351,426 l0,-2" /><path class="rulrs2" d="M352,386 l0,2" /><path class="rulrs2" d="M352,426 l0,-2" /><path class="rulrs2" d="M353,386 l0,2" /><path class="rulrs2" d="M353,426 l0,-2" /><path class="rulrs2" d="M354,386 l0,2" /><path class="rulrs2" d="M354,426 l0,-2" /><path class="rulrs2" d="M355,386 l0,2" /><path class="rulrs2" d="M355,426 l0,-2" /><path class="rulrs2" d="M356,386 l0,6" /><path class="rulrs2" d="M356,426 l0,-6" /><path class="rulrs2" d="M357,386 l0,2" /><path class="rulrs2" d="M357,426 l0,-2" /><path class="rulrs2" d="M358,386 l0,2" /><path class="rulrs2" d="M358,426 l0,-2" /><path class="rulrs2" d="M359,386 l0,2" /><path class="rulrs2" d="M359,426 l0,-2" /><path class="rulrs2" d="M360,386 l0,2" /><path class="rulrs2" d="M360,426 l0,-2" /><path class="rulrs2" d="M361,386 l0,2" /><path class="rulrs2" d="M361,426 l0,-2" /><path class="rulrs2" d="M362,386 l0,2" /><path class="rulrs2" d="M362,426 l0,-2" /><path class="rulrs2" d="M363,386 l0,2" /><path class="rulrs2" d="M363,426 l0,-2" /><path class="rulrs2" d="M364,386 l0,2" /><path class="rulrs2" d="M364,426 l0,-2" /><path class="rulrs2" d="M365,386 l0,2" /><path class="rulrs2" d="M365,426 l0,-2" /><path class="rulrs2" d="M366,386 l0,4" /><path class="rulrs2" d="M366,426 l0,-4" /><path class="rulrs2" d="M367,386 l0,2" /><path class="rulrs2" d="M367,426 l0,-2" /><path class="rulrs2" d="M368,386 l0,2" /><path class="rulrs2" d="M368,426 l0,-2" /><path class="rulrs2" d="M369,386 l0,2" /><path class="rulrs2" d="M369,426 l0,-2" /><path class="rulrs2" d="M370,386 l0,2" /><path class="rulrs2" d="M370,426 l0,-2" /><path class="rulrs2" d="M371,386 l0,2" /><path class="rulrs2" d="M371,426 l0,-2" /><path class="rulrs2" d="M372,386 l0,2" /><path class="rulrs2" d="M372,426 l0,-2" /><path class="rulrs2" d="M373,386 l0,2" /><path class="rulrs2" d="M373,426 l0,-2" /><path class="rulrs2" d="M374,386 l0,2" /><path class="rulrs2" d="M374,426 l0,-2" /><path class="rulrs2" d="M375,386 l0,2" /><path class="rulrs2" d="M375,426 l0,-2" /><path class="rulrs2" d="M376,386 l0,4" /><path class="rulrs2" d="M376,426 l0,-4" /><path class="rulrs2" d="M377,386 l0,2" /><path class="rulrs2" d="M377,426 l0,-2" /><path class="rulrs2" d="M378,386 l0,2" /><path class="rulrs2" d="M378,426 l0,-2" /><path class="rulrs2" d="M379,386 l0,2" /><path class="rulrs2" d="M379,426 l0,-2" /><path class="rulrs2" d="M380,386 l0,2" /><path class="rulrs2" d="M380,426 l0,-2" /><path class="rulrs2" d="M381,386 l0,2" /><path class="rulrs2" d="M381,426 l0,-2" /><path class="rulrs2" d="M382,386 l0,2" /><path class="rulrs2" d="M382,426 l0,-2" /><path class="rulrs2" d="M383,386 l0,2" /><path class="rulrs2" d="M383,426 l0,-2" /><path class="rulrs2" d="M384,386 l0,2" /><path class="rulrs2" d="M384,426 l0,-2" /><path class="rulrs2" d="M385,386 l0,2" /><path class="rulrs2" d="M385,426 l0,-2" /><path class="rulrs2" d="M386,386 l0,4" /><path class="rulrs2" d="M386,426 l0,-4" /><path class="rulrs2" d="M387,386 l0,2" /><path class="rulrs2" d="M387,426 l0,-2" /><path class="rulrs2" d="M388,386 l0,2" /><path class="rulrs2" d="M388,426 l0,-2" /><path class="rulrs2" d="M389,386 l0,2" /><path class="rulrs2" d="M389,426 l0,-2" /><path class="rulrs2" d="M390,386 l0,2" /><path class="rulrs2" d="M390,426 l0,-2" /><path class="rulrs2" d="M391,386 l0,2" /><path class="rulrs2" d="M391,426 l0,-2" /><path class="rulrs2" d="M392,386 l0,2" /><path class="rulrs2" d="M392,426 l0,-2" /><path class="rulrs2" d="M393,386 l0,2" /><path class="rulrs2" d="M393,426 l0,-2" /><path class="rulrs2" d="M394,386 l0,2" /><path class="rulrs2" d="M394,426 l0,-2" /><path class="rulrs2" d="M395,386 l0,2" /><path class="rulrs2" d="M395,426 l0,-2" /><path class="rulrs2" d="M396,386 l0,4" /><path class="rulrs2" d="M396,426 l0,-4" /><path class="rulrs2" d="M397,386 l0,2" /><path class="rulrs2" d="M397,426 l0,-2" /><path class="rulrs2" d="M398,386 l0,2" /><path class="rulrs2" d="M398,426 l0,-2" /><path class="rulrs2" d="M399,386 l0,2" /><path class="rulrs2" d="M399,426 l0,-2" /><path class="rulrs2" d="M400,386 l0,2" /><path class="rulrs2" d="M400,426 l0,-2" /><path class="rulrs2" d="M401,386 l0,2" /><path class="rulrs2" d="M401,426 l0,-2" /><path class="rulrs2" d="M402,386 l0,2" /><path class="rulrs2" d="M402,426 l0,-2" /><path class="rulrs2" d="M403,386 l0,2" /><path class="rulrs2" d="M403,426 l0,-2" /><path class="rulrs2" d="M404,386 l0,2" /><path class="rulrs2" d="M404,426 l0,-2" /><path class="rulrs2" d="M405,386 l0,2" /><path class="rulrs2" d="M405,426 l0,-2" /><path class="rulrs0" d="M406,386 l0,8" /><text class="rulrs5" x="406" y="395">2</text><path class="rulrs0" d="M406,426 l0,-8" /><text class="rulrs6" x="406" y="417">2</text><path class="rulrs2" d="M407,386 l0,2" /><path class="rulrs2" d="M407,426 l0,-2" /><path class="rulrs2" d="M408,386 l0,2" /><path class="rulrs2" d="M408,426 l0,-2" /><path class="rulrs2" d="M409,386 l0,2" /><path class="rulrs2" d="M409,426 l0,-2" /><path class="rulrs2" d="M410,386 l0,2" /><path class="rulrs2" d="M410,426 l0,-2" /><path class="rulrs2" d="M411,386 l0,2" /><path class="rulrs2" d="M411,426 l0,-2" /><path class="rulrs2" d="M412,386 l0,2" /><path class="rulrs2" d="M412,426 l0,-2" /><path class="rulrs2" d="M413,386 l0,2" /><path class="rulrs2" d="M413,426 l0,-2" /><path class="rulrs2" d="M414,386 l0,2" /><path class="rulrs2" d="M414,426 l0,-2" /><path class="rulrs2" d="M415,386 l0,2" /><path class="rulrs2" d="M415,426 l0,-2" /><path class="rulrs2" d="M416,386 l0,4" /><path class="rulrs2" d="M416,426 l0,-4" /><path class="rulrs2" d="M417,386 l0,2" /><path class="rulrs2" d="M417,426 l0,-2" /><path class="rulrs2" d="M418,386 l0,2" /><path class="rulrs2" d="M418,426 l0,-2" /><path class="rulrs2" d="M419,386 l0,2" /><path class="rulrs2" d="M419,426 l0,-2" /><path class="rulrs2" d="M420,386 l0,2" /><path class="rulrs2" d="M420,426 l0,-2" /><path class="rulrs2" d="M421,386 l0,2" /><path class="rulrs2" d="M421,426 l0,-2" /><path class="rulrs2" d="M422,386 l0,2" /><path class="rulrs2" d="M422,426 l0,-2" /><path class="rulrs2" d="M423,386 l0,2" /><path class="rulrs2" d="M423,426 l0,-2" /><path class="rulrs2" d="M424,386 l0,2" /><path class="rulrs2" d="M424,426 l0,-2" /><path class="rulrs2" d="M425,386 l0,2" /><path class="rulrs2" d="M425,426 l0,-2" /><path class="rulrs2" d="M426,386 l0,4" /><path class="rulrs2" d="M426,426 l0,-4" /><path class="rulrs2" d="M427,386 l0,2" /><path class="rulrs2" d="M427,426 l0,-2" /><path class="rulrs2" d="M428,386 l0,2" /><path class="rulrs2" d="M428,426 l0,-2" /><path class="rulrs2" d="M429,386 l0,2" /><path class="rulrs2" d="M429,426 l0,-2" /><path class="rulrs2" d="M430,386 l0,2" /><path class="rulrs2" d="M430,426 l0,-2" /><path class="rulrs2" d="M431,386 l0,2" /><path class="rulrs2" d="M431,426 l0,-2" /><path class="rulrs2" d="M432,386 l0,2" /><path class="rulrs2" d="M432,426 l0,-2" /><path class="rulrs2" d="M433,386 l0,2" /><path class="rulrs2" d="M433,426 l0,-2" /><path class="rulrs2" d="M434,386 l0,2" /><path class="rulrs2" d="M434,426 l0,-2" /><path class="rulrs2" d="M435,386 l0,2" /><path class="rulrs2" d="M435,426 l0,-2" /><path class="rulrs2" d="M436,386 l0,4" /><path class="rulrs2" d="M436,426 l0,-4" /><path class="rulrs2" d="M437,386 l0,2" /><path class="rulrs2" d="M437,426 l0,-2" /><path class="rulrs2" d="M438,386 l0,2" /><path class="rulrs2" d="M438,426 l0,-2" /><path class="rulrs2" d="M439,386 l0,2" /><path class="rulrs2" d="M439,426 l0,-2" /><path class="rulrs2" d="M440,386 l0,2" /><path class="rulrs2" d="M440,426 l0,-2" /><path class="rulrs2" d="M441,386 l0,2" /><path class="rulrs2" d="M441,426 l0,-2" /><path class="rulrs2" d="M442,386 l0,2" /><path class="rulrs2" d="M442,426 l0,-2" /><path class="rulrs2" d="M443,386 l0,2" /><path class="rulrs2" d="M443,426 l0,-2" /><path class="rulrs2" d="M444,386 l0,2" /><path class="rulrs2" d="M444,426 l0,-2" /><path class="rulrs2" d="M445,386 l0,2" /><path class="rulrs2" d="M445,426 l0,-2" /><path class="rulrs2" d="M446,386 l0,4" /><path class="rulrs2" d="M446,426 l0,-4" /><path class="rulrs2" d="M447,386 l0,2" /><path class="rulrs2" d="M447,426 l0,-2" /><path class="rulrs2" d="M448,386 l0,2" /><path class="rulrs2" d="M448,426 l0,-2" /><path class="rulrs2" d="M449,386 l0,2" /><path class="rulrs2" d="M449,426 l0,-2" /><path class="rulrs2" d="M450,386 l0,2" /><path class="rulrs2" d="M450,426 l0,-2" /><path class="rulrs2" d="M451,386 l0,2" /><path class="rulrs2" d="M451,426 l0,-2" /><path class="rulrs2" d="M452,386 l0,2" /><path class="rulrs2" d="M452,426 l0,-2" /><path class="rulrs2" d="M453,386 l0,2" /><path class="rulrs2" d="M453,426 l0,-2" /><path class="rulrs2" d="M454,386 l0,2" /><path class="rulrs2" d="M454,426 l0,-2" /><path class="rulrs2" d="M455,386 l0,2" /><path class="rulrs2" d="M455,426 l0,-2" /><path class="rulrs2" d="M456,386 l0,6" /><path class="rulrs2" d="M456,426 l0,-6" /><path class="rulrs2" d="M457,386 l0,2" /><path class="rulrs2" d="M457,426 l0,-2" /><path class="rulrs2" d="M458,386 l0,2" /><path class="rulrs2" d="M458,426 l0,-2" /><path class="rulrs2" d="M459,386 l0,2" /><path class="rulrs2" d="M459,426 l0,-2" /><path class="rulrs2" d="M460,386 l0,2" /><path class="rulrs2" d="M460,426 l0,-2" /><path class="rulrs2" d="M461,386 l0,2" /><path class="rulrs2" d="M461,426 l0,-2" /><path class="rulrs2" d="M462,386 l0,2" /><path class="rulrs2" d="M462,426 l0,-2" /><path class="rulrs2" d="M463,386 l0,2" /><path class="rulrs2" d="M463,426 l0,-2" /><path class="rulrs2" d="M464,386 l0,2" /><path class="rulrs2" d="M464,426 l0,-2" /><path class="rulrs2" d="M465,386 l0,2" /><path class="rulrs2" d="M465,426 l0,-2" /><path class="rulrs2" d="M466,386 l0,4" /><path class="rulrs2" d="M466,426 l0,-4" /><path class="rulrs2" d="M467,386 l0,2" /><path class="rulrs2" d="M467,426 l0,-2" /><path class="rulrs2" d="M468,386 l0,2" /><path class="rulrs2" d="M468,426 l0,-2" /><path class="rulrs2" d="M469,386 l0,2" /><path class="rulrs2" d="M469,426 l0,-2" /><path class="rulrs2" d="M470,386 l0,2" /><path class="rulrs2" d="M470,426 l0,-2" /><path class="rulrs2" d="M471,386 l0,2" /><path class="rulrs2" d="M471,426 l0,-2" /><path class="rulrs2" d="M472,386 l0,2" /><path class="rulrs2" d="M472,426 l0,-2" /><path class="rulrs2" d="M473,386 l0,2" /><path class="rulrs2" d="M473,426 l0,-2" /><path class="rulrs2" d="M474,386 l0,2" /><path class="rulrs2" d="M474,426 l0,-2" /><path class="rulrs2" d="M475,386 l0,2" /><path class="rulrs2" d="M475,426 l0,-2" /><path class="rulrs2" d="M476,386 l0,4" /><path class="rulrs2" d="M476,426 l0,-4" /><path class="rulrs2" d="M477,386 l0,2" /><path class="rulrs2" d="M477,426 l0,-2" /><path class="rulrs2" d="M478,386 l0,2" /><path class="rulrs2" d="M478,426 l0,-2" /><path class="rulrs2" d="M479,386 l0,2" /><path class="rulrs2" d="M479,426 l0,-2" /><path class="rulrs2" d="M480,386 l0,2" /><path class="rulrs2" d="M480,426 l0,-2" /><path class="rulrs2" d="M481,386 l0,2" /><path class="rulrs2" d="M481,426 l0,-2" /><path class="rulrs2" d="M482,386 l0,2" /><path class="rulrs2" d="M482,426 l0,-2" /><path class="rulrs2" d="M483,386 l0,2" /><path class="rulrs2" d="M483,426 l0,-2" /><path class="rulrs2" d="M484,386 l0,2" /><path class="rulrs2" d="M484,426 l0,-2" /><path class="rulrs2" d="M485,386 l0,2" /><path class="rulrs2" d="M485,426 l0,-2" /><path class="rulrs2" d="M486,386 l0,4" /><path class="rulrs2" d="M486,426 l0,-4" /><path class="rulrs2" d="M487,386 l0,2" /><path class="rulrs2" d="M487,426 l0,-2" /><path class="rulrs2" d="M488,386 l0,2" /><path class="rulrs2" d="M488,426 l0,-2" /><path class="rulrs2" d="M489,386 l0,2" /><path class="rulrs2" d="M489,426 l0,-2" /><path class="rulrs2" d="M490,386 l0,2" /><path class="rulrs2" d="M490,426 l0,-2" /><path class="rulrs2" d="M491,386 l0,2" /><path class="rulrs2" d="M491,426 l0,-2" /><path class="rulrs2" d="M492,386 l0,2" /><path class="rulrs2" d="M492,426 l0,-2" /><path class="rulrs2" d="M493,386 l0,2" /><path class="rulrs2" d="M493,426 l0,-2" /><path class="rulrs2" d="M494,386 l0,2" /><path class="rulrs2" d="M494,426 l0,-2" /><path class="rulrs2" d="M495,386 l0,2" /><path class="rulrs2" d="M495,426 l0,-2" /><path class="rulrs2" d="M496,386 l0,4" /><path class="rulrs2" d="M496,426 l0,-4" /><path class="rulrs2" d="M497,386 l0,2" /><path class="rulrs2" d="M497,426 l0,-2" /><path class="rulrs2" d="M498,386 l0,2" /><path class="rulrs2" d="M498,426 l0,-2" /><path class="rulrs2" d="M499,386 l0,2" /><path class="rulrs2" d="M499,426 l0,-2" /><path class="rulrs2" d="M500,386 l0,2" /><path class="rulrs2" d="M500,426 l0,-2" /><path class="rulrs2" d="M501,386 l0,2" /><path class="rulrs2" d="M501,426 l0,-2" /><path class="rulrs2" d="M502,386 l0,2" /><path class="rulrs2" d="M502,426 l0,-2" /><path class="rulrs2" d="M503,386 l0,2" /><path class="rulrs2" d="M503,426 l0,-2" /><path class="rulrs2" d="M504,386 l0,2" /><path class="rulrs2" d="M504,426 l0,-2" /><path class="rulrs2" d="M505,386 l0,2" /><path class="rulrs2" d="M505,426 l0,-2" /><path class="rulrs0" d="M506,386 l0,8" /><text class="rulrs5" x="506" y="395">3</text><path class="rulrs0" d="M506,426 l0,-8" /><text class="rulrs6" x="506" y="417">3</text><path class="rulrs2" d="M507,386 l0,2" /><path class="rulrs2" d="M507,426 l0,-2" /><path class="rulrs2" d="M508,386 l0,2" /><path class="rulrs2" d="M508,426 l0,-2" /><path class="rulrs2" d="M509,386 l0,2" /><path class="rulrs2" d="M509,426 l0,-2" /><path class="rulrs2" d="M510,386 l0,2" /><path class="rulrs2" d="M510,426 l0,-2" /><path class="rulrs2" d="M511,386 l0,2" /><path class="rulrs2" d="M511,426 l0,-2" /><path class="rulrs2" d="M512,386 l0,2" /><path class="rulrs2" d="M512,426 l0,-2" /><path class="rulrs2" d="M513,386 l0,2" /><path class="rulrs2" d="M513,426 l0,-2" /><path class="rulrs2" d="M514,386 l0,2" /><path class="rulrs2" d="M514,426 l0,-2" /><path class="rulrs2" d="M515,386 l0,2" /><path class="rulrs2" d="M515,426 l0,-2" /><path class="rulrs2" d="M516,386 l0,4" /><path class="rulrs2" d="M516,426 l0,-4" /><path class="rulrs2" d="M517,386 l0,2" /><path class="rulrs2" d="M517,426 l0,-2" /><path class="rulrs2" d="M518,386 l0,2" /><path class="rulrs2" d="M518,426 l0,-2" /><path class="rulrs2" d="M519,386 l0,2" /><path class="rulrs2" d="M519,426 l0,-2" /><path class="rulrs2" d="M520,386 l0,2" /><path class="rulrs2" d="M520,426 l0,-2" /><path class="rulrs2" d="M521,386 l0,2" /><path class="rulrs2" d="M521,426 l0,-2" /><path class="rulrs2" d="M522,386 l0,2" /><path class="rulrs2" d="M522,426 l0,-2" /><path class="rulrs2" d="M523,386 l0,2" /><path class="rulrs2" d="M523,426 l0,-2" /><path class="rulrs2" d="M524,386 l0,2" /><path class="rulrs2" d="M524,426 l0,-2" /><path class="rulrs2" d="M525,386 l0,2" /><path class="rulrs2" d="M525,426 l0,-2" /><path class="rulrs2" d="M526,386 l0,4" /><path class="rulrs2" d="M526,426 l0,-4" /><path class="rulrs2" d="M527,386 l0,2" /><path class="rulrs2" d="M527,426 l0,-2" /><path class="rulrs2" d="M528,386 l0,2" /><path class="rulrs2" d="M528,426 l0,-2" /><path class="rulrs2" d="M529,386 l0,2" /><path class="rulrs2" d="M529,426 l0,-2" /><path class="rulrs2" d="M530,386 l0,2" /><path class="rulrs2" d="M530,426 l0,-2" /><path class="rulrs2" d="M531,386 l0,2" /><path class="rulrs2" d="M531,426 l0,-2" /><path class="rulrs2" d="M532,386 l0,2" /><path class="rulrs2" d="M532,426 l0,-2" /><path class="rulrs2" d="M533,386 l0,2" /><path class="rulrs2" d="M533,426 l0,-2" /><path class="rulrs2" d="M534,386 l0,2" /><path class="rulrs2" d="M534,426 l0,-2" /><path class="rulrs2" d="M535,386 l0,2" /><path class="rulrs2" d="M535,426 l0,-2" /><path class="rulrs2" d="M536,386 l0,4" /><path class="rulrs2" d="M536,426 l0,-4" /><path class="rulrs2" d="M537,386 l0,2" /><path class="rulrs2" d="M537,426 l0,-2" /><path class="rulrs2" d="M538,386 l0,2" /><path class="rulrs2" d="M538,426 l0,-2" /><path class="rulrs2" d="M539,386 l0,2" /><path class="rulrs2" d="M539,426 l0,-2" /><path class="rulrs2" d="M540,386 l0,2" /><path class="rulrs2" d="M540,426 l0,-2" /><path class="rulrs2" d="M541,386 l0,2" /><path class="rulrs2" d="M541,426 l0,-2" /><path class="rulrs2" d="M542,386 l0,2" /><path class="rulrs2" d="M542,426 l0,-2" /><path class="rulrs2" d="M543,386 l0,2" /><path class="rulrs2" d="M543,426 l0,-2" /><path class="rulrs2" d="M544,386 l0,2" /><path class="rulrs2" d="M544,426 l0,-2" /><path class="rulrs2" d="M545,386 l0,2" /><path class="rulrs2" d="M545,426 l0,-2" /><path class="rulrs2" d="M546,386 l0,4" /><path class="rulrs2" d="M546,426 l0,-4" /><path class="rulrs2" d="M547,386 l0,2" /><path class="rulrs2" d="M547,426 l0,-2" /><path class="rulrs2" d="M548,386 l0,2" /><path class="rulrs2" d="M548,426 l0,-2" /><path class="rulrs2" d="M549,386 l0,2" /><path class="rulrs2" d="M549,426 l0,-2" /><path class="rulrs2" d="M550,386 l0,2" /><path class="rulrs2" d="M550,426 l0,-2" /><path class="rulrs2" d="M551,386 l0,2" /><path class="rulrs2" d="M551,426 l0,-2" /><path class="rulrs2" d="M552,386 l0,2" /><path class="rulrs2" d="M552,426 l0,-2" /><path class="rulrs2" d="M553,386 l0,2" /><path class="rulrs2" d="M553,426 l0,-2" /><path class="rulrs2" d="M554,386 l0,2" /><path class="rulrs2" d="M554,426 l0,-2" /><path class="rulrs2" d="M555,386 l0,2" /><path class="rulrs2" d="M555,426 l0,-2" /><path class="rulrs2" d="M556,386 l0,6" /><path class="rulrs2" d="M556,426 l0,-6" /><path class="rulrs2" d="M557,386 l0,2" /><path class="rulrs2" d="M557,426 l0,-2" /><path class="rulrs2" d="M558,386 l0,2" /><path class="rulrs2" d="M558,426 l0,-2" /><path class="rulrs2" d="M559,386 l0,2" /><path class="rulrs2" d="M559,426 l0,-2" /><path class="rulrs2" d="M560,386 l0,2" /><path class="rulrs2" d="M560,426 l0,-2" /><path class="rulrs2" d="M561,386 l0,2" /><path class="rulrs2" d="M561,426 l0,-2" /><path class="rulrs2" d="M562,386 l0,2" /><path class="rulrs2" d="M562,426 l0,-2" /><path class="rulrs2" d="M563,386 l0,2" /><path class="rulrs2" d="M563,426 l0,-2" /><path class="rulrs2" d="M564,386 l0,2" /><path class="rulrs2" d="M564,426 l0,-2" /><path class="rulrs2" d="M565,386 l0,2" /><path class="rulrs2" d="M565,426 l0,-2" /><path class="rulrs2" d="M566,386 l0,4" /><path class="rulrs2" d="M566,426 l0,-4" /><path class="rulrs2" d="M567,386 l0,2" /><path class="rulrs2" d="M567,426 l0,-2" /><path class="rulrs2" d="M568,386 l0,2" /><path class="rulrs2" d="M568,426 l0,-2" /><path class="rulrs2" d="M569,386 l0,2" /><path class="rulrs2" d="M569,426 l0,-2" /><path class="rulrs2" d="M570,386 l0,2" /><path class="rulrs2" d="M570,426 l0,-2" /><path class="rulrs2" d="M571,386 l0,2" /><path class="rulrs2" d="M571,426 l0,-2" /><path class="rulrs2" d="M572,386 l0,2" /><path class="rulrs2" d="M572,426 l0,-2" /><path class="rulrs2" d="M573,386 l0,2" /><path class="rulrs2" d="M573,426 l0,-2" /><path class="rulrs2" d="M574,386 l0,2" /><path class="rulrs2" d="M574,426 l0,-2" /><path class="rulrs2" d="M575,386 l0,2" /><path class="rulrs2" d="M575,426 l0,-2" /><path class="rulrs2" d="M576,386 l0,4" /><path class="rulrs2" d="M576,426 l0,-4" /><path class="rulrs2" d="M577,386 l0,2" /><path class="rulrs2" d="M577,426 l0,-2" /><path class="rulrs2" d="M578,386 l0,2" /><path class="rulrs2" d="M578,426 l0,-2" /><path class="rulrs2" d="M579,386 l0,2" /><path class="rulrs2" d="M579,426 l0,-2" /><path class="rulrs2" d="M580,386 l0,2" /><path class="rulrs2" d="M580,426 l0,-2" /><path class="rulrs2" d="M581,386 l0,2" /><path class="rulrs2" d="M581,426 l0,-2" /><path class="rulrs2" d="M582,386 l0,2" /><path class="rulrs2" d="M582,426 l0,-2" /><path class="rulrs2" d="M583,386 l0,2" /><path class="rulrs2" d="M583,426 l0,-2" /><path class="rulrs2" d="M584,386 l0,2" /><path class="rulrs2" d="M584,426 l0,-2" /><path class="rulrs2" d="M585,386 l0,2" /><path class="rulrs2" d="M585,426 l0,-2" /><path class="rulrs2" d="M586,386 l0,4" /><path class="rulrs2" d="M586,426 l0,-4" /><path class="rulrs2" d="M587,386 l0,2" /><path class="rulrs2" d="M587,426 l0,-2" /><path class="rulrs2" d="M588,386 l0,2" /><path class="rulrs2" d="M588,426 l0,-2" /><path class="rulrs2" d="M589,386 l0,2" /><path class="rulrs2" d="M589,426 l0,-2" /><path class="rulrs2" d="M590,386 l0,2" /><path class="rulrs2" d="M590,426 l0,-2" /><path class="rulrs2" d="M591,386 l0,2" /><path class="rulrs2" d="M591,426 l0,-2" /><path class="rulrs2" d="M592,386 l0,2" /><path class="rulrs2" d="M592,426 l0,-2" /><path class="rulrs2" d="M593,386 l0,2" /><path class="rulrs2" d="M593,426 l0,-2" /><path class="rulrs2" d="M594,386 l0,2" /><path class="rulrs2" d="M594,426 l0,-2" /><path class="rulrs2" d="M595,386 l0,2" /><path class="rulrs2" d="M595,426 l0,-2" /><path class="rulrs2" d="M596,386 l0,4" /><path class="rulrs2" d="M596,426 l0,-4" /><path class="rulrs2" d="M597,386 l0,2" /><path class="rulrs2" d="M597,426 l0,-2" /><path class="rulrs2" d="M598,386 l0,2" /><path class="rulrs2" d="M598,426 l0,-2" /><path class="rulrs2" d="M599,386 l0,2" /><path class="rulrs2" d="M599,426 l0,-2" /><path class="rulrs2" d="M600,386 l0,2" /><path class="rulrs2" d="M600,426 l0,-2" /><path class="rulrs2" d="M601,386 l0,2" /><path class="rulrs2" d="M601,426 l0,-2" /><path class="rulrs2" d="M602,386 l0,2" /><path class="rulrs2" d="M602,426 l0,-2" /><path class="rulrs2" d="M603,386 l0,2" /><path class="rulrs2" d="M603,426 l0,-2" /><path class="rulrs2" d="M604,386 l0,2" /><path class="rulrs2" d="M604,426 l0,-2" /><path class="rulrs2" d="M605,386 l0,2" /><path class="rulrs2" d="M605,426 l0,-2" /><path class="rulrs0" d="M606,386 l0,8" /><text class="rulrs5" x="606" y="395">4</text><path class="rulrs0" d="M606,426 l0,-8" /><text class="rulrs6" x="606" y="417">4</text><path class="rulrs2" d="M607,386 l0,2" /><path class="rulrs2" d="M607,426 l0,-2" /><path class="rulrs2" d="M608,386 l0,2" /><path class="rulrs2" d="M608,426 l0,-2" /><path class="rulrs2" d="M609,386 l0,2" /><path class="rulrs2" d="M609,426 l0,-2" /><path class="rulrs2" d="M610,386 l0,2" /><path class="rulrs2" d="M610,426 l0,-2" /><path class="rulrs2" d="M611,386 l0,2" /><path class="rulrs2" d="M611,426 l0,-2" /><path class="rulrs2" d="M612,386 l0,2" /><path class="rulrs2" d="M612,426 l0,-2" /><path class="rulrs2" d="M613,386 l0,2" /><path class="rulrs2" d="M613,426 l0,-2" /><path class="rulrs2" d="M614,386 l0,2" /><path class="rulrs2" d="M614,426 l0,-2" /><path class="rulrs2" d="M615,386 l0,2" /><path class="rulrs2" d="M615,426 l0,-2" /><path class="rulrs2" d="M616,386 l0,4" /><path class="rulrs2" d="M616,426 l0,-4" /><path class="rulrs2" d="M617,386 l0,2" /><path class="rulrs2" d="M617,426 l0,-2" /><path class="rulrs2" d="M618,386 l0,2" /><path class="rulrs2" d="M618,426 l0,-2" /><path class="rulrs2" d="M619,386 l0,2" /><path class="rulrs2" d="M619,426 l0,-2" /><path class="rulrs2" d="M620,386 l0,2" /><path class="rulrs2" d="M620,426 l0,-2" /><path class="rulrs2" d="M621,386 l0,2" /><path class="rulrs2" d="M621,426 l0,-2" /><path class="rulrs2" d="M622,386 l0,2" /><path class="rulrs2" d="M622,426 l0,-2" /><path class="rulrs2" d="M623,386 l0,2" /><path class="rulrs2" d="M623,426 l0,-2" /><path class="rulrs2" d="M624,386 l0,2" /><path class="rulrs2" d="M624,426 l0,-2" /><path class="rulrs2" d="M625,386 l0,2" /><path class="rulrs2" d="M625,426 l0,-2" /><path class="rulrs2" d="M626,386 l0,4" /><path class="rulrs2" d="M626,426 l0,-4" /><path class="rulrs2" d="M627,386 l0,2" /><path class="rulrs2" d="M627,426 l0,-2" /><path class="rulrs2" d="M628,386 l0,2" /><path class="rulrs2" d="M628,426 l0,-2" /><path class="rulrs2" d="M629,386 l0,2" /><path class="rulrs2" d="M629,426 l0,-2" /><path class="rulrs2" d="M630,386 l0,2" /><path class="rulrs2" d="M630,426 l0,-2" /><path class="rulrs2" d="M631,386 l0,2" /><path class="rulrs2" d="M631,426 l0,-2" /><path class="rulrs2" d="M632,386 l0,2" /><path class="rulrs2" d="M632,426 l0,-2" /><path class="rulrs2" d="M633,386 l0,2" /><path class="rulrs2" d="M633,426 l0,-2" /><path class="rulrs2" d="M634,386 l0,2" /><path class="rulrs2" d="M634,426 l0,-2" /><path class="rulrs2" d="M635,386 l0,2" /><path class="rulrs2" d="M635,426 l0,-2" /><path class="rulrs2" d="M636,386 l0,4" /><path class="rulrs2" d="M636,426 l0,-4" /><path class="rulrs2" d="M637,386 l0,2" /><path class="rulrs2" d="M637,426 l0,-2" /><path class="rulrs2" d="M638,386 l0,2" /><path class="rulrs2" d="M638,426 l0,-2" /><path class="rulrs2" d="M639,386 l0,2" /><path class="rulrs2" d="M639,426 l0,-2" /><path class="rulrs2" d="M640,386 l0,2" /><path class="rulrs2" d="M640,426 l0,-2" /><path class="rulrs2" d="M641,386 l0,2" /><path class="rulrs2" d="M641,426 l0,-2" /><path class="rulrs2" d="M642,386 l0,2" /><path class="rulrs2" d="M642,426 l0,-2" /><path class="rulrs2" d="M643,386 l0,2" /><path class="rulrs2" d="M643,426 l0,-2" /><path class="rulrs2" d="M644,386 l0,2" /><path class="rulrs2" d="M644,426 l0,-2" /><path class="rulrs2" d="M645,386 l0,2" /><path class="rulrs2" d="M645,426 l0,-2" /><path class="rulrs2" d="M646,386 l0,4" /><path class="rulrs2" d="M646,426 l0,-4" /><path class="rulrs2" d="M647,386 l0,2" /><path class="rulrs2" d="M647,426 l0,-2" /><path class="rulrs2" d="M648,386 l0,2" /><path class="rulrs2" d="M648,426 l0,-2" /><path class="rulrs2" d="M649,386 l0,2" /><path class="rulrs2" d="M649,426 l0,-2" /><path class="rulrs2" d="M650,386 l0,2" /><path class="rulrs2" d="M650,426 l0,-2" /><path class="rulrs2" d="M651,386 l0,2" /><path class="rulrs2" d="M651,426 l0,-2" /><path class="rulrs2" d="M652,386 l0,2" /><path class="rulrs2" d="M652,426 l0,-2" /><path class="rulrs2" d="M653,386 l0,2" /><path class="rulrs2" d="M653,426 l0,-2" /><path class="rulrs2" d="M654,386 l0,2" /><path class="rulrs2" d="M654,426 l0,-2" /><path class="rulrs2" d="M655,386 l0,2" /><path class="rulrs2" d="M655,426 l0,-2" /><path class="rulrs2" d="M656,386 l0,6" /><path class="rulrs2" d="M656,426 l0,-6" /><path class="rulrs2" d="M657,386 l0,2" /><path class="rulrs2" d="M657,426 l0,-2" /><path class="rulrs2" d="M658,386 l0,2" /><path class="rulrs2" d="M658,426 l0,-2" /><path class="rulrs2" d="M659,386 l0,2" /><path class="rulrs2" d="M659,426 l0,-2" /><path class="rulrs2" d="M660,386 l0,2" /><path class="rulrs2" d="M660,426 l0,-2" /><path class="rulrs2" d="M661,386 l0,2" /><path class="rulrs2" d="M661,426 l0,-2" /><path class="rulrs2" d="M662,386 l0,2" /><path class="rulrs2" d="M662,426 l0,-2" /><path class="rulrs2" d="M663,386 l0,2" /><path class="rulrs2" d="M663,426 l0,-2" /><path class="rulrs2" d="M664,386 l0,2" /><path class="rulrs2" d="M664,426 l0,-2" /><path class="rulrs2" d="M665,386 l0,2" /><path class="rulrs2" d="M665,426 l0,-2" /><path class="rulrs2" d="M666,386 l0,4" /><path class="rulrs2" d="M666,426 l0,-4" /><path class="rulrs2" d="M667,386 l0,2" /><path class="rulrs2" d="M667,426 l0,-2" /><path class="rulrs2" d="M668,386 l0,2" /><path class="rulrs2" d="M668,426 l0,-2" /><path class="rulrs2" d="M669,386 l0,2" /><path class="rulrs2" d="M669,426 l0,-2" /><path class="rulrs2" d="M670,386 l0,2" /><path class="rulrs2" d="M670,426 l0,-2" /><path class="rulrs2" d="M671,386 l0,2" /><path class="rulrs2" d="M671,426 l0,-2" /><path class="rulrs2" d="M672,386 l0,2" /><path class="rulrs2" d="M672,426 l0,-2" /><path class="rulrs2" d="M673,386 l0,2" /><path class="rulrs2" d="M673,426 l0,-2" /><path class="rulrs2" d="M674,386 l0,2" /><path class="rulrs2" d="M674,426 l0,-2" /><path class="rulrs2" d="M675,386 l0,2" /><path class="rulrs2" d="M675,426 l0,-2" /><path class="rulrs2" d="M676,386 l0,4" /><path class="rulrs2" d="M676,426 l0,-4" /><path class="rulrs2" d="M677,386 l0,2" /><path class="rulrs2" d="M677,426 l0,-2" /><path class="rulrs2" d="M678,386 l0,2" /><path class="rulrs2" d="M678,426 l0,-2" /><path class="rulrs2" d="M679,386 l0,2" /><path class="rulrs2" d="M679,426 l0,-2" /><path class="rulrs2" d="M680,386 l0,2" /><path class="rulrs2" d="M680,426 l0,-2" /><path class="rulrs2" d="M681,386 l0,2" /><path class="rulrs2" d="M681,426 l0,-2" /><path class="rulrs2" d="M682,386 l0,2" /><path class="rulrs2" d="M682,426 l0,-2" /><path class="rulrs2" d="M683,386 l0,2" /><path class="rulrs2" d="M683,426 l0,-2" /><path class="rulrs2" d="M684,386 l0,2" /><path class="rulrs2" d="M684,426 l0,-2" /><path class="rulrs2" d="M685,386 l0,2" /><path class="rulrs2" d="M685,426 l0,-2" /><path class="rulrs2" d="M686,386 l0,4" /><path class="rulrs2" d="M686,426 l0,-4" /><path class="rulrs2" d="M687,386 l0,2" /><path class="rulrs2" d="M687,426 l0,-2" /><path class="rulrs2" d="M688,386 l0,2" /><path class="rulrs2" d="M688,426 l0,-2" /><path class="rulrs2" d="M689,386 l0,2" /><path class="rulrs2" d="M689,426 l0,-2" /><path class="rulrs2" d="M690,386 l0,2" /><path class="rulrs2" d="M690,426 l0,-2" /><path class="rulrs2" d="M691,386 l0,2" /><path class="rulrs2" d="M691,426 l0,-2" /><path class="rulrs2" d="M692,386 l0,2" /><path class="rulrs2" d="M692,426 l0,-2" /><path class="rulrs2" d="M693,386 l0,2" /><path class="rulrs2" d="M693,426 l0,-2" /><path class="rulrs2" d="M694,386 l0,2" /><path class="rulrs2" d="M694,426 l0,-2" /><path class="rulrs2" d="M695,386 l0,2" /><path class="rulrs2" d="M695,426 l0,-2" /><path class="rulrs2" d="M696,386 l0,4" /><path class="rulrs2" d="M696,426 l0,-4" /><path class="rulrs2" d="M697,386 l0,2" /><path class="rulrs2" d="M697,426 l0,-2" /><path class="rulrs2" d="M698,386 l0,2" /><path class="rulrs2" d="M698,426 l0,-2" /><path class="rulrs2" d="M699,386 l0,2" /><path class="rulrs2" d="M699,426 l0,-2" /><path class="rulrs2" d="M700,386 l0,2" /><path class="rulrs2" d="M700,426 l0,-2" /><path class="rulrs2" d="M701,386 l0,2" /><path class="rulrs2" d="M701,426 l0,-2" /><path class="rulrs2" d="M702,386 l0,2" /><path class="rulrs2" d="M702,426 l0,-2" /><path class="rulrs2" d="M703,386 l0,2" /><path class="rulrs2" d="M703,426 l0,-2" /><path class="rulrs2" d="M704,386 l0,2" /><path class="rulrs2" d="M704,426 l0,-2" /><path class="rulrs2" d="M705,386 l0,2" /><path class="rulrs2" d="M705,426 l0,-2" /><path class="rulrs0" d="M706,386 l0,8" /><text class="rulrs5" x="706" y="395">5</text><path class="rulrs0" d="M706,426 l0,-8" /><text class="rulrs6" x="706" y="417">5</text><path class="rulrs2" d="M707,386 l0,2" /><path class="rulrs2" d="M707,426 l0,-2" /><path class="rulrs2" d="M708,386 l0,2" /><path class="rulrs2" d="M708,426 l0,-2" /><path class="rulrs2" d="M709,386 l0,2" /><path class="rulrs2" d="M709,426 l0,-2" /><path class="rulrs2" d="M710,386 l0,2" /><path class="rulrs2" d="M710,426 l0,-2" /><path class="rulrs2" d="M711,386 l0,2" /><path class="rulrs2" d="M711,426 l0,-2" /><path class="rulrs2" d="M712,386 l0,2" /><path class="rulrs2" d="M712,426 l0,-2" /><path class="rulrs2" d="M713,386 l0,2" /><path class="rulrs2" d="M713,426 l0,-2" /><path class="rulrs2" d="M714,386 l0,2" /><path class="rulrs2" d="M714,426 l0,-2" /><path class="rulrs2" d="M715,386 l0,2" /><path class="rulrs2" d="M715,426 l0,-2" /><path class="rulrs2" d="M716,386 l0,4" /><path class="rulrs2" d="M716,426 l0,-4" /><path class="rulrs2" d="M717,386 l0,2" /><path class="rulrs2" d="M717,426 l0,-2" /><path class="rulrs2" d="M718,386 l0,2" /><path class="rulrs2" d="M718,426 l0,-2" /><path class="rulrs2" d="M719,386 l0,2" /><path class="rulrs2" d="M719,426 l0,-2" /><path class="rulrs2" d="M720,386 l0,2" /><path class="rulrs2" d="M720,426 l0,-2" /><path class="rulrs2" d="M721,386 l0,2" /><path class="rulrs2" d="M721,426 l0,-2" /><path class="rulrs2" d="M722,386 l0,2" /><path class="rulrs2" d="M722,426 l0,-2" /><path class="rulrs2" d="M723,386 l0,2" /><path class="rulrs2" d="M723,426 l0,-2" /><path class="rulrs2" d="M724,386 l0,2" /><path class="rulrs2" d="M724,426 l0,-2" /><path class="rulrs2" d="M725,386 l0,2" /><path class="rulrs2" d="M725,426 l0,-2" /><path class="rulrs2" d="M726,386 l0,4" /><path class="rulrs2" d="M726,426 l0,-4" /><path class="rulrs2" d="M727,386 l0,2" /><path class="rulrs2" d="M727,426 l0,-2" /><path class="rulrs2" d="M728,386 l0,2" /><path class="rulrs2" d="M728,426 l0,-2" /><path class="rulrs2" d="M729,386 l0,2" /><path class="rulrs2" d="M729,426 l0,-2" /><path class="rulrs2" d="M730,386 l0,2" /><path class="rulrs2" d="M730,426 l0,-2" /><path class="rulrs2" d="M731,386 l0,2" /><path class="rulrs2" d="M731,426 l0,-2" /><path class="rulrs2" d="M732,386 l0,2" /><path class="rulrs2" d="M732,426 l0,-2" /><path class="rulrs2" d="M733,386 l0,2" /><path class="rulrs2" d="M733,426 l0,-2" /><path class="rulrs2" d="M734,386 l0,2" /><path class="rulrs2" d="M734,426 l0,-2" /><path class="rulrs2" d="M735,386 l0,2" /><path class="rulrs2" d="M735,426 l0,-2" /><path class="rulrs2" d="M736,386 l0,4" /><path class="rulrs2" d="M736,426 l0,-4" /><path class="rulrs2" d="M737,386 l0,2" /><path class="rulrs2" d="M737,426 l0,-2" /><path class="rulrs2" d="M738,386 l0,2" /><path class="rulrs2" d="M738,426 l0,-2" /><path class="rulrs2" d="M739,386 l0,2" /><path class="rulrs2" d="M739,426 l0,-2" /><path class="rulrs2" d="M740,386 l0,2" /><path class="rulrs2" d="M740,426 l0,-2" /><path class="rulrs2" d="M741,386 l0,2" /><path class="rulrs2" d="M741,426 l0,-2" /><path class="rulrs2" d="M742,386 l0,2" /><path class="rulrs2" d="M742,426 l0,-2" /><path class="rulrs2" d="M743,386 l0,2" /><path class="rulrs2" d="M743,426 l0,-2" /><path class="rulrs2" d="M744,386 l0,2" /><path class="rulrs2" d="M744,426 l0,-2" /><path class="rulrs2" d="M745,386 l0,2" /><path class="rulrs2" d="M745,426 l0,-2" /><path class="rulrs2" d="M746,386 l0,4" /><path class="rulrs2" d="M746,426 l0,-4" /><path class="rulrs2" d="M747,386 l0,2" /><path class="rulrs2" d="M747,426 l0,-2" /><path class="rulrs2" d="M748,386 l0,2" /><path class="rulrs2" d="M748,426 l0,-2" /><path class="rulrs2" d="M749,386 l0,2" /><path class="rulrs2" d="M749,426 l0,-2" /><path class="rulrs2" d="M750,386 l0,2" /><path class="rulrs2" d="M750,426 l0,-2" /><path class="rulrs2" d="M751,386 l0,2" /><path class="rulrs2" d="M751,426 l0,-2" /><path class="rulrs2" d="M752,386 l0,2" /><path class="rulrs2" d="M752,426 l0,-2" /><path class="rulrs2" d="M753,386 l0,2" /><path class="rulrs2" d="M753,426 l0,-2" /><path class="rulrs2" d="M754,386 l0,2" /><path class="rulrs2" d="M754,426 l0,-2" /><path class="rulrs2" d="M755,386 l0,2" /><path class="rulrs2" d="M755,426 l0,-2" /><path class="rulrs2" d="M756,386 l0,6" /><path class="rulrs2" d="M756,426 l0,-6" /><path class="rulrs2" d="M757,386 l0,2" /><path class="rulrs2" d="M757,426 l0,-2" /><path class="rulrs2" d="M758,386 l0,2" /><path class="rulrs2" d="M758,426 l0,-2" /><path class="rulrs2" d="M759,386 l0,2" /><path class="rulrs2" d="M759,426 l0,-2" /><path class="rulrs2" d="M760,386 l0,2" /><path class="rulrs2" d="M760,426 l0,-2" /><path class="rulrs2" d="M761,386 l0,2" /><path class="rulrs2" d="M761,426 l0,-2" /><path class="rulrs2" d="M762,386 l0,2" /><path class="rulrs2" d="M762,426 l0,-2" /><path class="rulrs2" d="M763,386 l0,2" /><path class="rulrs2" d="M763,426 l0,-2" /><path class="rulrs2" d="M764,386 l0,2" /><path class="rulrs2" d="M764,426 l0,-2" /><path class="rulrs2" d="M765,386 l0,2" /><path class="rulrs2" d="M765,426 l0,-2" /><path class="rulrs2" d="M766,386 l0,4" /><path class="rulrs2" d="M766,426 l0,-4" /><path class="rulrs2" d="M767,386 l0,2" /><path class="rulrs2" d="M767,426 l0,-2" /><path class="rulrs2" d="M768,386 l0,2" /><path class="rulrs2" d="M768,426 l0,-2" /><path class="rulrs2" d="M769,386 l0,2" /><path class="rulrs2" d="M769,426 l0,-2" /><path class="rulrs2" d="M770,386 l0,2" /><path class="rulrs2" d="M770,426 l0,-2" /><path class="rulrs2" d="M771,386 l0,2" /><path class="rulrs2" d="M771,426 l0,-2" /><path class="rulrs2" d="M772,386 l0,2" /><path class="rulrs2" d="M772,426 l0,-2" /><path class="rulrs2" d="M773,386 l0,2" /><path class="rulrs2" d="M773,426 l0,-2" /><path class="rulrs2" d="M774,386 l0,2" /><path class="rulrs2" d="M774,426 l0,-2" /><path class="rulrs2" d="M775,386 l0,2" /><path class="rulrs2" d="M775,426 l0,-2" /><path class="rulrs2" d="M776,386 l0,4" /><path class="rulrs2" d="M776,426 l0,-4" /><path class="rulrs2" d="M777,386 l0,2" /><path class="rulrs2" d="M777,426 l0,-2" /><path class="rulrs2" d="M778,386 l0,2" /><path class="rulrs2" d="M778,426 l0,-2" /><path class="rulrs2" d="M779,386 l0,2" /><path class="rulrs2" d="M779,426 l0,-2" /><path class="rulrs2" d="M780,386 l0,2" /><path class="rulrs2" d="M780,426 l0,-2" /><path class="rulrs2" d="M781,386 l0,2" /><path class="rulrs2" d="M781,426 l0,-2" /><path class="rulrs2" d="M782,386 l0,2" /><path class="rulrs2" d="M782,426 l0,-2" /><path class="rulrs2" d="M783,386 l0,2" /><path class="rulrs2" d="M783,426 l0,-2" /><path class="rulrs2" d="M784,386 l0,2" /><path class="rulrs2" d="M784,426 l0,-2" /><path class="rulrs2" d="M785,386 l0,2" /><path class="rulrs2" d="M785,426 l0,-2" /><path class="rulrs2" d="M786,386 l0,4" /><path class="rulrs2" d="M786,426 l0,-4" /><path class="rulrs2" d="M787,386 l0,2" /><path class="rulrs2" d="M787,426 l0,-2" /><path class="rulrs2" d="M788,386 l0,2" /><path class="rulrs2" d="M788,426 l0,-2" /><path class="rulrs2" d="M789,386 l0,2" /><path class="rulrs2" d="M789,426 l0,-2" /><path class="rulrs2" d="M790,386 l0,2" /><path class="rulrs2" d="M790,426 l0,-2" /><path class="rulrs2" d="M791,386 l0,2" /><path class="rulrs2" d="M791,426 l0,-2" /><path class="rulrs2" d="M792,386 l0,2" /><path class="rulrs2" d="M792,426 l0,-2" /><path class="rulrs2" d="M793,386 l0,2" /><path class="rulrs2" d="M793,426 l0,-2" /><path class="rulrs2" d="M794,386 l0,2" /><path class="rulrs2" d="M794,426 l0,-2" /><path class="rulrs2" d="M795,386 l0,2" /><path class="rulrs2" d="M795,426 l0,-2" /><path class="rulrs2" d="M796,386 l0,4" /><path class="rulrs2" d="M796,426 l0,-4" /><path class="rulrs2" d="M797,386 l0,2" /><path class="rulrs2" d="M797,426 l0,-2" /><path class="rulrs2" d="M798,386 l0,2" /><path class="rulrs2" d="M798,426 l0,-2" /><path class="rulrs2" d="M799,386 l0,2" /><path class="rulrs2" d="M799,426 l0,-2" /><path class="rulrs2" d="M800,386 l0,2" /><path class="rulrs2" d="M800,426 l0,-2" /><path class="rulrs2" d="M801,386 l0,2" /><path class="rulrs2" d="M801,426 l0,-2" /><path class="rulrs2" d="M802,386 l0,2" /><path class="rulrs2" d="M802,426 l0,-2" /><path class="rulrs2" d="M803,386 l0,2" /><path class="rulrs2" d="M803,426 l0,-2" /><path class="rulrs2" d="M804,386 l0,2" /><path class="rulrs2" d="M804,426 l0,-2" /><path class="rulrs2" d="M805,386 l0,2" /><path class="rulrs2" d="M805,426 l0,-2" /><path class="rulrs0" d="M806,386 l0,8" /><text class="rulrs5" x="806" y="395">6</text><path class="rulrs0" d="M806,426 l0,-8" /><text class="rulrs6" x="806" y="417">6</text><circle cx="606" cy="406" r="5" class="rulrs3" /><circle cx="606" cy="406" r="5.5" class="rulrs0" /><path class="rulrs1" d="M206,406 l394,0" /><path class="rulrs1" d="M612,406 l194,0" /><path class="rulrs1" d="M406,402 l0,8" />'
            });
        }
        _createDragMarkerIcon() {
            const zoom = this._map.getZoom();
            const transformation = this._getTransformation();
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
        }
        _createRotateMarkerIcon() {
            const zoom = this._map.getZoom();
            const size = 11 / 812;
            const transformation = this._getTransformation();
            const scale = this._map.options.crs.scale(zoom);
            const w = Math.abs(transformation._a) * scale * this.options.widthInMeters * size;
            const h = Math.abs(transformation._c) * scale * this.options.heightInMeters * size;
            return L.icon({
                iconUrl: '/img/transparent.png',
                iconSize: [w, h],
                iconAnchor: [w / 2, h / 2],
                className: 'map-utils-tools-ruler-rotate'
            });
        }
        _getRotateMarkerPosition() {
            const rel = this.options.widthInMeters * 200 / 812;
            return [
                this._latlng.lat + (Math.cos((this._bearing + 90) * Math.PI / 180) * rel),
                this._latlng.lng + (Math.sin((this._bearing + 90) * Math.PI / 180) * rel)
            ];
        }
        _updateRotateMarkerPosition() {
            if (this._rotateMarker) {
                this._rotateMarker.setLatLng(this._getRotateMarkerPosition());
            }
        }
        _updateRotateMarkerSize() {
            this._rotateMarker.setIcon(this._createRotateMarkerIcon());
        }
        _onRotateMarkerDrag() {
            this.setBearing(GameMapUtils.computeBearingDegrees(this._latlng, this._rotateMarker.getLatLng(), this._map) - 90);
        }
        _updateDragMarkerIconTransform() {
            const icon = this._dragMarker._icon;
            const idx = icon.style.transform.indexOf('rotateZ');
            if (idx != -1) {
                icon.style.transform = icon.style.transform.substring(0, idx) + 'rotateZ(' + this._bearing + 'deg)';
            }
            else {
                icon.style.transform += ' rotateZ(' + this._bearing + 'deg)';
            }
            const a = this._dragMarker.options.icon.options.iconAnchor;
            icon.style.transformOrigin = a[0] + "px " + a[1] + "px";
        }
        _resetBearing() {
            this.setBearing(0);
            return false;
        }
        _createRotateMarker() {
            return L.marker(this._getRotateMarkerPosition(), {
                icon: this._createRotateMarkerIcon(),
                draggable: true,
                autoPanOnFocus: false,
                zIndexOffset: 1000,
                title: 'Drag to rotate the ruler. Double click to reset to West-East.'
            })
                .on('drag', this._onRotateMarkerDrag, this)
                .on('dblclick', this._resetBearing, this);
        }
    }
    GameMapUtils.Ruler = Ruler;
    function ruler(latLng) {
        return new GameMapUtils.Ruler(latLng);
    }
    GameMapUtils.ruler = ruler;
    class ToggleToolButton extends GameMapUtils.ToggleButton {
        constructor(options) {
            super(L.extend({
                tool: GameMapUtils.ruler,
                content: 'Ruler'
            }, options));
            this._toolInstance = null;
        }
        onDisable(map) {
            if (this._toolInstance) {
                this._toolInstance.removeFrom(map);
            }
        }
        onEnable(map) {
            if (!this._toolInstance) {
                this._toolInstance = this.options.tool(map.getCenter());
            }
            this._toolInstance.addTo(map);
        }
    }
    GameMapUtils.ToggleToolButton = ToggleToolButton;
    function rulerToolButton(options) {
        return new GameMapUtils.ToggleToolButton(L.extend({
            tool: GameMapUtils.ruler,
            content: '<img src="/img/ruler.svg" width="16" height="16" class="revertable"/>'
        }, options));
    }
    GameMapUtils.rulerToolButton = rulerToolButton;
    ;
    function coordinateScaleToolButton(options) {
        return new GameMapUtils.ToggleToolButton(L.extend({
            tool: GameMapUtils.coordinateScale,
            content: '<img src="/img/grid.svg" width="16" height="16" class="revertable"/>'
        }, options));
    }
    GameMapUtils.coordinateScaleToolButton = coordinateScaleToolButton;
    ;
    function protractorToolButton(options) {
        return new GameMapUtils.ToggleToolButton(L.extend({
            tool: GameMapUtils.protractor,
            content: '<img src="/img/protractor.svg" width="16" height="16" class="revertable"/>'
        }, options));
    }
    GameMapUtils.protractorToolButton = protractorToolButton;
    ;
})(GameMapUtils || (GameMapUtils = {}));
;
/// <reference path="../types/leaflet.d.ts" />
/// <reference path="GameMapUtils.ts" />
/// <reference path="Overlays.ts" /> 
var GameMapUtils;
(function (GameMapUtils) {
    GameMapUtils.MapEditToolsGroup = new GameMapUtils.ToggleButtonGroup();
    class HandToolButton extends GameMapUtils.ToggleButton {
        constructor(options) {
            super(L.extend({
                group: GameMapUtils.MapEditToolsGroup,
                content: '<img src="/img/hand.svg" width="16" height="16" class="revertable" />'
            }, options));
        }
        onDisable(map) {
        }
        onEnable(map) {
        }
    }
    function handToolButton(options) {
        return new HandToolButton(options);
    }
    GameMapUtils.handToolButton = handToolButton;
    const intl = new Intl.NumberFormat();
    class MeasureMarker extends L.Polyline {
        constructor(latlngs, options) {
            super(latlngs, L.extend({ color: '#000000', weight: 1.3, dashArray: '4', interactive: false }, options));
            this._toolTips = [];
            this.on('add', () => {
                this._toolTips = [];
                this._updateMarkers();
            });
            this.on('remove', () => {
                this._toolTips.forEach(tp => tp.remove());
                this._toolTips = [];
            });
        }
        _updateMarkers() {
            const posList = this.getLatLngs();
            for (let i = 0; i < posList.length - 1; ++i) {
                const formatedDistance = this._tooltipContent(posList[i], posList[i + 1]);
                const center = new L.LatLngBounds(posList[i], posList[i + 1]).getCenter();
                if (this._toolTips.length <= i) {
                    const tooltip = new L.Tooltip(center, { content: formatedDistance, direction: 'center', permanent: true, interactive: this.options.interactive, opacity: 0.8 });
                    tooltip.addTo(this._map);
                    this._toolTips.push(tooltip);
                }
                else {
                    const tooltip = this._toolTips[i];
                    tooltip.setContent(formatedDistance);
                    tooltip.setLatLng(center);
                }
            }
            while (this._toolTips.length > posList.length - 1) {
                this._toolTips.pop().remove();
            }
        }
        redraw() {
            if (this._map) {
                this._updateMarkers();
            }
            return super.redraw();
        }
        _tooltipContent(a, b) {
            return '<i class="fas fa-arrows-alt-h"></i> ' + intl.format(Math.round(this._map.distance(a, b))) + ' m<br/><i class="fas fa-compass"></i> '
                + GameMapUtils.computeAndFormatBearing(a, b, this._map, this.options.useMils);
        }
    }
    class EventHolder extends L.Evented {
    }
    ;
    class MarkerCreatorToggleButton extends GameMapUtils.ToggleButton {
        constructor(options) {
            super(options);
            this.holder = new EventHolder();
        }
        on(type, handler, context) {
            this.holder.on(type, handler, context);
            return this;
        }
        off(type, handler, context) {
            this.holder.off(type, handler, context);
            return this;
        }
        fire(type, data) {
            this.holder.fire(type, data);
            return this;
        }
    }
    class MeasurePathToolButton extends MarkerCreatorToggleButton {
        constructor(options) {
            super(L.extend({
                group: GameMapUtils.MapEditToolsGroup,
                content: '<img src="/img/path.svg" width="16" height="16" class="revertable" />'
            }, options));
        }
        onDisable(map) {
            this._dismissAll();
            map.off('click', this._mapClickHandler, this);
            map.off('mousemove', this._mapMouseMoveHandler, this);
            map.off('contextmenu', this._dismissLast, this);
            map.getContainer().classList.remove('precision-cursor');
        }
        onEnable(map) {
            map.on('click', this._mapClickHandler, this);
            map.on('mousemove', this._mapMouseMoveHandler, this);
            map.on('contextmenu', this._dismissLast, this);
            map.getContainer().classList.add('precision-cursor');
        }
        _mapClickHandler(ev) {
            if (this._current) {
                const marker = this._current;
                var posList = marker.getLatLngs();
                posList[posList.length - 1] = ev.latlng;
                if (ev.originalEvent.ctrlKey) {
                    posList.push(ev.latlng);
                    marker.setLatLngs(posList);
                }
                else {
                    marker.setLatLngs(posList);
                    this._current = null;
                    this.fire('added', { marker: marker });
                }
            }
            else {
                this._current = new MeasureMarker([ev.latlng, ev.latlng], { color: '#000000', weight: 1.3, dashArray: '4', interactive: false, useMils: this.options.useMils });
                this.fire('started', { marker: this._current });
                this._current.addTo(this._map);
            }
        }
        _mapMouseMoveHandler(ev) {
            if (this._current) {
                var posList = this._current.getLatLngs();
                posList[posList.length - 1] = ev.latlng;
                this._current.setLatLngs(posList);
            }
        }
        _dismissAll() {
            if (this._current) {
                this._current.remove();
                this._current = null;
            }
        }
        _dismissLast() {
            if (this._current) {
                const marker = this._current;
                this._current = null;
                var posList = marker.getLatLngs();
                if (posList.length == 2) {
                    marker.remove();
                }
                else {
                    posList.pop();
                    marker.setLatLngs(posList);
                    this.fire('added', { marker: marker });
                }
            }
        }
    }
    function measurePathToolButton(options) {
        return new MeasurePathToolButton(options);
    }
    GameMapUtils.measurePathToolButton = measurePathToolButton;
})(GameMapUtils || (GameMapUtils = {}));
