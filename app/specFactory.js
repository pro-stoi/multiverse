// multiverse/app/specFactory.js
//
// Строит spec из JSON мира.

import { FALLBACK_SVG } from './fallback.js';
import { loadWorld, pickWorldId } from '../data/worldAssets.js';

const FIG_KEYS = ['CIRCLE', 'DIAMOND', 'SQUARE', 'TRIANGLE', 'POLYHEDRON'];

// Из одного JSON строит spec.
export function makeSpecFromJson(worldJson) {
    if (!worldJson || !worldJson.svg || !worldJson.svg.world) return null;

    const svg = Object.assign({}, FALLBACK_SVG_KEYS, worldJson.svg);
    const layout = worldJson.layout || {};

    return {
        id: worldJson.id,
        name: worldJson.name || ('world_' + worldJson.id),
        era: worldJson.era || { from: 0, to: 9999 },
        background: worldJson.background || '#020208',
        layout: layout,
        params: worldJson.params || {},

        getWorldSvg() { return svg.world; },

        getPortalSvg(portal) {
            if (!portal.isOpen()) return svg.portalClosed;
            if (portal.anomalous) return svg.portalOpenAnomaly;
            if (portal.kind === 'PARALLEL') return svg.portalOpenParallel;
            if (portal.kind === 'TIME_PAST') return svg.portalOpenPast;
            return svg.portalOpenFuture;
        },

        getCellSvg(filled) {
            return filled ? svg.cellFilled : svg.cellEmpty;
        },

        getFigureSvg(shapeIndex) {
            const key = 'figure' + FIG_KEYS[shapeIndex].charAt(0) +
                        FIG_KEYS[shapeIndex].slice(1).toLowerCase();
            // figureCircle, figureDiamond, ...
            return svg[key] || svg.figureCircle;
        },

        getExchangerSvg() {
            return svg.exchanger || null;
        },

        // -------- позиции --------

        getWorldRect(viewport, radiusMul = 1.0) {
            const w = layout.world || {};
            const m = Math.min(viewport.width, viewport.height);
            const r = Math.max(40, (w.radius ?? 0.22) * m * radiusMul);
            return {
                cx: (w.cx ?? 0.5) * viewport.width,
                cy: (w.cy ?? 0.55) * viewport.height,
                r: r,
                width: viewport.width,
                height: viewport.height,
            };
        },

        getPortalPosition(slotIndex, viewport, worldRect, totalCount) {
            const p = layout.portals || {};
            const rule = p.rule || 'radial';

            if (rule === 'xy' && Array.isArray(p.slots) && p.slots[slotIndex]) {
                const s = p.slots[slotIndex];
                return {
                    x: s.x * viewport.width,
                    y: s.y * viewport.height,
                };
            }

            // radial по умолчанию
            const n = totalCount || 5;
            const start = p.startAngle ?? -Math.PI / 2;
            const radius = p.radius ?? 1.30;
            const a = start + slotIndex * 2 * Math.PI / n;
            return {
                x: worldRect.cx + Math.cos(a) * radius * worldRect.r,
                y: worldRect.cy + Math.sin(a) * radius * worldRect.r,
            };
        },

        getExchangerPosition(viewport, worldRect) {
            const ex = layout.exchanger || {};
            const rule = ex.rule || 'radial';
            if (rule === 'xy') {
                return { x: ex.x * viewport.width, y: ex.y * viewport.height };
            }
            const a = ex.angle ?? Math.PI / 2;
            const r = ex.radius ?? 0.65;
            return {
                x: worldRect.cx + Math.cos(a) * r * worldRect.r,
                y: worldRect.cy + Math.sin(a) * r * worldRect.r,
            };
        },

        getInventoryRect(viewport) {
            const m = Math.min(viewport.width, viewport.height);
            const cell = m * 0.075;
            const gap  = m * 0.014;
            const cells = 5;
            const total = cells * cell + (cells - 1) * gap;
            return {
                x0: (viewport.width - total) / 2,
                y: viewport.height - cell - m * 0.06,
                cell, gap, total, cells,
            };
        },

        getForecastRect(viewport) {
            const m = Math.min(viewport.width, viewport.height);
            const cell = m * 0.1;
            const gap  = m * 0.016;
            const cells = 5;
            const total = cells * cell + (cells - 1) * gap;
            return {
                x0: (viewport.width - total) / 2,
                y: m * 0.15,
                cell, gap, total, cells,
            };
        },

        getHudOrigin(viewport) {
            return { x: 16, y: 26 };
        },
    };
}

// Fallback-ключи, чтобы не падало при отсутствии
const FALLBACK_SVG_KEYS = {
    world: FALLBACK_SVG.world,
    portalClosed: FALLBACK_SVG.portalClosed,
    portalOpenPast: FALLBACK_SVG.portalOpenPast,
    portalOpenFuture: FALLBACK_SVG.portalOpenFuture,
    portalOpenParallel: FALLBACK_SVG.portalOpenParallel,
    portalOpenAnomaly: FALLBACK_SVG.portalOpenAnomaly,
    cellEmpty: FALLBACK_SVG.cellEmpty,
    cellFilled: FALLBACK_SVG.cellFilled,
    figureCircle: FALLBACK_SVG.figureCircle,
    figureDiamond: FALLBACK_SVG.figureDiamond,
    figureSquare: FALLBACK_SVG.figureSquare,
    figureTriangle: FALLBACK_SVG.figureTriangle,
    figurePolyhedron: FALLBACK_SVG.figurePolyhedron,
};

// Загрузить мир по ID.
export async function loadSpec(id) {
    const worldJson = await loadWorld(id);
    if (!worldJson) {
        console.warn('[specFactory] мир не найден:', id);
        return null;
    }
    console.log('✅ Мир загружен:', id, worldJson.name || '');
    return makeSpecFromJson(worldJson);
}

// Загрузить мир для (branchId, era).
export async function loadSpecFor(branchId, era) {
    const id = await pickWorldId(branchId, era);
    if (id == null) return null;
    console.log('[specFactory] branch=', branchId, 'era=', era, '→ world', id);
    return loadSpec(id);
}