import Phaser from "phaser";
import FaceBase, { Edge } from "./_FaceBase";
import { TwinklingStars } from "../utils/TwinklingStars";
import { getIsDesktop } from "../ControlsMode";

export default class Face3Scene extends FaceBase {
  constructor() {
    super("Face3Scene");
  }

  private layer = {
    bg: null as Phaser.GameObjects.Container | null,
    ground: null as Phaser.GameObjects.Container | null,
    deco: null as Phaser.GameObjects.Container | null,
    actors: null as Phaser.GameObjects.Container | null,
    fx: null as Phaser.GameObjects.Container | null,
    ui: null as Phaser.GameObjects.Container | null,
  };

  private edgeZones: {
    zone: Phaser.GameObjects.Zone;
    target: string;
    gfx: Phaser.GameObjects.Graphics;
    width: number;
    height: number;
  }[] = [];
  private activeEdge: string | null = null;

  private twinklingStars?: TwinklingStars;

  create() {
    console.log("[ENTER]", this.scene.key);
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#0b1020");
//kopieer nog naar de nadere files om de melding weg te halen

    // Label at top
    this.add
      .text(this.scale.width / 2, 20, this.scene.key, {
        fontFamily: "Arial",
        fontSize: "28px",
        color: "#ffffff",
      })
      .setOrigin(0.5, 0)
      .setDepth(2000);

    const EDGE_TRIGGER_SCALE = 0.4;

    this.ensureEnergyInitialized(0);

    // layers
    this.layer.bg = this.add.container(0, 0).setDepth(0);
    this.layer.ground = this.add.container(0, 0).setDepth(10);
    this.layer.deco = this.add.container(0, 0).setDepth(20);
    this.layer.actors = this.add.container(0, 0).setDepth(30);
    this.layer.fx = this.add.container(0, 0).setDepth(40);
    this.layer.ui = this.add.container(0, 0).setDepth(1000);

    this.twinklingStars = new TwinklingStars(this, 220, width, height);
    this.layer.bg.add(this.twinklingStars.graphics);

    const stars = this.add.graphics();
    for (let i = 0; i < 200; i++) {
      stars.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.15, 0.8));
      stars.fillRect(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        2,
        2
      );
    }
    this.layer.bg.add(stars);

    // face geometry
    const radius = 180;
    const faceTravelTargets = [
      "Face1Scene",
      "Face2Scene",
      "Face9Scene",
      "Face4Scene",
      "Face7Scene",
    ];

    const colorMap: Record<string, number> = {
      Face1Scene: 0x311111,
      Face2Scene: 0x311111,
      Face9Scene: 0x311111,
      Face4Scene: 0x311111,
      Face7Scene: 0x311111,
    };

    const neighborStyles = faceTravelTargets.map((k) =>
      k ? { fill: colorMap[k], stroke: 0x4b7ad1, alpha: 0.95 } : undefined
    );

    this.renderFaceAndNeighbors({
      cx: width / 2,
      cy: height / 2,
      radius,
      fill: 0x311111,
      neighborFill: 0x311111,
      neighborStyles,
    });

    // spawn player
    const spawnX = (this.data.get("spawnX") as number) ?? width / 2;
    const spawnY = (this.data.get("spawnY") as number) ?? height / 2 - 20;
    this.createPlayerAt(spawnX, spawnY);

    // build edge zones + gfx
    const edges = this.getEdges();
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i];
      const target = faceTravelTargets[i];
      if (!target) continue;

      const hitWidth = e.length * EDGE_TRIGGER_SCALE;
      const hitHeight = 40 * EDGE_TRIGGER_SCALE;

      const zone = this.add.zone(e.mid.x, e.mid.y, hitWidth, hitHeight).setOrigin(0.5);
      this.physics.add.existing(zone, true);

      const gfx = this.add.graphics().setDepth(60);
      gfx.fillStyle(0x4b7ad1, 0.16);
      gfx.lineStyle(2, 0x4b7ad1, 0.9);
      gfx.fillRoundedRect(
        -hitWidth / 2,
        -hitHeight / 2,
        hitWidth,
        hitHeight,
        Math.max(6, Math.round(hitHeight / 2))
      );
      gfx.strokeRoundedRect(
        -hitWidth / 2,
        -hitHeight / 2,
        hitWidth,
        hitHeight,
        Math.max(6, Math.round(hitHeight / 2))
      );
      gfx.setPosition(e.mid.x, e.mid.y);
      gfx.setRotation(
        Phaser.Math.Angle.Between(e.start.x, e.start.y, e.end.x, e.end.y)
      );
      this.layer.fx?.add(gfx);

      this.edgeZones.push({ zone, target, gfx, width: hitWidth, height: hitHeight });
    }

    const isDesktop = getIsDesktop(this);
    const edgeHint = "Ga naar volgende vlak: " + (isDesktop ? "E" : "I");

    this.registerInteraction(
      () => this.activeEdge !== null,
      () => {
        if (this.activeEdge) {
          console.log(`[TRANSITION] ${this.scene.key} → ${this.activeEdge}`);
          this.scene.start(this.activeEdge);
        }
      },
      { hintText: edgeHint }
    );
  }

  private getEdges() {
    const pts = this.poly.points as Phaser.Geom.Point[];
    const edges: {
      start: Phaser.Math.Vector2;
      end: Phaser.Math.Vector2;
      mid: Phaser.Math.Vector2;
      length: number;
    }[] = [];
    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % pts.length];
      const start = new Phaser.Math.Vector2(p1.x, p1.y);
      const end = new Phaser.Math.Vector2(p2.x, p2.y);
      const mid = new Phaser.Math.Vector2(
        (start.x + end.x) / 2,
        (start.y + end.y) / 2
      );
      const length = Phaser.Math.Distance.Between(
        start.x,
        start.y,
        end.x,
        end.y
      );
      edges.push({ start, end, mid, length });
    }
    return edges;
  }

  update(_time: number, delta: number) {
    this.twinklingStars?.update(delta);

    this.activeEdge = null;
    for (const ez of this.edgeZones) {
      if (this.physics.world.overlap(this.player, ez.zone)) {
        this.activeEdge = ez.target;
        ez.gfx.clear();
        ez.gfx.fillStyle(0x4b7ad1, 0.26);
        ez.gfx.lineStyle(2, 0x4b7ad1, 1.0);
        ez.gfx.fillRoundedRect(
          -ez.width / 2,
          -ez.height / 2,
          ez.width,
          ez.height,
          Math.max(6, Math.round(ez.height / 2))
        );
        ez.gfx.strokeRoundedRect(
          -ez.width / 2,
          -ez.height / 2,
          ez.width,
          ez.height,
          Math.max(6, Math.round(ez.height / 2))
        );
        break;
      } else {
        ez.gfx.clear();
        ez.gfx.fillStyle(0x4b7ad1, 0.16);
        ez.gfx.lineStyle(2, 0x4b7ad1, 0.9);
        ez.gfx.fillRoundedRect(
          -ez.width / 2,
          -ez.height / 2,
          ez.width,
          ez.height,
          Math.max(6, Math.round(ez.height / 2))
        );
        ez.gfx.strokeRoundedRect(
          -ez.width / 2,
          -ez.height / 2,
          ez.width,
          ez.height,
          Math.max(6, Math.round(ez.height / 2))
        );
      }
    }
  }

  protected isNearEdge(_p: any, _e: Edge): boolean {
    return this.activeEdge !== null;
  }
}
