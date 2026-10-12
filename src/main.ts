import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from './config';
import { MainScene } from './scenes/MainScene';
import { SHARP } from './screen';

new Phaser.Game({
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
