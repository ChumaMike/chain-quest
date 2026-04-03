import Phaser from 'phaser';
import PreloadScene from './scenes/PreloadScene';
import OpenWorldScene from './scenes/OpenWorldScene';
import UIScene from './scenes/UIScene';
import BlockRacerScene from './scenes/BlockRacerScene';
import NodeDefenderScene from './scenes/NodeDefenderScene';
import HashPuzzleScene from './scenes/HashPuzzleScene';
import DuelScene from './scenes/DuelScene';
import JumperScene from './scenes/JumperScene';

export function createPhaserConfig(parent: string): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#04060f',
    pixelArt: true,
    roundPixels: true,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: [PreloadScene, OpenWorldScene, UIScene, BlockRacerScene, NodeDefenderScene, HashPuzzleScene, DuelScene, JumperScene],
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: {
      antialias: false,
      pixelArt: true,
    },
  };
}
