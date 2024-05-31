/// <reference path="../types/leaflet.d.ts" /> 
/// <reference path="MapTools.ts" /> 

namespace GameMapUtils {

    export interface ToggleToolButtonOptions extends L.ControlOptions {
        baseClassName: string;
        offClassName: string;
        onClassName: string;
        tool: (pos:L.LatLng) => L.Layer;
        content: string;
    }

    export class ToggleToolButton extends L.Control {
        options: ToggleToolButtonOptions;
        _map: L.Map;
        _container: HTMLElement;
        _toolInstance?: L.Layer = null;
        _toolActive: boolean = false;

        constructor(options?: ToggleToolButtonOptions) {
            super(L.extend({
                position: 'topleft',
                baseClassName: 'btn btn-sm',
                offClassName: 'btn-outline-secondary',
                onClassName: 'btn-primary',
                tool: GameMapUtils.ruler,
                content: 'Ruler'
            }, options));
        }

        override onAdd (map) {
            this._map = map;
            this._container = L.DomUtil.create('button', this.options.baseClassName + ' ' + this.options.offClassName);
            L.DomEvent.disableClickPropagation(this._container);
            this._container.innerHTML = this.options.content;
            L.DomEvent.on(this._container, 'click', this._toggleTool, this);
            return this._container;
        }

        override onRemove(map) {
            if (this._toolActive) {
                this._toolInstance.removeFrom(this._map);
            }
        }

        _toggleTool(e) {
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
        }
    }

    export function toggleToolButton (options) {
        return new GameMapUtils.ToggleToolButton(options);
    };
};