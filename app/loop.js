// multiverse/app/loop.js
//
// Игровой цикл: таймер года + отрисовка кадра.

import { HitKind } from '../core/hits.js';
import {
    drawTopBlocks,
    drawEnergy,
    drawSideButtons,
    drawInventoryWithBurn,
} from '../render/layoutRenderer.js';

export function startLoop({ canvas, ctx, world, player, state, renderer, dragAPI, updateHits }) {
    let lastTs = performance.now();
    let yearAccum = 0;

    function frame(ts) {
        const dt = Math.min(100, ts - lastTs);
        lastTs = ts;

        yearAccum += dt;
        const need = 33 * 1000;
        if (yearAccum >= need) {
            yearAccum -= need;
            world.tickUserTime(player, true);
        }

        updateHits();
        renderer.clear();

        const viewport = { width: canvas.clientWidth, height: canvas.clientHeight };
        const node = player.currentNode;

        if (node) {
            node.forecast = world.effectiveForecastAt(node.branchId, node.timeAnchor);
        }

        const radiusMul = node ? (1 + (node.radius || 2) / 5) * state.zoom : 1;
        const worldRect = state.currentWorldSpec.getWorldRect(viewport, radiusMul);

        renderer.drawWorld(worldRect, node, state.currentWorldSpec);
        renderer.drawWorldFill(worldRect, (node.fill || 0) / 100);

        // t-якорь
        ctx.fillStyle = '#dce6ff';
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((node.timeAnchor >= 0 ? '+' : '') + node.timeAnchor,
                     worldRect.cx, worldRect.cy + 6);

        // Фигуры на поле
        const visible = world.visibleOnField(node.branchId, node.timeAnchor);
        const highlight = state.highlight && state.highlight.until > performance.now()
            ? state.highlight : null;
        const drag = dragAPI.drag;

        for (let i = 0; i < visible.length; i++) {
            const f = visible[i];
            const x = worldRect.cx + Math.cos(f.angle) * f.radius * worldRect.r * 0.85;
            const y = worldRect.cy + Math.sin(f.angle) * f.radius * worldRect.r * 0.85;
            f._px = x; f._py = y;
            if (drag.active && drag.figure === f) continue;

            if (highlight && highlight.kind === HitKind.ITEM && highlight.index === i) {
                renderer.drawFigureHighlight(f.shape, x, y, 18, state.currentWorldSpec);
            } else {
                renderer.drawFigure(f.shape, x, y, 18, state.currentWorldSpec);
            }
        }

        // Порталы
        for (let pi = 0; pi < node.portals.length; pi++) {
            const p = node.portals[pi];
            const pos = state.currentWorldSpec.getPortalPosition(pi, viewport, worldRect, node.portals.length);
            const known = player.isPortalKnown(p);
            renderer.drawPortal(p, pos.x, pos.y, state.currentWorldSpec, known);

            const cellR = 54;
            for (let ci = 0; ci < p.cells.length; ci++) {
                const cell = p.cells[ci];
                const a = cell.angle - Math.PI / 2;
                const ccx = pos.x + Math.cos(a) * cellR;
                const ccy = pos.y + Math.sin(a) * cellR;

                const isDragging = drag.active &&
                    drag.source && drag.source.kind === 'CELL' &&
                    drag.source.index === pi * 100 + ci;

                if (isDragging) {
                    renderer.drawPortalCell({ figure: null }, ccx, ccy, p, state.currentWorldSpec, false);
                    continue;
                }

                const packed = pi * 100 + ci;
                const isCellHi = highlight && highlight.kind === HitKind.PORTAL_CELL
                              && highlight.index === packed;
                renderer.drawPortalCell(cell, ccx, ccy, p, state.currentWorldSpec, isCellHi);
            }
        }

        // Обменник
        if (node.hasExchanger) {
            const exPos = state.currentWorldSpec.getExchangerPosition(viewport, worldRect);
            renderer.drawExchanger(exPos.x, exPos.y, state.currentWorldSpec);
        }

        // HUD
        drawTopBlocks(ctx, viewport, state);
        drawEnergy(ctx, viewport, state);
        drawSideButtons(ctx, viewport);
        drawInventoryWithBurn(ctx, viewport, state);

        const fcRect = state.currentWorldSpec.getForecastRect(viewport);
        renderer.drawForecast(state, fcRect, state.currentWorldSpec, null);
        renderer.drawStatus(state.statusText, viewport);

        // Тащим фигуру — поверх
        if (drag.active && drag.figure) {
            renderer.drawFigure(drag.figure.shape, drag.x, drag.y, 22, state.currentWorldSpec);
        }

        renderer.flush();
        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
}