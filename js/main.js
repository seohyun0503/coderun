import { Game } from './game.js';

const canvas = document.getElementById('gameCanvas');
const game = new Game(canvas);

game.init();
game.start();

// Expose for debugging
if (import.meta.env?.DEV ?? true) {
  window.__game = game;
}
