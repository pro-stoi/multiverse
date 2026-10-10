// multiverse/core/transitions.js
//
// Фон перехода между порталами.
// Показывается поверх canvas, блокирует ввод (если не скипнут).
//
// Фазы: 'in' (fade in) → 'hold' (пауза) → 'out' (fade out).
// По завершении 'out' — transition считается done.

export class Transition {
    constructor(bgSpec, onComplete, onPhaseInEnd) {
        this.spec = bgSpec || {};
        this.onComplete = onComplete || (() => {});
        this.onPhaseInEnd = onPhaseInEnd || (() => {});
        
        
        this.durationIn   = this.spec.durationIn   ?? 400;
        this.durationHold = this.spec.durationHold ?? 200;
        this.durationOut  = this.spec.durationOut  ?? 400;
        this.skippable    = this.spec.skippable    ?? true;

        this.phase   = 'in';
        this.elapsed = 0;
        this.done    = false;
    }

 update(dtMs) {
    if (this.done) return;
    this.elapsed += dtMs;

    if (this.phase === 'in') {
        if (this.elapsed >= this.durationIn) {
            this.phase = 'hold';
            this.elapsed = 0;
            // Момент, когда затемнение завершено — можно менять мир
            this.onPhaseInEnd();
        }
    } else if (this.phase === 'hold') {
        if (this.elapsed >= this.durationHold) {
            this.phase = 'out';
            this.elapsed = 0;
        }
    } else if (this.phase === 'out') {
        if (this.elapsed >= this.durationOut) {
            this.done = true;
            this.onComplete();
        }
    }
}

    // Полная длительность (для проверки « > 800 мс»)
    totalDuration() {
        return this.durationIn + this.durationHold + this.durationOut;
    }

    // Прогресс 0..1 для текущей фазы
    phaseProgress() {
        if (this.phase === 'in')   return Math.min(1, this.elapsed / this.durationIn);
        if (this.phase === 'hold') return 1;
        if (this.phase === 'out')  return Math.min(1, this.elapsed / this.durationOut);
        return 1;
    }

    // Общая непрозрачность фона: 0 (прозрачно) → 1 (непрозрачно)
    opacity() {
        if (this.phase === 'in')   return this.phaseProgress();
        if (this.phase === 'hold') return 1;
        if (this.phase === 'out')  return 1 - this.phaseProgress();
        return 0;
    }

    isDone() { return this.done; }

    // Скип — перейти сразу в 'out' (или завершить)
    skip() {
        if (!this.skippable) return;
        if (this.done) return;

        if (this.phase === 'in') {
            this.phase = 'out';
            this.elapsed = 0;
            // Если узел ещё не переключен — переключение делает внешний код
            // через onSwitch callback (см. ниже). Чтобы не усложнять,
            // требуем от внешнего кода переключать узел сразу при старте transition.
        } else if (this.phase === 'hold') {
            this.phase = 'out';
            this.elapsed = 0;
        } else if (this.phase === 'out') {
            this.elapsed = this.durationOut;   // финишировать
        }
    }
}