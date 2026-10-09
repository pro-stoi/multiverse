// multiverse/render/layoutRenderer.js
//
// Рисует HUD-объекты: три блока (ветка/время/год), энергию, кнопки.
// Пока — хардкод. Позже — параметры из JSON layout.

import { SvgParser } from './svgParser.js';

// Хелпер: нарисовать SVG-строку через класс SvgParser
function drawSvgString(ctx, svg, cx, cy, scale) {
    if (!svg) return;
    const els = SvgParser.parse(svg, cx, cy, scale);
    for (const el of els) {
        if (!el.path) continue;
        const prevAlpha = ctx.globalAlpha;
        if (el.opacity < 1) ctx.globalAlpha = el.opacity;
        if (el.fill)   { ctx.fillStyle = el.fill;     ctx.fill(el.path); }
        if (el.stroke && el.strokeWidth > 0) {
            ctx.strokeStyle = el.stroke;
            ctx.lineWidth = el.strokeWidth;
            ctx.stroke(el.path);
        }
        ctx.globalAlpha = prevAlpha;
    }
}

// ===============================================================
//  Три блока по центру: ВЕТКА | ВРЕМЯ | ГОД
// ===============================================================
export function drawTopBlocks(ctx, viewport, state) {
    const W = viewport.width;
    const H = viewport.height;

    const y = H * 0.02;           // отступ сверху
    const h = H * 0.045;          // ← высота блока: было 0.075, стало 0.045

    // Ширины (доли от ширины экрана)
    const wBranch = W * 0.18;     // ← чуть шире
    const wTime   = W * 0.20;
    const wYear   = W * 0.20;

    const gap = W * 0.02;

    const totalW = wBranch + wTime + wYear + gap * 2;
    let x0 = (W - totalW) / 2;
    

    // ВЕТКА
    drawPanel(ctx, x0, y, wBranch, h, {
        label: 'ВЕТКА',
        value: String(state.player.currentBranch),
        border: '#5a6480',
        valueColor: '#dce6ff',
    });
    x0 += wBranch + gap;

    // ВРЕМЯ
    const t = state.player.currentNode ? state.player.currentNode.timeAnchor : 0;
    const tLabel = (t > 0 ? '+' : '') + t;
    const timeBorder = t > 0 ? '#ffaa5a' : t < 0 ? '#5ab4ff' : '#5a6480';
    const timeColor  = t > 0 ? '#ffcc88' : t < 0 ? '#88c8ff' : '#dce6ff';
    drawPanel(ctx, x0, y, wTime, h, {
        label: 'ВРЕМЯ',
        value: tLabel,
        border: timeBorder,
        valueColor: timeColor,
    });
    x0 += wTime + gap;

    // ГОД
    drawPanel(ctx, x0, y, wYear, h, {
        label: 'ГОД',
        value: String(state.player.gameYear),
        border: '#ffc85a',
        valueColor: '#ffcc44',
    });
}

export function drawPanel(ctx, x, y, w, h, opts) {
    const radius = 10;
    const bg = opts.background || 'rgba(30, 36, 56, 0.85)';
    const borderColor = opts.border || '#5a6480';
    const valueColor = opts.valueColor || '#dce6ff';
    const labelColor = opts.labelColor || '#8aa0c8';

    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.fill();

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.stroke();

    ctx.fillStyle = labelColor;
    ctx.font = `${Math.round(h * 0.22)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(opts.label || '', x + w / 2, y + h * 0.28);

    ctx.fillStyle = valueColor;
    ctx.font = `bold ${Math.round(h * 0.42)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(opts.value || '', x + w / 2, y + h * 0.68);
}

// ===============================================================
//  Энергия
// ===============================================================
export function drawEnergy(ctx, viewport, state, opts = {}) {
    const W = viewport.width;
    const H = viewport.height;

    // Совпадает с drawInventoryWithBurn
    const cell = W * 0.14;
    const invY = H - cell - H * 0.05;

    const h = H * 0.018;              // тонкая полоска
    const w = 5 * cell + 4 * (W * 0.018);   // ширина над 5 слотами
    const x = (W - w) / 2;
    const y = invY - h - H * 0.012;   // чуть выше инвентаря

    const cur = state.player.energy ?? 20;
    const max = state.player.energyMax ?? 20;

    // Фон
    ctx.fillStyle = 'rgba(30, 36, 56, 0.85)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();

    // Заполнение
    const fillFrac = Math.max(0, Math.min(1, cur / max));
    if (fillFrac > 0) {
        ctx.fillStyle = 'rgba(90, 220, 180, 0.85)';
        ctx.beginPath();
        ctx.roundRect(x, y, w * fillFrac, h, 6);
        ctx.fill();
    }

    // Обводка
    ctx.strokeStyle = '#5a88d0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.stroke();

    // Текст — поверх, мелкий, по центру
    ctx.fillStyle = '#dce6ff';
    ctx.font = `bold ${Math.round(h * 0.85)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡ ' + cur + '/' + max, x + w / 2, y + h / 2 + 1);
}

// ===============================================================
//  Кнопки справа
// ===============================================================
export function drawSideButtons(ctx, viewport) {
    const W = viewport.width;
    const H = viewport.height;

    const bw = W * 0.09;
    const bh = H * 0.045;
    const x  = W - bw - W * 0.02;
    let y    = H * 0.13;

    const gap = H * 0.012;

    drawButton(ctx, x, y, bw, bh, '+', '#5a6480');
    y += bh + gap;

    drawButton(ctx, x, y, bw, bh, '−', '#5a6480');
    y += bh + gap;

    drawButton(ctx, x, y, bw, bh, '+ год', '#ffc85a');
    y += bh + gap;
}

function drawButton(ctx, x, y, w, h, label, borderColor) {
    ctx.fillStyle = 'rgba(30, 36, 56, 0.9)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(h * 0.5)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2 + 1);
}

// ===============================================================
//  Инвентарь + 6-я ячейка сжигания
// ===============================================================
export function drawInventoryWithBurn(ctx, viewport, state) {
    const W = viewport.width;
    const H = viewport.height;

    const cell = W * 0.14;
    const gap  = W * 0.018;
    const burn = cell * 1.15;

    const totalW = 5 * cell + 4 * gap + gap * 2 + burn;
    const x0 = (W - totalW) / 2;
    const y  = H - cell - H * 0.05;

    const spec = state.currentWorldSpec;

    for (let i = 0; i < 5; i++) {
        const x = x0 + i * (cell + gap);
        drawInvSlot(ctx, x, y, cell, state.player.slots[i], spec);
    }

    const bx = x0 + 5 * (cell + gap) + gap;
    drawBurnSlot(ctx, bx, y - (burn - cell) / 2, burn, burn, state);
}

function drawInvSlot(ctx, x, y, size, slot, spec) {
    ctx.fillStyle = 'rgba(36, 42, 64, 0.9)';
    ctx.beginPath();
    ctx.roundRect(x, y, size, size, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(90, 120, 180, 0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, size, size, 10);
    ctx.stroke();

    if (!slot || slot.isEmpty()) return;

    const shape = slot.shape;

    // Рисуем фигуру из spec (JSON-мира), а не из локальной копии
    if (spec) {
        const svg = spec.getFigureSvg(shape);
        if (svg) {
            drawSvgString(ctx, svg, x + size / 2, y + size / 2, size / 60);
        }
    }

    if (slot.count > 1) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.beginPath();
        ctx.roundRect(x + size - size * 0.35, y + size - size * 0.32, size * 0.32, size * 0.28, 5);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.round(size * 0.22)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('×' + slot.count, x + size - size * 0.19, y + size - size * 0.18);
    }
}

function drawBurnSlot(ctx, x, y, w, h, state) {
    ctx.fillStyle = 'rgba(56, 30, 30, 0.9)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.fill();

    ctx.strokeStyle = '#ff7a44';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.stroke();

    ctx.fillStyle = '#ffcc88';
    ctx.font = `bold ${Math.round(h * 0.42)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('♻ +3', x + w / 2, y + h / 2 + 1);
}