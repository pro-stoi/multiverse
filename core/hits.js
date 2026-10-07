// multiverse/core/hits.js
//
// Реестр хит-регионов и «занятых зон».
//  - hits — куда можно кликнуть (порталы, ячейки, слоты, кнопки).
//  - blocked — куда НЕ должен попадать предмет при спавне.

export const HitKind = Object.freeze({
    PORTAL:       'PORTAL',
    PORTAL_CELL:  'PORTAL_CELL',
    ITEM:         'ITEM',
    SLOT:         'SLOT',
    EXCHANGER:    'EXCHANGER',
    FORECAST:     'FORECAST',
    ZOOM_IN:      'ZOOM_IN',
    ZOOM_OUT:     'ZOOM_OUT',
    NEXT_YEAR:    'NEXT_YEAR',
    UI:           'UI',
});

export class Hits {
    constructor() {
        this.list = [];        // кликабельные регионы
        this.blocked = [];     // запретные зоны для спавна предметов
    }

    clear() {
        this.list.length = 0;
        this.blocked.length = 0;
    }

    add(kind, index, x, y, r) {
        this.list.push({ kind, index, x, y, r });
    }

    addBlocked(x, y, r, tag = '') {
        this.blocked.push({ x, y, r, tag });
    }

    // Найти верхний (последний добавленный) кликабельный регион
    findAt(x, y) {
        for (let i = this.list.length - 1; i >= 0; i--) {
            const h = this.list[i];
            const dx = x - h.x, dy = y - h.y;
            if (dx * dx + dy * dy <= h.r * h.r) return h;
        }
        return null;
    }

    // Пересекается ли круг с какой-либо запретной зоной
    overlapsBlocked(x, y, r) {
        for (const b of this.blocked) {
            const dx = x - b.x, dy = y - b.y;
            const rr = r + b.r;
            if (dx * dx + dy * dy < rr * rr) return true;
        }
        return false;
    }
}