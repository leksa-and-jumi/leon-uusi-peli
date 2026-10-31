import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from './config';
import { Lobby } from './lobby/Lobby';
import { MainScene } from './scenes/MainScene';
import { SHARP } from './screen';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  // More pixels than the game's own size, for a sharp picture: the scene zooms in to match
  width: GAME_WIDTH * SHARP,
  height: GAME_HEIGHT * SHARP,
  backgroundColor: COLORS.background,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [MainScene],
});

/** The game's scene, once it is up and running. */
function scene(): MainScene | null {
  const main = game.scene.getScene('MainScene') as MainScene | null;
  return main?.sys.isActive() ? main : null;
}

/** Keys go to the lobby's text boxes while it is open, and to the game while it is not. */
let typing = true;
function keysTo(): void {
  const keyboard = scene()?.input.keyboard;
  if (!keyboard) return;
  keyboard.enabled = !typing;
  if (typing) keyboard.disableGlobalCapture();
  else keyboard.enableGlobalCapture();
}
// The scene starts a moment later: then it gets the keys the right way too
const waiting = window.setInterval(() => {
  if (!scene()) return;
  window.clearInterval(waiting);
  keysTo();
}, 100);

// The lobby is on top while the game starts behind it: the big button plays at once
new Lobby({
  playable: scene,
  typing: (on) => {
    typing = on;
    keysTo();
  },
});
