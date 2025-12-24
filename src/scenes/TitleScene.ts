import Phaser from "phaser";
import { TwinklingStars } from "../utils/TwinklingStars";

/**
 * Links supported as markdown:
 *  - [label](https://example.com)
 *
 * Popup supports tabs with separate bodies per tab.
 */

// -----------------------------
// TAB CONTENT
// -----------------------------
const INFO_TAB_BODY = `Deze escaperoom is gericht op leerlingen van groep 6, 7 en 8 van de basisschool die van puzzelen en logisch denken houden. Voor nu staat alleen de teaser nog online. Dit voorproefje geeft alvast een beeld van de escaperoom die in januari volledig online zal komen. Let op: als je de teaser afsluit, dan is je voortgang weg. Speel hem dus in 1x uit, of schrijf de antwoorden op zodat je de volgende keer er sneller doorheen kan.`;

const ACHTERGROND_TAB_BODY = `Stichting [Vierkant voor Wiskunde](https://www.vierkantvoorwiskunde.nl/) organiseert al vanaf 1993 wiskundige activiteiten voor jongeren. Onder andere organiseert de stichting elk jaar wiskundezomerkampen voor groep 6 tot en met klas 6. Om dit mooie initiatief te ondersteunen, hebben de [bèta-vicedecanen van de Nederlandse universiteiten](https://www.vierkantvoorwiskunde.nl/2023/10/uitbouw-van-de-vierkant-voor-wiskunde-zomerkampen/) in 2024 een bijdrage toegekend om de zomerkampen uit te breiden.

Je hoeft geen wiskundeheld te zijn om mee te gaan op kamp, maar wel een liefhebber van puzzels en problemen. Tijdens de kampen wordt een aantal onderwerpen met een wiskundig thema verkend, zoals veelvlakken, getallen, grafen, magische vierkanten, geheimschrift of verzamelingen. Je kunt ook aan de slag gaan met berekeningen, bouwwerken, tekeningen of kunstwerken gebaseerd op een nieuw uitdagend onderwerp. Hierbij kun je denken aan Escher-tekeningen of fractals. Naast de wiskunde is er natuurlijk ook tijd voor andere activiteiten, zoals sport, spelletjes, zwemmen en creatieve activiteiten. Er zijn twee deskundige begeleiders per groepje van 6 deelnemers, zodat iedereen voldoende meegenomen en uitgedaagd wordt.

In 2024-2025 is de eerste escaperoom opgezet als prijsvraag om twintig gratis kampplaatsen weg te geven voor klas 1, 2 en 3 van de middelbare school. De escaperoom voor 2025-2026 is gericht op leerlingen uit groep 6, 7 en 8 van de basisschool, zij kunnen ook gratis kampplaatsen winnen door het oplossen van de escaperoom.

Wil je mee op een van de zomerkampen van Vierkant voor Wiskunde? Meer informatie vind je op de website: [Vierkant voor Wiskunde](https://www.vierkantvoorwiskunde.nl/kampen/)
Bekijk ook onze [homepagina](https://www.vierkantvoorwiskunde.nl/).`;

const CONTACT_TAB_BODY = `Makers escaperoom 2025-2026:
- Verhaal en Raadsels: Sonja Lakovleva & Moniek Messink
- Programmering: Daniël Wielenga, Misha Stassen, Robin van Hoorn
- Illustraties: Gegenereerd met AI.

Bugs kunnen worden gemeld via [escaperoom@vierkantvoorwiskunde.nl](mailto:escaperoom@vierkantvoorwiskunde.nl)
`;

// -----------------------------
// SCENE
// -----------------------------
export default class TitleScene extends Phaser.Scene {
  private twinklingStars?: TwinklingStars;
  private isStarting = false;

  // Popup refs
  private popupContainer?: Phaser.GameObjects.Container;

  // Scrollable inner content
  private popupContent?: Phaser.GameObjects.Container;
  private popupViewportRect?: Phaser.GameObjects.Rectangle;
  private popupScrollThumb?: Phaser.GameObjects.Rectangle;
  private popupScrollTrack?: Phaser.GameObjects.Rectangle;

  private popupScrollY = 0;
  private popupMaxScroll = 0;

  // Tab refs/state
  private popupTabIndex = 0;
  private popupTabs: Array<{ title: string; body: string }> = [];
  private popupTabButtons: Array<{
    pad: Phaser.GameObjects.Rectangle;
    text: Phaser.GameObjects.Text;
  }> = [];

  // Cached layout values for rebuild on tab switch
  private popupLayout?: {
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
  };

  constructor() {
    super("TitleScene");
  }

  create() {
    const { width, height } = this.scale;

    this.twinklingStars = new TwinklingStars(this, 140, width, height);

    this.add
      .text(width / 2, height * 0.28, "Verzamelmania op Dezonia!", {
        fontFamily: "sans-serif",
        fontSize: "42px",
        fontStyle: "900",
        color: "#e7f3ff",
        stroke: "#66a3ff",
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    this.add
      .text(
        width / 2,
        height * 0.38,
        "Lukt het jou om terug te keren naar Aarde?",
        {
          fontFamily: "sans-serif",
          fontSize: "18px",
          color: "#b6d5ff",
        }
      )
      .setOrigin(0.5);

    // =========================================================
    // BUTTON LAYOUT (equal size + aligned vertically)
    // =========================================================
    const btnX = width / 2;
    const firstBtnY = height * 0.62;
    const btnGap = 18;

    const BTN_W = 420;
    const BTN_H = 70;

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
    this.startGame();
  }

  private startGame() {
    this.cameras.main.fadeOut(200, 0, 0, 0, (_: any, p: number) => {
      if (p === 1) this.scene.start("Face1Scene");
    });
  }

  // =========================================================
  // REUSABLE MENU BUTTON FACTORY
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
      .text(x, y, label, {
        fontFamily: "sans-serif",
        fontSize: "22px",
        color: "#cfe8ff",
      })
      .setOrigin(0.5);

    pad.setInteractive({ useHandCursor: true });
    text.setInteractive({ useHandCursor: true });

    const canInteract = () => !(lockWhenStarting && this.isStarting);

    const setHover = (hovered: boolean) => {
      if (!canInteract()) return;

      if (hovered) {
        pad.setFillStyle(0x26365f, 0.95);
        pad.setStrokeStyle(2, 0x66a3ff);
        text.setColor("#ffffff");
      } else {
        pad.setFillStyle(0x1e2a4a, 0.85);
        pad.setStrokeStyle(2, 0x3c5a99);
        text.setColor("#cfe8ff");
      }
    };

    const pressUp = () => {
      if (!canInteract()) return;
      this.tweens.add({
        targets: [pad, text],
        scale: 1.0,
        duration: 110,
        ease: "quad.out",
      });
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
      obj.on("pointerover", () => setHover(true));
      obj.on("pointerout", () => setHover(false));
      obj.on("pointerup", () => {
        pressUp();
        click();
      });
      obj.on("pointerupoutside", () => {
        pressUp();
        setHover(false);
      });
    };

    hook(pad);
    hook(text);

    return { pad, text };
  }

  // =========================================================
  // POPUP (modal) - closable + scrollable + links + tabs
  // =========================================================
  private openTabbedPopup(tabs: Array<{ title: string; body: string }>) {
    if (this.popupContainer) return;

    const { width, height } = this.scale;

    // Bigger popup
    const panelW = Math.min(760, width * 0.9);
    const panelH = Math.min(560, height * 0.82);
    const panelX = width / 2;
    const panelY = height / 2;

    this.popupTabs = tabs.slice();
    this.popupTabIndex = 0;
    this.popupTabButtons = [];

    // Overlay
    const overlay = this.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.6)
      .setInteractive();

    // Panel bg
    const panel = this.add
      .rectangle(panelX, panelY, panelW, panelH, 0x111a2e, 0.96)
      .setStrokeStyle(2, 0x66a3ff);


    // Close X
    const closeX = this.add
      .text(panelX + panelW / 2 - 18, panelY - panelH / 2 + 12, "✕", {
        fontFamily: "sans-serif",
        fontSize: "22px",
        color: "#cfe8ff",
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });

    // ---- Tabs row
    const tabRowY = panelY - panelH / 2 + 12;
    const tabRowX = panelX - panelW / 2 + 20;
    const tabRowW = panelW - 100;

    const tabH = 34;
    const tabGap = 10;
    const tabW =
      tabs.length <= 0
        ? tabRowW
        : Math.floor((tabRowW - tabGap * (tabs.length - 1)) / tabs.length);

    const tabObjects: Phaser.GameObjects.GameObject[] = [];

    for (let i = 0; i < tabs.length; i++) {
      const tx = tabRowX + i * (tabW + tabGap);
      const isActive = i === this.popupTabIndex;

      const pad = this.add
        .rectangle(tx, tabRowY, tabW, tabH, isActive ? 0x26365f : 0x1e2a4a, 0.95)
        .setOrigin(0, 0)
        .setStrokeStyle(2, isActive ? 0x66a3ff : 0x3c5a99);

      const text = this.add
        .text(tx + tabW / 2, tabRowY + tabH / 2, tabs[i].title, {
          fontFamily: "sans-serif",
          fontSize: "16px",
          color: isActive ? "#ffffff" : "#cfe8ff",
        })
        .setOrigin(0.5);

      pad.setInteractive({ useHandCursor: true });
      text.setInteractive({ useHandCursor: true });

      const hook = (obj: Phaser.GameObjects.GameObject) => {
        obj.on("pointerdown", () => {
          this.switchPopupTab(i);
        });
      };

      hook(pad);
      hook(text);

      this.popupTabButtons.push({ pad, text });
      tabObjects.push(pad, text);
    }

    // Divider line under tabs
    const dividerY = tabRowY + tabH + 14;
    const divider = this.add
      .rectangle(panelX, dividerY, panelW - 40, 1, 0x66a3ff, 0.6)
      .setOrigin(0.5, 0.5);

    // Viewport area (scroll area) inside panel
    const viewportPadding = 26;
    const viewportX = panelX - panelW / 2 + viewportPadding;
    const viewportY = dividerY + 14;
    const viewportW = panelW - viewportPadding * 2 - 18; // leave room for scrollbar
    const viewportH = panelY + panelH / 2 - viewportPadding - viewportY;

    // Invisible rectangle defining viewport (also used for drag scrolling)
    const viewportRect = this.add
      .rectangle(viewportX, viewportY, viewportW, viewportH, 0x000000, 0)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });

    // Mask graphics for clipping
    const maskGfx = this.make.graphics({ x: 0, y: 0 });
    maskGfx.fillStyle(0xffffff);
    maskGfx.fillRect(viewportX, viewportY, viewportW, viewportH);
    const mask = maskGfx.createGeometryMask();
    maskGfx.setVisible(false);

    // Content container (scrolls)
    const content = this.add.container(viewportX, viewportY);
    content.setMask(mask);

    // Build content for initial tab
    const initialBody = this.popupTabs[this.popupTabIndex]?.body ?? "";
    const contentHeight = this.buildRichTextIntoContainer(content, initialBody, {
      maxWidth: viewportW,
      fontSize: 18,
      lineHeight: 26,
    });

    // Compute scroll range
    this.popupScrollY = 0;
    this.popupMaxScroll = Math.max(0, contentHeight - viewportH);

    // Scrollbar
    const trackX = viewportX + viewportW + 10;
    const trackY = viewportY;
    const trackW = 6;
    const trackH = viewportH;

    const scrollTrack = this.add
      .rectangle(trackX, trackY, trackW, trackH, 0x3c5a99, 0.35)
      .setOrigin(0, 0);

    const thumbMinH = 30;
    const thumbH =
      this.popupMaxScroll <= 0
        ? trackH
        : Math.max(thumbMinH, (trackH * trackH) / (contentHeight || 1));

    const scrollThumb = this.add
      .rectangle(trackX, trackY, trackW, thumbH, 0x66a3ff, 0.85)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });

    // Cache layout for tab rebuild
    this.popupLayout = {
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
    };

    // Container for everything
    this.popupContainer = this.add.container(0, 0, [
      overlay,
      panel,
      closeX,
      ...tabObjects,
      divider,
      scrollTrack,
      scrollThumb,
      viewportRect,
      maskGfx, // keep alive
      content,
    ]);
    this.popupContainer.setDepth(1000);

    // Save refs for scrolling handlers
    this.popupContent = content;
    this.popupViewportRect = viewportRect;
    this.popupScrollThumb = scrollThumb;
    this.popupScrollTrack = scrollTrack;

    // Close handlers
    closeX.on("pointerdown", () => this.closePopup());

    // Wheel scroll (only while popup open)
    const wheelHandler = (
      _pointer: Phaser.Input.Pointer,
      _objs: any,
      _dx: number,
      dy: number
    ) => {
      if (!this.popupContainer) return;
      // dy > 0 => scroll down
      this.setPopupScroll(this.popupScrollY + dy * 0.6);
    };
    this.input.on("wheel", wheelHandler);

    // Drag scroll in viewport
    let dragging = false;
    let dragStartY = 0;
    let scrollStartY = 0;

    viewportRect.on("pointerdown", (p: Phaser.Input.Pointer) => {
      dragging = true;
      dragStartY = p.y;
      scrollStartY = this.popupScrollY;
    });

    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (!this.popupContainer) return;
      if (!dragging) return;
      if (!p.isDown) return;

      const delta = p.y - dragStartY;
      this.setPopupScroll(scrollStartY - delta);
    });

    this.input.on("pointerup", () => {
      dragging = false;
    });

    // Drag thumb
    let thumbDragging = false;
    let thumbDragStart = 0;
    let thumbStartY = 0;

    scrollThumb.on("pointerdown", (p: Phaser.Input.Pointer) => {
      thumbDragging = true;
      thumbDragStart = p.y;
      thumbStartY = scrollThumb.y;
    });

    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (!this.popupContainer) return;
      if (!thumbDragging) return;
      if (!p.isDown) return;

      const trackTop = trackY;
      const trackBottom = trackY + trackH - scrollThumb.height;
      const nextThumbY = Phaser.Math.Clamp(
        thumbStartY + (p.y - thumbDragStart),
        trackTop,
        trackBottom
      );

      // Convert thumb position to scroll position
      if (this.popupMaxScroll > 0) {
        const t = (nextThumbY - trackTop) / (trackBottom - trackTop || 1);
        this.setPopupScroll(t * this.popupMaxScroll);
      } else {
        this.setPopupScroll(0);
      }
    });

    this.input.on("pointerup", () => {
      thumbDragging = false;
    });

    // Store cleanup on container for close
    (this.popupContainer as any).__cleanup = () => {
      this.input.off("wheel", wheelHandler);
      dragging = false;
      thumbDragging = false;
    };

    // Fade in
    this.popupContainer.setAlpha(0);
    this.tweens.add({
      targets: this.popupContainer,
      alpha: 1,
      duration: 140,
      ease: "quad.out",
    });

    // Ensure initial thumb state
    this.setPopupScroll(0);
  }

  private switchPopupTab(nextIndex: number) {
    if (!this.popupContainer) return;
    if (nextIndex === this.popupTabIndex) return;
    if (nextIndex < 0 || nextIndex >= this.popupTabs.length) return;

    this.popupTabIndex = nextIndex;

    // Update tab visuals
    for (let i = 0; i < this.popupTabButtons.length; i++) {
      const isActive = i === this.popupTabIndex;
      const btn = this.popupTabButtons[i];
      btn.pad.setFillStyle(isActive ? 0x26365f : 0x1e2a4a, 0.95);
      btn.pad.setStrokeStyle(2, isActive ? 0x66a3ff : 0x3c5a99);
      btn.text.setColor(isActive ? "#ffffff" : "#cfe8ff");
    }

    // Rebuild scroll content
    if (!this.popupContent || !this.popupLayout) return;

    // Remove and destroy previous children
    const oldChildren = this.popupContent.list.slice();
    this.popupContent.removeAll(true);
    for (const ch of oldChildren) {
      // removeAll(true) should destroy, but keep safe if Phaser config differs
      if (ch && (ch as any).destroy && !(ch as any).destroyed) (ch as any).destroy();
    }

    // Reset content position (container itself is anchored to viewportX/Y)
    this.popupContent.x = this.popupLayout.viewportX;
    this.popupContent.y = this.popupLayout.viewportY;

    // Build new tab body
    const body = this.popupTabs[this.popupTabIndex]?.body ?? "";
    const contentHeight = this.buildRichTextIntoContainer(this.popupContent, body, {
      maxWidth: this.popupLayout.viewportW,
      fontSize: 18,
      lineHeight: 26,
    });

    // Recompute scroll range and thumb sizing
    this.popupScrollY = 0;
    this.popupMaxScroll = Math.max(0, contentHeight - this.popupLayout.viewportH);

    if (this.popupScrollTrack && this.popupScrollThumb) {
      const trackH = this.popupScrollTrack.height;
      const thumbMinH = 30;

      const thumbH =
        this.popupMaxScroll <= 0
          ? trackH
          : Math.max(thumbMinH, (trackH * trackH) / (contentHeight || 1));

      this.popupScrollThumb.height = thumbH;
    }

    // Apply scroll (will also update thumb)
    this.setPopupScroll(0);
  }

  private closePopup() {
    if (!this.popupContainer) return;

    const c = this.popupContainer;
    this.popupContainer = undefined;

    // Cleanup input listeners
    const cleanup = (c as any).__cleanup as undefined | (() => void);
    cleanup?.();

    // Clear refs
    this.popupContent = undefined;
    this.popupViewportRect = undefined;
    this.popupScrollThumb = undefined;
    this.popupScrollTrack = undefined;
    this.popupLayout = undefined;

    this.popupTabs = [];
    this.popupTabButtons = [];
    this.popupTabIndex = 0;

    this.popupScrollY = 0;
    this.popupMaxScroll = 0;

    this.tweens.add({
      targets: c,
      alpha: 0,
      duration: 120,
      ease: "quad.in",
      onComplete: () => c.destroy(true),
    });
  }

  // =========================================================
  // SCROLL IMPLEMENTATION
  // =========================================================
  private setPopupScroll(nextY: number) {
    if (!this.popupContent || !this.popupScrollThumb || !this.popupScrollTrack) return;
    if (!this.popupViewportRect) return;

    this.popupScrollY = Phaser.Math.Clamp(nextY, 0, this.popupMaxScroll);

    // Move content up as you scroll down
    this.popupContent.y = (this.popupViewportRect.y as number) - this.popupScrollY;

    // Update thumb
    const trackTop = this.popupScrollTrack.y;
    const trackH = this.popupScrollTrack.height;
    const thumbH = this.popupScrollThumb.height;

    if (this.popupMaxScroll <= 0) {
      this.popupScrollThumb.y = trackTop;
      this.popupScrollThumb.height = trackH;
      return;
    }

    const trackBottom = trackTop + trackH - thumbH;
    const t = this.popupScrollY / this.popupMaxScroll;
    this.popupScrollThumb.y = Phaser.Math.Linear(trackTop, trackBottom, t);
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

    // A hidden measurer text object for accurate width measurements
    const measurer = this.add.text(0, 0, "", baseStyle).setVisible(false);

    // Parse into tokens: words + link tokens + newlines
    // We keep blank lines too.
    const paragraphs = raw.replace(/\r\n/g, "\n").split("\n");

    let x = 0;
    let y = 0;

    const pushNewLine = () => {
      x = 0;
      y += lineHeight;
    };

    const spaceW = (() => {
      measurer.setText(" ");
      return measurer.width;
    })();

    const addToken = (token: { text: string; url?: string }) => {
      // Split token.text by spaces, but keep it as words for wrapping.
      const parts = token.text.split(/(\s+)/).filter((p) => p.length > 0);

      for (const part of parts) {
        const isSpace = /^\s+$/.test(part);
        if (isSpace) {
          x += spaceW;
          continue;
        }

        const style = token.url ? linkStyle : baseStyle;
        measurer.setStyle(style);
        measurer.setText(part);
        const w = measurer.width;

        // Wrap if needed (and not at start)
        if (x > 0 && x + w > maxWidth) {
          pushNewLine();
        }

        const t = this.add.text(x, y, part, style).setOrigin(0, 0);

        if (token.url) {
          t.setInteractive({ useHandCursor: true });
          t.on("pointerdown", () => {
            // Open link in new tab (web build)
            if (typeof window !== "undefined") window.open(token.url, "_blank");
          });

          // simple hover effect
          t.on("pointerover", () => t.setAlpha(0.85));
          t.on("pointerout", () => t.setAlpha(1));
        }

        container.add(t);
        x += w;
      }
    };

    for (let i = 0; i < paragraphs.length; i++) {
      const line = paragraphs[i];

      // Empty line => blank line spacing
      if (line.trim().length === 0) {
        pushNewLine();
        pushNewLine(); // extra gap for paragraph breaks
        continue;
      }

      // Find markdown links in this line
      // pattern: [label](url)
      const re = /\[([^\]]+)\]\(([^)]+)\)/g;
      let lastIndex = 0;
      let m: RegExpExecArray | null;

      while ((m = re.exec(line)) !== null) {
        const before = line.slice(lastIndex, m.index);
        if (before.length > 0) addToken({ text: before });

        const label = m[1];
        const url = m[2];
        addToken({ text: label, url });

        lastIndex = m.index + m[0].length;
      }

      const rest = line.slice(lastIndex);
      if (rest.length > 0) addToken({ text: rest });

      pushNewLine();
    }

    measurer.destroy();

    // Return total content height
    return y + lineHeight;
  }
}
