// multiverse/core/node.js
//
// Узел — точка (branchId, t). Содержит порталы, прогноз, обменник.

export class Node {
    constructor(id, timeAnchor, seed, branchId) {
        this.id = id;
        this.timeAnchor = timeAnchor;
        this.seed = seed;
        this.branchId = branchId;
        this.name = 't=' + (timeAnchor >= 0 ? '+' : '') + timeAnchor;

        // Визуальные параметры (могут переопределяться миром)
        this.radius = 2;
        this.glow = 0.5;
        this.fill = 0;

        
        
        // Прогноз: 5 форм
        this.forecast = [0, 0, 0, 0, 0];         // вероятности (0..1)
        this.forecastCharged = [0, 0, 0, 0, 0];  // сколько раз заряжали

        
        // Прогноз привязан к t, где был заряжен
this.forecastStored = [0, 0, 0, 0, 0];   // значение на момент зарядки
this.forecastAtT = null;                 // t, где зарядили последний раз

// Отдельно — charged для совместимости со старым SaveManager
this.forecastCharged = [0, 0, 0, 0, 0];
        
        // Обменник
        this.hasExchanger = false;
        this.exchangerAngle = 0.5 * Math.PI;
        this.exchangerRadius = 0.65;

        // Аномалия
        this.anomalous = false;

        // Содержимое
        this.portals = [];
    }

    // Эффективный прогноз в узле с учётом расстояния от t_charge
effectiveForecast() {
    if (this.forecastAtT == null) return [0, 0, 0, 0, 0];
    const dist = Math.abs(this.timeAnchor - this.forecastAtT);
    const decay = dist * 0.01;
    const out = [];
    for (let i = 0; i < 5; i++) {
        out.push(Math.max(0, this.forecastStored[i] - decay));
    }
    return out;
}
    
    addPortal(portal) {
        portal.fromNodeId = this.id;
        this.portals.push(portal);
    }

    getEra() {
        return Math.floor(Math.abs(this.timeAnchor) / 10);
    }
}