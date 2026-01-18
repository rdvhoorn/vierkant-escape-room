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

  constructor(scene: Phaser.Scene, count: number, width: number, height: number) {
    this.graphics = scene.add.graphics();

    // Generate stars
    for (let i = 0; i < count; i++) {
      const baseAlpha = Phaser.Math.FloatBetween(0.3, 1.0);
      this.stars.push({
        x: Phaser.Math.Between(0, width),
        y: Phaser.Math.Between(0, height),
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

interface WarpStar {
  // world-ish coordinates around the center
  x: number; // -spread..spread
  y: number; // -spread..spread
  z: number; // 0..depth (bigger = farther away)

  // visual
  baseAlpha: number;
  twinkleSpeed: number;
  twinkleOffset: number;

  // optional: slight per-star speed variance
  speedMul: number;
}

export class WarpStars {
  private stars: WarpStar[] = [];
  public graphics: Phaser.GameObjects.Graphics;

  private time = 0;

  private centerX: number;
  private centerY: number;

  // Tuning knobs
  private readonly width: number;
  private readonly height: number;

  private readonly spread: number; // how wide the star "cloud" is around center (world space)
  private readonly depth: number;  // how far back stars can spawn (z range)
  private readonly fov: number;    // projection strength (higher = less extreme)

  private baseSpeed: number;       // units per second in z-direction
  private maxSize: number;

  // Fade behavior
  private fadeInZPortion: number;  // fade in over the nearest X% of depth
  private edgeFadeStart: number;   // start fading near edges (0..1, as fraction of half-diagonal)

  constructor(
    scene: Phaser.Scene,
    count: number,
    width: number,
    height: number,
    options?: Partial<{
      spread: number;
      depth: number;
      fov: number;
      baseSpeed: number;
      maxSize: number;
      fadeInZPortion: number;
      edgeFadeStart: number;
      centerX: number;
      centerY: number;
    }>
  ) {
    this.width = width;
    this.height = height;

    this.centerX = options?.centerX ?? width / 2;
    this.centerY = options?.centerY ?? height / 2;

    this.spread = options?.spread ?? Math.max(width, height) * 0.9; // world spread
    this.depth = options?.depth ?? 1200; // z range
    this.fov = options?.fov ?? 300;

    this.baseSpeed = options?.baseSpeed ?? 500; // z units per second
    this.maxSize = options?.maxSize ?? 3;

    this.fadeInZPortion = options?.fadeInZPortion ?? 0.2; // fade in over nearest 20% of depth
    this.edgeFadeStart = options?.edgeFadeStart ?? 0.85;  // fade out near edges

    this.graphics = scene.add.graphics();

    for (let i = 0; i < count; i++) {
      this.stars.push(this.makeStar(true));
    }
  }

  /** Create a star; if randomZ is true, distribute throughout depth to avoid initial clump. */
  private makeStar(randomZ: boolean): WarpStar {
    const baseAlpha = Phaser.Math.FloatBetween(0.35, 1.0);

    return {
      x: Phaser.Math.FloatBetween(-this.spread, this.spread),
      y: Phaser.Math.FloatBetween(-this.spread, this.spread),
      z: randomZ
        ? Phaser.Math.FloatBetween(0, this.depth)
        : this.depth, // spawn at far plane
      baseAlpha,
      twinkleSpeed: Phaser.Math.FloatBetween(0.4, 2.0),
      twinkleOffset: Math.random() * Math.PI * 2,
      speedMul: Phaser.Math.FloatBetween(0.85, 1.25),
    };
  }

  private respawnStar(star: WarpStar) {
    // Re-randomize x/y, push to far depth.
    star.x = Phaser.Math.FloatBetween(-this.spread, this.spread);
    star.y = Phaser.Math.FloatBetween(-this.spread, this.spread);
    star.z = this.depth;

    star.baseAlpha = Phaser.Math.FloatBetween(0.35, 1.0);
    star.twinkleSpeed = Phaser.Math.FloatBetween(0.4, 2.0);
    star.twinkleOffset = Math.random() * Math.PI * 2;
    star.speedMul = Phaser.Math.FloatBetween(0.85, 1.25);
  }

  update(deltaMs: number) {
    const dt = deltaMs / 1000;
    this.time += dt;

    // Clear once per frame
    this.graphics.clear();

    // Half diagonal for edge fade normalization
    const halfDiag = Math.sqrt((this.width * this.width + this.height * this.height)) / 2;

    for (const star of this.stars) {
      // Move forward: decreasing z makes projected position fly outward faster
      star.z -= this.baseSpeed * star.speedMul * dt;

      // If it passes the "camera", respawn
      if (star.z <= 1) {
        this.respawnStar(star);
        continue;
      }

      // Perspective projection
      const scale = this.fov / (this.fov + star.z);

      const sx = this.centerX + star.x * scale;
      const sy = this.centerY + star.y * scale;

      // If it leaves screen bounds by some margin, recycle
      const margin = 50;
      if (sx < -margin || sx > this.width + margin || sy < -margin || sy > this.height + margin) {
        this.respawnStar(star);
        continue;
      }

      // Size grows as it gets closer
      const size = Phaser.Math.Clamp(1 + scale * this.maxSize, 1, this.maxSize + 2);

      // Twinkle (subtle, not overpowering)
      const twinkle = Math.sin(this.time * star.twinkleSpeed + star.twinkleOffset) * 0.15;

      // Fade in as it gets somewhat away from the far plane toward camera
      // Here: when z is near depth => alpha low; as z approaches depth*(1 - fadeInZPortion) => alpha reaches 1
      const fadeInStartZ = this.depth; // far
      const fadeInEndZ = this.depth * (1 - this.fadeInZPortion); // closer
      let fadeIn = 1;
      if (star.z > fadeInEndZ) {
        // map z from [fadeInStartZ..fadeInEndZ] to [0..1]
        fadeIn = 1 - (star.z - fadeInEndZ) / (fadeInStartZ - fadeInEndZ);
      }
      fadeIn = Phaser.Math.Clamp(fadeIn, 0, 1);

      // Optional: fade out near edges so stars don't "stick" on corners
      const distFromCenter = Math.sqrt(
        (sx - this.centerX) * (sx - this.centerX) + (sy - this.centerY) * (sy - this.centerY)
      );
      const edgeT = distFromCenter / halfDiag; // 0 at center, ~1 at edges
      let edgeFade = 1;
      if (edgeT > this.edgeFadeStart) {
        edgeFade = 1 - (edgeT - this.edgeFadeStart) / (1 - this.edgeFadeStart);
      }
      edgeFade = Phaser.Math.Clamp(edgeFade, 0, 1);

      // Final alpha
      const alpha = Phaser.Math.Clamp((star.baseAlpha + twinkle) * fadeIn * edgeFade, 0.05, 1);

      this.graphics.fillStyle(0xffffff, alpha);
      this.graphics.fillRect(sx, sy, size, size);
    }
  }

  setDepth(depth: number) {
    this.graphics.setDepth(depth);
    return this;
  }

  /** Useful to “speed up” or “slow down” the travel effect dynamically. */
  setSpeed(speed: number) {
    this.baseSpeed = speed;
    return this;
  }

  setCenter(x: number, y: number) {
    this.centerX = x;
    this.centerY = y;
    return this;
  }

  destroy() {
    this.graphics.destroy();
  }
}

