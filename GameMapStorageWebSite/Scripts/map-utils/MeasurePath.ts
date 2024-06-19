/// <reference path="../Types/leaflet.d.ts" />
/// <reference path="GameMapUtils.ts" />
/// <reference path="Overlays.ts" /> 

namespace GameMapUtils {

    export const MapEditToolsGroup = new ToggleButtonGroup();

    class HandToolButton extends ToggleButton {
        constructor(options?: ToggleButtonOptions) {
            super(L.extend({
                group: MapEditToolsGroup,
                content: '<img src="/img/hand.svg" width="16" height="16" class="revertable" />'
            }, options));
        }
        onDisable(map: L.Map) {
        }
        onEnable(map: L.Map) {
        }
    }

    export function handToolButton(options: ToggleButtonOptions): ToggleButton {
        return new HandToolButton(options);
    }

    const intl = new Intl.NumberFormat();

    interface MeasureMarkerOptions extends L.PolylineOptions {
        useMils?: boolean;
    }

    class MeasureMarker extends L.Polyline {
        options: MeasureMarkerOptions;
        _toolTips: L.Tooltip[] = [];
        constructor(latlngs: L.LatLngExpression[], options?: MeasureMarkerOptions) {
            super(latlngs, L.extend({ color: '#000000', weight: 1.3, dashArray: '4', interactive: false }, options));
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
            const posList = this.getLatLngs() as L.LatLng[];
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

        override redraw(): this {
            if (this._map) {
                this._updateMarkers();
            }
            return super.redraw();
        }

        private _tooltipContent(a: L.LatLng, b: L.LatLng) {
            return '<i class="fas fa-arrows-alt-h"></i> ' + intl.format(Math.round(this._map.distance(a, b))) + ' m<br/><i class="fas fa-compass"></i> '
                + GameMapUtils.computeAndFormatBearing(a, b, this._map, this.options.useMils);
        }
    }

    type MarkerCreatorEvents = 'added' | 'started';

    interface MakerCreateEvent<TMarker> extends L.LeafletEvent {
        marker: TMarker;
    }

    type MakerCreateHandlerFn<TMarker> = (event: MakerCreateEvent<TMarker>) => void;

    class EventHolder extends L.Evented { };

    abstract class MarkerCreatorToggleButton<TMarker> extends ToggleButton {
        holder: EventHolder;
        constructor(options?: ToggleButtonOptions) {
            super(options);
            this.holder = new EventHolder();
        }
        on(type: MarkerCreatorEvents, handler: MakerCreateHandlerFn<TMarker>, context): this {
            this.holder.on(type, handler, context);
            return this;
        }
        off(type: MarkerCreatorEvents, handler: MakerCreateHandlerFn<TMarker>, context): this {
            this.holder.off(type, handler, context);
            return this;
        }
        fire(type: MarkerCreatorEvents, data: { marker: TMarker }): this {
            this.holder.fire(type, data);
            return this;
        }
    }

    interface MeasurePathToolButtonOptions extends ToggleButtonOptions {
        useMils?: boolean;
    }

    class MeasurePathToolButton extends MarkerCreatorToggleButton<MeasureMarker> {
        options: MeasurePathToolButtonOptions;
        _current: MeasureMarker

        constructor(options?: MeasurePathToolButtonOptions) {
            super(L.extend({
                group: MapEditToolsGroup,
                content: '<img src="/img/path.svg" width="16" height="16" class="revertable" />'
            }, options));
        }
        onDisable(map: L.Map) {
            this._dismissAll();
            map.off('click', this._mapClickHandler, this);
            map.off('mousemove', this._mapMouseMoveHandler, this);
            map.off('contextmenu', this._dismissLast, this);
            map.getContainer().classList.remove('precision-cursor');
        }
        onEnable(map: L.Map) {
            map.on('click', this._mapClickHandler, this);
            map.on('mousemove', this._mapMouseMoveHandler, this);
            map.on('contextmenu', this._dismissLast, this);
            map.getContainer().classList.add('precision-cursor');
        }
        _mapClickHandler(ev: L.LeafletMouseEvent) {
            if (this._current) {
                const marker = this._current;
                var posList = marker.getLatLngs() as L.LatLng[];
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
            } else {
                this._current = new MeasureMarker([ev.latlng, ev.latlng], { color: '#000000', weight: 1.3, dashArray: '4', interactive: false, useMils: this.options.useMils });
                this.fire('started', { marker: this._current });
                this._current.addTo(this._map);
            }
        }
        _mapMouseMoveHandler(ev: L.LeafletMouseEvent) {
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
                var posList = marker.getLatLngs() as L.LatLng[];
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
    export function measurePathToolButton(options: ToggleButtonOptions): MeasurePathToolButton {
        return new MeasurePathToolButton(options);
    }

}
