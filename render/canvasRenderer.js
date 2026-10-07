// multiverse/render/canvasRenderer.js
//
// Базовая реализация рендера на Canvas 2D.
// Все SVG — через SvgParser (кэшируется).

import { RendererInterface } from './rendererInterface.js';
import { SvgParser } from './svgParser.js';

export class CanvasRenderer extends RendererInterface {
    constructor() {
        super();
        this.canvas = null;
        this.ctx = null;
        this.width = 0;
        this.height = 0;
        this.dpr = 1;
        this.spec = null;
        this.config = null;
    }

    init(canvas, worldSpec, config) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.spec = worldSpec;
        this.config = config;

        // Установим начальный размер
        this.resize(canvas.clientWidth || 360, canvas.clientHeight || 640, window.devicePixelRatio || 1);
    }

    setSpec(worldSpec) {
        this.spec = worldSpec;
    }

    resize(cssWidth, cssHeight, dpr) {
        this.dpr = dpr;
        this.width = cssWidth;
        this.height = cssHeight;
        this.canvas.width  = Math.round(cssWidth * dpr);
        this.canvas.height = Math.round(cssHeight * dpr);
        this.canvas.style.width  = cssWidth + 'px';
        this.canvas.style.height = cssHeight + 'px';
    }

    // ----- низкоуровневое -----
    _resetTransform() {
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(this.dpr, this.dpr);
    }

    clear() {
        this._resetTransform();
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    _drawSvgElements(elements) {
        const ctx = this.ctx;
        for (const el of elements) {
            if (!el.path) continue;
            const prevAlpha = ctx.globalAlpha;
            if (el.opacity < 1) ctx.globalAlpha = el.opacity;

            if (el.fill) {
                ctx.fillStyle = el.fill;
                ctx.fill(el.path);
            }
            if (el.stroke && el.strokeWidth > 0) {
                ctx.strokeStyle = el.stroke;
                ctx.lineWidth = el.strokeWidth;
                ctx.stroke(el.path);
            }

            ctx.globalAlpha = prevAlpha;
        }
    }

    _drawSvgString(svg, cx, cy, scale) {
        if (!svg) return;
        const els = SvgParser.parse(svg, cx, cy, scale);
        this._drawSvgElements(els);
    }

    // ----- мир -----
    drawWorld(worldRect, node, spec) {
        const svg = spec.getWorldSvg();
        if (!svg) return;

        // SVG рисуется как будто r=100 в SVG = worldRect.r на канве
        const scale = worldRect.r / 100;
        this._drawSvgString(svg, worldRect.cx, worldRect.cy, scale);
    }

    drawWorldFill(worldRect, fillFrac) {
        if (fillFrac <= 0) return;
        const ctx = this.ctx;
        const r = worldRect.r * 0.55 * fillFrac;
        ctx.fillStyle = 'rgba(80, 220, 180, 0.24)';
        ctx.beginPath();
        ctx.arc(worldRect.cx, worldRect.cy, r, 0, Math.PI * 2);
        ctx.fill();
    }

    // ----- порталы -----
    drawPortal(portal, x, y, spec, isKnown) {
        const svg = spec.getPortalSvg(portal);
        if (!svg) {
            // Fallback — просто круг
            const ctx = this.ctx;
            ctx.strokeStyle = portal.isOpen() ? '#7aa8ff' : '#5a6480';
            ctx.lineWidth = portal.isOpen() ? 2.5 : 1.5;
            ctx.beginPath();
            ctx.arc(x, y, 28, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            this._drawSvgString(svg, x, y, 1.0);
        }

        // Подпись
        const ctx = this.ctx;
        ctx.fillStyle = portal.isOpen() ? '#ffffff' : '#a0aac8';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let label = portal.displayLabel();
        if (!isKnown && !portal.anomalous && portal.kind !== 'PARALLEL') {
            // Игрок не знает, куда ведёт
            if (!portal.customLabel) label = '?';
        }
        if (!isKnown && portal.kind === 'PARALLEL' && !portal.customLabel) {
            label = '?';
        }
        ctx.fillText(label, x, y + 4);
    }

    drawPortalCell(cell, x, y, portal, spec, highlight) {
        const svg = spec.getCellSvg(cell.figure != null);
        if (svg) this._drawSvgString(svg, x, y, 1.0);
        else {
            const ctx = this.ctx;
            ctx.fillStyle = '#283250';
            ctx.beginPath();
            ctx.arc(x, y, 13, 0, Math.PI * 2);
            ctx.fill();
        }

        if (cell.figure != null) {
            this.drawFigure(cell.figure.shape, x, y, 10, spec);
        }

        if (highlight) {
            const ctx = this.ctx;
            ctx.strokeStyle = '#ffcc44';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, 16, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    // ----- фигуры -----
    drawFigure(shapeIndex, x, y, size, spec) {
        const svg = spec.getFigureSvg(shapeIndex);
        if (!svg) return;
        // В SVG фигуры r=18
        const scale = size / 18;
        this._drawSvgString(svg, x, y, scale);
    }

    drawFigureHighlight(shapeIndex, x, y, size, spec) {
        this.drawFigure(shapeIndex, x, y, size, spec);
        const ctx = this.ctx;
        ctx.strokeStyle = '#ffcc44';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, size + 4, 0, Math.PI * 2);
        ctx.stroke();
    }

    // ----- обменник -----
 drawExchanger(x, y, spec) {
    const svg = spec.getExchangerSvg ? spec.getExchangerSvg() : null;

    if (svg) {
        this._drawSvgString(svg, x, y, 1.0);
        return;
    }

    // Fallback — старый хардкод
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(255, 200, 90, 0.25)';
    ctx.beginPath();
    ctx.arc(x, y, 32, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffc85a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, 24, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#1e1a0e';
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffe6a0';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('¤', x, y + 1);
}

    // ----- HUD -----
    drawHud(state, viewport, spec) {
        const ctx = this.ctx;
        const p = state.player;
        const node = p.currentNode;
        if (!node) return;

        const origin = spec ? spec.getHudOrigin(viewport) : { x: 16, y: 24 };

        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';

        ctx.fillStyle = '#dce6ff';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('ветка=' + p.currentBranch + '  t=' + node.timeAnchor + '  год=' + p.gameYear, origin.x, origin.y);

        ctx.font = '13px sans-serif';
        ctx.fillStyle = '#5ab4ff';
        ctx.fillText('Прошлое ' + p.pastEnergy + '/20', origin.x, origin.y + 22);

        ctx.fillStyle = '#ffaa5a';
        ctx.fillText('Будущее ' + p.futureEnergy + '/20', origin.x, origin.y + 42);
    }

    drawInventory(state, rect, spec, highlight) {
        const ctx = this.ctx;
        const slots = state.player.slots;

        for (let i = 0; i < rect.cells; i++) {
            const x = rect.x0 + i * (rect.cell + rect.gap);
            const y = rect.y;

            ctx.fillStyle = 'rgba(36, 42, 64, 0.9)';
            ctx.beginPath();
            ctx.roundRect(x, y, rect.cell, rect.cell, 10);
            ctx.fill();
            ctx.strokeStyle = 'rgba(90, 120, 180, 0.9)';
            ctx.lineWidth = 1;
            ctx.stroke();

            if (i < slots.length && !slots[i].isEmpty()) {
                const s = slots[i];
                this.drawFigure(s.shape, x + rect.cell / 2, y + rect.cell / 2, rect.cell * 0.34, spec);
                if (s.count > 1) {
                    ctx.fillStyle = 'rgba(0,0,0,0.7)';
                    ctx.beginPath();
                    ctx.roundRect(x + rect.cell - 22, y + rect.cell - 20, 20, 18, 5);
                    ctx.fill();
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 12px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('×' + s.count, x + rect.cell - 12, y + rect.cell - 11);
                }
            }
        }
    }

    drawForecast(state, rect, spec, highlight) {
        const ctx = this.ctx;
        const node = state.player.currentNode;
        if (!node) return;

        for (let i = 0; i < rect.cells; i++) {
            const x = rect.x0 + i * (rect.cell + rect.gap);
            const y = rect.y;

            ctx.fillStyle = 'rgba(36, 42, 64, 0.9)';
            ctx.beginPath();
            ctx.roundRect(x, y, rect.cell, rect.cell, 10);
            ctx.fill();
            ctx.strokeStyle = 'rgba(90, 120, 180, 0.9)';
            ctx.lineWidth = 1;
            ctx.stroke();

            this.drawFigure(i, x + rect.cell / 2, y + rect.cell / 2 - 6, rect.cell * 0.28, spec);

            const pct = Math.round((node.forecast[i] || 0) * 100);
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.beginPath();
            ctx.roundRect(x + 4, y + rect.cell - 20, rect.cell - 8, 18, 5);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(pct + '%', x + rect.cell / 2, y + rect.cell - 11);
        }
    }

    // ----- кнопки -----
    drawZoomButtons(state, viewport) {
        const ctx = this.ctx;
        const bx = viewport.width - 60;
        const by = 16;
        const bs = 28;

        // +
        ctx.fillStyle = 'rgba(30, 36, 56, 0.9)';
        ctx.beginPath(); ctx.roundRect(bx, by, bs, bs, 8); ctx.fill();
        ctx.strokeStyle = 'rgba(90, 120, 180, 0.9)';
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('+', bx + bs / 2, by + bs / 2);

        // -
        const by2 = by + bs + 8;
        ctx.fillStyle = 'rgba(30, 36, 56, 0.9)';
        ctx.beginPath(); ctx.roundRect(bx, by2, bs, bs, 8); ctx.fill();
        ctx.strokeStyle = 'rgba(90, 120, 180, 0.9)';
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.fillText('−', bx + bs / 2, by2 + bs / 2);
    }

    drawStatus(text, viewport) {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(220, 230, 255, 0.85)';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(text, 16, viewport.height - 16);
    }

    // ----- переход -----
    drawTransition(transition, bgSpec) {
        if (!transition) return;
        const ctx = this.ctx;
        const op = transition.opacity();

        // Фон
        ctx.globalAlpha = op;
        ctx.fillStyle = (bgSpec && bgSpec.backgroundColor) || '#0a0a2a';
        ctx.fillRect(0, 0, this.width, this.height);

        // SVG поверх, если есть
        if (bgSpec && bgSpec.svg) {
            const scale = Math.min(this.width, this.height) / 200;
            this._drawSvgString(bgSpec.svg, this.width / 2, this.height / 2, scale);
        }
        ctx.globalAlpha = 1;
    }

    flush() {
        // Canvas — синхронный, flush не нужен.
    }
}