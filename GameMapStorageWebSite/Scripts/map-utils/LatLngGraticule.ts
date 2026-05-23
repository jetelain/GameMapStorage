/// <reference path="../Types/leaflet.d.ts" />
/// <reference path="GameMapUtils.ts" />

namespace GameMapUtils {

    export interface MgrsGraticuleOptions extends L.LayerOptions {
        /** The font to use for the graticule labels (default: '12px Verdana') */
        font: string;

        /** The color of the font (default: same as color) */
        fontColor: string;

        /** The color of the graticule lines (default: '#444') */
        color: string;

        /** The opacity of the graticule lines (default: 1) */
        opacity: number;

        /** The weight of the graticule lines (default: 1px physical) */
        weight: number;

        /** Whether to draw the graticule lines (default: false) */
        drawLines: boolean;

        /** The background color of the label (default: undefined (for transparent)) */
        labelBackground: string;
    }

    function applyComputedDefaults(options?: Partial<MgrsGraticuleOptions>): Partial<MgrsGraticuleOptions> {
        if (!options) {
            return {};
        }
        const result = { ...options };
        if (!result.fontColor && result.color) {
            // If fontColor is not specified, use the same color as the graticule lines
            result.fontColor = result.color;
        }
        if (result.font && result.font.indexOf(' ') < 0) {
            // If the font option is specified but does not include a font family, add a default font family (e.g., 'Verdana')
            result.font += ' Verdana';
        }
        return result;
    }

    /**
     * Create a Canvas to draw MGRS compatible Graticule, and show the axis tick label on the edge of the map.
     * 
     * Assume that map coordinates are MGRS compatible coordinates in meters.
     * 
     * Based on LatLngGraticule from lanwei@cloudybay.com.tw
     */
    export class MgrsGraticule extends L.Layer
    {
        options: MgrsGraticuleOptions;
        _container: HTMLDivElement;
        _canvas: HTMLCanvasElement;
        _grid?: GameMapUtils.MapGrid;

        constructor(options?: Partial<MgrsGraticuleOptions>) {
            super(L.extend({
                opacity: 1,
                weight: 1 / (window.devicePixelRatio || 1),
                color: '#444',
                fontColor: '#444',
                font: '12px Verdana',
                drawLines: false
            }, applyComputedDefaults(options)));
        }

        /**
         * Called by super constructor to initialize the options. Do not call this method directly.
         * @private
         */
        initialize(options) {
            L.Util.setOptions(this, options);
        }

        /**
         * Update the graticule style. If the graticule is already added to map, it will be redrawn immediately.
         * @param options The options to update
         * @returns
         */
        setStyle(options: Partial<MgrsGraticuleOptions>) {
            L.Util.setOptions(this, applyComputedDefaults(options));
            if (this._container) {
                if (this._map) {
                    this._reset();
                }
                this._updateOpacity();
            }
            return this;
        }

        onAdd (map: L.Map): this {
            this._map = map;
            this._grid = (map as GameMapUtils.MapWithGrid).grid;
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
            map.on('zoomanim', this._animateZoom, this);
            this._reset();
            return this;
        }

        onRemove(map: L.Map): this {
            this._grid = undefined;
            map.getPane('overlayPane').removeChild(this._container);
            map.off('viewreset', this._reset, this);
            map.off('move', this._reset, this);
            map.off('moveend', this._reset, this);
            map.off('zoomanim', this._animateZoom, this);
            return this;
        }

        addTo (map) {
            map.addLayer(this);
            return this;
        }

        setOpacity (opacity) {
            this.options.opacity = opacity;
            if (this._container) {
                this._updateOpacity();
            }
            return this;
        }

        bringToFront () {
            if (this._container) {
                this._map.getPane('overlayPane').appendChild(this._container);
            }
            return this;
        }

        bringToBack () {
            if (this._container) {
                let pane = this._map.getPane('overlayPane');
                pane.insertBefore(this._container, pane.firstChild);
            }
            return this;
        }

        getAttribution () {
            return this.options.attribution;
        }

        _initCanvas () {
            this._container = L.DomUtil.create('div', 'leaflet-image-layer');

            if (this._map.options.zoomAnimation && L.Browser.any3d) { 
                L.DomUtil.addClass(this._container, 'leaflet-zoom-animated');
            }

            this._canvas = L.DomUtil.create('canvas', '');

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

            const dpr = window.devicePixelRatio || 1;
            canvas.width = size.x * dpr;
            canvas.height = size.y * dpr;
            canvas.style.width = size.x + 'px';
            canvas.style.height = size.y + 'px';

            this.__draw(this.options.drawLines);
        }

        _onCanvasLoad () {
            this.fire('load');
        }

        _updateOpacity () {
            L.DomUtil.setOpacity(this._canvas, this.options.opacity);
        }

        _animateZoom(e) {
            // Code from ImageOverlay
            const map = this._map;
            const scale = map.getZoomScale(e.zoom);
            const offset = (map as any)._latLngBoundsToNewLayerBounds(
                map.getBounds(),
                e.zoom,
                e.center
            ).min;
            L.DomUtil.setTransform(this._container, offset, scale);
        }

        __draw(drawLines: boolean = false) {
            const canvas = this._canvas,
                map = this._map,
                grid = this._grid;

            if (L.Browser.canvas && map) {
                const dpr = window.devicePixelRatio || 1;
                const ww = canvas.width / dpr,
                    hh = canvas.height / dpr,
                    originX = grid.options.originX,
                    originY = grid.options.originY,
                    sizeInMeters = grid.options.sizeInMeters,
                    fontColor = this.options.fontColor,
                    labelBackground = this.options.labelBackground;


                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.save();
                ctx.scale(dpr, dpr);
                ctx.font = this.options.font;

                const lt = map.containerPointToLatLng(L.point(0, 0));
                const rt = map.containerPointToLatLng(L.point(ww, 0));
                const rb = map.containerPointToLatLng(L.point(ww, hh));

                let startLat = rb.lat,
                    endLat = lt.lat;

                let startLng = lt.lng,
                    endLng = rt.lng;

                const pointPerLat = Math.max(1, (endLat - startLat) / (hh * 0.2));
                if (isNaN(pointPerLat)) {
                    return;
                }

                const kmPx = Math.min(hh / (endLat - startLat), ww / (endLng - startLng)) * 1000; // Pixels per kilometer

                startLat = Math.trunc(startLat - pointPerLat);
                endLat = Math.min(sizeInMeters, Math.trunc(endLat + pointPerLat));

                const pointPerLon = Math.max(1, (endLng - startLng) / (ww * 0.2));
                endLng = Math.min(sizeInMeters, Math.trunc(endLng + pointPerLon));
                startLng = Math.trunc(startLng - pointPerLon);

                let gridInterval = 1000,
                    gridPrecision = 2;

                if (kmPx < 50) {
                    gridInterval = 10000;
                    gridPrecision = 1;
                }

                const latGap = (-originY) % gridInterval,
                    lngGap = (-originX) % gridInterval,
                    boldInterval = gridInterval * 10;

                let latTicks = [];
                let lngTicks = [];

                if (gridInterval > 0) {
                    const firstLat = Math.max(0, latGap + Math.ceil((startLat - latGap) / gridInterval) * gridInterval);
                    for (let lat = firstLat; lat <= endLat; lat += gridInterval) {
                        const left = this._map.latLngToContainerPoint(L.latLng(lat, startLng));
                        const right = this._map.latLngToContainerPoint(L.latLng(lat, endLng));
                        const label = GameMapUtils.formatCoordinate(lat + grid.options.originY, gridPrecision);
                        const box = ctx.measureText(label);
                        latTicks.push({ label: label, width: box.width, height: box.fontBoundingBoxAscent, left: left, right: right, isBold: lat % boldInterval === 0 });
                    }
                }

                if (gridInterval > 0) {
                    const firstLng = Math.max(0, lngGap + Math.ceil((startLng - lngGap) / gridInterval) * gridInterval);
                    for (let lng = firstLng; lng <= endLng; lng += gridInterval) {
                        const bottom = this._map.latLngToContainerPoint(L.latLng(startLat, lng));
                        const top = this._map.latLngToContainerPoint(L.latLng(endLat, lng));
                        const label = GameMapUtils.formatCoordinate(lng + grid.options.originX, gridPrecision);
                        const box = ctx.measureText(label);
                        lngTicks.push({ label: label, width: box.width, height: box.fontBoundingBoxAscent, top: top, bottom: bottom, isBold: lng % boldInterval === 0  });
                    }
                }

                if (drawLines) {
                    ctx.lineWidth = this.options.weight;
                    ctx.strokeStyle = this.options.color;
                    ctx.beginPath();
                    for (let i = 0; i < latTicks.length; ++i) {
                        const tick = latTicks[i];
                        if (!tick.isBold) {
                            ctx.moveTo(tick.width + 3, tick.left.y);
                            ctx.lineTo(ww - tick.width - 4, tick.right.y);
                        }
                    }
                    for (let i = 0; i < lngTicks.length; ++i) {
                        const tick = lngTicks[i];
                        if (!tick.isBold) {
                            ctx.moveTo(tick.top.x, tick.height + 3);
                            ctx.lineTo(tick.bottom.x, hh - tick.height - 3);
                        }
                    }
                    ctx.stroke();

                    ctx.lineWidth = this.options.weight * 2;
                    ctx.beginPath();
                    for (let i = 0; i < latTicks.length; ++i) {
                        const tick = latTicks[i];
                        if (tick.isBold) {
                            ctx.moveTo(tick.width + 3, tick.left.y);
                            ctx.lineTo(ww - tick.width - 4, tick.right.y);
                        }
                    }
                    for (let i = 0; i < lngTicks.length; ++i) {
                        const tick = lngTicks[i];
                        if (tick.isBold) {
                            ctx.moveTo(tick.top.x, tick.height + 3);
                            ctx.lineTo(tick.bottom.x, hh - tick.height - 3);
                        }
                    }
                    ctx.stroke();
                }

                for (let i = 0; i < latTicks.length; ++i) {
                    const tick = latTicks[i];
                    if (labelBackground) {
                        ctx.fillStyle = labelBackground;
                        ctx.fillRect(0, tick.left.y - (tick.height / 2) - 2, tick.width + 4, tick.height + 4);
                        ctx.fillRect(ww - tick.width - 4, tick.right.y - (tick.height / 2) - 2, tick.width + 4, tick.height + 4);
                    }
                    ctx.fillStyle = fontColor;
                    ctx.fillText(tick.label, 1, tick.left.y + (tick.height / 2) - 2);
                    ctx.fillText(tick.label, ww - tick.width - 2, tick.right.y + (tick.height / 2) - 2);
                }
                for (let i = 0; i < lngTicks.length; ++i) {
                    const tick = lngTicks[i];
                    if (labelBackground) {
                        ctx.fillStyle = labelBackground;
                        ctx.fillRect(tick.top.x - (tick.width / 2) - 2, 0, tick.width + 4, tick.height + 4);
                        ctx.fillRect(tick.bottom.x - (tick.width / 2) - 2, hh - tick.height - 4, tick.width + 4, tick.height + 4);
                    }
                    ctx.fillStyle = fontColor;
                    ctx.fillText(tick.label, tick.top.x - (tick.width / 2), tick.height + 1);
                    ctx.fillText(tick.label, tick.bottom.x - (tick.width / 2), hh - 3);
                }

                ctx.restore();
            }
        }
    }


    export function mgrsGraticule(options?: Partial<MgrsGraticuleOptions>): MgrsGraticule {
        return new GameMapUtils.MgrsGraticule(options);
    };

    // Backward compatibility
    export interface LatLngGraticuleOptions extends GameMapUtils.MgrsGraticuleOptions {

    }

    export class LatLngGraticule extends GameMapUtils.MgrsGraticule {
        constructor(options?: Partial<LatLngGraticuleOptions>) {
            super(options);
        }
    }

    export function latlngGraticule(options?: Partial<LatLngGraticuleOptions>): LatLngGraticule {
        return new GameMapUtils.LatLngGraticule(options);
    };
}
