// multiverse/core/portalGrid.js
//
// Карта порталов в параллель.
// Одна эпоха = 10 веток × 10 узлов. Внутри эпохи — ладья 10 × 10.
// Порталы ведут ВНУТРИ своей эпохи.

const ERA_SIZE = 10;   // 10 лет в эпохе

function makeRng(seed) {
    let a = seed >>> 0;
    return function() {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function shuffled(n, rnd) {
    const p = new Array(n);
    for (let i = 0; i < n; i++) p[i] = i;
    for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        const t = p[i]; p[i] = p[j]; p[j] = t;
    }
    return p;
}

export class PortalGrid {
    constructor(seed, totalEras = 100) {
        this.totalEras = totalEras;
        this.plusMap  = new Map();   // "t:branch" → true (t >= 0)
        this.minusMap = new Map();   // "t:branch" → true (t < 0)
        this._build(seed);
    }

    _build(seed) {
        // Плюс: эпохи 0..totalEras-1
        for (let era = 0; era < this.totalEras; era++) {
            this._buildEra(seed, era, 1);
        }
        // Минус: эпохи -1..-totalEras
        for (let era = 0; era < this.totalEras; era++) {
            this._buildEra(seed, era, -1);
        }
    }

    _buildEra(seed, eraIndex, sign) {
        // Диапазон узлов и веток эпохи
        // sign = +1: t = era*10 .. era*10+9, branch = era*10 .. era*10+9
        // sign = -1: t = -1-era*10 .. -10-era*10 (т.е. -10..-1 для era=0)
        //            branch = era*10 .. era*10+9

        const rnd = makeRng(
            (seed ^ (0xE0000 + eraIndex * 7777 + (sign > 0 ? 0x10000 : 0))) >>> 0
        );
        const colForRow = shuffled(ERA_SIZE, rnd);

        const branchStart = eraIndex * ERA_SIZE;

        for (let row = 0; row < ERA_SIZE; row++) {
            const branch = branchStart + row;
            const tOffset = colForRow[row];

            let t;
            if (sign > 0) {
                t = eraIndex * ERA_SIZE + tOffset;
            } else {
                t = -(eraIndex * ERA_SIZE + tOffset) - 1;
            }

            const key = t + ':' + branch;
            if (sign > 0) this.plusMap.set(key, true);
            else          this.minusMap.set(key, true);
        }
    }

    has(branchId, t) {
        if (t >= 0) return this.plusMap.has(t + ':' + branchId);
        else        return this.minusMap.has(t + ':' + branchId);
    }

    count() {
        return this.plusMap.size + this.minusMap.size;
    }
}
