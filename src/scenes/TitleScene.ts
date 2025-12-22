import Phaser from "phaser";
import { TwinklingStars } from "../utils/TwinklingStars";
import { InfoPopup } from "../utils/InfoPopup";

export default class TitleScene extends Phaser.Scene {
  private pulseTween?: Phaser.Tweens.Tween;
  private twinklingStars?: TwinklingStars;
  private infoPopup?: InfoPopup;

  constructor() {
    super("TitleScene");
  }

  create() {
    const { width, height } = this.scale;

    this.twinklingStars = new TwinklingStars(this, 140, width, height);

    this.add.text(width / 2, height * 0.28, "Dodecahedron Escape", {
      fontFamily: "sans-serif",
      fontSize: "42px",
      fontStyle: "900",
      color: "#e7f3ff",
      stroke: "#66a3ff",
      strokeThickness: 2,
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.38, "Gestrand! De zoektocht naar een wiskundige manier om weer weg te komen.", {
      fontFamily: "sans-serif",
      fontSize: "18px",
      color: "#b6d5ff",
    }).setOrigin(0.5);

    const pad = this.add.rectangle(width / 2, height * 0.65, 420, 70, 0x1e2a4a, 0.6)
      .setStrokeStyle(2, 0x3c5a99);
    const startHint = this.add.text(width / 2, height * 0.65, "Klik hier om te starten", {
      fontFamily: "sans-serif",
      fontSize: "22px",
      color: "#cfe8ff",
    }).setOrigin(0.5);

    this.pulseTween = this.tweens.add({
      targets: [pad, startHint],
      alpha: { from: 0.6, to: 1 },
      duration: 850,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
    });

    this.input.keyboard?.once("keydown-SPACE", () => this.startGame());
    
    // Version text
    const v = this.registry.get("version") ?? "";
    this.add.text(width - 12, height - 10, `v${v}`, {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#7ea7ff",
    }).setOrigin(1, 1).setAlpha(0.8);
    
    // Info button (i icon)
    const infoButton = this.add.text(12, height - 10, "ℹ️ Info", {
      fontFamily: "sans-serif",
      fontSize: "16px",
      color: "#7ea7ff",
    }).setOrigin(0, 1).setInteractive({ useHandCursor: true }).setAlpha(0.8);

    infoButton.on("pointerover", () => {
      infoButton.setAlpha(1);
      infoButton.setColor("#cfe8ff");
    });

    infoButton.on("pointerout", () => {
      infoButton.setAlpha(0.8);
      infoButton.setColor("#7ea7ff");
    });

    infoButton.on("pointerup", () => {
      this.showInfoPopup();
    });

    // Initialize info popup
    this.infoPopup = new InfoPopup(this);
    
    // Handle clicks to start game (but not on info button)
    // Check this on pointerdown before it bubbles
    let clickedOnInfo = false;
    
    infoButton.on("pointerdown", () => {
      clickedOnInfo = true;
    });
    
    this.input.on("pointerdown", () => {
      if (!clickedOnInfo) {
        this.startGame();
      }
      clickedOnInfo = false;
    });
  }

  update(_time: number, delta: number) {
    this.twinklingStars?.update(delta);
  }

  private startGame() {
    this.pulseTween?.stop();
    this.cameras.main.fadeOut(200, 0, 0, 0, (_: any, p: number) => {
      if (p === 1) this.scene.start("Face2Scene");
    });
  }

  private showInfoPopup() {
    const infoText = `Achtergrond

Stichting Vierkant voor Wiskunde organiseert al vanaf 1993 wiskundige activiteiten voor jongeren. Onder andere organiseert de stichting elk jaar wiskundezomerkampen voor groep 6 tot en met klas 6. Om dit mooie initiatief te ondersteunen, hebben de bèta-vicedecanen van de Nederlandse universiteiten in 2024 een bijdrage toegekend om de zomerkampen uit te breiden.

Je hoeft geen wiskundeheld te zijn om mee te gaan op kamp, maar wel een liefhebber van puzzels en problemen. Tijdens de kampen wordt een aantal onderwerpen met een wiskundig thema verkend, zoals veelvlakken, getallen, grafen, magische vierkanten, geheimschrift of verzamelingen. Je kunt ook aan de slag gaan met berekeningen, bouwwerken, tekeningen of kunstwerken gebaseerd op een nieuw uitdagend onderwerp. Hierbij kun je denken aan Escher-tekeningen of fractals. Naast de wiskunde is er natuurlijk ook tijd voor andere activiteiten, zoals sport, spelletjes, zwemmen en creatieve activiteiten. Er zijn twee deskundige begeleiders per groepje van 6 deelnemers, zodat iedereen voldoende meegenomen en uitgedaagd wordt.

Deze Escape Room is in 2025-2026 opgezet als prijsvraag om twintig gratis kampplaatsen weg te geven. De prijsvraag is inmiddels gesloten en de winnaars zijn op de hoogte gesteld van hun prijs. Je kunt niet meer meedoen voor de prijzen. Wel kun je de Escape Room oplossen en je naam toevoegen aan de lijst van oplossers.

Wil je alsnog mee op een van de zomerkampen van Vierkant voor Wiskunde? Meer informatie vind je op de website:
https://www.vierkantvoorwiskunde.nl/kampen/

In geval van bugs kun je deze melden via ...`;
    
    this.infoPopup?.show(infoText);
  }
}
