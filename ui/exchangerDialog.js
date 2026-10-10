// multiverse/ui/exchangerDialog.js
//
// Модалка обменника. Показывает доступные обмены.
// Игрок выбирает → 5 фигур одной формы → 1 фигура следующей формы.
// Каждый обмен тратит 1 энергию.

import { SvgParser } from '../render/svgParser.js';

export class ExchangerDialog {
    static open(player, spec, onDone) {
        if (player.energy < 1) {
            alert('Не хватает энергии');
            if (onDone) onDone(false);
            return;
        }

        const available = [];
        for (let shape = 0; shape < 5; shape++) {
            let total = 0;
            for (const s of player.slots) {
                if (!s.isEmpty() && s.shape === shape) total += s.count;
            }
            if (total >= 5) {
                available.push({ shape, total });
            }
        }

        if (available.length === 0) {
            alert('Нужно 5 одинаковых фигур в инвентаре');
            if (onDone) onDone(false);
            return;
        }

        ExchangerDialog._createModal(player, spec, available, onDone);
    }

    static _createModal(player, spec, available, onDone) {
        const old = document.getElementById('exchangerModal');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'exchangerModal';
        modal.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            font-family: 'Segoe UI', Roboto, sans-serif;
        `;

        const box = document.createElement('div');
        box.style.cssText = `
            background: #1a2030;
            border: 2px solid #5a88d0;
            border-radius: 14px;
            padding: 20px 24px;
            min-width: 280px;
            max-width: 90vw;
            color: #dce6ff;
            box-shadow: 0 0 40px rgba(80,120,200,0.3);
        `;

        const title = document.createElement('div');
        title.textContent = 'Обменник';
        title.style.cssText = 'font-size: 18px; font-weight: bold; text-align: center; margin-bottom: 12px;';
        box.appendChild(title);

        const energy = document.createElement('div');
        energy.textContent = '⚡ ' + player.energy + '/' + player.energyMax;
        energy.style.cssText = 'text-align: center; font-size: 13px; color: #88c8ff; margin-bottom: 16px;';
        box.appendChild(energy);

        const list = document.createElement('div');
        list.style.cssText = 'display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px;';

        for (const opt of available) {
            const nextShape = (opt.shape + 1) % 5;

            const row = document.createElement('button');
            row.style.cssText = `
                background: rgba(40,50,80,0.9);
                border: 1px solid #5a6480;
                border-radius: 10px;
                padding: 10px 14px;
                color: #dce6ff;
                cursor: pointer;
                font-size: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                transition: background 0.15s;
            `;
            row.onmouseenter = () => row.style.background = 'rgba(60,80,120,0.9)';
            row.onmouseleave = () => row.style.background = 'rgba(40,50,80,0.9)';

            // Левая часть: 5 маленьких фигур
            const leftGroup = document.createElement('div');
            leftGroup.style.cssText = 'display: flex; gap: 2px; align-items: center;';

            for (let i = 0; i < 5; i++) {
                const canvas = document.createElement('canvas');
                canvas.width = 28;
                canvas.height = 28;
                canvas.style.cssText = 'width: 28px; height: 28px;';
                const ctx = canvas.getContext('2d');
                const svg = spec ? spec.getFigureSvg(opt.shape) : null;
                if (svg) {
                    const els = SvgParser.parse(svg, 14, 14, 14 / 18);
                    for (const el of els) {
                        if (!el.path) continue;
                        if (el.fill) { ctx.fillStyle = el.fill; ctx.fill(el.path); }
                        if (el.stroke && el.strokeWidth > 0) {
                            ctx.strokeStyle = el.stroke;
                            ctx.lineWidth = el.strokeWidth;
                            ctx.stroke(el.path);
                        }
                    }
                }
                leftGroup.appendChild(canvas);
            }

            // Счётчик ×N справа от фигур
            const leftCount = document.createElement('span');
            leftCount.textContent = '×' + opt.total;
            leftCount.style.cssText = 'color: #8aa0c8; font-size: 12px; margin-left: 4px;';
            leftGroup.appendChild(leftCount);

            // Стрелка
            const arrow = document.createElement('span');
            arrow.textContent = '→';
            arrow.style.cssText = 'font-size: 20px; color: #8aa0c8; font-weight: bold;';

            // Правая часть: 1 фигура
            const rightGroup = document.createElement('div');
            rightGroup.style.cssText = 'display: flex; align-items: center; gap: 6px;';

            const canvasR = document.createElement('canvas');
            canvasR.width = 32;
            canvasR.height = 32;
            canvasR.style.cssText = 'width: 32px; height: 32px;';
            const ctxR = canvasR.getContext('2d');
            const svgR = spec ? spec.getFigureSvg(nextShape) : null;
            if (svgR) {
                const els = SvgParser.parse(svgR, 16, 16, 16 / 18);
                for (const el of els) {
                    if (!el.path) continue;
                    if (el.fill) { ctxR.fillStyle = el.fill; ctxR.fill(el.path); }
                    if (el.stroke && el.strokeWidth > 0) {
                        ctxR.strokeStyle = el.stroke;
                        ctxR.lineWidth = el.strokeWidth;
                        ctxR.stroke(el.path);
                    }
                }
            }
            rightGroup.appendChild(canvasR);

            const rightCount = document.createElement('span');
            rightCount.textContent = '×1';
            rightCount.style.cssText = 'color: #88ffcc; font-weight: bold; font-size: 14px;';
            rightGroup.appendChild(rightCount);

            // Собираем строку
            row.appendChild(leftGroup);
            row.appendChild(arrow);
            row.appendChild(rightGroup);

            // Клик — обмен
            row.onclick = () => {
                if (player.energy < 1) {
                    alert('Не хватает энергии');
                    return;
                }

                const ok = player.exchange(opt.shape, true);
                if (ok) {
                    player.spendEnergy(1);
                } else {
                    alert('Не удалось обменять');
                    return;
                }

                modal.remove();

                // Пересчёт доступных обменов
                const newAvailable = [];
                for (let shape = 0; shape < 5; shape++) {
                    let total = 0;
                    for (const s of player.slots) {
                        if (!s.isEmpty() && s.shape === shape) total += s.count;
                    }
                    if (total >= 5) newAvailable.push({ shape, total });
                }

                if (newAvailable.length > 0 && player.energy >= 1) {
                    ExchangerDialog._createModal(player, spec, newAvailable, onDone);
                } else {
                    if (onDone) onDone(true);
                }
            };

            list.appendChild(row);
        }

        box.appendChild(list);

        const cancel = document.createElement('button');
        cancel.textContent = 'Закрыть';
        cancel.style.cssText = `
            width: 100%;
            padding: 10px;
            background: rgba(30,36,56,0.9);
            border: 1px solid #5a6480;
            border-radius: 10px;
            color: #dce6ff;
            cursor: pointer;
            font-size: 14px;
        `;
        cancel.onclick = () => {
            modal.remove();
            if (onDone) onDone(false);
        };
        box.appendChild(cancel);

        modal.appendChild(box);
        document.body.appendChild(modal);
    }
}