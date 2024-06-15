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
        _grid?: GameMapUtils.MapGrid;
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
        __draw(label: boolean): void;
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
        on<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any): this;
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
    class ToggleButtonGroup {
        _buttons: ToggleButton[];
        add(btn: ToggleButton): void;
        remove(btn: ToggleButton): void;
        setActive(btn: ToggleButton): void;
        getActive(): ToggleButton | undefined;
    }
    function toggleButtonGroup(): ToggleButtonGroup;
    interface ToggleButtonOptions extends L.ControlOptions {
        baseClassName: string;
        offClassName: string;
        onClassName: string;
        content: string;
        group?: ToggleButtonGroup;
    }
    abstract class ToggleButton extends L.Control {
        options: ToggleButtonOptions;
        _map: L.Map;
        _container: HTMLElement;
        _isActive: boolean;
        constructor(options?: ToggleButtonOptions);
        onAdd(map: L.Map): HTMLElement;
        onRemove(map: L.Map): void;
        abstract onDisable(map: L.Map): any;
        abstract onEnable(map: L.Map): any;
        _setActive(_isActive: boolean): void;
        _clickHandler(e: any): void;
    }
    interface ButtonGroupOptions extends L.ControlOptions {
        className?: string;
    }
    class ButtonGroupBlock extends L.Control {
        options: ButtonGroupOptions;
        _container: HTMLElement;
        _buttons: L.Control[];
        _map: L.Map;
        constructor(options?: ButtonGroupOptions);
        onAdd(map: any): HTMLElement;
        onRemove(map: any): void;
        add(...btns: L.Control[]): this;
    }
    function buttonGroupBlock(options?: ButtonGroupOptions): ButtonGroupBlock;
}
declare namespace GameMapUtils {
    interface MapWithGrid extends L.Map {
        grid?: MapGrid;
    }
    function formatCoordinate(num: number, precision: number): string;
    interface MapGridOptions {
        sizeInMeters: number;
        originX: number;
        originY: number;
        defaultPrecision: number;
    }
    class MapGrid {
        options: MapGridOptions;
        constructor(options: MapGridOptions);
        toCoordinates(latlng: L.LatLng, precision?: number): string;
    }
    function toGridCoordinates(latlng: L.LatLng, precision: number, map: L.Map): string;
    function computeBearingMils(p1: L.LatLng, p2: L.LatLng, map: L.Map): number;
    function computeBearingDegrees(p1: L.LatLng, p2: L.LatLng, map: L.Map): number;
    function computeAndFormatBearing(p1: L.LatLng, p2: L.LatLng, map: L.Map, useMils?: boolean): string;
    function CRS(factorx: number, factory: number, tileSize: number): L.CRS;
    interface LayerDisplayOptions {
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
    }
    function basicInit(mapInfos: LayerDisplayOptions, mapDivId?: string | HTMLElement): MapWithGrid;
    function basicInitFromAPI(gameName: string, mapName: string, mapDivId?: string | HTMLElement, apiBasePath?: string): Promise<L.Map>;
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
    interface ToggleToolButtonOptions extends ToggleButtonOptions {
        tool: (pos: L.LatLng) => L.Layer;
    }
    class ToggleToolButton extends ToggleButton {
        options: ToggleToolButtonOptions;
        _toolInstance?: L.Layer;
        constructor(options?: ToggleToolButtonOptions);
        onDisable(map: L.Map): void;
        onEnable(map: L.Map): void;
    }
    function rulerToolButton(options?: ToggleButtonOptions): ToggleToolButton;
    function coordinateScaleToolButton(options?: ToggleButtonOptions): ToggleToolButton;
    function protractorToolButton(options?: ToggleButtonOptions): ToggleToolButton;
}
declare namespace GameMapUtils {
    export const MapEditToolsGroup: ToggleButtonGroup;
    export function handToolButton(options: ToggleButtonOptions): ToggleButton;
    interface MeasureMarkerOptions extends L.PolylineOptions {
        useMils?: boolean;
    }
    class MeasureMarker extends L.Polyline {
        options: MeasureMarkerOptions;
        _toolTips: L.Tooltip[];
        constructor(latlngs: L.LatLngExpression[], options?: MeasureMarkerOptions);
        _updateMarkers(): void;
        redraw(): this;
        private _tooltipContent;
    }
    type MarkerCreatorEvents = 'added' | 'started';
    interface MakerCreateEvent<TMarker> extends L.LeafletEvent {
        marker: TMarker;
    }
    type MakerCreateHandlerFn<TMarker> = (event: MakerCreateEvent<TMarker>) => void;
    class EventHolder extends L.Evented {
    }
    abstract class MarkerCreatorToggleButton<TMarker> extends ToggleButton {
        holder: EventHolder;
        constructor(options?: ToggleButtonOptions);
        on(type: MarkerCreatorEvents, handler: MakerCreateHandlerFn<TMarker>, context: any): this;
        off(type: MarkerCreatorEvents, handler: MakerCreateHandlerFn<TMarker>, context: any): this;
        fire(type: MarkerCreatorEvents, data: {
            marker: TMarker;
        }): this;
    }
    interface MeasurePathToolButtonOptions extends ToggleButtonOptions {
        useMils?: boolean;
    }
    class MeasurePathToolButton extends MarkerCreatorToggleButton<MeasureMarker> {
        options: MeasurePathToolButtonOptions;
        _current: MeasureMarker;
        constructor(options?: MeasurePathToolButtonOptions);
        onDisable(map: L.Map): void;
        onEnable(map: L.Map): void;
        _mapClickHandler(ev: L.LeafletMouseEvent): void;
        _mapMouseMoveHandler(ev: L.LeafletMouseEvent): void;
        _dismissAll(): void;
        _dismissLast(): void;
    }
    export function measurePathToolButton(options: ToggleButtonOptions): MeasurePathToolButton;
    export {};
}
