// multiverse/app/fallback.js
//
// Fallback SVG + spec. Используется, если JSON-мир не загрузился.

export const FALLBACK_SVG = {
    world: `<svg>
        <circle cx="0" cy="0" r="100" fill="#1e2846" stroke="#7aa8ff" stroke-width="2"/>
        <circle cx="0" cy="0" r="60" fill="#253058" stroke="#5a88d0" stroke-width="1"/>
    </svg>`,

    portalClosed: `<svg>
        <circle cx="0" cy="0" r="28" fill="none" stroke="#5a6480" stroke-width="1.5"/>
    </svg>`,

    portalOpenPast: `<svg>
        <circle cx="0" cy="0" r="28" fill="none" stroke="#5ab4ff" stroke-width="2.5"/>
        <circle cx="0" cy="0" r="20" fill="none" stroke="#a8d8ff" stroke-width="1" opacity="0.6"/>
    </svg>`,

    portalOpenFuture: `<svg>
        <circle cx="0" cy="0" r="28" fill="none" stroke="#ffaa5a" stroke-width="2.5"/>
        <circle cx="0" cy="0" r="20" fill="none" stroke="#ffd8a8" stroke-width="1" opacity="0.6"/>
    </svg>`,

    portalOpenParallel: `<svg>
        <circle cx="0" cy="0" r="28" fill="none" stroke="#a08cff" stroke-width="2.5"/>
        <circle cx="0" cy="0" r="20" fill="none" stroke="#c8b8ff" stroke-width="1" opacity="0.6"/>
    </svg>`,

    portalOpenAnomaly: `<svg>
        <circle cx="0" cy="0" r="28" fill="none" stroke="#c878ff" stroke-width="2.5"/>
    </svg>`,

    cellEmpty: `<svg>
        <circle cx="0" cy="0" r="13" fill="#283250" stroke="#3a4a70" stroke-width="1"/>
    </svg>`,
    cellFilled: `<svg>
        <circle cx="0" cy="0" r="13" fill="#3a4a70" stroke="#5a88d0" stroke-width="1"/>
    </svg>`,

    figureCircle:     `<svg><circle cx="0" cy="0" r="18" fill="#ffffff"/></svg>`,
    figureDiamond:    `<svg><path d="M 0 -18 L 18 0 L 0 18 L -18 0 Z" fill="#ffffff"/></svg>`,
    figureSquare:     `<svg><rect x="-16" y="-16" width="32" height="32" fill="#ffffff"/></svg>`,
    figureTriangle:   `<svg><path d="M 0 -18 L 16 14 L -16 14 Z" fill="#ffffff"/></svg>`,
    figurePolyhedron: `<svg><path d="M 0 -18 L 17 -5 L 11 15 L -11 15 L -17 -5 Z" fill="#ffffff"/></svg>`,
};

const FIGURE_KEY = [
    'figureCircle', 'figureDiamond', 'figureSquare',
    'figureTriangle', 'figurePolyhedron',
];

export function makeFallbackSpec() {
    return {
        id: 'fallback',
        name: 'Fallback',
        era: 0,
        svg: FALLBACK_SVG,
        background: '#0a0a1e',

        getWorldSvg() { return FALLBACK_SVG.world; },

        getPortalSvg(portal) {
            if (!portal.isOpen()) return FALLBACK_SVG.portalClosed;
            if (portal.anomalous) return FALLBACK_SVG.portalOpenAnomaly;
            if (portal.kind === 'PARALLEL') return FALLBACK_SVG.portalOpenParallel;
            if (portal.kind === 'TIME_PAST') return FALLBACK_SVG.portalOpenPast;
            return FALLBACK_SVG.portalOpenFuture;
        },

        getCellSvg(filled) {
            return filled ? FALLBACK_SVG.cellFilled : FALLBACK_SVG.cellEmpty;
        },

        getFigureSvg(shapeIndex) {
            return FALLBACK_SVG[FIGURE_KEY[shapeIndex]] || FALLBACK_SVG.figureCircle;
        },

        getPortalPosition(slotIndex, viewport, worldRect, totalCount) {
            const n = totalCount || 5;
            const a = -Math.PI / 2 + slotIndex * 2 * Math.PI / n;
            return {
                x: worldRect.cx + Math.cos(a) * 1.3 * worldRect.r,
                y: worldRect.cy + Math.sin(a) * 1.3 * worldRect.r,
            };
        },

        getExchangerPosition(viewport, worldRect) {
            return { x: worldRect.cx, y: worldRect.cy + worldRect.r * 0.65 };
        },

        getWorldRect(viewport, radiusMul = 1.0) {
            const m = Math.min(viewport.width, viewport.height);
            const r = Math.max(60, m * 0.22 * radiusMul);
            return {
                cx: viewport.width  * 0.5,
                cy: viewport.height * 0.55,
                r,
                width: viewport.width,
                height: viewport.height,
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