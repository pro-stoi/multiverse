// multiverse/core/player.js
//
// Игрок: инвентарь, энергия, известные паттерны порталов, позиция.

import { Figure, Shape } from './figure.js';

export const STACK_MAX = 25;
export const ENERGY_MAX = 25;

export class Slot {
    constructor() {
        this.shape = null;
        this.count = 0;
    }

    isEmpty() { return this.count <= 0; }

    clear() {
        this.shape = null;
        this.count = 0;
    }

    matches(figure) {
        return this.shape === figure.shape;
    }
}

export class Player {
    constructor() {
       this.energy = ENERGY_MAX;
this.energyMax = ENERGY_MAX;

        this.currentBranch = 0;
        this.currentNode = null;

        this.gameYear = 0;
        this.globalTime = 0;

        this.slots = [];
        for (let i = 0; i < 5; i++) this.slots.push(new Slot());

        // Известные паттерны порталов
        this.knownPortalPatterns = new Set();
        this.knownPortalPatterns.add('past:1');
        this.knownPortalPatterns.add('future:1');
    }

    // ----- инвентарь -----
    addFigure(figure) {
        if (!figure) return false;

        // Сначала — в существующий стак той же формы
        for (const s of this.slots) {
            if (!s.isEmpty() && s.matches(figure) && s.count < STACK_MAX) {
                s.count++;
                return true;
            }
        }
        // Потом — в пустой слот
        for (const s of this.slots) {
            if (s.isEmpty()) {
                s.shape = figure.shape;
                s.count = 1;
                return true;
            }
        }
        return false;
    }

    takeOneFromSlot(slotIndex) {
        if (slotIndex < 0 || slotIndex >= this.slots.length) return null;
        const s = this.slots[slotIndex];
        if (s.isEmpty()) return null;

        const f = new Figure(s.shape);
        s.count--;
        if (s.count <= 0) s.clear();
        return f;
    }

    countInSlot(slotIndex) {
        if (slotIndex < 0 || slotIndex >= this.slots.length) return 0;
        return this.slots[slotIndex].count;
    }

    // ----- энергия -----
spendEnergy(v) { this.energy = Math.max(0, this.energy - v); }
addEnergy(v)   { this.energy = Math.min(this.energyMax, this.energy + v); }

    // ----- прогресс -----
    incrementYear() { this.gameYear++; }

    // ----- знание порталов -----
    isPortalKnown(portal) {
        if (!portal) return false;
        if (portal.anomalous) return false;
        return this.knownPortalPatterns.has(portal.patternKey());
    }

    markPortalKnown(portal) {
        if (!portal) return;
        if (portal.anomalous) return;
        this.knownPortalPatterns.add(portal.patternKey());
    }

    // ----- обмен -----
    exchange(shape, forward = true) {
        let total = 0;
        for (const s of this.slots) {
            if (!s.isEmpty() && s.shape === shape) total += s.count;
        }
        if (total < 5) return false;

        let toRemove = 5;
        for (const s of this.slots) {
            if (toRemove === 0) break;
            if (s.isEmpty() || s.shape !== shape) continue;
            const take = Math.min(s.count, toRemove);
            s.count -= take;
            toRemove -= take;
            if (s.count <= 0) s.clear();
        }

        const next = forward ? (shape + 1) % 5 : (shape - 1 + 5) % 5;
        return this.addFigure(new Figure(next));
    }
}