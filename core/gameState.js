// multiverse/core/gameState.js
//
// Общий стейт игры. Связывает World, Player, WorldSelector, Transition.

export class GameState {
    constructor(seed) {
        this.seed = seed;

        this.world = null;              // core/world.js
        this.player = null;             // core/player.js
        this.selector = null;           // core/worldSelector.js

        this.transition = null;         // core/transitions.js (если активен)
        this.dragging = null;           // фигура в руке (если drag-mode)
        this.dragSource = 'NONE';

        this.panX = 0;
this.panY = 0;
        
        this.zoom = 1.0;
        this.secondsToNextYear = 20;

        this.currentWorldSpec = null;   // data/worldSpec.js — загруженный мир
        this.currentWorldId = null;

        this.paused = false;
    }

    isTransitioning() {
        return this.transition != null && !this.transition.isDone();
    }
}
