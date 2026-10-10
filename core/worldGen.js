// multiverse/core/worldGen.js
//
// Генерация узла (branchId, t).
// Чистая функция, детерминированная по seed.

import { Node } from './node.js';
import { Portal, PortalKind, CELLS } from './portal.js';
import { Figure, Shape } from './figure.js';
import { CONFIG } from '../config.js';

// ===============================================================
//  PRNG / hash
// ===============================================================
function makeRng(seed) {
    let a = seed >>> 0;
    return function() {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function hash32(...nums) {
    let h = 2166136261 >>> 0;
    for (const n of nums) {
        let x = (n | 0) >>> 0;
        for (let i = 0; i < 4; i++) {
            h ^= (x & 0xff);
            h = Math.imul(h, 16777619) >>> 0;
            x >>>= 8;
        }
    }
    return h >>> 0;
}

function nodeSeed(worldSeed, branchId, t) {
    let h = worldSeed >>> 0;
    h = (Math.imul(h ^ (branchId | 0), 0x9E3779B1) >>> 0);
    h = (Math.imul(h ^ (t | 0),        0x85EBCA6B) >>> 0);
    h = (h ^ (h >>> 13)) >>> 0;
    return h >>> 0;
}

// ===============================================================
//  Эпохи
// ===============================================================
export function eraOf(t) {
    return Math.floor(t / 10);
}

// ===============================================================
//  Вспомогательное
// ===============================================================
export function allowedShapesForBranch(branchId) {
    if (branchId === 0) return [Shape.CIRCLE, Shape.DIAMOND];
    const all = [Shape.DIAMOND, Shape.SQUARE, Shape.TRIANGLE, Shape.POLYHEDRON];
    return [all[branchId % all.length]];
}

export function itemsOnNode(t) {
    const c = CONFIG.items;
    const bonus = Math.min(c.bonusAtAbsT, Math.abs(t)) / c.bonusAtAbsT;
    let n = c.baseCount + Math.round(bonus * (c.maxCount - c.baseCount));
    if (n < 1) n = 1;
    if (n > c.maxCount) n = c.maxCount;
    return n;
}

export function placeExchangerAt(branchId, t, seed) {
    if (t === 0) return false;
    const rng = makeRng(seed ^ 0xE1234);
    const absT = Math.abs(t);
    if (absT === CONFIG.exchanger.firstT) return true;
    let cur = CONFIG.exchanger.firstT;
    while (cur < absT) {
        const gap = CONFIG.exchanger.minGap +
            Math.floor(rng() * (CONFIG.exchanger.maxGap - CONFIG.exchanger.minGap + 1));
        const next = cur + gap;
        if (next === absT) return true;
        if (next > absT)  return false;
        cur = next;
    }
    return false;
}

// ===============================================================
//  Генерация узла
// ===============================================================
export function generateNode({ branchId, t, worldSeed, selector, world }) {
    const seed = nodeSeed(worldSeed, branchId, t);
    const rng = makeRng(seed);

    const node = new Node(world.nextNodeId++, t, seed, branchId);

    node.radius = 1 + (Math.abs(branchId * 31 + 7) % 5);
    node.glow   = 0.3 + (Math.abs(branchId * 17) % 60) / 100.0;
    node.fill   = 0;

    const isStart = (t === 0 && branchId === 0);

    // Обменник
    node.hasExchanger = placeExchangerAt(branchId, t, seed);

    // Предметы
    const allowed = allowedShapesForBranch(branchId);
    const isBonus = !isStart && Math.abs(t) % CONFIG.portals.bonusNodeEveryN === 0;
    let itemCount = itemsOnNode(t);
    if (isBonus) itemCount = itemCount * 2;

    for (let i = 0; i < itemCount; i++) {
        const shape = allowed[Math.floor(rng() * allowed.length)];
        const f = new Figure(shape, {
            branchId,
            timeAnchor: t,
            lifespan: 5,
            angle: rng() * 2 * Math.PI,
            radius: rng() * 0.85,
        });
        world.allFigures.push(f);
    }

    // Порталы
    buildPortals(node, rng, branchId, t, worldSeed, isStart, world);

    return node;
}

// ===============================================================
//  Сборка порталов
// ===============================================================
function buildPortals(node, rng, branchId, t, worldSeed, isStart, world) {
    // --- 1. Базовые 5 ---
    // Слот 0: -1
    const pPast = new Portal(-1, 0, 1);
    pPast.kind = PortalKind.TIME_PAST;
    node.addPortal(pPast);

    // Слот 1: +1
    const pFuture = new Portal(+1, 0, 1);
    pFuture.kind = PortalKind.TIME_FUTURE;
    node.addPortal(pFuture);

    // Слоты 2..4: случайные временные
    for (let i = 0; i < 3; i++) {
        const sign = rng() < 0.5 ? -1 : +1;
        const mag = 2 + Math.floor(rng() * 4);      // 2..5
        const p = new Portal(sign * mag, 0, 1 + Math.floor(rng() * 3));
        p.kind = sign < 0 ? PortalKind.TIME_PAST : PortalKind.TIME_FUTURE;
        node.addPortal(p);
    }

    // --- 2. Стандартные параллели 0 ↔ 1 в t = 0 ---
    if (isStart) {
        // ветка 0 → ветка 1
        const p = new Portal(0, 0, 1);
        p.kind = PortalKind.PARALLEL;
        p.targetBranch = 1;
        p._targetT = 0;
        p.label = '⇄ ветка 1';
        fillPortal(p, Shape.CIRCLE);
        node.addPortal(p);
    } else if (branchId === 1 && t === 0) {
        // ветка 1 → ветка 0
        const p = new Portal(0, 0, 1);
        p.kind = PortalKind.PARALLEL;
        p.targetBranch = 0;
        p._targetT = 0;
        p.label = '⇄ ветка 0';
        fillPortal(p, Shape.CIRCLE);
        node.addPortal(p);
    }

    // --- 3. Порталы в параллель по карте ---
  // --- 3. Порталы в параллель по формуле ---

// Особый случай: ветка 0, узел 0 → ветка 1 (уже есть, стандартный)
// Особый случай: ветка 1, узел 0 → ветка 0 (уже есть, стандартный)

if (!isStart && !(branchId === 1 && t === 0)) {
    // Из ветки N → в N+1 в узле N+1
    const nextBranch = branchId + 1;
    const nextT = branchId + 1;

    if (branchId >= 0 && branchId < 100 && t === nextT) {
        const p = new Portal(0, 0, 1);
        p.kind = PortalKind.PARALLEL;
        p.targetBranch = nextBranch;
        p._targetT = nextT;
        p.label = '⇄ ' + nextBranch;
        node.addPortal(p);
    }

    // Из ветки N → в N-1 в узле -(N-1)
    const prevBranch = branchId - 1;
    const prevT = -(branchId - 1);

    if (branchId > 0 && branchId < 100 && t === prevT) {
        const p = new Portal(0, 0, 1);
        p.kind = PortalKind.PARALLEL;
        p.targetBranch = prevBranch;
        p._targetT = prevT;
        p.label = '⇄ ' + prevBranch;
        node.addPortal(p);
    }
}

 // === ЧИТ: все порталы открыты ===
if (CONFIG.debug.cheat_allPortalsOpen) {
    for (const p of node.portals) {
        for (let i = 0; i < CELLS; i++) {
            if (!p.cells[i].figure) {
                p.cells[i].figure = new Figure(Shape.CIRCLE);
            }
        }
        p.refreshState();
    }
}

for (const p of node.portals) p.refreshState();
}

// ===============================================================
//  Куда ведёт портал в параллель
// ===============================================================
function pickParallelTarget(world, branchId, t, worldSeed) {
    // Эпоха
    let era;
    if (t >= 0) era = Math.floor(t / 10);
    else        era = Math.floor((-t - 1) / 10);

    // Ветки этой эпохи
    const branchStart = era * 10;
    const branchEnd = branchStart + 9;

    // Собираем уже занятые цели в этой эпохе
    const occupied = occupiedBranchesInEra(world, era);
    const alreadyFromThis = occupiedTargetsFromBranch(world, branchId);

    const candidates = [];
    for (let b = branchStart; b <= branchEnd; b++) {
        if (b === branchId) continue;
        if (occupied.has(b)) continue;
        if (alreadyFromThis.has(b)) continue;
        candidates.push(b);
    }

    if (candidates.length === 0) {
        for (let b = branchStart; b <= branchEnd; b++) {
            if (b === branchId) continue;
            if (occupied.has(b)) continue;
            candidates.push(b);
        }
    }

    if (candidates.length === 0) {
        for (let b = branchStart; b <= branchEnd; b++) {
            if (b !== branchId) candidates.push(b);
        }
    }
    if (candidates.length === 0) return -1;

    const rng = makeRng(hash32(worldSeed, branchId, t, 0xB01));
    return candidates[Math.floor(rng() * candidates.length)];
}

// Ветки, в которые УЖЕ ведёт портал из этой ветки (в любой эпохе)
function occupiedTargetsFromBranch(world, branchId) {
    const set = new Set();
    if (!world || !world.allBranches) return set;

    const nodesMap = world.allBranches.get(branchId);
    if (!nodesMap) return set;

    for (const node of nodesMap.values()) {
        for (const p of node.portals) {
            if (p.kind === PortalKind.PARALLEL && p.targetBranch >= 0 && !p.anomalous) {
                set.add(p.targetBranch);
            }
        }
    }
    return set;
}

// Занятые ветки-цели в эпохе
function occupiedBranchesInEra(world, era) {
    const set = new Set();
    if (!world || !world.allBranches) return set;

    for (const [bId, nodesMap] of world.allBranches.entries()) {
        for (const [t, node] of nodesMap.entries()) {
            const nodeEra = Math.floor(t / 10);
            if (nodeEra !== era) continue;
            for (const p of node.portals) {
                if (p.kind === PortalKind.PARALLEL && p.targetBranch >= 0 && !p.anomalous) {
                    set.add(p.targetBranch);
                }
            }
        }
    }
    return set;
}

// Залить портал одной формой
function fillPortal(portal, shape) {
    for (let i = 0; i < CELLS; i++) {
        portal.cells[i].figure = new Figure(shape);
    }
    portal.refreshState();
}