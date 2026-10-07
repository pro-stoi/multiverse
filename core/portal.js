// multiverse/core/portal.js
//
// Портал — точка перехода. Может быть временным (+/-) или параллельным.
// Открыт, когда все 5 ячеек заполнены.

export const PortalKind = Object.freeze({
    TIME_FUTURE: 'TIME_FUTURE',
    TIME_PAST:   'TIME_PAST',
    PARALLEL:    'PARALLEL',
});

export const CELLS = 5;

export class PortalCell {
    constructor(angle, figure = null) {
        this.angle = angle;
        this.figure = figure;
    }
}

let _nextPortalId = 1;

export class Portal {
    constructor(deltaTime = 0, deltaWorld = 0, costEnergy = 1) {
        this.id = _nextPortalId++;
        this.fromNodeId = -1;

        this.deltaTime = deltaTime;     // для временных: -N или +N
        this.deltaWorld = deltaWorld;   // задел на будущее
        this.costEnergy = costEnergy;

        this.kind = PortalKind.TIME_FUTURE;
        this.targetBranch = -1;         // для параллельных

        this.anomalous = false;
        this.label = '';
        this.customLabel = null;

        this.state = 'closed';          // 'open' | 'closed'

        // Позиция (заполняется снаружи — WorldSpec или layout)
        this.x = 0;
        this.y = 0;

        // Ячейки
        this.cells = [];
        for (let i = 0; i < CELLS; i++) {
            this.cells.push(new PortalCell(i * 2 * Math.PI / CELLS));
        }
    }

    filledCells() {
        let n = 0;
        for (const c of this.cells) if (c.figure != null) n++;
        return n;
    }

    refreshState() {
        this.state = this.filledCells() === CELLS ? 'open' : 'closed';
    }

    isOpen() {
        return this.state === 'open';
    }

    // Общая подпись для отрисовки
    displayLabel() {
        if (this.customLabel) return this.customLabel;
        if (this.anomalous) return '?';
        if (this.kind === PortalKind.PARALLEL) {
            return this.targetBranch >= 0 ? '⇄ ' + this.targetBranch : '⇄';
        }
        if (this.kind === PortalKind.TIME_FUTURE) {
            return '+' + Math.abs(this.deltaTime);
        }
        return '-' + Math.abs(this.deltaTime);
    }

    // Ключ паттерна — для запоминания игроком
    patternKey() {
        if (this.anomalous) return 'anomaly:' + this.targetBranch;
        if (this.kind === PortalKind.PARALLEL) return 'parallel:' + this.targetBranch;
        if (this.kind === PortalKind.TIME_PAST) return 'past:' + Math.abs(this.deltaTime);
        return 'future:' + Math.abs(this.deltaTime);
    }
}