// multiverse/core/animation.js

export class Animation {
    constructor(config) {
        this.rotation   = config.rotation  || null;
        this.pulse      = config.pulse     || null;
        this.sway       = config.sway      || null;
        this.float      = config.float     || null;
        this.opacity    = config.opacity   || null;
        this.jsCode     = config.js        || null;

        // Кэш скомпилированной функции
        this._jsFn = null;
        if (this.jsCode) {
            try {
                this._jsFn = new Function('ctx', 'Math', 'Date', 'performance', this.jsCode);
            } catch (e) {
                console.warn('[animation] ошибка компиляции JS:', e.message);
                this._jsFn = null;
            }
        }
    }

    // Применить к ctx. Вызывается с ctx уже в позиции (cx, cy).
    apply(ctx, now) {
        // 1. Декларативные трансформации
        if (this.rotation) {
            ctx.rotate((now / 1000) * this.rotation.speed);
        }

        if (this.pulse) {
            const { speed, amplitude } = this.pulse;
            const k = 1 + Math.sin((now / 1000) * speed * Math.PI * 2) * amplitude;
            ctx.scale(k, k);
        }

        if (this.sway) {
            const { speed, amplitude } = this.sway;
            const dx = Math.sin((now / 1000) * speed * Math.PI * 2) * amplitude;
            ctx.translate(dx, 0);
        }

        if (this.float) {
            const { speed, amplitude } = this.float;
            const dy = Math.sin((now / 1000) * speed * Math.PI * 2) * amplitude;
            ctx.translate(0, dy);
        }

        if (this.opacity) {
            const { from, to, speed } = this.opacity;
            const t = (Math.sin((now / 1000) * speed * Math.PI * 2) + 1) / 2;
            ctx.globalAlpha = from + (to - from) * t;
        }

        // 2. JS-код — после декларативных
        if (this._jsFn) {
            try {
                this._jsFn(ctx, Math, Date, performance);
            } catch (e) {
                console.warn('[animation] ошибка JS:', e.message);
            }
        }
    }
}