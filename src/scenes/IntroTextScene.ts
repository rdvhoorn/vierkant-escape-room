import Phaser from "phaser";
import { WarpStars } from "../utils/TwinklingStars";

/**
 * Intro scene shown after clicking Start on the TitleScene.
 * Displays a scrollable info panel and requires the user to click "Verder"
 * before continuing to the real first game scene.
 */

const INTRO_BODY = `Je gaat zo beginnen aan de nieuwe escaperoom van Vierkant voor Wiskunde. Als je deze escaperoom helemaal uit speelt, maak je kans op een prijs van €395! Je maakt namelijk kans op een gratis plek op zomerkamp 2026!

Voordat je begint, even het volgende:
- De escaperoom duurt ongeveer 60 tot 90 minuten.
- Het is het beste om deze escaperoom te spelen op de computer (niet op een telefoon of tablet). We kunnen niet garanderen dat alles goed werkt op een telefoon of tablet.
- Zorg dat je pen en papier bij de hand hebt, dat kan soms handig zijn.
- Je tussentijdse voortgang wordt niet opgeslagen. Als je de escaperoom verlaat, moet je helemaal opnieuw beginnen.
- Ga lekker opzoek naar de puzzels en probeer ze op te lossen! Veel plezier!

Klaar om te starten? Klik op Verder.`;

// Reuse the Tab type idea, but we only need one body here.
type IntroState = {
  content: Phaser.GameObjects.Container;
  viewportRect: Phaser.GameObjects.Rectangle;
  maskGfx: Phaser.GameObjects.Graphics;
  scrollTrack: Phaser.GameObjects.Rectangle;
  scrollThumb: Phaser.GameObjects.Rectangle;

  viewportX: number;
  viewportY: number;
  viewportW: number;
  viewportH: number;

  trackX: number;
  trackY: number;
  trackH: number;

  scrollY: number;
  maxScroll: number;

  dragging: boolean;
  dragStartY: number;
  scrollStartY: number;

  thumbDragging: boolean;
  thumbDragStartY: number;
  thumbStartY: number;

  canContinue: boolean;
  nextBtn?: { pad: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text };

  cleanup: () => void;
};

export default class IntroScene extends Phaser.Scene {
  private warpStars?: WarpStars;
  private state?: IntroState;
  private isContinuing = false;

  constructor() {
    super("IntroScene");
  }

  create() {
    const { width, height } = this.scale;

    // Background: Warp stars (same as TitleScene)
    const stars = new WarpStars(this, 600, width, height, {
      baseSpeed: 200,
      depth: 1400,
      fov: 280,
      fadeInZPortion: 0.25,
    });
    stars.setDepth(-10);
    this.warpStars = stars;

    this.events.on("update", (_time: number, delta: number) => {
      this.warpStars?.update(delta);
    });

    // Title
    this.add
      .text(width / 2, height * 0.16, "Voordat je begint", {
        fontFamily: "sans-serif",
        fontSize: "64px",
        fontStyle: "900",
        color: "#e7f3ff",
        stroke: "#66a3ff",
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    // Panel layout
    const panelW = Math.min(900, width * 0.9);
    const panelH = Math.min(520, height * 0.55);

    const panelX = width / 2;
    const panelY = height * 0.52;

    const panel = this.add
      .rectangle(panelX, panelY, panelW, panelH, 0x111a2e, 0.96)
      .setStrokeStyle(2, 0x66a3ff);

    // Viewport area (scrollable text)
    const viewportPadding = 28;
    const viewportX = panelX - panelW / 2 + viewportPadding;
    const viewportY = panelY - panelH / 2 + viewportPadding;
    const viewportW = panelW - viewportPadding * 2 - 18;
    const viewportH = panelH - viewportPadding * 2;

    const viewportRect = this.add
      .rectangle(viewportX, viewportY, viewportW, viewportH, 0x000000, 0)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });

    const maskGfx = this.make.graphics({ x: 0, y: 0 });
    maskGfx.fillStyle(0xffffff).fillRect(viewportX, viewportY, viewportW, viewportH);
    maskGfx.setVisible(false);
    const mask = maskGfx.createGeometryMask();

    const content = this.add.container(viewportX, viewportY).setMask(mask);

    const contentHeight = this.buildTextIntoContainer(content, INTRO_BODY, {
      maxWidth: viewportW,
      fontSize: 22,
      lineHeight: 32,
    });

    // Scrollbar
    const trackX = viewportX + viewportW + 10;
    const trackY = viewportY;
    const trackW = 6;
    const trackH = viewportH;

    const scrollTrack = this.add.rectangle(trackX, trackY, trackW, trackH, 0x3c5a99, 0.35).setOrigin(0, 0);

    const scrollThumb = this.add
      .rectangle(trackX, trackY, trackW, this.calcThumbH(trackH, contentHeight, 36), 0x66a3ff, 0.85)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });

    // Buttons (reuse same design as TitleScene)
    const btnY = height * 0.86;
    const BTN_W = 320;
    const BTN_H = 80;

    const nextBtn = this.makeMenuButton({
        x: width / 2 + 190,
        y: btnY,
        width: BTN_W,
        height: BTN_H,
        label: "Verder",
        onClick: () => this.goNext(),
        lockWhenStarting: true,
    });

    // Depth tweaks (match your title scene habit)
    panel.setDepth(1);
    viewportRect.setDepth(2);
    content.setDepth(3);
    scrollTrack.setDepth(4);
    scrollThumb.setDepth(5);
    nextBtn.pad.setDepth(10);
    nextBtn.text.setDepth(11);

    // Store state
    this.state = {
      content,
      viewportRect,
      maskGfx,
      scrollTrack,
      scrollThumb,
      viewportX,
      viewportY,
      viewportW,
      viewportH,
      trackX,
      trackY,
      trackH,
      scrollY: 0,
      maxScroll: Math.max(0, contentHeight - viewportH),
      dragging: false,
      dragStartY: 0,
      scrollStartY: 0,
      thumbDragging: false,
      thumbDragStartY: 0,
      thumbStartY: 0,
      nextBtn: nextBtn,
      canContinue: false,
      cleanup: () => {},
    };

    this.setNextEnabled(false);

    // Input handlers
    const wheelHandler = (_p: Phaser.Input.Pointer, _objs: any, _dx: number, dy: number) => {
      if (!this.state) return;
      this.setScroll(this.state.scrollY + dy * 0.6);
    };

    const moveHandler = (p: Phaser.Input.Pointer) => {
      const st = this.state;
      if (!st || !p.isDown) return;

      if (st.dragging) {
        const delta = p.y - st.dragStartY;
        this.setScroll(st.scrollStartY - delta);
      } else if (st.thumbDragging) {
        const trackTop = st.scrollTrack.y;
        const trackBottom = st.scrollTrack.y + st.trackH - st.scrollThumb.height;

        const nextThumbY = Phaser.Math.Clamp(st.thumbStartY + (p.y - st.thumbDragStartY), trackTop, trackBottom);

        if (st.maxScroll > 0) {
          const t = (nextThumbY - trackTop) / (trackBottom - trackTop || 1);
          this.setScroll(t * st.maxScroll);
        } else {
          this.setScroll(0);
        }
      }
    };

    const upHandler = () => {
      if (!this.state) return;
      this.state.dragging = false;
      this.state.thumbDragging = false;
    };

    this.input.on("wheel", wheelHandler);
    this.input.on("pointermove", moveHandler);
    this.input.on("pointerup", upHandler);

    this.state.cleanup = () => {
      this.input.off("wheel", wheelHandler);
      this.input.off("pointermove", moveHandler);
      this.input.off("pointerup", upHandler);
    };

    // Drag scroll on viewport
    viewportRect.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (!this.state) return;
      this.state.dragging = true;
      this.state.dragStartY = p.y;
      this.state.scrollStartY = this.state.scrollY;
    });

    // Drag thumb
    scrollThumb.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (!this.state) return;
      this.state.thumbDragging = true;
      this.state.thumbDragStartY = p.y;
      this.state.thumbStartY = scrollThumb.y;
    });

    // Ensure correct initial positions
    this.setScroll(0);
  }

  shutdown() {
    this.state?.cleanup();
  }

  private goNext() {
    if (this.isContinuing) return;
    this.isContinuing = true;
    this.cameras.main.fadeOut(180, 0, 0, 0, (_: any, p: number) => {
      if (p === 1) this.scene.start("CockpitScene");
    });
  }

  // =========================================================
  // BUTTON (same look/feel as TitleScene)
  // =========================================================
  private makeMenuButton(opts: {
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
    onClick: () => void;
    lockWhenStarting?: boolean;
  }) {
    const { x, y, width, height, label, onClick, lockWhenStarting } = opts;

    const pad = this.add
      .rectangle(x, y, width, height, 0x1e2a4a, 0.85)
      .setStrokeStyle(2, 0x3c5a99);

    const text = this.add
      .text(x, y, label, { fontFamily: "sans-serif", fontSize: "36px", color: "#cfe8ff" })
      .setOrigin(0.5);

    const canInteract = () => !(lockWhenStarting && this.isContinuing);

    const setHover = (hovered: boolean) => {
      if (!canInteract()) return;
      pad.setFillStyle(hovered ? 0x26365f : 0x1e2a4a, hovered ? 0.95 : 0.85);
      pad.setStrokeStyle(2, hovered ? 0x66a3ff : 0x3c5a99);
      text.setColor(hovered ? "#ffffff" : "#cfe8ff");
    };

    const click = () => {
      if (!canInteract()) return;
      this.tweens.add({
        targets: [pad, text],
        scale: 1.02,
        duration: 120,
        yoyo: true,
        ease: "back.out",
        onComplete: () => onClick(),
      });
    };

    const hook = (obj: Phaser.GameObjects.GameObject) => {
      obj.setInteractive({ useHandCursor: true });
      obj.on("pointerover", () => setHover(true));
      obj.on("pointerout", () => setHover(false));
      obj.on("pointerup", () => {
        if (!canInteract()) return;
        this.tweens.add({ targets: [pad, text], scale: 1.0, duration: 110, ease: "quad.out" });
        click();
      });
      obj.on("pointerupoutside", () => {
        this.tweens.add({ targets: [pad, text], scale: 1.0, duration: 110, ease: "quad.out" });
        setHover(false);
      });
    };

    hook(pad);
    hook(text);

    return { pad, text };
  }

  private calcThumbH(trackH: number, contentH: number, minH: number) {
    return contentH <= 0 ? trackH : Math.max(minH, (trackH * trackH) / contentH);
  }

  // =========================================================
  // SIMPLE TEXT LAYOUT into container (no links needed here)
  // (If you want markdown links, you can literally paste your rich-text builder instead.)
  // =========================================================
  private buildTextIntoContainer(
    container: Phaser.GameObjects.Container,
    raw: string,
    opts: { maxWidth: number; fontSize: number; lineHeight: number }
  ): number {
    const { maxWidth, fontSize, lineHeight } = opts;

    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: "sans-serif",
      fontSize: `${fontSize}px`,
      color: "#cfe8ff",
    };

    const measurer = this.add.text(0, 0, "", style).setVisible(false);
    const spaceW = (measurer.setText(" "), measurer.width);

    let x = 0;
    let y = 0;

    const newLine = (extra = 1) => {
      x = 0;
      y += lineHeight * extra;
    };

    const addWord = (word: string) => {
      measurer.setText(word);
      const w = measurer.width;

      if (x > 0 && x + w > maxWidth) newLine();

      const t = this.add.text(x, y, word, style).setOrigin(0, 0);
      container.add(t);
      x += w;
    };

    const addLine = (line: string) => {
      const parts = line.split(/(\s+)/).filter(Boolean);
      for (const part of parts) {
        if (/^\s+$/.test(part)) x += spaceW;
        else addWord(part);
      }
      newLine();
    };

    const lines = raw.replace(/\r\n/g, "\n").split("\n");
    for (const line of lines) {
      if (!line.trim()) {
        newLine(1.3);
        continue;
      }
      addLine(line);
    }

    measurer.destroy();
    return y + lineHeight;
  }

  private setNextEnabled(enabled: boolean) {
    const st = this.state;
    if (!st?.nextBtn) return;

    const { pad, text } = st.nextBtn;

    // visuals
    pad.setFillStyle(enabled ? 0x1e2a4a : 0x1e2a4a, enabled ? 0.85 : 0.35);
    pad.setStrokeStyle(2, enabled ? 0x3c5a99 : 0x2a3f6b);
    text.setColor(enabled ? "#cfe8ff" : "#7f97b6");

    // input
    if (enabled) {
        pad.setInteractive({ useHandCursor: true });
        text.setInteractive({ useHandCursor: true });
    } else {
        pad.disableInteractive();
        text.disableInteractive();
    }
  }

  private setScroll(nextY: number) {
    const st = this.state;
    if (!st) return;

    st.scrollY = Phaser.Math.Clamp(nextY, 0, st.maxScroll);
    st.content.y = st.viewportY - st.scrollY;

    const trackTop = st.scrollTrack.y;
    const trackH = st.trackH;

    if (st.maxScroll <= 0) {
        st.scrollThumb.y = trackTop;
        st.scrollThumb.height = trackH;

        // If no scrolling needed, allow continue immediately
        if (!st.canContinue) {
        st.canContinue = true;
        this.setNextEnabled(true);
        }
        return;
    }

    const thumbH = st.scrollThumb.height;
    const trackBottom = trackTop + trackH - thumbH;
    const t = st.scrollY / st.maxScroll;
    st.scrollThumb.y = Phaser.Math.Linear(trackTop, trackBottom, t);

    // ---- NEW: unlock when near bottom ----
    const threshold = 8; // pixels "close enough"
    const atBottom = st.scrollY >= st.maxScroll - threshold;

    if (atBottom !== st.canContinue) {
        st.canContinue = atBottom;
        this.setNextEnabled(atBottom);
    }
    }


}
