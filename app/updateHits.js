// multiverse/app/updateHits.js
//
// Обновление хит-регионов каждый кадр.

import { HitKind } from '../core/hits.js';

export function updateHits({ hits, world, player, state, canvas }) {
    hits.clear();

    const viewport = { width: canvas.clientWidth, height: canvas.clientHeight };
    const node = player.currentNode;
    if (!node) return;

    const radiusMul = (1 + (node.radius || 2) / 5) * state.zoom;
    const worldRect = state.currentWorldSpec.getWorldRect(viewport, radiusMul);

    // Порталы + ячейки
    for (let pi = 0; pi < node.portals.length; pi++) {
        const pos = state.currentWorldSpec.getPortalPosition(pi, viewport, worldRect, node.portals.length);
        const cellR = 54;
        for (let ci = 0; ci < node.portals[pi].cells.length; ci++) {
            const a = node.portals[pi].cells[ci].angle - Math.PI / 2;
            const ccx = pos.x + Math.cos(a) * cellR;
            const ccy = pos.y + Math.sin(a) * cellR;
            hits.add(HitKind.PORTAL_CELL, pi * 100 + ci, ccx, ccy, 15);
            hits.addBlocked(ccx, ccy, 18, 'cell');
        }
        hits.add(HitKind.PORTAL, pi, pos.x, pos.y, 32);
        hits.addBlocked(pos.x, pos.y, 36, 'portal');
    }

    // Предметы
    const visible = world.visibleOnField(node.branchId, node.timeAnchor);
    for (let i = 0; i < visible.length; i++) {
        const f = visible[i];
        const x = f._px != null ? f._px : worldRect.cx;
        const y = f._py != null ? f._py : worldRect.cy;
        hits.add(HitKind.ITEM, i, x, y, 22);
    }

    // Обменник
    if (node.hasExchanger) {
        const exPos = state.currentWorldSpec.getExchangerPosition(viewport, worldRect);
        hits.add(HitKind.EXCHANGER, 0, exPos.x, exPos.y, 28);
        hits.addBlocked(exPos.x, exPos.y, 32, 'exchanger');
    }

    // Кнопки зума + год
    const W = viewport.width;
    const H = viewport.height;
    const bw = W * 0.09;
    const bh = H * 0.045;
    const bx = W - bw - W * 0.02;
    const by = H * 0.13;
    const gap = H * 0.012;
    hits.add(HitKind.ZOOM_IN,  0, bx + bw / 2, by + bh / 2, bh / 2);
    hits.add(HitKind.ZOOM_OUT, 0, bx + bw / 2, by + bh + gap + bh / 2, bh / 2);
    hits.add('NEXT_YEAR',      0, bx + bw / 2, by + (bh + gap) * 2 + bh / 2, bh / 2);

    // Слоты инвентаря + BURN
    const cell = W * 0.14;
    const invGap = W * 0.018;
    const burn = cell * 1.15;
    const totalInvW = 5 * cell + 4 * invGap + invGap * 2 + burn;
    const invX0 = (W - totalInvW) / 2;
    const invY = H - cell - H * 0.05;

    for (let i = 0; i < 5; i++) {
        const x = invX0 + i * (cell + invGap) + cell / 2;
        const y = invY + cell / 2;
        hits.add(HitKind.SLOT, i, x, y, cell / 2);
        hits.addBlocked(x, y, cell / 2, 'slot');
    }

    const burnX = invX0 + 5 * (cell + invGap) + invGap;
    const burnY = invY - (burn - cell) / 2;
    hits.add('BURN', 0, burnX + burn / 2, burnY + burn / 2, burn / 2);
    hits.addBlocked(burnX + burn / 2, burnY + burn / 2, burn / 2, 'burn');

    // Прогноз
    const fcRect = state.currentWorldSpec.getForecastRect(viewport);
    for (let i = 0; i < fcRect.cells; i++) {
        const x = fcRect.x0 + i * (fcRect.cell + fcRect.gap) + fcRect.cell / 2;
        const y = fcRect.y + fcRect.cell / 2;
        hits.add(HitKind.FORECAST, i, x, y, fcRect.cell / 2);
        hits.addBlocked(x, y, fcRect.cell / 2, 'forecast');
    }
}