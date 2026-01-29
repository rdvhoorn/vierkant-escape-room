import Phaser from "phaser";
import FaceBase, { Edge } from "./_FaceBase";
import { getIsDesktop } from "../../ControlsMode";
import { resolveFaceConfig, buildNeighborColorMap } from "./_FaceConfig";
import { DEBUG } from "../../main";

export default class Face1Scene extends FaceBase {
  constructor() {
    super("Face1Scene");
  }

  // Local alias for layers (we fill this from FaceBase.getFaceLayers())
  private layer = {
    bg: null as Phaser.GameObjects.Container | null,
    ground: null as Phaser.GameObjects.Container | null,
    deco: null as Phaser.GameObjects.Container | null,
    actors: null as Phaser.GameObjects.Container | null,
    fx: null as Phaser.GameObjects.Container | null,
    ui: null as Phaser.GameObjects.Container | null,
  };

  private shipZone!: Phaser.GameObjects.Zone; // proximity window
  private shipHighlight!: Phaser.GameObjects.Graphics; // visual highlight around ship

  private quadratusZone!: Phaser.GameObjects.Zone; // Quadratus interaction zone
  private quadratusHighlight!: Phaser.GameObjects.Graphics;

  private inShipRange = false;
  private inQuadratusRange = false;

  // Quadratus character
  private quadratusSprite?: Phaser.GameObjects.Image;

  // Quadratus dialog
  private quadratusDialogActive = false;
  private quadratusLines: { speaker: string; text: string; thought?: boolean }[] = [
    { speaker: "Q", text: "Hoi vreemdeling, ik ben Quadratus de Espirantus. Welkom op de planeet Dezonia!" },
    { speaker: "IK", text: "(Quadratus lijkt vriendelijk en ik kan wel wat hulp gebruiken.)", thought: true },
    { speaker: "IK", text: "Hoi Quadratus, ik ben een beetje verdwaald geloof ik." },
    { speaker: "IK", text: "Ik was op weg naar de Aarde met mijn raket, maar nu ben ik ineens hier." },
    { speaker: "IK", text: "Mijn raket doet het nog, maar de energietank is bijna leeg. Hoe kom ik nu naar huis?" },
    { speaker: "Q", text: "Ach vreemdeling toch, wat een pech. Gelukkig is er hier op Dezonia ook energie te vinden..." },
    { speaker: "IK", text: "Nou, dan ga ik meteen zoeken, dank je wel Quadratus!" },
    { speaker: "Q", text: "Helaas, je moet nog even geduld hebben." },
    { speaker: "IK", text: "Waarom dan?" },
    { speaker: "Q", text: "Omdat ik eerst nog het hele spel moet afmaken. Dit was de teaser en die heb je zojuist uitgespeeld." },
  ];
  private quadratusIndex = 0;
  private quadratusBox?: Phaser.GameObjects.Graphics;
  private quadratusText?: Phaser.GameObjects.Text;
  private quadratusSpeaker?: Phaser.GameObjects.Text;
  private quadratusOverlay?: Phaser.GameObjects.Rectangle;

  create() {
    console.log("[ENTER]", this.scene.key);
    const { width, height } = this.scale;

    // Shared energy initialization for this face
    this.ensureEnergyInitialized(0);

    // --- Pull config from faceConfig.ts ---
    const cfg = resolveFaceConfig("Face1Scene");
    const { radius, neighbors, visuals } = cfg;
    const colorMap = buildNeighborColorMap(neighbors);

    this.initStandardFace({
      radius,
      faceTravelTargets: neighbors, // Keep neighbors for visual colors
      mainFill: visuals.mainFill,
      neighborFill: visuals.neighborFill,
      colorMap,
      edgeTriggerScale: visuals.edgeTriggerScale,
      backgroundColor: visuals.backgroundColor,
      showLabel: visuals.showLabel, // false for Face1 in config
      disableEscape: true, // Disable ESC to title screen in teaser
      disableTravel: true, // Disable face-to-face travel (keeps visual colors)
    });

    // Grab the created layers from FaceBase and map them to our local layer object
    const baseLayers = this.getFaceLayers();
    this.layer.bg = baseLayers.bg;
    this.layer.ground = baseLayers.ground;
    this.layer.deco = baseLayers.deco;
    this.layer.actors = baseLayers.actors;
    this.layer.fx = baseLayers.fx;
    this.layer.ui = baseLayers.ui;

    // Ground texture on the main face
    this.addGrassyGroundTexture(width / 2, height / 2, radius);

    // ---- Crash site / ship
    const center = this.getPolygonCenter(this.poly);
    const shipPos = new Phaser.Math.Vector2(center.x, center.y + 50);

    const ship = this.add
      .image(shipPos.x, shipPos.y, "ship")
      .setOrigin(0.5, 0.6)
      .setDisplaySize(48, 48)
      .setDepth(50);
    ship.setAngle(-18);
    this.addSoftShadowBelow(ship, 22, 0x000000, 0.28);
    this.layer.actors?.add(ship);

    const shipBlock = this.add.zone(shipPos.x, shipPos.y, 44, 28);
    this.physics.add.existing(shipBlock, true);
    this.physics.add.collider(this.player, shipBlock);

    // ---- Ship zone & highlight
    this.shipZone = this.add.zone(shipPos.x, shipPos.y, 90, 70).setOrigin(0.5);
    this.physics.add.existing(this.shipZone, true);

    this.shipHighlight = this.add.graphics().setDepth(51).setVisible(false);
    this.shipHighlight.lineStyle(2, 0xffffff, 0.6);
    this.shipHighlight.strokeRoundedRect(
      shipPos.x - 45,
      shipPos.y - 35,
      90,
      70,
      10
    );
    this.shipHighlight.setAlpha(0.8);
    this.layer.fx?.add(this.shipHighlight);

    const isDesktop = getIsDesktop(this);
    const hintText = "Interactie: " + (isDesktop ? "spatie / E" : "I");

    // Interaction for ship/quadratus logic
    this.registerInteraction(
      () => this.inShipRange || this.inQuadratusRange,
      () => {
        if (this.inShipRange) {
          // If puzzle already solved, go to cockpit instead of puzzle
          if (this.registry.get("electricitySolved")) {
            this.scene.start("CockpitScene");
          } else {
            this.scene.start("ShipFuelScene");
          }
        } else if (this.inQuadratusRange && !this.quadratusDialogActive) {
          // Talk to Quadratus (repeatable)
          this.startQuadratusDialog();
        }
      },
      { hintText }
    );

    // Decorations etc.
    this.decorateCrashSite(radius);

    // Spawn Quadratus (if electricity is solved, or in debug mode)
    if (DEBUG || this.registry.get("electricitySolved")) {
      this.spawnQuadratus();
    }

    // Dialog input handlers (E and SPACE both work)
    this.input.on("pointerdown", () => this.advanceQuadratusDialog());
    this.input.keyboard?.on("keydown-SPACE", () => this.advanceQuadratusDialog());
    this.input.keyboard?.on("keydown-E", () => this.advanceQuadratusDialog());
  }

  private spawnQuadratus() {
    const center = this.getPolygonCenter(this.poly);
    const quadratusX = center.x + 100; // Further right to avoid overlap
    const quadratusY = center.y - 30; // Slightly higher, not too much

    // Test NEAREST filter for pixel-art look (sharp pixels, no blur)
    const texture = this.textures.get("quadratus_small");
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);

    // LOD approach: Use pre-scaled quadratus_small.webp (200x336) for gameplay
    // This avoids GPU downsampling artifacts from scaling down large images
    // setDisplaySize 42x70 pixels (30% smaller than previous 60x100)
    this.quadratusSprite = this.add.image(quadratusX, quadratusY, "quadratus_small")
      .setOrigin(0.5, 0.6)
      .setDisplaySize(42, 70) // 30% smaller, similar to farmer size
      .setDepth(55)
      .setFlipX(true);

    this.addSoftShadowBelow(this.quadratusSprite, 18, 0x000000, 0.28);
    this.layer.actors?.add(this.quadratusSprite);

    // Create interaction zone around Quadratus
    this.quadratusZone = this.add.zone(quadratusX, quadratusY, 80, 80);
    this.physics.world.enable(this.quadratusZone);

    this.quadratusHighlight = this.add.graphics().setDepth(51).setVisible(false);
    this.quadratusHighlight.lineStyle(2, 0x66ff66, 0.6);
    this.quadratusHighlight.strokeRoundedRect(
      quadratusX - 40,
      quadratusY - 40,
      80,
      80,
      10
    );
    this.quadratusHighlight.setAlpha(0.8);
    this.layer.fx?.add(this.quadratusHighlight);
  }

  private startQuadratusDialog() {
    if (this.quadratusDialogActive) return;
    if (this.registry.get("teaserCompleteShown")) return; // Teaser is done, no more dialog
    this.quadratusDialogActive = true;
    this.quadratusIndex = 0;

    // Stop player movement and disable input during dialog
    this.playerController.setInputEnabled(false);

    const { width, height } = this.scale;

    // No dark overlay - keep Quadratus visible
    this.quadratusOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0);
    this.quadratusOverlay.setDepth(200);
    this.quadratusOverlay.setScrollFactor(0);

    // Dialog box at bottom (same dimensions as CockpitScene, fixed to screen)
    const boxHeight = 120;
    const boxWidth = 640;
    const boxX = width / 2 - boxWidth / 2;
    const boxY = height - boxHeight - 20;

    this.quadratusBox = this.add.graphics();
    this.quadratusBox.setDepth(201);
    this.quadratusBox.setScrollFactor(0);
    this.quadratusBox.fillStyle(0x1b2748, 0.95);
    this.quadratusBox.fillRoundedRect(boxX, boxY, boxWidth, boxHeight, 12);
    this.quadratusBox.lineStyle(2, 0x3c5a99, 1);
    this.quadratusBox.strokeRoundedRect(boxX, boxY, boxWidth, boxHeight, 12);

    // Text layout (same as CockpitScene, fixed to screen)
    const textStartX = boxX + 20;

    // Speaker name at top of box
    this.quadratusSpeaker = this.add.text(textStartX, boxY + 15, "", {
      fontFamily: "sans-serif",
      fontSize: "14px",
      color: "#ffaa00",
      fontStyle: "bold",
    }).setDepth(202).setScrollFactor(0);

    // Dialog text below speaker
    this.quadratusText = this.add.text(textStartX, boxY + 35, "", {
      fontFamily: "sans-serif",
      fontSize: "18px",
      color: "#e7f3ff",
      wordWrap: { width: boxWidth - 40, useAdvancedWrap: true },
    }).setDepth(202).setScrollFactor(0);

    // Hint positioned bottom-right inside box
    this.add.text(boxX + boxWidth - 10, boxY + boxHeight - 10, "Klik →", {
      fontFamily: "sans-serif",
      fontSize: "12px",
      color: "#888888",
    }).setOrigin(1, 1).setDepth(202).setScrollFactor(0).setName("quadratusHint");

    this.showDialogLine();
  }

  private showDialogLine() {
    if (!this.quadratusText || !this.quadratusSpeaker) return;

    const line = this.quadratusLines[this.quadratusIndex];
    const speakerName = line.speaker === "Q" ? "Quadratus" : "Jij";
    const textColor = line.thought ? "#aaaaff" : "#e7f3ff";
    const speakerColor = line.speaker === "Q" ? "#ffaa00" : "#88ff88";

    this.quadratusSpeaker.setText(speakerName).setColor(speakerColor);
    this.quadratusText.setText(line.text).setColor(textColor);

    // Fade in effect
    this.quadratusText.setAlpha(0);
    this.tweens.add({ targets: this.quadratusText, alpha: 1, duration: 150 });
  }

  private advanceQuadratusDialog() {
    if (!this.quadratusDialogActive) return;
    if (this.registry.get("teaserCompleteShown")) return; // Popup shown, ignore input

    this.quadratusIndex++;
    if (this.quadratusIndex < this.quadratusLines.length) {
      this.showDialogLine();
    } else {
      this.endQuadratusDialog();
    }
  }

  private endQuadratusDialog() {
    this.quadratusDialogActive = false;
    this.registry.set("quadratusDialogSeen", true);

    // Re-enable player movement
    this.playerController.setInputEnabled(true);

    // Clean up dialog UI only (Quadratus stays on the planet)
    this.quadratusOverlay?.destroy();
    this.quadratusBox?.destroy();
    this.quadratusText?.destroy();
    this.quadratusSpeaker?.destroy();
    this.children.getByName("quadratusHint")?.destroy();

    // Show teaser complete popup after dialog (only first time)
    if (!this.registry.get("teaserCompleteShown")) {
      this.registry.set("teaserCompleteShown", true);
      this.time.delayedCall(500, () => this.showTeaserCompletePopup());
    }
  }

  private showTeaserCompletePopup() {
    const { width, height } = this.scale;
    this.playerController.setInputEnabled(false);

    // Darken background - must cover entire screen
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
    overlay.setDepth(200);
    overlay.setScrollFactor(0); // Fixed to camera, not world

    // Popup box
    const boxWidth = 400;
    const boxHeight = 200;
    const box = this.add.graphics();
    box.setDepth(201);
    box.setScrollFactor(0);
    box.fillStyle(0x1b2748, 0.95);
    box.fillRoundedRect(width / 2 - boxWidth / 2, height / 2 - boxHeight / 2, boxWidth, boxHeight, 16);
    box.lineStyle(3, 0x3c5a99, 1);
    box.strokeRoundedRect(width / 2 - boxWidth / 2, height / 2 - boxHeight / 2, boxWidth, boxHeight, 16);

    // Title
    this.add.text(width / 2, height / 2 - 50, "Gelukt!", {
      fontFamily: "sans-serif",
      fontSize: "32px",
      color: "#00ff88",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(202).setScrollFactor(0);

    // Message
    this.add.text(width / 2, height / 2 + 10, "Dit was de teaser voor de escape room!\nKom in februari terug voor meer!", {
      fontFamily: "sans-serif",
      fontSize: "18px",
      color: "#e7f3ff",
      align: "center",
    }).setOrigin(0.5).setDepth(202).setScrollFactor(0);

    // Confetti effect
    const confettiColors = [0xffd700, 0x00ff00, 0x00ffff, 0xff00ff, 0xffffff, 0xffff00];
    for (let i = 0; i < 50; i++) {
      const x = Phaser.Math.Between(width / 2 - 200, width / 2 + 200);
      const startY = height / 2 - 120;
      const particle = this.add.circle(x, startY, Phaser.Math.Between(3, 6), Phaser.Utils.Array.GetRandom(confettiColors));
      particle.setDepth(203);
      particle.setScrollFactor(0);

      this.tweens.add({
        targets: particle,
        y: startY + Phaser.Math.Between(150, 250),
        x: x + Phaser.Math.Between(-50, 50),
        alpha: 0,
        duration: Phaser.Math.Between(1500, 2500),
        ease: "cubic.out",
        delay: Phaser.Math.Between(0, 500),
        onComplete: () => particle.destroy(),
      });
    }
  }

  update(_time: number, delta: number) {
    this.baseFaceUpdate(delta);

    // ---- Ship overlap
    const isOverlappingShip = this.physics.world.overlap(this.player, this.shipZone);
    this.inShipRange = isOverlappingShip;
    this.shipHighlight.setVisible(this.inShipRange);

    // ---- Quadratus overlap
    if (this.quadratusZone) {
      const isOverlappingQuadratus = this.physics.world.overlap(this.player, this.quadratusZone);
      this.inQuadratusRange = isOverlappingQuadratus;
      this.quadratusHighlight.setVisible(this.inQuadratusRange && !this.quadratusDialogActive);
    }
  }

  /**
   * Override FaceBase's edge-based proximity:
   * For this scene, "interaction in range" is defined by the ship/quadratus zones,
   * OR a travel edge being active.
   */
  protected isNearEdge(_player: { x: number; y: number }, _e: Edge): boolean {
    // `activeTravelEdge` is managed by baseFaceUpdate() in FaceBase
    return this.inShipRange || this.inQuadratusRange || this.activeTravelEdge !== null;
  }

  // ---------------------------
  // Decorations / visuals
  // ---------------------------

  private addGrassyGroundTexture(cx: number, cy: number, radius: number) {
    const key = "grassTexFaceTop";
    const size = 512;
    if (!this.textures.exists(key)) {
      const tex = this.textures.createCanvas(key, size, size);
      if (tex === null) return;

      const ctx = tex.getContext();
      const g = ctx.createLinearGradient(0, 0, size, size);
      g.addColorStop(0, "#1f4a2b");
      g.addColorStop(1, "#2c6b3b");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);

      for (let i = 0; i < 5000; i++) {
        const a = Math.random() * 0.08 + 0.02;
        ctx.fillStyle = `rgba(${(30 + (Math.random() * 50) | 0)}, ${
          80 + ((Math.random() * 80) | 0)
        }, ${(40 + (Math.random() * 40) | 0)}, ${a})`;
        const x = (Math.random() * size) | 0;
        const y = (Math.random() * size) | 0;
        const s = Math.random() < 0.7 ? 1 : 2;
        ctx.fillRect(x, y, s, s);
      }

      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 300; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const len = 3 + Math.random() * 8;
        ctx.beginPath();
        ctx.moveTo(x, y + 2);
        ctx.lineTo(x + (Math.random() * 2 - 1), y - len);
        ctx.stroke();
      }

      tex.refresh();
    }

    const img = this.add.image(cx, cy, key);
    const scale = (radius * 2.2) / 256;
    img.setScale(scale);

    const maskGfx = this.add.graphics();
    maskGfx.fillStyle(0xffffff, 1);
    maskGfx.beginPath();
    const pts = (this.poly.points as Phaser.Geom.Point[]).map(
      (p) => new Phaser.Math.Vector2(p.x, p.y)
    );
    maskGfx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) maskGfx.lineTo(pts[i].x, pts[i].y);
    maskGfx.closePath();
    maskGfx.fillPath();
    const mask = maskGfx.createGeometryMask();
    img.setMask(mask);
    maskGfx.setVisible(false);

    const edge = this.add.graphics();
    edge.lineStyle(2, 0x0a3918, 0.8);
    edge.beginPath();
    edge.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) edge.lineTo(pts[i].x, pts[i].y);
    edge.closePath();
    edge.strokePath();

    this.layer.ground?.add([img, edge, maskGfx]);
  }

  private decorateCrashSite(radius: number) {
    const center = this.getPolygonCenter(this.poly);
    const candidates = ["rock", "tuft1", "tuft2", "debris1", "debris2"].filter((k) =>
      this.textures.exists(k)
    );
    const count = Phaser.Math.Between(6, 10);
    for (let i = 0; i < count; i++) {
      const p = this.randomPointInPolygon(this.poly, center, radius * 0.75);
      const key = candidates.length
        ? Phaser.Utils.Array.GetRandom(candidates)
        : null;
      if (!key) break;

      const s = this.add.image(p.x, p.y, key);
      s.setScale(Phaser.Math.FloatBetween(0.8, 1.15));
      s.setAngle(Phaser.Math.Between(-15, 15));
      s.setAlpha(0.95);
      this.layer.deco?.add(s);
      this.addSoftShadowBelow(s, 10, 0x000000, 0.2);
    }
  }

  private randomPointInPolygon(
    poly: Phaser.Geom.Polygon,
    center: Phaser.Math.Vector2,
    maxR: number
  ) {
    for (let tries = 0; tries < 200; tries++) {
      const r = Phaser.Math.FloatBetween(maxR * 0.2, maxR);
      const a = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const x = center.x + Math.cos(a) * r;
      const y = center.y + Math.sin(a) * r;
      if (Phaser.Geom.Polygon.Contains(poly, x, y))
        return new Phaser.Math.Vector2(x, y);
    }
    return center.clone();
  }
}
