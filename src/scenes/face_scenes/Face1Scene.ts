import Phaser from "phaser";
import FaceBase, { Edge } from "./_FaceBase";
import { getIsDesktop } from "../../ControlsMode";
import { resolveFaceConfig, buildNeighborColorMap } from "./_FaceConfig";

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

  private puzzleZone!: Phaser.GameObjects.Zone; // puzzle proximity
  private puzzleHighlight!: Phaser.GameObjects.Graphics;

  private inShipRange = false;
  private inPuzzleRange = false;

  // Quadratus character
  private quadratusSprite?: Phaser.GameObjects.Image;
  private quadratusShadow?: Phaser.GameObjects.Graphics;

  // Quadratus dialog
  private quadratusDialogActive = false;
  private quadratusLines: { speaker: string; text: string; thought?: boolean }[] = [
    { speaker: "Q", text: "Hoi vreemdeling, ik ben Quadratus de Espirantus. Welkom op de planeet Dezonia!" },
    { speaker: "IK", text: "(Quadratus lijkt vriendelijk en ik kan wel wat hulp gebruiken.)", thought: true },
    { speaker: "IK", text: "Hoi Quadratus, ik ben een beetje verdwaald geloof ik." },
    { speaker: "IK", text: "Ik was op weg naar de Aarde met mijn raket, maar nu ben ik ineens hier." },
    { speaker: "IK", text: "Mijn raket doet het nog, maar de energietank is bijna leeg. Hoe kom ik nu naar huis?" },
    { speaker: "Q", text: "Ach vreemdeling toch, wat een pech. Gelukkig is er hier op Dezonia ook energie te vinden..." },
    { speaker: "IK", text: "Nou, dat biedt hoop, dank je wel Quadratus!" },
    { speaker: "Q", text: "Veel succes, vreemdeling! Het is aan jou of je de hele planeet wil ontdekken." },
    { speaker: "IK", text: "Wacht! Ga je niet met me mee?" },
    { speaker: "Q", text: "Nee, maar ik denk niet dat dit de laatste keer is dat we elkaar zien." },
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
      faceTravelTargets: neighbors,
      mainFill: visuals.mainFill,
      neighborFill: visuals.neighborFill,
      colorMap,
      edgeTriggerScale: visuals.edgeTriggerScale,
      backgroundColor: visuals.backgroundColor,
      showLabel: visuals.showLabel, // false for Face1 in config
      disableEscape: true, // Disable ESC to title screen in teaser
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

    // ---- Puzzle zone near ship
    const puzzlePos = new Phaser.Math.Vector2(shipPos.x + 100, shipPos.y - 80);

    this.puzzleZone = this.add.zone(puzzlePos.x, puzzlePos.y, 80, 80).setOrigin(0.5);
    this.physics.add.existing(this.puzzleZone, true);

    this.puzzleHighlight = this.add.graphics().setDepth(51).setVisible(false);
    this.puzzleHighlight.lineStyle(2, 0xffff00, 0.6);
    this.puzzleHighlight.strokeRoundedRect(
      puzzlePos.x - 40,
      puzzlePos.y - 40,
      80,
      80,
      8
    );
    this.puzzleHighlight.setAlpha(0.8);
    this.layer.fx?.add(this.puzzleHighlight);

    const puzzleImage = this.add
      .image(puzzlePos.x, puzzlePos.y, "letter")
      .setOrigin(0.5, 0.5)
      .setDisplaySize(48, 48)
      .setDepth(50);
    this.addSoftShadowBelow(puzzleImage, 22, 0x000000, 0.28);
    this.layer.actors?.add(puzzleImage);

    const isDesktop = getIsDesktop(this);
    const hintText = "Interactie: " + (isDesktop ? "E" : "I");

    // Interaction for ship/puzzle logic
    this.registerInteraction(
      () => this.inShipRange || this.inPuzzleRange,
      () => {
        if (this.inShipRange) {
          // If puzzle already solved, go to cockpit instead of puzzle
          if (this.registry.get("electricitySolved")) {
            this.scene.start("CockpitScene");
          } else {
            this.scene.start("ShipFuelScene");
          }
        } else if (this.inPuzzleRange) {
          // In teaser: start Quadratus dialog or show popup
          if (this.registry.get("electricitySolved")) {
            if (!this.registry.get("quadratusDialogSeen")) {
              this.startQuadratusDialog();
            } else {
              this.showTeaserCompletePopup();
            }
          } else {
            // Normal game flow (not in teaser)
            if (this.registry.get("logic1Solved")) {
              this.scene.start("PuzzleLogicTwoScene");
            } else {
              this.scene.start("PuzzleLogicOneScene");
            }
          }
        }
      },
      { hintText }
    );

    // Decorations etc.
    this.decorateCrashSite(radius);

    // Start intro sequence (if electricity is solved and dialog not seen yet)
    if (this.registry.get("electricitySolved") && !this.registry.get("quadratusDialogSeen")) {
      this.startIntroSequence();
    }

    // Dialog input handlers
    this.input.on("pointerdown", () => this.advanceQuadratusDialog());
    this.input.keyboard?.on("keydown-SPACE", () => this.advanceQuadratusDialog());
  }

  private startIntroSequence() {
    // Sequence: spawn Quadratus → dialog → Quadratus leaves
    const center = this.getPolygonCenter(this.poly);

    // Spawn Quadratus to the right of player (after short delay)
    this.time.delayedCall(1000, () => {
      const quadratusX = center.x + 60; // Right of center
      const quadratusY = center.y - 8; // Slightly higher than astronaut

      this.quadratusSprite = this.add.image(quadratusX, quadratusY, "quadratus")
        .setOrigin(0.5, 0.6)
        .setDisplaySize(70, 70) // 40% larger than original (58 * 1.2 ≈ 70)
        .setDepth(55)
        .setFlipX(true); // Mirror sprite to face left

      // Enable anti-aliasing for smooth rendering
      const texture = this.textures.get("quadratus");
      texture.setFilter(Phaser.Textures.FilterMode.LINEAR);

      this.quadratusShadow = this.addSoftShadowBelow(this.quadratusSprite, 13, 0x000000, 0.28); // 50% smaller shadow (26 / 2)
      this.layer.actors?.add(this.quadratusSprite);

      // Start dialog after Quadratus appears
      this.time.delayedCall(500, () => {
        this.startQuadratusDialog();
      });
    });
  }

  private startQuadratusDialog() {
    if (this.quadratusDialogActive) return;
    this.quadratusDialogActive = true;
    this.quadratusIndex = 0;

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

    // Hint
    this.add.text(width - 50, height - 30, "Klik →", {
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

    // Clean up dialog UI
    this.quadratusOverlay?.destroy();
    this.quadratusBox?.destroy();
    this.quadratusText?.destroy();
    this.quadratusSpeaker?.destroy();
    this.children.getByName("quadratusHint")?.destroy();

    // Quadratus leaves (destroy sprite and shadow)
    this.quadratusSprite?.destroy();
    this.quadratusShadow?.destroy();

    // Show teaser complete popup after dialog
    this.time.delayedCall(500, () => this.showTeaserCompletePopup());
  }

  private showTeaserCompletePopup() {
    const { width, height } = this.scale;

    // Darken background
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
    overlay.setDepth(200);

    // Popup box
    const boxWidth = 400;
    const boxHeight = 200;
    const box = this.add.graphics();
    box.setDepth(201);
    box.fillStyle(0x1b2748, 0.95);
    box.fillRoundedRect(width / 2 - boxWidth / 2, height / 2 - boxHeight / 2, boxWidth, boxHeight, 16);
    box.lineStyle(3, 0x3c5a99, 1);
    box.strokeRoundedRect(width / 2 - boxWidth / 2, height / 2 - boxHeight / 2, boxWidth, boxHeight, 16);

    // Title
    const title = this.add.text(width / 2, height / 2 - 50, "Gelukt!", {
      fontFamily: "sans-serif",
      fontSize: "32px",
      color: "#00ff88",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(202);

    // Message
    const msg = this.add.text(width / 2, height / 2 + 10, "Dit was de teaser voor de escape room!\nKom in januari terug voor meer!", {
      fontFamily: "sans-serif",
      fontSize: "18px",
      color: "#e7f3ff",
      align: "center",
    }).setOrigin(0.5).setDepth(202);

    // Confetti effect
    const confettiColors = [0xffd700, 0x00ff00, 0x00ffff, 0xff00ff, 0xffffff, 0xffff00];
    for (let i = 0; i < 50; i++) {
      const x = Phaser.Math.Between(width / 2 - 200, width / 2 + 200);
      const startY = height / 2 - 120;
      const particle = this.add.circle(x, startY, Phaser.Math.Between(3, 6), Phaser.Utils.Array.GetRandom(confettiColors));
      particle.setDepth(203);

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

    // Click on popup box to dismiss
    const hitArea = this.add.rectangle(width / 2, height / 2, boxWidth, boxHeight, 0xffffff, 0);
    hitArea.setDepth(204);
    hitArea.setInteractive({ useHandCursor: true });
    hitArea.once("pointerdown", () => {
      overlay.destroy();
      box.destroy();
      title.destroy();
      msg.destroy();
      hitArea.destroy();
    });
  }

  update(_time: number, delta: number) {
    this.baseFaceUpdate(delta);

    // ---- Ship overlap
    const isOverlappingShip = this.physics.world.overlap(this.player, this.shipZone);
    this.inShipRange = isOverlappingShip;
    this.shipHighlight.setVisible(this.inShipRange);

    // ---- Puzzle overlap
    const isOverlappingPuzzle = this.physics.world.overlap(this.player, this.puzzleZone);
    this.inPuzzleRange = isOverlappingPuzzle;
    this.puzzleHighlight.setVisible(this.inPuzzleRange);
  }

  /**
   * Override FaceBase's edge-based proximity:
   * For this scene, "interaction in range" is defined by the ship/puzzle zones,
   * OR a travel edge being active.
   */
  protected isNearEdge(_player: { x: number; y: number }, _e: Edge): boolean {
    // `activeTravelEdge` is managed by baseFaceUpdate() in FaceBase
    return this.inShipRange || this.inPuzzleRange || this.activeTravelEdge !== null;
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
