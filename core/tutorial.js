// multiverse/core/tutorial.js

export class Tutorial {
    constructor(config) {
        this.steps = (config && config.steps) || [];
        this.visible = false;
        this.currentStep = 0;
        this.enabled = this.steps.length > 0;
    }

      // Открыть, листать, закрыть.
    toggle() {
        if (!this.enabled) return;

        if (!this.visible) {
            // Открыть с первого шага
            this.visible = true;
            this.currentStep = 0;
            return;
        }

        // Уже открыт — следующий шаг
        this.currentStep++;

        // Если прошли все — закрыть
        if (this.currentStep >= this.steps.length) {
            this.visible = false;
            this.currentStep = 0;
        }
    }

    next() {
        if (!this.visible) return;
        this.currentStep++;
        if (this.currentStep >= this.steps.length) {
            this.currentStep = this.steps.length - 1;
            // Можно скрыть после последнего:
            // this.visible = false;
        }
    }

    // Получить текущий шаг (или null).
    current() {
        if (!this.visible) return null;
        return this.steps[this.currentStep] || null;
    }
}