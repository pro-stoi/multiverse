// multiverse/app/dragDrop.js
//
// Drag & Drop: захват, перемещение, бросок фигур.

import { HitKind } from '../core/hits.js';
import { shapeName } from '../core/figure.js';

export function setupDragDrop({ world, player, hits, state, canvas }) {
    const drag = {
        active: false,
        figure: null,
        source: null,
        x: 0, y: 0,
        offsetX: 0, offsetY: 0,
    };

    function start(hit, x, y) {
        const node = player.currentNode;
        if (!node) return;

        if (hit.kind === HitKind.ITEM) {
            const visible = world.visibleOnField(node.branchId, node.timeAnchor);
            const f = visible[hit.index];
            if (!f) return;
            drag.figure = f;
            drag.source = { kind: 'FIELD', index: hit.index };
            drag.offsetX = f._px != null ? f._px - x : 0;
            drag.offsetY = f._py != null ? f._py - y : 0;
        } else if (hit.kind === HitKind.PORTAL_CELL) {
            const pi = Math.floor(hit.index / 100);
            const ci = hit.index % 100;
            const portal = node.portals[pi];
            if (!portal) return;
            const cell = portal.cells[ci];
            if (!cell || !cell.figure) return;

            const wasFull = (portal.filledCells() === 5);
            if (wasFull) {
                const combo = portal.cells.map(c => c.figure);
                world.unregisterCombo(node.branchId, combo);
            }

            drag.figure = cell.figure;
            drag.source = { kind: 'CELL', index: hit.index };
            cell.figure = null;
            portal.refreshState();
        } else if (hit.kind === HitKind.SLOT) {
            const s = player.slots[hit.index];
            if (!s || s.isEmpty()) return;
            const f = player.takeOneFromSlot(hit.index);
            if (!f) return;
            drag.figure = f;
            drag.source = { kind: 'SLOT', index: hit.index };
        } else {
            return;
        }

        drag.active = true;
        drag.x = x;
        drag.y = y;
        state.statusText = 'Тяну...';
    }

    function update(x, y) {
        if (!drag.active) return;
        drag.x = x;
        drag.y = y;
    }

    function drop(x, y) {
        if (!drag.active || !drag.figure) return;

        const node = player.currentNode;
        const hit = hits.findAt(x, y);

        // BURN
        if (hit && hit.kind === 'BURN') {
            const gain = 3;
            player.addEnergy(gain);
            state.statusText = 'Сжёг фигуру (+' + gain + '⚡)';
            if (drag.source.kind === 'FIELD') world.pickUp(drag.figure);
            end();
            return;
        }

        // FORECAST
        if (hit && hit.kind === HitKind.FORECAST) {
            const shapeIdx = hit.index;
            if (drag.figure.shape !== shapeIdx) {
                state.statusText = 'Форма не подходит (нужна ' + shapeName(shapeIdx) + ')';
                returnToSource();
                end();
                return;
            }
            world.chargeForecast(node, shapeIdx, drag.figure);
            if (drag.source.kind === 'FIELD') world.pickUp(drag.figure);
            state.statusText = 'Прогноз: ' + shapeName(shapeIdx) + ' = ' +
                Math.round(node.forecast[shapeIdx] * 100) + '%';
            end();
            return;
        }

        // SLOT
        if (hit && hit.kind === HitKind.SLOT) {
            if (player.addFigure(drag.figure)) {
                if (drag.source.kind === 'FIELD') world.pickUp(drag.figure);
                state.statusText = 'В инвентарь';
                end();
                return;
            } else {
                state.statusText = 'Инвентарь полон';
                returnToSource();
                end();
                return;
            }
        }

        // PORTAL_CELL
        if (hit && hit.kind === HitKind.PORTAL_CELL) {
            const pi = Math.floor(hit.index / 100);
            const ci = hit.index % 100;
            const portal = node.portals[pi];
            if (!portal) { returnToSource(); end(); return; }
            const cell = portal.cells[ci];
            if (cell.figure != null) {
                state.statusText = 'Ячейка занята';
                returnToSource();
                end();
                return;
            }
            cell.figure = drag.figure;
            drag.figure.location = 'PORTAL_CELL';
            if (portal.filledCells() === 5) {
                const combo = portal.cells.map(c => c.figure);
                const branchId = node.branchId;
                if (!world.isComboAvailable(branchId, combo)) {
                    cell.figure = null;
                    drag.figure.location = 'FIELD';
                    portal.refreshState();
                    returnToSource();
                    state.statusText = 'Такая комбинация уже собрана в этой ветке';
                    end();
                    return;
                }
                world.registerCombo(branchId, combo);
                state.statusText = 'Портал открыт!';
            } else {
                state.statusText = 'В ячейку портала (' + portal.filledCells() + '/5)';
            }
            portal.refreshState();
            end();
            return;
        }

        // Пустота
        if (drag.source.kind === 'FIELD') {
            const worldRect = state.currentWorldSpec.getWorldRect(
                { width: canvas.clientWidth, height: canvas.clientHeight },
                (1 + (node.radius || 2) / 5) * state.zoom,
            );
            const dx = x - worldRect.cx;
            const dy = y - worldRect.cy;
            const angle = Math.atan2(dy, dx);
            const radius = Math.min(0.85, Math.hypot(dx, dy) / worldRect.r);
            world.dropOnField(drag.figure, node.branchId, node.timeAnchor, angle, radius);
            state.statusText = 'На поле';
        } else {
            returnToSource();
            state.statusText = 'На поле нельзя';
        }
        end();
    }

    function returnToSource() {
        if (!drag.figure || !drag.source) return;
        const node = player.currentNode;
        if (drag.source.kind === 'FIELD') {
            // ничего
        } else if (drag.source.kind === 'CELL') {
            const pi = Math.floor(drag.source.index / 100);
            const ci = drag.source.index % 100;
            const portal = node.portals[pi];
            if (portal) {
                portal.cells[ci].figure = drag.figure;
                drag.figure.location = 'PORTAL_CELL';
                portal.refreshState();
            }
        } else if (drag.source.kind === 'SLOT') {
            player.addFigure(drag.figure);
        }
    }

    function end() {
        drag.active = false;
        drag.figure = null;
        drag.source = null;
        state.highlight = null;
    }

    return { drag, start, update, drop, returnToSource, end };
}