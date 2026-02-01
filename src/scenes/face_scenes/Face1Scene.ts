import Phaser from "phaser";
import FaceBase, { Edge } from "./_FaceBase";
import { getIsDesktop } from "../../ControlsMode";
import { resolveFaceConfig, buildNeighborColorMap, ENERGY_THRESHOLD_HOME } from "./_FaceConfig";

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

  private inShipRange = false;
  private inPuzzleRange = false;

  private entry_from_cockpit: boolean = false;
  private static readonly QUADRATUS_FACE1_MET_KEY = "face1_quadratus_met";

  init(data?: any) {
    super.init(data);
    this.entry_from_cockpit = !!data?.entry_from_cockpit;
  }

  create() {
    console.log("[ENTER]", this.scene.key);
    const { width, height } = this.scale;

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
    const shipPos = new Phaser.Math.Vector2(center.x-60, center.y + 100);

    const ship = this.add
      .image(shipPos.x, shipPos.y, "ship")
      .setOrigin(0.5, 0.6)
      .setDisplaySize(150, 150)
      .setDepth(50);
    ship.setAngle(-18);
    this.layer.actors?.add(ship);

    const shipBlock = this.add.zone(shipPos.x, shipPos.y-60, 50, 120);
    this.physics.add.existing(shipBlock, true);
    this.physics.add.collider(this.player, shipBlock);

    // ---- Ship zone & highlight
    this.makeObjectInteractable(ship, {
      hitRadius: 100,
      paddingX: 0,
      paddingY: 0,
      hintText: "Interactie: " + (getIsDesktop(this) ? "E / spatie" : "I"),
      onUse: () => {
        this.scene.start("CockpitScene");
      }
    })

    // Decorations etc.
    this.decorateCrashSite(radius);


    // ---- Quadratus near the ship
    const quadratusPos = new Phaser.Math.Vector2(shipPos.x + 140, shipPos.y - 180);

    const quadratus = this.add
      .image(quadratusPos.x, quadratusPos.y, "quadratus_small")
      .setDepth(55)
      // match your Face7 sizing vibe (adjust to taste)
      .setDisplaySize(-200 / 2, 336 / 2);

    this.layer.deco?.add(quadratus);

    // Optional: block so you can't walk through him
    const quadBlock = this.add.zone(quadratusPos.x, quadratusPos.y - 30, 60, 90);
    this.physics.add.existing(quadBlock, true);
    this.physics.add.collider(this.player, quadBlock);

    // ---- Dialog interaction
    const hasMet = !!this.registry.get(Face1Scene.QUADRATUS_FACE1_MET_KEY);
    const current_energie = this.getEnergy();

    const quadHandle = this.createDialogInteraction(quadratus, {
      hitRadius: 110,
      hintText: "Praat met Quadratus",
      buildLines: () => {
        // First ever emergence from cockpit => longer intro
        if (this.entry_from_cockpit && !hasMet) {
          return [
            { speaker: "Quadratus", text: "Ah hallo vreemdeling! Welkom op Dezonia, onze twaalf vlakkige planeet. Ik ben Quadratus. Is er iets waarmee ik je kan helpen?" },
            { speaker: "Jij", text: "Hoi Quadratus. Fijn om iemand te leren kennen. Ik was onderweg naar huis toen ik problemen kreeg met mijn raket. Nu heb ik te weinig energie om terug naar huis te reizen. Weet jij misschien hoe ik op Dezonia energie kan krijgen?" },
            { speaker: "Quadratus", text: "Energie is er genoeg op Dezonia. Je moet alleen weten waar je moet zoeken. Ik denk dat je gewoon maar moet gaan zoeken! Er zullen vast veel bewoners zijn die je hulp kunnen gebruiken in ruil voor wat energie. Op ieder van de twaalf vlakken van deze planeet is wel wat unieks te vinden." },
            { speaker: "Jij", text: `Dankjewel voor de tip! Ik heb nog 10 energie, maar ik moet nog een lang stuk naar huis. Ik moet dus proberen om in totaal ${ENERGY_THRESHOLD_HOME} energie te verzamelen om weer terug te kunnen reizen.`},
            { speaker: "Quadratus", text: "Je kunt over de hele planeet heen lopen door gebruik te maken van de pijltjes toetsen of de WASD toetsen. Als je in de buurt van de rand van dit vlak komt, dan kun je je naar een ander vlak verplaatsen door op de spatiebalk te drukken." },
            { speaker: "Jij", text: "Super handig, dankjewel! Ik ga nu op onderzoek uit." },

          ];
        }

        // Later occasions: always the same single line
        if (current_energie == 10) {
          return [
            { speaker: "Quadratus", text: "Je kunt bewegen met de pijltjes toetsen of de WASD toetsen. Aan de rand van het vlak kun je met behulp van de spatiebalk je naar een ander vlak verplaatsen" },
            { speaker: "Quadratus", text: `Als je ${ENERGY_THRESHOLD_HOME} energie hebt verzameld, dan kun je terug naar huis reizen! Heel veel succes!` },
          ];
        } else if (current_energie < ENERGY_THRESHOLD_HOME) {
          return [
            { speaker: "Quadratus", text: "Hoi! Hoe gaat het met je zoektocht naar energie?" },
            { speaker: "Jij", text: `Ik heb nu ${current_energie} energie verzameld.` },
            { speaker: "Quadratus", text: "Wow, goed bezig! Blijf vooral zoeken, er is nog genoeg energie te vinden op deze planeet!" },
          ];
        } else {
          return [
            { speaker: "Quadratus", text: `Wauw! Je hebt al ${current_energie} energie verzameld! Dat is genoeg om terug naar huis te reizen!` },
            { speaker: "Quadratus", text: "Ga snel terug naar je raket! Ik wens je een goede reis!" },
          ];
        }
      },
      onComplete: () => {
        // Mark met after the first forced talk
        if (this.entry_from_cockpit && !hasMet) {
          this.registry.set(Face1Scene.QUADRATUS_FACE1_MET_KEY, true);
        }
        // consume the entry flag so we don't retrigger in the same lifetime
        this.entry_from_cockpit = false;
      },
    });

    // Auto-start ONLY the first time you emerge from cockpit (and haven't met yet)
    if (this.entry_from_cockpit && !hasMet) {
      this.time.delayedCall(50, () => quadHandle.start());
    }

  }

  update(_time: number, delta: number) {
    this.baseFaceUpdate(delta);
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
