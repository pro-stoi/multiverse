// multiverse/app/input.js
//
// Обработка тапов, кликов, двойного тапа.

import { HitKind } from '../core/hits.js';
import { ExchangerDialog } from '../ui/exchangerDialog.js';
import { loadSpecFor } from './specFactory.js';
import { pickWorldId } from '../data/worldAssets.js';
import { Transition } from '../core/transitions.js';

import { CONFIG } from '../config.js';

export function setupInput({ canvas, hits, world, player, state, dragAPI }) {
    const DOUBLE_TAP_MS = 320;
    let lastTapTime = 0;
    let lastTapId = null;
    let downX = 0, downY = 0;
    let downHit = null;
    let dragThresholdPassed = false;

    function canvasXY(e) {
        const rect = canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

function onPortalTap(pi) {
    const node = player.currentNode;
    const portal = node.portals[pi];
    if (!portal) return;
    if (!portal.isOpen()) {
        state.statusText = 'Портал закрыт (' + portal.filledCells() + '/5)';
        return;
    }
    if (player.energy < 1) {
        state.statusText = 'Не хватает энергии';
        return;
    }
    if (state.transition) return;   // уже в переходе — игнорируем

 if (!CONFIG.debug.cheat_noEnergyCost && !CONFIG.debug.infiniteEnergy) {
    player.spendEnergy(1);
}

// Сохраняем «что прыгнуть» — но сам прыжок делаем ПОСЛЕ затемнения
const jumpAction = () => {
    try {
        world.jump(player, portal, null, async () => {
            state.statusText = 'Прыжок → t=' + player.currentNode.timeAnchor;
            await maybeSwapWorld();
        });
    } catch (e) {
        state.statusText = 'Прыжок невозможен: ' + e.message;
    }
};

state.transition = new Transition(
    {
        durationIn: 400,
        durationHold: 600,
        durationOut: 400,
        skippable: true,
    },
    // onComplete — когда всё закончилось
    () => { state.transition = null; },
    // onPhaseInEnd — когда затемнение завершено
    () => { jumpAction(); }
);
}

// Проверить, изменился ли мир для текущего (branchId, era).
// Если да — загрузить новый.
async function maybeSwapWorld() {
    const node = player.currentNode;
    if (!node) return;

    const era = Math.floor(node.timeAnchor / 10);
    const worldId = await pickWorldId(node.branchId, era);
    if (worldId == null) return;

    if (worldId === state.currentWorldId) return;

    try {
        const jsonSpec = await loadSpecFor(node.branchId, era);
        if (jsonSpec) {
            state.currentWorldSpec = jsonSpec;
            state.currentWorldId = worldId;
            console.log('[input] мир сменился на', worldId);
        }
    } catch (e) {
        console.warn('[input] не удалось загрузить мир', worldId, e);
    }
}

    function pickFieldFigure(index) {
        const node = player.currentNode;
        const visible = world.visibleOnField(node.branchId, node.timeAnchor);
        const f = visible[index];
        if (!f) return;
        if (player.addFigure(f)) {
            world.pickUp(f);
            state.statusText = 'Взял фигуру';
        } else {
            state.statusText = 'Инвентарь полон';
        }
    }

    function pickCellFigure(packed) {
        const node = player.currentNode;
        const pi = Math.floor(packed / 100);
        const ci = packed % 100;
        const portal = node.portals[pi];
        if (!portal) return;
        const cell = portal.cells[ci];
        if (!cell || !cell.figure) return;
        if (player.addFigure(cell.figure)) {
            const wasFull = (portal.filledCells() === 5);
            if (wasFull) {
                const combo = portal.cells.map(c => c.figure);
                world.unregisterCombo(node.branchId, combo);
            }
            cell.figure = null;
            portal.refreshState();
            state.statusText = 'Забрал из ячейки';
        } else {
            state.statusText = 'Инвентарь полон';
        }
    }

    function handleTap(x, y, now) {
        const hit = hits.findAt(x, y);
        if (!hit) { lastTapId = null; lastTapTime = 0; return; }

        const id = hit.kind + ':' + hit.index;
        const isDouble = (now - lastTapTime < DOUBLE_TAP_MS) && (lastTapId === id);

        if (hit.kind === HitKind.PORTAL) {
            onPortalTap(hit.index);
            lastTapId = null; lastTapTime = 0; return;
        }
           if (hit.kind === HitKind.ZOOM_IN)  { state.zoom = Math.min(2.0, state.zoom + 0.15); lastTapId = null; return; }
        if (hit.kind === HitKind.ZOOM_OUT) { state.zoom = Math.max(0.5, state.zoom - 0.15); lastTapId = null; return; }

        if (hit.kind === 'NEXT_YEAR') {
            if (!CONFIG.debug.cheat_noEnergyCost && !CONFIG.debug.infiniteEnergy) {
                if (player.energy < 1) {
                    state.statusText = 'Не хватает энергии';
                    lastTapId = null;
                    return;
                }
                player.spendEnergy(1);
            }
            world.tickUserTime(player, false);
            state.statusText = 'Год +1 (t=' + player.currentNode.timeAnchor + ')';
            lastTapId = null;
            return;
        }

        if (hit.kind === HitKind.EXCHANGER) {
            if (isDouble) {
                ExchangerDialog.open(player, (success) => {
                    if (success) state.statusText = 'Обмен завершён';
                });
                lastTapId = null; lastTapTime = 0; state.highlight = null;
            } else {
                state.highlight = { kind: 'EXCHANGER', index: 0, until: now + 260 };
                lastTapId = id; lastTapTime = now;
            }
            return;
        }

        if (hit.kind === HitKind.ITEM || hit.kind === HitKind.PORTAL_CELL) {
            if (isDouble) {
                if (hit.kind === HitKind.ITEM) pickFieldFigure(hit.index);
                else                           pickCellFigure(hit.index);
                lastTapId = null; lastTapTime = 0; state.highlight = null;
            } else {
                state.highlight = { kind: hit.kind, index: hit.index, until: now + 260 };
                lastTapId = id; lastTapTime = now;
            }
        }
    }

    // --- слушатели ---
  let panActive = false;
let panStartX = 0, panStartY = 0;
let panStartPanX = 0, panStartPanY = 0;
let panCandidate = false;   // нажатие может стать панорамированием

canvas.addEventListener('pointerdown', (e) => {
    const { x, y } = canvasXY(e);
    downX = x; downY = y;
    downHit = hits.findAt(x, y);
    panCandidate = false;
    panActive = false;

    // Если нажатие НЕ на хит (пустое место) — кандидат на панорамирование
    if (!downHit) {
        panCandidate = true;
        panStartX = x;
        panStartY = y;
        panStartPanX = state.panX || 0;
        panStartPanY = state.panY || 0;
    }
});

canvas.addEventListener('pointermove', (e) => {
    const { x, y } = canvasXY(e);

    // Панорамирование
    if (panCandidate && !panActive) {
        const dx = x - panStartX;
        const dy = y - panStartY;
        if (dx * dx + dy * dy > 100) {   // порог срабатывания
            panActive = true;
        }
    }

    if (panActive) {
        state.panX = panStartPanX + (x - panStartX);
        state.panY = panStartPanY + (y - panStartY);
        return;
    }

    // Драг фигуры
    if (!downHit) return;
    const dx = x - downX, dy = y - downY;
    const dist2 = dx * dx + dy * dy;
    if (!dragThresholdPassed && dist2 > 100) {
        dragThresholdPassed = true;
        dragAPI.start(downHit, x, y);
    }
    if (dragAPI.drag.active) dragAPI.update(x, y);
});

canvas.addEventListener('pointerup', (e) => {
    const { x, y } = canvasXY(e);
    const now = performance.now();
    const dx = x - downX, dy = y - downY;
    const moved = (dx * dx + dy * dy) > 100;

    if (panActive) {
        panActive = false;
        panCandidate = false;
        downHit = null;
        return;
    }

    panCandidate = false;

    if (dragAPI.drag.active) {
        dragAPI.drop(x, y);
        dragThresholdPassed = false;
        downHit = null;
        return;
    }
    dragThresholdPassed = false;
    if (moved) { downHit = null; return; }
    handleTap(x, y, now);
    downHit = null;
});

canvas.addEventListener('pointercancel', () => {
    if (dragAPI.drag.active) {
        dragAPI.returnToSource();
        dragAPI.end();
    }
    panActive = false;
    panCandidate = false;
    dragThresholdPassed = false;
    downHit = null;
});
   } 
