// multiverse/render/rendererInterface.js
//
// Базовый интерфейс рендера.
// Игра общается только через эти методы — что именно рисовать.
// Как именно — решает конкретная реализация (canvas / dom / sprite).

export class RendererInterface {
    /** @param {HTMLCanvasElement} canvas */
    init(canvas, worldSpec, config) {
        throw new Error('init not implemented');
    }

    resize(width, height, dpr) {}

    clear() {}

    // ----- мир -----
    drawWorld(worldRect, node, spec) {}
    drawWorldFill(worldRect, fillFrac) {}

    // ----- порталы и ячейки -----
    drawPortal(portal, x, y, spec, isKnown) {}
    drawPortalCell(cell, x, y, portal, spec, highlight) {}

    // ----- предметы -----
    drawFigure(shape, x, y, size, spec) {}
    drawFigureHighlight(shape, x, y, size, spec) {}

    // ----- обменник -----
    drawExchanger(x, y, spec) {}

    // ----- UI -----
    drawHud(state, viewport, spec) {}
    drawInventory(state, rect, spec, highlight) {}
    drawForecast(state, rect, spec, highlight) {}
    drawZoomButtons(state, viewport) {}
    drawStatus(text, viewport) {}

    // ----- переход -----
    drawTransition(transition, spec) {}

    // ----- финальная отрисовка кадра -----
    flush() {}
}