import Phaser from "phaser";

interface Star {
  x: number;
  y: number;
  size: number;
  alpha: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

export class TwinklingStars {
  private stars: Star[] = [];
  public graphics: Phaser.GameObjects.Graphics;
  private time = 0;

  constructor(scene: Phaser.Scene, count: number, width: number, height: number, yOffset: number = 0) {
    this.graphics = scene.add.graphics();

    // Generate stars
    for (let i = 0; i < count; i++) {
      const baseAlpha = Phaser.Math.FloatBetween(0.3, 1.0);
      this.stars.push({
        x: Phaser.Math.Between(0, width),
        y: Phaser.Math.Between(yOffset, yOffset + height),
        size: Math.random() < 0.8 ? 2 : 3, // Most stars are small, some bigger
        alpha: baseAlpha,
        baseAlpha,
        twinkleSpeed: Phaser.Math.FloatBetween(0.5, 2.5),
        twinkleOffset: Math.random() * Math.PI * 2, // Random phase offset
      });
    }
  }

  update(delta: number) {
    this.time += delta / 1000;
    this.graphics.clear();

    for (const star of this.stars) {
      // Sine wave for smooth twinkling
      const twinkle = Math.sin(this.time * star.twinkleSpeed + star.twinkleOffset);
      star.alpha = star.baseAlpha + twinkle * 0.3;
      star.alpha = Phaser.Math.Clamp(star.alpha, 0.1, 1);

      this.graphics.fillStyle(0xffffff, star.alpha);
      this.graphics.fillRect(star.x, star.y, star.size, star.size);
    }
  }

  setDepth(depth: number) {
    this.graphics.setDepth(depth);
    return this;
  }

  destroy() {
    this.graphics.destroy();
  }
}
