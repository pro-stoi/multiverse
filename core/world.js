// multiverse/core/world.js
//
// Мир: узлы, фигуры, комбо, прыжки, годы.
// Центральный объект логики. Не знает про рендер.

import { Figure, Shape } from './figure.js';
import { Portal, PortalKind } from './portal.js';
import { Node } from './node.js';
import { generateNode, allowedShapesForBranch } from './worldGen.js';
import { PortalGrid } from './portalGrid.js';
import { CONFIG } from '../config.js';

export class World {
    constructor(seed) {
        
        
        
        
        
        this.forecastCharges = [];
        this.seed = seed;
this.portalGrid = new PortalGrid(seed);
        
        // branchId -> Map(t -> Node)
        this.allBranches = new Map();

        // Все фигуры, живущие в мире (на поле, в порталах)
        this.allFigures = [];

        // branchId -> Set(comboKey)
        this.usedCombos = new Map();

        // Отложенные overrides из сейва: "branch:t" -> {...}
        this.pendingOverrides = new Map();

        this.nextNodeId = 1;
        this.currentNode = null;

        // Для быстрого доступа к узлам
        this._nodeIndex = new Map();   // "branch:t" -> Node
    }
// Прошёл один «пользовательский год» — время пользователя +1,
// спавн по прогнозу в текущем узле, энергия +1.
// Вызывается либо по таймеру, либо по кнопке.
tickUserTime(player, gainEnergy = true) {
    const n = player.currentNode;
    if (!n) return;

    // Спавн по прогнозу в текущем узле
    const eff = this.effectiveForecastAt(n.branchId, n.timeAnchor);
    const visible = this.visibleOnField(n.branchId, n.timeAnchor);

    let s = (n.seed ^ (player.gameYear * 17)) >>> 0;
    const rnd = () => {
        s = (Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) >>> 0);
        return (s >>> 0) / 4294967296;
    };

    let spawned = 0;
    const limit = 6;
    for (let i = 0; i < 5; i++) {
        if (eff[i] <= 0) continue;
        if (visible.length + spawned >= limit) break;
        if (rnd() < eff[i]) {
            const f = new Figure(i, {
                branchId: n.branchId,
                timeAnchor: n.timeAnchor,
                angle: rnd() * 2 * Math.PI,
                radius: rnd() * 0.85,
                lifespan: 5,
            });
            f._generated = false;
            f.location = 'FIELD';
            this.allFigures.push(f);
            spawned++;
        }
    }

    n.forecast = eff;

    // Счётчик пользовательского времени
    player.incrementYear();

    // Энергия
    if (gainEnergy) player.addEnergy(1);
}
    // ---------- доступ к веткам/узлам ----------

    branch(branchId) {
        let m = this.allBranches.get(branchId);
        if (!m) { m = new Map(); this.allBranches.set(branchId, m); }
        return m;
    }

    getNode(branchId, t) {
        return this._nodeIndex.get(branchId + ':' + t) || null;
    }

    putNode(branchId, t, node) {
        this.branch(branchId).set(t, node);
        this._nodeIndex.set(branchId + ':' + t, node);
    }

    // ---------- генерация ----------

    /**
     * selector — core/worldSelector.js (обязателен, если есть параллельные порталы)
     */
    generateNode(t, branchId, selector) {
        const existing = this.getNode(branchId, t);
        if (existing) return existing;

        const node = generateNode({
            branchId, t,
            worldSeed: this.seed,
            selector,
            world: this,
        });

        // Помечаем сгенерированные фигуры, чтобы saveManager знал,
        // что они восстанавливаются из seed и их НЕ надо сохранять.
        for (const f of this.allFigures) {
            if (f._generated === undefined && f.branchId === branchId && f.timeAnchor === t) {
                f._generated = true;
            }
        }

        this.putNode(branchId, t, node);

        // Применяем отложенные overrides, если есть
        const key = branchId + ':' + t;
        if (this.pendingOverrides.has(key)) {
            const ov = this.pendingOverrides.get(key);
            this._applyNodeOverrides(node, ov);
            this.pendingOverrides.delete(key);
        }

        this.currentNode = node;
        return node;
    }

    _applyNodeOverrides(node, ov) {
        if (ov.forecast) {
            for (let i = 0; i < node.forecast.length; i++) {
                node.forecast[i] = ov.forecast[i] ?? 0;
                node.forecastCharged[i] = (ov.forecastCharged && ov.forecastCharged[i]) || 0;
            }
        }
        if (ov.portalLabels) {
            for (const k of Object.keys(ov.portalLabels)) {
                const idx = Number(k);
                if (node.portals[idx]) node.portals[idx].customLabel = ov.portalLabels[k];
            }
        }
        if (ov.portalTargets) {
            for (const k of Object.keys(ov.portalTargets)) {
                const idx = Number(k);
                if (node.portals[idx]) {
                    node.portals[idx].targetBranch = ov.portalTargets[k];
                    node.portals[idx]._manualTarget = true;
                }
            }
        }
    }

    // ---------- внешние фигуры (из сейва) ----------

    addExternalFigure(d) {
        const f = new Figure(d.shape, {
            id: d.id,
            branchId: d.branchId,
            timeAnchor: d.timeAnchor,
            angle: d.angle,
            radius: d.radius,
            lifespan: d.lifespan,
        });
        f._generated = false;   // выброшена игроком — сохраняем
        this.allFigures.push(f);
        return f;
    }

    // ---------- видимые на поле ----------

    visibleOnField(branchId, t) {
        const out = [];
        for (const f of this.allFigures) {
            if (f.location !== 'FIELD') continue;
            if (f.visibleAt(branchId, t)) out.push(f);
        }
        return out;
    }

    // ---------- комбо ----------

    comboKey(figures) {
        if (!figures || figures.length !== 5) return null;
        let s = '';
        for (const f of figures) {
            if (f == null) return null;
            s += f.shape;
        }
        return s;
    }

    comboSet(branchId) {
        let s = this.usedCombos.get(branchId);
        if (!s) { s = new Set(); this.usedCombos.set(branchId, s); }
        return s;
    }

    isComboAvailable(branchId, figures) {
        const key = this.comboKey(figures);
        if (!key) return false;
        return !this.comboSet(branchId).has(key);
    }

    registerCombo(branchId, figures) {
        const key = this.comboKey(figures);
        if (key) this.comboSet(branchId).add(key);
    }

    unregisterCombo(branchId, figures) {
        const key = this.comboKey(figures);
        if (key) this.comboSet(branchId).delete(key);
    }

    // ---------- зарядка прогноза ----------

chargeForecast(node, shapeIdx, figure) {
    // Ищем существующий заряд этой формы в этой ветке с той же точкой atT
    const branchId = node.branchId;
    const t = node.timeAnchor;

    let charge = this.forecastCharges.find(c =>
        c.branchId === branchId &&
        c.shapeIdx === shapeIdx &&
        c.atT === t
    );

    if (!charge) {
        charge = { branchId, shapeIdx, stored: 0, atT: t };
        this.forecastCharges.push(charge);
    }

    charge.stored = Math.min(0.30, charge.stored + 0.05);
    node.forecastCharged[shapeIdx] = (node.forecastCharged[shapeIdx] || 0) + 1;

    // Обновляем плоский forecast для HUD
    node.forecast = this.effectiveForecastAt(node.branchId, node.timeAnchor);

    return charge.stored;
}
// Эффективный прогноз в узле (branchId, t):
// сумма всех зарядов формы i, у которых atT <= t,
// с затуханием 1% за каждый год расстояния.
// Ограничение [0, 1].
effectiveForecastAt(branchId, t) {
    const out = [0, 0, 0, 0, 0];
    for (const c of this.forecastCharges) {
        if (c.branchId !== branchId) continue;
        if (t < c.atT) continue;                    // прошлое — не действует
        const dist = t - c.atT;
        const val = Math.max(0, c.stored - dist * 0.01);
        out[c.shapeIdx] = Math.min(0.30, out[c.shapeIdx] + val);
    }
    return out;
}
    // ---------- годы ----------

tickUserTime(player, gainEnergy = true) {
    const n = player.currentNode;
    if (!n) return;

    // Спавн по прогнозу в текущем узле
    const eff = this.effectiveForecastAt(n.branchId, n.timeAnchor);   // ← метод World
    const visible = this.visibleOnField(n.branchId, n.timeAnchor);

    let s = (n.seed ^ (player.gameYear * 17)) >>> 0;
    const rnd = () => {
        s = (Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) >>> 0);
        return (s >>> 0) / 4294967296;
    };

    let spawned = 0;
    const limit = 6;
    for (let i = 0; i < 5; i++) {
        if (eff[i] <= 0) continue;
        if (visible.length + spawned >= limit) break;
        if (rnd() < eff[i]) {
            const f = new Figure(i, {
                branchId: n.branchId,
                timeAnchor: n.timeAnchor,
                angle: rnd() * 2 * Math.PI,
                radius: rnd() * 0.85,
                lifespan: 5,
            });
            f._generated = false;
            f.location = 'FIELD';
            this.allFigures.push(f);
            spawned++;
        }
    }

    n.forecast = eff;

    player.incrementYear();

    if (gainEnergy) player.addEnergy(1);
}

    _pickShapeByForecast(rnd, forecast) {
        let sum = 0;
        for (const p of forecast) sum += p;
        if (sum <= 0) return null;

        const r = rnd() * sum;
        let acc = 0;
        for (let i = 0; i < forecast.length; i++) {
            acc += forecast[i];
            if (r <= acc) return i;
        }
        return forecast.length - 1;
    }

    // ---------- прыжки ----------

    /**
     * @param player — core/player.js
     * @param portal — core/portal.js
     * @param selector — core/worldSelector.js
     * @param onSwitch — callback(node, branchId, t) — вызывается, когда новый узел готов
     */
    jump(player, portal, selector, onSwitch) {
        if (!portal.isOpen()) {
            throw new Error('портал закрыт (' + portal.filledCells() + '/5)');
        }

        player.markPortalKnown(portal);

        if (portal.anomalous) {
            // Аномалия — случайная ветка, случайный t
            const targetBranch = portal.targetBranch;
            const targetT = portal.deltaTime;
            let target = this.getNode(targetBranch, targetT);
            if (!target) target = this.generateNode(targetT, targetBranch, selector);

            player.currentBranch = targetBranch;
            player.currentNode = target;
            target.forecast = this.effectiveForecastAt(target.branchId, target.timeAnchor);
            this.currentNode = node;
            if (onSwitch) onSwitch(target, targetBranch, targetT);
            return;
        }

       if (portal.kind === PortalKind.PARALLEL) {
    // Если у портала есть явный targetT — используем его
    const targetBranch = portal.targetBranch;
    const targetT = portal._targetT != null
        ? portal._targetT
        : player.currentNode.timeAnchor;

    let node = this.getNode(targetBranch, targetT);
    if (!node) node = this.generateNode(targetT, targetBranch, selector);

    player.currentBranch = targetBranch;
    player.currentNode = node;
    node.forecast = this.effectiveForecastAt(node.branchId, node.timeAnchor);
    this.currentNode = node;
    if (onSwitch) onSwitch(node, targetBranch, targetT);
    return;
}

        // Временной прыжок
   // Временной прыжок — просто меняем t, без прокрутки годов
const dt = portal.kind === PortalKind.TIME_FUTURE
    ? Math.abs(portal.deltaTime)
    : -Math.abs(portal.deltaTime);
const t = player.currentNode.timeAnchor + dt;

const curBranch = player.currentBranch;
let target = this.getNode(curBranch, t);
if (!target) target = this.generateNode(t, curBranch, selector);

player.currentNode = target;
node.forecast = this.effectiveForecastAt(node.branchId, node.timeAnchor);

this.currentNode = target;
if (onSwitch) onSwitch(target, curBranch, t);
    }

    // ---------- фигуры ----------

    pickUp(figure) {
        figure.alive = false;
        figure.location = 'INVENTORY';
    }

    dropOnField(figure, branchId, t, angle, radius) {
        figure.alive = true;
        figure.location = 'FIELD';
        figure.branchId = branchId;
        figure.timeAnchor = t;
        figure.angle = angle;
        figure.radius = radius;
        figure._generated = false;
    }

    putInPortal(figure, portalId, cellIndex) {
        figure.location = 'PORTAL_CELL';
        figure.portalId = portalId;
        figure.cellIndex = cellIndex;
    }
}