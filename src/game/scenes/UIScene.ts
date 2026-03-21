import Phaser from 'phaser';

export default class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    // This scene sits on top of OpenWorldScene
    // React handles the actual HUD, this just provides a layer for future Phaser-native HUD elements
    const controlsText = this.add.text(10, this.cameras.main.height - 30,
      'WASD / ↑↓←→  Move   ·   Walk into enemies to battle   ·   Enter boss portal for boss fight',
      { fontFamily: 'Share Tech Mono', fontSize: '9px', color: '#ffffff' }
    ).setScrollFactor(0).setAlpha(0.3);

    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      controlsText.y = gameSize.height - 30;
    });
  }
}
