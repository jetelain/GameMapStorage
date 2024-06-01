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
            this._container.innerHTML = GameMapUtils.toGrid(L.latLng(0, 0), this.options.precision, this._map);
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
                content: ''
            }, options));
        }

        onAdd (map) {
            this._previousClass = this.options.className;
            this._container = L.DomUtil.create('button', this.options.baseClassName + ' ' + this.options.className);
            L.DomEvent.disableClickPropagation(this._container);
            this._container.innerHTML = this.options.content;
            return this._container;
        }

        on<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any): this {
            this._container.addEventListener(type, listener);
            return this;
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

    export class ToggleButtonGroup {

        _buttons: ToggleButton[];

        add(btn: ToggleButton) {
            this._buttons.push(btn);
        }

        remove(btn: ToggleButton) {
            const index = this._buttons.indexOf(btn);
            if (index != -1) {
                this._buttons.splice(index, 1);
            }
        }

        setActive(btn: ToggleButton) {
            this._buttons.forEach((item) => {
                if (item != btn) {
                    item._setActive(false);
                }
            });
            btn._setActive(true);
        }

        getActive(): ToggleButton | undefined {
            return this._buttons.find(item => item._isActive);
        }
    }

    export function toggleButtonGroup() {
        return new GameMapUtils.ToggleButtonGroup();
    };

    export interface ToggleButtonOptions extends L.ControlOptions {
        baseClassName: string;
        offClassName: string;
        onClassName: string;
        content: string;
        group?: ToggleButtonGroup;
    }

    export abstract class ToggleButton extends L.Control {
        options: ToggleButtonOptions;
        _map: L.Map;
        _container: HTMLElement;
        _isActive: boolean;

        constructor(options?: ToggleButtonOptions) {
            super(L.extend({
                position: 'topleft',
                baseClassName: 'btn btn-sm',
                offClassName: 'btn-outline-secondary',
                onClassName: 'btn-primary',
                content: ''
            }, options));
        }

        override onAdd(map: L.Map) {
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

        override onRemove(map: L.Map) {
            if (this._isActive) {
                this.onDisable(this._map);
            }
            if (this.options.group) {
                this.options.group.remove(this);
            }
        }

        abstract onDisable(map: L.Map);

        abstract onEnable(map: L.Map);

        _setActive(_isActive: boolean) {
            if (this._isActive == _isActive) {
                return;
            }
            this._isActive = _isActive;
            if (this._isActive) {
                this.onEnable(this._map);
                this._container.classList.remove(this.options.offClassName);
                this._container.classList.add(this.options.onClassName);
            } else {
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

};