// multiverse/core/portalGrid.js
//
// Карта порталов в параллель.
// Сетка W × H. Блоки SIZE × SIZE по диагонали.
// В каждом блоке — по одной цифре в строке и столбце (ладья-задача).
// Наличие цифры в (t, branch) = наличие портала в узле (ветка = branch, t = t).

const W = 100;         // ось t
const H = 100;         // ось ветки
const SIZE = 10;       // размер блока

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
    constructor(seed) {
        this.map = new Map();     // "t:branch" → true
        this._build(seed);
    }

    _build(seed) {
        const rnd = makeRng(seed ^ 0xA5B6C7);

        for (let i = 0; i * SIZE < W && i * SIZE < H; i++) {
            const x0 = i * SIZE;   // по t
            const y0 = i * SIZE;   // по branch

            const colForRow = shuffled(SIZE, rnd);

            for (let r = 0; r < SIZE; r++) {
                const c = colForRow[r];
                const t = x0 + c;
                const branch = y0 + r;
                this.map.set(t + ':' + branch, true);
            }
        }
    }

    has(branchId, t) {
        if (t < 0 || t >= W) return false;
        if (branchId < 0 || branchId >= H) return false;
        return this.map.has(t + ':' + branchId);
    }

    count() {
        return this.map.size;
    }
}