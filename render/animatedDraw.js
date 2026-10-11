// multiverse/render/animatedDraw.js

import { SvgParser } from './svgParser.js';

// Рисует SVG в (cx, cy) с применением анимации.
export function drawSvgAnimated(ctx, svg, cx, cy, scale, animation) {
    if (!svg) return;

    const now = performance.now();

    ctx.save();

    // Переносим в точку
    ctx.translate(cx, cy);

    // Применяем анимацию (если есть)
    if (animation) {
        animation.apply(ctx, now);
    }

    // Парсим SVG в ЛОКАЛЬНЫХ координатах
    const els = SvgParser.parseLocal(svg, scale);

    for (const el of els) {
        if (!el.path) continue;
        const prevAlpha = ctx.globalAlpha;
        if (el.opacity < 1) ctx.globalAlpha *= el.opacity;
        if (el.fill)   { ctx.fillStyle = el.fill;     ctx.fill(el.path); }
        if (el.stroke && el.strokeWidth > 0) {
            ctx.strokeStyle = el.stroke;
            ctx.lineWidth = el.strokeWidth;
            ctx.stroke(el.path);
        }
        ctx.globalAlpha = prevAlpha;
    }

    ctx.restore();
}