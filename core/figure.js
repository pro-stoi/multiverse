// multiverse/core/figure.js
//
// Фигура — предмет в мире.
// Может лежать на поле, в ячейке портала или в инвентаре игрока.

export const Shape = Object.freeze({
    CIRCLE:     0,
    DIAMOND:    1,
    SQUARE:     2,
    TRIANGLE:   3,
    POLYHEDRON: 4,
});

export const ShapeName = Object.freeze([
    'CIRCLE', 'DIAMOND', 'SQUARE', 'TRIANGLE', 'POLYHEDRON'
]);

export const Location = Object.freeze({
    FIELD:       'FIELD',
    PORTAL_CELL: 'PORTAL_CELL',
    INVENTORY:   'INVENTORY',
});

let _nextId = 1;

export class Figure {
    constructor(shape, opts = {}) {
        this.id = opts.id ?? _nextId++;
        this.shape = shape;

        this.branchId = opts.branchId ?? 0;
        this.timeAnchor = opts.timeAnchor ?? 0;
        this.lifespan = opts.lifespan ?? 5;

        this.alive = true;
        this.location = Location.FIELD;

        // Позиция на поле
        this.angle = opts.angle ?? 0;
        this.radius = opts.radius ?? 0;

        // Если в ячейке портала
        this.portalId = -1;
        this.cellIndex = -1;

        // Если в инвентаре
        this.slotIndex = -1;
    }

    // Видна ли фигура в узле (branchId, t)
    visibleAt(branchId, t) {
        if (!this.alive) return false;
        if (this.branchId !== branchId) return false;
        return t >= this.timeAnchor && t <= this.timeAnchor + this.lifespan;
    }

    symbol() {
        switch (this.shape) {
            case Shape.CIRCLE:     return 'O';
            case Shape.DIAMOND:    return '<>';
            case Shape.SQUARE:     return '[]';
            case Shape.TRIANGLE:   return '/\\';
            case Shape.POLYHEDRON: return '*';
        }
        return '?';
    }
}

export function nextShape(s) {
    return (s + 1) % ShapeName.length;
}

export function prevShape(s) {
    return (s - 1 + ShapeName.length) % ShapeName.length;
}

export function shapeName(s) {
    return ShapeName[s] ?? 'UNKNOWN';
}