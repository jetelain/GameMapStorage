/// <reference path="../types/leaflet.d.ts" /> 
/// <reference path="GameMapUtils.ts" /> 

namespace GameMapUtils {
    export interface GridMousePositionOptions extends L.ControlOptions {
        precision: number;
    }

    /**
     * Display mouse coordinates on map
     *
     * Author: jetelain
     */
    export class GridMousePosition extends L.Control {
        options : GridMousePositionOptions;
        _map: L.Map;
        _container: HTMLElement;

        constructor(options?: GridMousePositionOptions) {
            super(L.extend({
                position: 'topright',
                precision: 4
            }, options));
        }

        override onAdd (map: L.Map): HTMLElement {
            this._container = L.DomUtil.create('div', 'leaflet-grid-mouseposition');
            this._map = map;
            L.DomEvent.disableClickPropagation(this._container);
            map.on('mousemove', this._onMouseMove, this);
            var placeHolder = '0'.repeat(this.options.precision);
            this._container.innerHTML = placeHolder + ' - ' + placeHolder;
            return this._container;
        }

        override onRemove (map: L.Map): void {
            this._map = null;
            map.off('mousemove', this._onMouseMove)
        }

        _onMouseMove (e) {
            this._container.innerHTML = GameMapUtils.toGrid(e.latlng, this.options.precision, this._map);
        }

    }

    export function gridMousePosition(options?: GridMousePositionOptions): GridMousePosition {
        return new GameMapUtils.GridMousePosition(options);
    };

    export interface OverlayButtonOptions extends L.ControlOptions {
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
    export class OverlayButton extends L.Control
    {
        options: OverlayButtonOptions;
        _container: HTMLElement;
        _previousClass: string = '';

        constructor(options?: OverlayButtonOptions) {
            super(L.extend({
                position: 'bottomright',
                baseClassName: 'btn',
                className: 'btn-outline-secondary',
                content: '',
                click: null
            }, options));
        }

        onAdd (map) {
            this._previousClass = this.options.className;
            this._container = L.DomUtil.create('button', this.options.baseClassName + ' ' + this.options.className);
            L.DomEvent.disableClickPropagation(this._container);
            this._container.innerHTML = this.options.content;
            if (this.options.click) {
                this._container.addEventListener('click', this.options.click);
            }
            return this._container;
        }

        onRemove (map) {

        }

        setClass (name) {
            this._container.classList.remove(this._previousClass);
            this._container.classList.add(name);
            this._previousClass = name;
        }
    };

    export function overlayButton (options) {
        return new GameMapUtils.OverlayButton(options);
    };
        
    
    export interface OverlayDivOptions extends L.ControlOptions {
        content: string|HTMLElement;
    }

    /**
     * Display an arbitrary div on map
     *
     * Author: jetelain
     */
    export class OverlayDiv extends L.Control
    {
        options: OverlayDivOptions;
        _container: HTMLElement;

        constructor(options?: OverlayDivOptions) {
            super(L.extend({
                position: 'bottomright',
                content: ''
            }, options));
        }

        onAdd (map) {
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

        onRemove (map) {

        }
    }

    export function overlayDiv (options) {
        return new GameMapUtils.OverlayDiv(options);
    };
};