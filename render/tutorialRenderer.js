// multiverse/render/tutorialRenderer.js

export function drawTutorial(ctx, tutorial, state, viewport, worldRect, node, spec) {
    if (!tutorial || !tutorial.visible) return;

    const step = tutorial.current();
    if (!step) return;

    // Особый случай — большая вводная подсказка
    if (step.target === 'center' || step.big) {
        drawBigCenter(ctx, viewport, step);
        return;
    }

    const target = getTargetPosition(step.target, state, viewport, worldRect, node, spec);
    if (!target) return;

    const tx = target.x;
    const ty = target.y;

    const offX = step.offsetX || 0;
    const offY = step.offsetY || 0;
    const labelX = tx + offX;
    const labelY = ty + offY;

    // Собираем строки
    const lines = step.textLines && step.textLines.length > 0
        ? step.textLines
        : (step.text ? [step.text] : ['']);

    // Максимальная ширина
    ctx.font = 'bold 14px sans-serif';
    let textW = 0;
    for (const line of lines) {
        const w = ctx.measureText(line).width;
        if (w > textW) textW = w;
    }

    const padding = 14;
    const lineHeight = 18;
    const boxW = textW + padding * 2;
    const boxH = lines.length * lineHeight + 14;

    if (step.arrow) {
        drawArrow(ctx, labelX, labelY, tx, ty);
    }

    const boxX = labelX - boxW / 2;
    const boxY = labelY - boxH / 2;

    ctx.fillStyle = 'rgba(20, 26, 46, 0.92)';
    ctx.strokeStyle = '#ffcc44';
    ctx.lineWidth = 2;
    roundRect(ctx, boxX, boxY, boxW, boxH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const firstY = labelY - ((lines.length - 1) * lineHeight) / 2;
    for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], labelX, firstY + i * lineHeight);
    }
}

function getTargetPosition(targetRole, state, viewport, worldRect, node, spec) {
    if (targetRole === 'forecast') {
        const r = spec.getForecastRect(viewport);
        return { x: r.x0 + r.total / 2, y: r.y + r.cell / 2 };
    }

    if (targetRole === 'inventory') {
        const r = spec.getInventoryRect(viewport);
        return { x: r.x0 + r.total / 2, y: r.y + r.cell / 2 };
    }

    if (targetRole === 'burn') {
        const r = spec.getInventoryRect(viewport);
        const burn = r.cell * 1.15;
        return {
            x: r.x0 + 5 * (r.cell + r.gap) + r.gap + burn / 2,
            y: r.y - (burn - r.cell) / 2 + burn / 2,
        };
    }

    if (targetRole === 'portal') {
        if (node.portals.length === 0) return null;
        return spec.getPortalPosition(0, viewport, worldRect, node.portals.length);
    }

    if (targetRole === 'exchanger') {
        return spec.getExchangerPosition(viewport, worldRect);
    }

    if (targetRole === 'item') {
        const visible = state.world.visibleOnField(node.branchId, node.timeAnchor);
        if (visible.length === 0) return null;
        const f = visible[0];
        const x = worldRect.cx + Math.cos(f.angle) * f.radius * worldRect.r * 0.85;
        const y = worldRect.cy + Math.sin(f.angle) * f.radius * worldRect.r * 0.85;
        return { x, y };
    }

    return null;
}

function drawArrow(ctx, fromX, fromY, toX, toY) {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const len = Math.hypot(dx, dy) || 1;
    const nx = dx / len;
    const ny = dy / len;

    const startX = fromX + nx * 40;
    const startY = fromY + ny * 20;
    const endX = toX - nx * 12;
    const endY = toY - ny * 12;

    ctx.strokeStyle = '#ffcc44';
    ctx.fillStyle = '#ffcc44';
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    const headLen = 12;
    const headWidth = 8;
    const perpX = -ny;
    const perpY = nx;

    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX - nx * headLen + perpX * headWidth,
               endY - ny * headLen + perpY * headWidth);
    ctx.lineTo(endX - nx * headLen - perpX * headWidth,
               endY - ny * headLen - perpY * headWidth);
    ctx.closePath();
    ctx.fill();
}

function drawBigCenter(ctx, viewport, step) {
    const lines = step.textLines || (step.text ? [step.text] : ['']);
    const fontSize = 16;
    const lineHeight = 24;
    const padding = 28;

    ctx.font = `bold ${fontSize}px sans-serif`;
    let textW = 0;
    for (const line of lines) {
        const w = ctx.measureText(line).width;
        if (w > textW) textW = w;
    }

    const boxW = Math.min(viewport.width * 0.85, textW + padding * 2);
    const boxH = lines.length * lineHeight + padding * 2;

    const boxX = (viewport.width - boxW) / 2;
    const boxY = (viewport.height - boxH) / 2;

    ctx.fillStyle = 'rgba(20, 26, 46, 0.95)';
    ctx.strokeStyle = '#ffcc44';
    ctx.lineWidth = 2.5;
    roundRect(ctx, boxX, boxY, boxW, boxH, 14);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const firstY = boxY + padding + lineHeight / 2;
    for (let i = 0; i < lines.length; i++) {
        // Первая строка — крупнее и золотая
        if (i === 0) {
            ctx.fillStyle = '#ffcc44';
            ctx.font = `bold ${fontSize + 4}px sans-serif`;
        } else {
            ctx.fillStyle = '#dce6ff';
            ctx.font = `${fontSize}px sans-serif`;
        }
        ctx.fillText(lines[i], viewport.width / 2, firstY + i * lineHeight);
    }
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
}