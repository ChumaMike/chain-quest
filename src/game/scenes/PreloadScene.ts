import Phaser from 'phaser';

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {
    // Create loading bar
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBox = this.add.graphics();
    const progressBar = this.add.graphics();

    progressBox.fillStyle(0x0a1020, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 15, 320, 30);

    const loadingText = this.add.text(width / 2, height / 2 - 50, 'LOADING CHAIN QUEST...', {
      fontFamily: 'Orbitron',
      fontSize: '16px',
      color: '#00d4ff',
    }).setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0x00d4ff, 1);
      progressBar.fillRect(width / 2 - 158, height / 2 - 13, 316 * value, 26);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    // No external assets needed — we build everything procedurally
    // Just a tiny delay to show loading screen
  }

  create() {
    this.scene.start('OpenWorldScene');
  }
}
