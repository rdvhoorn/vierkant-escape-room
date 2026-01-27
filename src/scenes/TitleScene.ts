import Phaser from "phaser";
import { TwinklingStars, WarpStars } from "../utils/TwinklingStars";
import { getLeaderboardKampA } from "../firebase/firestore";

/**
 * Links supported as markdown:
 *  - [label](https://example.com)
 *
 * Popup supports tabs with separate bodies per tab.
 */

// -----------------------------
// TAB CONTENT
// -----------------------------
const INFO_TAB_BODY = `Deze escaperoom is gericht op leerlingen van groep 6, 7 en 8 van de basisschool die van puzzelen en logisch denken houden. Voor nu staat alleen de teaser nog online. Dit voorproefje geeft alvast een beeld van de escaperoom die in februari volledig online zal komen. Let op: als je de teaser afsluit, dan is je voortgang weg. Speel hem dus in 1x uit, of schrijf de antwoorden op zodat je de volgende keer er sneller doorheen kan.`;

const ACHTERGROND_TAB_BODY = `Stichting [Vierkant voor Wiskunde](https://www.vierkantvoorwiskunde.nl/) organiseert al vanaf 1993 wiskundige activiteiten voor jongeren. Onder andere organiseert de stichting elk jaar wiskundezomerkampen voor groep 6 tot en met klas 6. Om dit mooie initiatief te ondersteunen, hebben de [bèta-vicedecanen van de Nederlandse universiteiten](https://www.vierkantvoorwiskunde.nl/2023/10/uitbouw-van-de-vierkant-voor-wiskunde-zomerkampen/) in 2024 een bijdrage toegekend om de zomerkampen uit te breiden.

Je hoeft geen wiskundeheld te zijn om mee te gaan op kamp, maar wel een liefhebber van puzzels en problemen. Tijdens de kampen wordt een aantal onderwerpen met een wiskundig thema verkend, zoals veelvlakken, getallen, grafen, magische vierkanten, geheimschrift of verzamelingen. Je kunt ook aan de slag gaan met berekeningen, bouwwerken, tekeningen of kunstwerken gebaseerd op een nieuw uitdagend onderwerp. Hierbij kun je denken aan Escher-tekeningen of fractals. Naast de wiskunde is er natuurlijk ook tijd voor andere activiteiten, zoals sport, spelletjes, zwemmen en creatieve activiteiten. Er zijn twee deskundige begeleiders per groepje van 6 deelnemers, zodat iedereen voldoende meegenomen en uitgedaagd wordt.

In 2024-2025 is de eerste escaperoom opgezet als prijsvraag om twintig gratis kampplaatsen weg te geven voor klas 1, 2 en 3 van de middelbare school. De escaperoom voor 2025-2026 is gericht op leerlingen uit groep 6, 7 en 8 van de basisschool, zij kunnen ook gratis kampplaatsen winnen door het oplossen van de escaperoom.

Wil je mee op een van de zomerkampen van Vierkant voor Wiskunde? Meer informatie vind je op de website: [Vierkant voor Wiskunde](https://www.vierkantvoorwiskunde.nl/kampen/)
Bekijk ook onze [homepagina](https://www.vierkantvoorwiskunde.nl/).`;

const CONTACT_TAB_BODY = `Makers escaperoom 2025-2026:
- Verhaal en Raadsels: Sonja Iakovleva & Moniek Messink
- Programmering: Daniël Wielenga, Misha Stassen, Robin van Hoorn
- Illustraties: Gegenereerd met AI.

Bugs kunnen worden gemeld via [escaperoom@vierkantvoorwiskunde.nl](mailto:escaperoom@vierkantvoorwiskunde.nl)
`;

type Tab = { title: string; body: string };

type PopupState = {
  container: Phaser.GameObjects.Container;
  overlay: Phaser.GameObjects.Rectangle;

  // layout
  panelX: number;
  panelY: number;
  panelW: number;
  panelH: number;

  dividerY: number;

  viewportX: number;
  viewportY: number;
  viewportW: number;
  viewportH: number;

  trackX: number;
  trackY: number;
  trackW: number;
  trackH: number;

  // refs
  closeX: Phaser.GameObjects.Text;
  tabs: Tab[];
  tabIndex: number;
  tabButtons: Array<{ pad: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text }>;

  viewportRect: Phaser.GameObjects.Rectangle;
  maskGfx: Phaser.GameObjects.Graphics;
  content: Phaser.GameObjects.Container;

  scrollTrack: Phaser.GameObjects.Rectangle;
  scrollThumb: Phaser.GameObjects.Rectangle;

  // scroll
  scrollY: number;
  maxScroll: number;

  // input state
  dragging: boolean;
  dragStartY: number;
  scrollStartY: number;

  thumbDragging: boolean;
  thumbDragStartY: number;
  thumbStartY: number;

  cleanup: () => void;
};

export default class TitleScene extends Phaser.Scene {
  private twinklingStars?: TwinklingStars;
  private warpStars?: WarpStars;
  private isStarting = false;
  private popup?: PopupState;

  constructor() {
    super("TitleScene");
  }

  create() {
    const { width, height } = this.scale;

    // -------------------------
    // Background: Warp Stars
    // -------------------------
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

    this.add
      .text(width / 2, height * 0.28, "Verzamelmania op Dezonia!", {
        fontFamily: "sans-serif",
        fontSize: "80px",
        fontStyle: "900",
        color: "#e7f3ff",
        stroke: "#66a3ff",
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.38, "Lukt het jou om terug te keren naar Aarde?", {
        fontFamily: "sans-serif",
        fontSize: "35px",
        color: "#b6d5ff",
      })
      .setOrigin(0.5);

    // Button layout
    const btnX = width / 2;
    const firstBtnY = height * 0.57;
    const btnGap = 15;
    const BTN_W = 600;
    const BTN_H = 90;

    const startButton = this.makeMenuButton({
      x: btnX,
      y: firstBtnY,
      width: BTN_W,
      height: BTN_H,
      label: "Klik hier om te starten",
      onClick: () => this.handleStartClick(),
      lockWhenStarting: true,
    });

    const infoButton = this.makeMenuButton({
      x: btnX,
      y: firstBtnY + BTN_H + btnGap,
      width: BTN_W,
      height: BTN_H,
      label: "Info / Achtergrond / Contact",
      onClick: () =>
        this.openTabbedPopup([
          { title: "Info", body: INFO_TAB_BODY },
          { title: "Achtergrond", body: ACHTERGROND_TAB_BODY },
          { title: "Contact", body: CONTACT_TAB_BODY },
        ]),
      lockWhenStarting: true,
    });

    const leaderboardButton = this.makeMenuButton({
      x: btnX,
      y: firstBtnY + (BTN_H + btnGap) * 2,
      width: BTN_W,
      height: BTN_H,
      label: "Leaderboard",
      onClick: () => this.openLeaderboardPopup(),
      lockWhenStarting: true,
    });

    leaderboardButton.pad.setDepth(10);
    leaderboardButton.text.setDepth(11);


    startButton.pad.setDepth(10);
    startButton.text.setDepth(11);
    infoButton.pad.setDepth(10);
    infoButton.text.setDepth(11);
  }

  update(_time: number, delta: number) {
    this.twinklingStars?.update(delta);
  }

  // =========================================================
  // START FLOW
  // =========================================================
  private handleStartClick() {
    if (this.isStarting) return;
    this.isStarting = true;
    this.cameras.main.fadeOut(200, 0, 0, 0, (_: any, p: number) => {
      if (p === 1) this.scene.start("IntroScene");
    });
  }

  // =========================================================
  // MENU BUTTON
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
      .text(x, y, label, { fontFamily: "sans-serif", fontSize: "40px", color: "#cfe8ff" })
      .setOrigin(0.5);

    const canInteract = () => !(lockWhenStarting && this.isStarting);

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

  // =========================================================
  // POPUP (tabs + scroll + links)
  // =========================================================
  private openTabbedPopup(tabs: Tab[]) {
    if (this.popup) return;

    const { width, height } = this.scale;

    const panelW = Math.min(760, width * 0.9);
    const panelH = Math.min(560, height * 0.82);
    const panelX = width / 2;
    const panelY = height / 2;

    const overlay = this.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.6)
      .setInteractive();

    const panel = this.add
      .rectangle(panelX, panelY, panelW, panelH, 0x111a2e, 0.96)
      .setStrokeStyle(2, 0x66a3ff);

    const closeX = this.add
      .text(panelX + panelW / 2 - 18, panelY - panelH / 2 + 12, "✕", {
        fontFamily: "sans-serif",
        fontSize: "22px",
        color: "#cfe8ff",
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });

    // Tabs row
    const tabRowY = panelY - panelH / 2 + 12;
    const tabRowX = panelX - panelW / 2 + 20;
    const tabRowW = panelW - 100;
    const tabH = 34;
    const tabGap = 10;
    const tabW = tabs.length ? Math.floor((tabRowW - tabGap * (tabs.length - 1)) / tabs.length) : tabRowW;

    const tabButtons: PopupState["tabButtons"] = [];
    const tabObjects: Phaser.GameObjects.GameObject[] = [];

    const makeTab = (i: number, active: boolean) => {
      const tx = tabRowX + i * (tabW + tabGap);
      const pad = this.add
        .rectangle(tx, tabRowY, tabW, tabH, active ? 0x26365f : 0x1e2a4a, 0.95)
        .setOrigin(0, 0)
        .setStrokeStyle(2, active ? 0x66a3ff : 0x3c5a99);

      const text = this.add
        .text(tx + tabW / 2, tabRowY + tabH / 2, tabs[i].title, {
          fontFamily: "sans-serif",
          fontSize: "16px",
          color: active ? "#ffffff" : "#cfe8ff",
        })
        .setOrigin(0.5);

      const onDown = () => this.switchPopupTab(i);
      pad.setInteractive({ useHandCursor: true }).on("pointerdown", onDown);
      text.setInteractive({ useHandCursor: true }).on("pointerdown", onDown);

      tabButtons.push({ pad, text });
      tabObjects.push(pad, text);
    };

    for (let i = 0; i < tabs.length; i++) makeTab(i, i === 0);

    const dividerY = tabRowY + tabH + 14;
    const divider = this.add.rectangle(panelX, dividerY, panelW - 40, 1, 0x66a3ff, 0.6).setOrigin(0.5);

    // Viewport
    const viewportPadding = 26;
    const viewportX = panelX - panelW / 2 + viewportPadding;
    const viewportY = dividerY + 14;
    const viewportW = panelW - viewportPadding * 2 - 18;
    const viewportH = panelY + panelH / 2 - viewportPadding - viewportY;

    const viewportRect = this.add
      .rectangle(viewportX, viewportY, viewportW, viewportH, 0x000000, 0)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });

    const maskGfx = this.make.graphics({ x: 0, y: 0 });
    maskGfx.fillStyle(0xffffff).fillRect(viewportX, viewportY, viewportW, viewportH);
    maskGfx.setVisible(false);
    const mask = maskGfx.createGeometryMask();

    const content = this.add.container(viewportX, viewportY).setMask(mask);

    // Build initial content
    const contentHeight = this.buildRichTextIntoContainer(content, tabs[0]?.body ?? "", {
      maxWidth: viewportW,
      fontSize: 18,
      lineHeight: 26,
    });

    // Scrollbar
    const trackX = viewportX + viewportW + 10;
    const trackY = viewportY;
    const trackW = 6;
    const trackH = viewportH;

    const scrollTrack = this.add.rectangle(trackX, trackY, trackW, trackH, 0x3c5a99, 0.35).setOrigin(0, 0);

    const scrollThumb = this.add
      .rectangle(trackX, trackY, trackW, this.calcThumbH(trackH, contentHeight, 30), 0x66a3ff, 0.85)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });

    // Assemble container
    const container = this.add.container(0, 0, [
      overlay,
      panel,
      closeX,
      ...tabObjects,
      divider,
      scrollTrack,
      scrollThumb,
      viewportRect,
      maskGfx,
      content,
    ]);
    container.setDepth(1000).setAlpha(0);

    this.popup = {
      container,
      overlay,
      panelX,
      panelY,
      panelW,
      panelH,
      dividerY,
      viewportX,
      viewportY,
      viewportW,
      viewportH,
      trackX,
      trackY,
      trackW,
      trackH,
      closeX,
      tabs: tabs.slice(),
      tabIndex: 0,
      tabButtons,
      viewportRect,
      maskGfx,
      content,
      scrollTrack,
      scrollThumb,
      scrollY: 0,
      maxScroll: Math.max(0, contentHeight - viewportH),
      dragging: false,
      dragStartY: 0,
      scrollStartY: 0,
      thumbDragging: false,
      thumbDragStartY: 0,
      thumbStartY: 0,
      cleanup: () => {},
    };

    // Input handlers (single set)
    const wheelHandler = (_p: Phaser.Input.Pointer, _objs: any, _dx: number, dy: number) => {
      if (!this.popup) return;
      this.setPopupScroll(this.popup.scrollY + dy * 0.6);
    };

    const moveHandler = (p: Phaser.Input.Pointer) => {
      const pop = this.popup;
      if (!pop || !p.isDown) return;

      if (pop.dragging) {
        const delta = p.y - pop.dragStartY;
        this.setPopupScroll(pop.scrollStartY - delta);
      } else if (pop.thumbDragging) {
        const trackTop = pop.trackY;
        const trackBottom = pop.trackY + pop.trackH - pop.scrollThumb.height;
        const nextThumbY = Phaser.Math.Clamp(pop.thumbStartY + (p.y - pop.thumbDragStartY), trackTop, trackBottom);

        if (pop.maxScroll > 0) {
          const t = (nextThumbY - trackTop) / (trackBottom - trackTop || 1);
          this.setPopupScroll(t * pop.maxScroll);
        } else {
          this.setPopupScroll(0);
        }
      }
    };

    const upHandler = () => {
      if (!this.popup) return;
      this.popup.dragging = false;
      this.popup.thumbDragging = false;
    };

    this.input.on("wheel", wheelHandler);
    this.input.on("pointermove", moveHandler);
    this.input.on("pointerup", upHandler);

    this.popup.cleanup = () => {
      this.input.off("wheel", wheelHandler);
      this.input.off("pointermove", moveHandler);
      this.input.off("pointerup", upHandler);
    };

    // Drag scroll on viewport
    viewportRect.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (!this.popup) return;
      this.popup.dragging = true;
      this.popup.dragStartY = p.y;
      this.popup.scrollStartY = this.popup.scrollY;
    });

    // Drag thumb
    scrollThumb.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (!this.popup) return;
      this.popup.thumbDragging = true;
      this.popup.thumbDragStartY = p.y;
      this.popup.thumbStartY = scrollThumb.y;
    });

    closeX.on("pointerdown", () => this.closePopup());

    // Fade in
    this.tweens.add({ targets: container, alpha: 1, duration: 140, ease: "quad.out" });

    // Ensure initial thumb position
    this.setPopupScroll(0);
  }

  private switchPopupTab(nextIndex: number) {
    const pop = this.popup;
    if (!pop) return;
    if (nextIndex === pop.tabIndex) return;
    if (nextIndex < 0 || nextIndex >= pop.tabs.length) return;

    pop.tabIndex = nextIndex;

    // Update tab visuals
    pop.tabButtons.forEach((btn, i) => {
      const active = i === pop.tabIndex;
      btn.pad.setFillStyle(active ? 0x26365f : 0x1e2a4a, 0.95);
      btn.pad.setStrokeStyle(2, active ? 0x66a3ff : 0x3c5a99);
      btn.text.setColor(active ? "#ffffff" : "#cfe8ff");
    });

    // Rebuild content
    pop.content.removeAll(true);
    pop.content.x = pop.viewportX;
    pop.content.y = pop.viewportY;

    const body = pop.tabs[pop.tabIndex]?.body ?? "";
    const contentHeight = this.buildRichTextIntoContainer(pop.content, body, {
      maxWidth: pop.viewportW,
      fontSize: 18,
      lineHeight: 26,
    });

    pop.scrollY = 0;
    pop.maxScroll = Math.max(0, contentHeight - pop.viewportH);
    pop.scrollThumb.height = this.calcThumbH(pop.trackH, contentHeight, 30);

    this.setPopupScroll(0);
  }

  private closePopup() {
    const pop = this.popup;
    if (!pop) return;
    this.popup = undefined;

    pop.cleanup();

    this.tweens.add({
      targets: pop.container,
      alpha: 0,
      duration: 120,
      ease: "quad.in",
      onComplete: () => pop.container.destroy(true),
    });
  }

  // =========================================================
  // SCROLL
  // =========================================================
  private setPopupScroll(nextY: number) {
    const pop = this.popup;
    if (!pop) return;

    pop.scrollY = Phaser.Math.Clamp(nextY, 0, pop.maxScroll);

    // content is anchored at viewportY; we scroll upward by scrollY
    pop.content.y = pop.viewportY - pop.scrollY;

    const trackTop = pop.scrollTrack.y;
    const trackH = pop.scrollTrack.height;

    if (pop.maxScroll <= 0) {
      pop.scrollThumb.y = trackTop;
      pop.scrollThumb.height = trackH;
      return;
    }

    const thumbH = pop.scrollThumb.height;
    const trackBottom = trackTop + trackH - thumbH;
    const t = pop.scrollY / pop.maxScroll;
    pop.scrollThumb.y = Phaser.Math.Linear(trackTop, trackBottom, t);
  }

  private calcThumbH(trackH: number, contentH: number, minH: number) {
    // Same sizing behavior as your original: (trackH^2)/contentH with a minimum
    return contentH <= 0 ? trackH : Math.max(minH, (trackH * trackH) / contentH);
  }

  // =========================================================
  // RICH TEXT (markdown links) into a container
  // Supports: [label](url)
  // =========================================================
  private buildRichTextIntoContainer(
    container: Phaser.GameObjects.Container,
    raw: string,
    opts: { maxWidth: number; fontSize: number; lineHeight: number }
  ): number {
    const { maxWidth, fontSize, lineHeight } = opts;

    const baseStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: "sans-serif",
      fontSize: `${fontSize}px`,
      color: "#cfe8ff",
    };

    const linkStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: "sans-serif",
      fontSize: `${fontSize}px`,
      color: "#66a3ff",
    };

    const measurer = this.add.text(0, 0, "", baseStyle).setVisible(false);
    const spaceW = (measurer.setText(" "), measurer.width);

    let x = 0;
    let y = 0;

    const newLine = (extra = 1) => {
      x = 0;
      y += lineHeight * extra;
    };

    const addWord = (word: string, style: Phaser.Types.GameObjects.Text.TextStyle, url?: string) => {
      measurer.setStyle(style).setText(word);
      const w = measurer.width;

      if (x > 0 && x + w > maxWidth) newLine();

      const t = this.add.text(x, y, word, style).setOrigin(0, 0);

      if (url) {
        t.setInteractive({ useHandCursor: true });
        t.on("pointerdown", () => {
          if (typeof window !== "undefined") window.open(url, "_blank");
        });
        t.on("pointerover", () => t.setAlpha(0.85));
        t.on("pointerout", () => t.setAlpha(1));
      }

      container.add(t);
      x += w;
    };

    const addTokenText = (text: string, url?: string) => {
      const parts = text.split(/(\s+)/).filter(Boolean);
      const style = url ? linkStyle : baseStyle;

      for (const part of parts) {
        if (/^\s+$/.test(part)) {
          x += spaceW;
        } else {
          addWord(part, style, url);
        }
      }
    };

    const lines = raw.replace(/\r\n/g, "\n").split("\n");
    const re = /\[([^\]]+)\]\(([^)]+)\)/g;

    for (const line of lines) {
      if (!line.trim()) {
        newLine(2);
        continue;
      }

      let last = 0;
      let m: RegExpExecArray | null;

      while ((m = re.exec(line))) {
        const before = line.slice(last, m.index);
        if (before) addTokenText(before);

        addTokenText(m[1], m[2]); // label with url
        last = m.index + m[0].length;
      }

      const rest = line.slice(last);
      if (rest) addTokenText(rest);

      newLine();
    }

    measurer.destroy();
    return y + lineHeight;
  }

  // =========================================================
  // LEADERBOARD POPUP
  // =========================================================
  private openLeaderboardPopup() {
    // Open popup immediately with a loading message
    this.openTabbedPopup([{ title: "Leaderboard", body: "Laden..." }]);

    // Then fetch and replace content
    (async () => {
      try {
        const rows = await getLeaderboardKampA(100);

        if (!this.popup) return; // user closed it
        if (!rows.length) {
          this.replacePopupBody("Nog geen inzendingen. Wees de eerste!");
          return;
        }

        // Build a nice fixed-width-ish list (works with your rich-text builder)
        // We'll show newest first (already sorted)
        const lines: string[] = [];
        lines.push("Nieuwste inzendingen:\n");

        // Keep it readable; show top 50 or 100 based on fetch
        rows.forEach((r, i) => {
          const name = (r as any).name ?? "";
          const age = (r as any).age ?? "";
          // Optional date
          let dateStr = "";
          const ts = (r as any).createdAt;
          if (ts?.toDate) {
            dateStr = ts.toDate().toLocaleDateString("nl-NL", { day: "2-digit", month: "short" });
          }
          const idx = String(i + 1).padStart(2, " ");
          const ageStr = String(age).padStart(2, " ");
          const suffix = dateStr ? `  ·  ${dateStr}` : "";
          lines.push(`${idx}. ${name} (${ageStr})${suffix}`);
        });

        this.replacePopupBody(lines.join("\n"));
      } catch (err) {
        console.error("[LEADERBOARD FAILED]", err);
        if (!this.popup) return;
        this.replacePopupBody("Oeps! Het leaderboard kon niet geladen worden. Probeer het later opnieuw.");
      }
    })();
  }

  private replacePopupBody(body: string) {
    const pop = this.popup;
    if (!pop) return;

    // Keep one tab; set its body
    pop.tabs = [{ title: "Leaderboard", body }];
    pop.tabIndex = 0;

    // Hide/disable tab buttons if there are multiple from earlier calls
    // (Since we opened with one tab, there should only be one.)
    pop.tabButtons.forEach((btn, i) => {
      const active = i === 0;
      btn.pad.setFillStyle(active ? 0x26365f : 0x1e2a4a, 0.95);
      btn.pad.setStrokeStyle(2, active ? 0x66a3ff : 0x3c5a99);
      btn.text.setColor(active ? "#ffffff" : "#cfe8ff");
    });

    // Rebuild content container
    pop.content.removeAll(true);
    pop.content.x = pop.viewportX;
    pop.content.y = pop.viewportY;

    const contentHeight = this.buildRichTextIntoContainer(pop.content, body, {
      maxWidth: pop.viewportW,
      fontSize: 18,
      lineHeight: 26,
    });

    pop.scrollY = 0;
    pop.maxScroll = Math.max(0, contentHeight - pop.viewportH);
    pop.scrollThumb.height = this.calcThumbH(pop.trackH, contentHeight, 30);

    this.setPopupScroll(0);
  }


}
