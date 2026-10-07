// multiverse/main.js
// Точка входа. Только склейка модулей.

import { CONFIG } from './config.js';

import { World } from './core/world.js';
import { Player } from './core/player.js';
import { Hits } from './core/hits.js';
import { GameState } from './core/gameState.js';

import { CanvasRenderer } from './render/canvasRenderer.js';

import { makeFallbackSpec } from './app/fallback.js';
import { loadSpec, loadSpecFor } from './app/specFactory.js';
import { setupDragDrop } from './app/dragDrop.js';
import { setupInput } from './app/input.js';
import { updateHits } from './app/updateHits.js';
import { startLoop } from './app/loop.js';

(async function init() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    function resize() {
        const frame = document.getElementById('gameFrame');
        const r = frame.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width  = Math.round(r.width  * dpr);
        canvas.height = Math.round(r.height * dpr);
        canvas.style.width  = r.width  + 'px';
        canvas.style.height = r.height + 'px';
    }
    window.addEventListener('resize', resize);
    resize();

    // --- core ---
    const world = new World(CONFIG.worldSeed);
    const player = new Player();
    const hits = new Hits();
    const state = new GameState(CONFIG.worldSeed);

    // --- spec ---
    let spec = makeFallbackSpec();
const jsonSpec = await loadSpecFor(0, 0);   // стартовый мир для (0, 0)
if (jsonSpec) spec = jsonSpec;

    state.world = world;
    state.player = player;
    state.currentWorldSpec = spec;
// worldId — это имя JSON-мира, а не spec.id
state.currentWorldId = jsonSpec ? 'w_default' : 'fallback';

    // --- renderer ---
    const renderer = new CanvasRenderer();
    renderer.init(canvas, spec, CONFIG);

    // --- стартовый узел ---
    try {
        world.generateNode(0, 0, null);
        player.currentNode = world.currentNode;
        player.currentBranch = 0;
    } catch (e) {
        console.error('Ошибка генерации стартового узла:', e);
        player.currentNode = {
            timeAnchor: 0, branchId: 0, portals: [],
            forecast: [0,0,0,0,0], forecastCharged: [0,0,0,0,0],
            fill: 0, radius: 2, hasExchanger: false, anomalous: false,
        };
    }

    // --- модули ---
    const dragAPI = setupDragDrop({ world, player, hits, state, canvas });
    setupInput({ canvas, hits, world, player, state, dragAPI });

    // --- цикл ---
    startLoop({
        canvas, ctx, world, player, state, renderer, dragAPI,
        updateHits: () => updateHits({ hits, world, player, state, canvas }),
    });

    console.log('✅ Мультивселенная запущена (модульная версия)');
})();