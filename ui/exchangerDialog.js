// multiverse/ui/exchangerDialog.js
//
// Модалка обменника. Показывает доступные обмены.
// Игрок выбирает → 5 фигур одной формы → 1 фигура следующей формы.
// Каждый обмен тратит 1 энергию.

import { shapeName } from '../core/figure.js';

export class ExchangerDialog {
    // player — core/player.js
    // onDone(success) — вызывается при завершении
    static open(player, onDone) {
        // Проверяем энергию
        if (player.energy < 1) {
            alert('Не хватает энергии');
            if (onDone) onDone(false);
            return;
        }

        // Собираем доступные обмены: формы, которых в сумме >= 5
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

        // Создаём модалку
        ExchangerDialog._createModal(player, available, onDone);
    }

    static _createModal(player, available, onDone) {
        // Удаляем старую, если есть
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
                padding: 12px;
                color: #dce6ff;
                cursor: pointer;
                font-size: 14px;
                text-align: left;
                transition: background 0.15s;
            `;
            row.onmouseenter = () => row.style.background = 'rgba(60,80,120,0.9)';
            row.onmouseleave = () => row.style.background = 'rgba(40,50,80,0.9)';

            row.innerHTML = `
                <span style="font-weight:bold;">${shapeName(opt.shape)} × 5</span>
                <span style="color:#8aa0c8;"> → </span>
                <span style="font-weight:bold;color:#88ffcc;">${shapeName(nextShape)} × 1</span>
                <span style="color:#8aa0c8; font-size:12px;"> (всего: ${opt.total})</span>
            `;

            row.onclick = () => {
                // Проверка энергии
                if (player.energy < 1) {
                    alert('Не хватает энергии');
                    return;
                }

                // Обмен
                const ok = player.exchange(opt.shape, true);
                if (ok) {
                    player.spendEnergy(1);
                } else {
                    alert('Не удалось обменять');
                    return;
                }

                // Закрываем модалку
                modal.remove();

                // Пересчитываем доступные обмены
                const newAvailable = [];
                for (let shape = 0; shape < 5; shape++) {
                    let total = 0;
                    for (const s of player.slots) {
                        if (!s.isEmpty() && s.shape === shape) total += s.count;
                    }
                    if (total >= 5) newAvailable.push({ shape, total });
                }

                // Если что-то ещё можно обменять — открываем снова
                if (newAvailable.length > 0 && player.energy >= 1) {
                    ExchangerDialog._createModal(player, newAvailable, onDone);
                } else {
                    if (onDone) onDone(true);
                }
            };

            list.appendChild(row);
        }

        box.appendChild(list);

        // Кнопка «Отмена»
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