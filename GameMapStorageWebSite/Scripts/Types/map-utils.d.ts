/// <reference path="leaflet.d.ts" />
declare namespace GameMapUtils {
    interface LatLngGraticuleInterval {
        start: number;
        end: number;
        interval: number;
    }
    interface LatLngGraticuleOptions extends L.LayerOptions {
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
    class LatLngGraticule extends L.Layer {
        options: LatLngGraticuleOptions;
        _container: HTMLDivElement;
        _canvas: HTMLCanvasElement;
        _currZoom?: number;
        _currLngInterval?: number;
        _currLatInterval?: number;
        constructor(options?: LatLngGraticuleOptions);
        initialize(options: any): void;
        onAdd(map: L.Map): this;
        onRemove(map: L.Map): this;
        addTo(map: any): this;
        setOpacity(opacity: any): this;
        bringToFront(): this;
        bringToBack(): this;
        getAttribution(): string;
        _initCanvas(): void;
        _reset(): void;
        _onCanvasLoad(): void;
        _updateOpacity(): void;
        __format_lat(lat: any): string;
        __format_lng(lng: any): string;
        __calcInterval(): void;
        __draw(label: any): void;
        _latLngToCanvasPoint(latlng: any): L.Point;
    }
    function latlngGraticule(options?: LatLngGraticuleOptions): LatLngGraticule;
}
declare namespace GameMapUtils {
    interface GridMousePositionOptions extends L.ControlOptions {
        precision: number;
    }
    /**
     * Display mouse coordinates on map
     *
     * Author: jetelain
     */
    class GridMousePosition extends L.Control {
        options: GridMousePositionOptions;
        _map: L.Map;
        _container: HTMLElement;
        constructor(options?: GridMousePositionOptions);
        onAdd(map: L.Map): HTMLElement;
        onRemove(map: L.Map): void;
        _onMouseMove(e: any): void;
    }
    function gridMousePosition(options?: GridMousePositionOptions): GridMousePosition;
    interface OverlayButtonOptions extends L.ControlOptions {
        baseClassName: string;
        className: string;
        content: string;
        click?: (this: HTMLElement, ev: MouseEvent) => any;
    }
    /**
     * Display a bootstrap button on map
     *
     * Author: jetelain
     */
    class OverlayButton extends L.Control {
        options: OverlayButtonOptions;
        _container: HTMLElement;
        _previousClass: string;
        constructor(options?: OverlayButtonOptions);
        onAdd(map: any): HTMLElement;
        onRemove(map: any): void;
        setClass(name: any): void;
    }
    function overlayButton(options: any): OverlayButton;
    interface OverlayDivOptions extends L.ControlOptions {
        content: string | HTMLElement;
    }
    /**
     * Display an arbitrary div on map
     *
     * Author: jetelain
     */
    class OverlayDiv extends L.Control {
        options: OverlayDivOptions;
        _container: HTMLElement;
        constructor(options?: OverlayDivOptions);
        onAdd(map: any): HTMLElement;
        onRemove(map: any): void;
    }
    function overlayDiv(options: any): OverlayDiv;
}
declare namespace GameMapUtils {
    function toCoord(num: number, precision: number): string;
    function toGrid(latlng: L.LatLng, precision: number, map: L.Map): string;
    function bearing(p1: L.LatLng, p2: L.LatLng, map: L.Map, useMils?: boolean): number;
    function CRS(factorx: number, factory: number, tileSize: number): L.CRS;
    function basicInit(mapInfos: any, mapDivId?: string): L.Map;
}
declare namespace GameMapUtils {
    interface MapToolBaseOptions extends L.LayerOptions {
        widthInMeters: number;
        heightInMeters: number;
        dragMarkerClassName: string;
        svgViewBox: string;
        svgContent: string;
        rotateCenter: string;
    }
    /**
     * Base class for interactive Protractor / Coordinate Scale / Ruler
     *
     * Author: jetelain
     */
    class MapToolBase extends L.Layer {
        options: MapToolBaseOptions;
        _bearing: number;
        _latlng: L.LatLng;
        _halfWidthInMeters: number;
        _halfHeightInMeters: number;
        _rotateMarker?: L.Marker;
        _svgRootGroup?: SVGElement;
        _svgElement?: SVGElement;
        _dragMarker?: L.Marker;
        _svgOverlay?: L.SVGOverlay;
        constructor(latlng: L.LatLngExpression, options?: MapToolBaseOptions);
        initialize(options: any): void;
        _getTransformation(): L.Transformation;
        _createDragMarkerIcon(): L.Icon<L.IconOptions>;
        _toSvgBounds(): L.LatLngBounds;
        _updateMarkersSize(): void;
        _positionChanged(): void;
        _updateRotateMarkerPosition(pos: L.LatLng): void;
        _updateRotateMarkerSize(): void;
        _createRotateMarker(): any;
        _updateDragMarkerIconTransform(): void;
        setLatLng(pos: L.LatLngExpression): void;
        getLatLng(): L.LatLng;
        setBearing(bearing: any): void;
        getBearing(): number;
        onAdd(map: L.Map): this;
        onRemove(map: L.Map): this;
        _getRotateMarkerPosition(): L.LatLngExpression;
    }
    /**
     * Protractor
     *
     * Author: jetelain
     */
    class Protractor extends GameMapUtils.MapToolBase {
        constructor(latlng: L.LatLngExpression);
        _createRotateMarkerIcon(): L.Icon<L.IconOptions>;
        _getRotateMarkerPosition(): [number, number];
        _updateRotateMarkerPosition(): void;
        _updateRotateMarkerSize(): void;
        _onRotateMarkerDrag(): void;
        _resetBearing(): boolean;
        _createRotateMarker(): L.Marker<any>;
    }
    function protractor(latLng: any): Protractor;
    /**
     * Coordinate Scale
     *
     * Author: jetelain
     */
    class CoordinateScale extends GameMapUtils.MapToolBase {
        constructor(latlng: L.LatLngExpression);
    }
    function coordinateScale(latLng: any): CoordinateScale;
    /**
     * Ruler
     *
     * Author: jetelain
     */
    class Ruler extends GameMapUtils.MapToolBase {
        constructor(latlng: L.LatLngExpression);
        _createDragMarkerIcon(): L.Icon<L.IconOptions>;
        _createRotateMarkerIcon(): L.Icon<L.IconOptions>;
        _getRotateMarkerPosition(): [number, number];
        _updateRotateMarkerPosition(): void;
        _updateRotateMarkerSize(): void;
        _onRotateMarkerDrag(): void;
        _updateDragMarkerIconTransform(): void;
        _resetBearing(): boolean;
        _createRotateMarker(): L.Marker<any>;
    }
    function ruler(latLng: any): Ruler;
}
declare namespace GameMapUtils {
    interface ToggleToolButtonOptions extends L.ControlOptions {
        baseClassName: string;
        offClassName: string;
        onClassName: string;
        tool: (pos: L.LatLng) => L.Layer;
        content: string;
    }
    class ToggleToolButton extends L.Control {
        options: ToggleToolButtonOptions;
        _map: L.Map;
        _container: HTMLElement;
        _toolInstance?: L.Layer;
        _toolActive: boolean;
        constructor(options?: ToggleToolButtonOptions);
        onAdd(map: any): HTMLElement;
        onRemove(map: any): void;
        _toggleTool(e: any): void;
    }
    function toggleToolButton(options: any): ToggleToolButton;
}