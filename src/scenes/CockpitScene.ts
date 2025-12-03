import Phaser from "phaser";
import { TwinklingStars } from "../utils/TwinklingStars";

export default class CockpitScene extends Phaser.Scene {
  private stars?: TwinklingStars;
  private energyLevel: number = 50; // 0-100
  private lampStates: Record<string, boolean> = {
    stroom: true,
    waarschuwing: false,
    brandstof: true,
    zuurstof: true,
    motor: true,
    schild: false,
    deuren: true,
  };

  // Navigation
  private destinations: string[] = ["DEZONIA", "CALCULON", "MATHORIA", "AARDE", "PROXIMA 7", "HEINO"];
  private distances: Record<string, number> = {
    "DEZONIA": 0,        // HIER - gestrand bij deze planeet
    "CALCULON": 850,     // Dichtbij wiskunde-planeet
    "MATHORIA": 2400,    // Nabije planeet met puzzels
    "AARDE": 785000,     // Ver van huis!
    "PROXIMA 7": 450000, // Ergens halverwege
    "HEINO": 785042,     // Op aarde, dus net zo ver + 42 ;)
  };
  private selectedDestination: number = 0;

  // Interactive elements
  private energyBar?: Phaser.GameObjects.Graphics;
  private lamps: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private needle?: Phaser.GameObjects.Graphics;

  constructor() {
    super("CockpitScene");
  }

  create() {
    const { width, height } = this.scale;

    console.log("[CockpitScene] create() called");

    // Background color (dark space)
    this.cameras.main.setBackgroundColor("#050510");

    // Starfield visible through windows
    this.stars = new TwinklingStars(this, 150, width, height);
    // Set stars to back layer (depth 0)
    this.stars.graphics.setDepth(0);
    console.log("[CockpitScene] stars created");

    // Draw cockpit elements (back to front)
    // Windows go on top of stars but behind dashboard
    console.log("[CockpitScene] drawing windows");
    this.drawCockpitWindows(width, height);
    console.log("[CockpitScene] drawing dashboard");
    this.drawDashboard(width, height);
    console.log("[CockpitScene] drawing instruments");
    this.drawInstruments(width, height);
    console.log("[CockpitScene] drawing stick control");
    this.drawStickControl(width, height);
    console.log("[CockpitScene] create() complete");

    // Test: Press SPACE to toggle warning lamp
    this.input.keyboard!.on("keydown-SPACE", () => {
      this.lampStates.waarschuwing = !this.lampStates.waarschuwing;
      this.updateLamps();
    });

    // Navigation controls: W/S or UP/DOWN
    this.input.keyboard!.on("keydown-W", () => {
      this.selectedDestination = Math.max(0, this.selectedDestination - 1);
      this.updateNavigationPanel();
    });

    this.input.keyboard!.on("keydown-S", () => {
      this.selectedDestination = Math.min(this.destinations.length - 1, this.selectedDestination + 1);
      this.updateNavigationPanel();
    });

    this.input.keyboard!.on("keydown-UP", () => {
      this.selectedDestination = Math.max(0, this.selectedDestination - 1);
      this.updateNavigationPanel();
    });

    this.input.keyboard!.on("keydown-DOWN", () => {
      this.selectedDestination = Math.min(this.destinations.length - 1, this.selectedDestination + 1);
      this.updateNavigationPanel();
    });

    // Set course with ENTER or E
    this.input.keyboard!.on("keydown-ENTER", () => {
      console.log(`Koers ingesteld naar: ${this.destinations[this.selectedDestination]}`);
    });

    this.input.keyboard!.on("keydown-E", () => {
      console.log(`Koers ingesteld naar: ${this.destinations[this.selectedDestination]}`);
    });
  }

  private drawCockpitWindows(width: number, height: number) {
    const gfx = this.add.graphics();
    gfx.setDepth(1); // Above stars (depth 0)

    // Main viewport window (trapezoid shape)
    const windowTop = 80;
    const windowBottom = height * 0.5;

    // Panel dividers (semi-transparent dark lines over stars)
    gfx.lineStyle(4, 0x1a1a2e, 0.8);
    gfx.lineBetween(width * 0.33, windowTop, width * 0.3, windowBottom);
    gfx.lineBetween(width * 0.66, windowTop, width * 0.7, windowBottom);

    // Horizontal bar
    gfx.lineBetween(width * 0.05, windowBottom - 30, width * 0.95, windowBottom - 30);

    // Frame edges (thicker, more prominent)
    gfx.lineStyle(6, 0x2d2d44, 1);
    gfx.beginPath();
    gfx.moveTo(width * 0.15, windowTop);
    gfx.lineTo(width * 0.85, windowTop);
    gfx.lineTo(width * 0.95, windowBottom);
    gfx.lineTo(width * 0.05, windowBottom);
    gfx.closePath();
    gfx.strokePath();
  }

  private drawDashboard(width: number, height: number) {
    const gfx = this.add.graphics();
    gfx.setDepth(2); // Above windows
    const dashTop = height * 0.5;

    // Main dashboard background
    gfx.fillStyle(0x16213e, 1);
    gfx.fillRect(0, dashTop, width, height - dashTop);

    // Dashboard sections
    gfx.fillStyle(0x1a1a2e, 1);

    // Left panel (status lamps) - 18%
    const leftPanelW = width * 0.18;
    gfx.fillRect(20, dashTop + 20, leftPanelW, 180);

    // Center panel (navigation) - 45%, taller
    const centerPanelX = 20 + leftPanelW + 20;
    const centerPanelW = width * 0.45;
    gfx.fillRect(centerPanelX, dashTop + 20, centerPanelW, 180);

    // Right panel (energy + gauge) - 25%
    const rightPanelX = centerPanelX + centerPanelW + 20;
    const rightPanelW = width - rightPanelX - 20;
    gfx.fillRect(rightPanelX, dashTop + 20, rightPanelW, 180);

    // Panel borders
    gfx.lineStyle(2, 0x0e7490, 0.8);
    gfx.strokeRect(20, dashTop + 20, leftPanelW, 180);
    gfx.strokeRect(centerPanelX, dashTop + 20, centerPanelW, 180);
    gfx.strokeRect(rightPanelX, dashTop + 20, rightPanelW, 180);
  }

  private drawInstruments(width: number, height: number) {
    const dashTop = height * 0.5;
    const leftPanelW = width * 0.18;
    const centerPanelX = 20 + leftPanelW + 20;
    const centerPanelW = width * 0.45;
    const rightPanelX = centerPanelX + centerPanelW + 20;
    const rightPanelW = width - rightPanelX - 20;

    // LEFT PANEL: Status lamps
    this.drawLamps(35, dashTop + 35, width, height);

    // CENTER PANEL: Navigation
    this.drawNavigationPanel(centerPanelX, dashTop + 20, centerPanelW, 180);

    // RIGHT PANEL: Energy meter + Gauge
    this.drawEnergyMeter(rightPanelX + 10, dashTop + 35, rightPanelW - 20);
    this.drawGauge(rightPanelX + rightPanelW / 2, dashTop + 130, 35);
  }

  private drawLamps(x: number, y: number, width: number, height: number) {
    const lampNames = ["stroom", "waarschuwing", "brandstof", "zuurstof", "motor", "schild", "deuren"];
    const lampLabels = {
      stroom: "STROOM",
      waarschuwing: "ALARM",
      brandstof: "BRANDSTOF",
      zuurstof: "ZUURSTOF",
      motor: "MOTOR",
      schild: "SCHILD",
      deuren: "DEUREN",
    };
    const lampColors = {
      stroom: 0x00ff00,
      waarschuwing: 0xff0000,
      brandstof: 0xffaa00,
      zuurstof: 0x00ddff,
      motor: 0x00ff88,
      schild: 0x0099ff,
      deuren: 0xffff00,
    };

    lampNames.forEach((name, idx) => {
      const lampY = y + idx * 24;

      // Lamp circle
      const lamp = this.add.graphics();
      lamp.setDepth(3); // Above dashboard
      const isOn = this.lampStates[name];
      const color = isOn ? lampColors[name as keyof typeof lampColors] : 0x333333;
      const alpha = isOn ? 1 : 0.3;

      lamp.fillStyle(color, alpha);
      lamp.fillCircle(x, lampY, 6);

      if (isOn) {
        // Glow effect
        lamp.fillStyle(color, 0.3);
        lamp.fillCircle(x, lampY, 10);
      }

      this.lamps.set(name, lamp);

      // Label
      this.add.text(x + 16, lampY - 6, lampLabels[name as keyof typeof lampLabels], {
        fontSize: "11px",
        color: isOn ? "#ffffff" : "#666666",
      }).setDepth(3);
    });
  }

  private drawNavigationPanel(x: number, y: number, w: number, h: number) {
    // Title
    this.add.text(x + w / 2, y + 10, "⚡ NAVIGATIE ⚡", {
      fontSize: "16px",
      color: "#00ff88",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(3);

    // Destinations list
    const listY = y + 40;
    const itemHeight = 22;

    this.destinations.forEach((dest, idx) => {
      const itemY = listY + idx * itemHeight;
      const isSelected = idx === this.selectedDestination;

      // Selection indicator (arrow)
      if (isSelected) {
        this.add.text(x + 15, itemY, "▶", {
          fontSize: "14px",
          color: "#ffaa00",
        }).setOrigin(0, 0.5).setDepth(3).setName(`nav-arrow`);
      }

      // Destination text
      const destText = this.add.text(x + 35, itemY, dest, {
        fontSize: isSelected ? "15px" : "13px",
        color: isSelected ? "#ffffff" : "#888888",
        fontStyle: isSelected ? "bold" : "normal",
      }).setOrigin(0, 0.5).setDepth(3).setName(`nav-dest-${idx}`);

      // Distance indicator
      if (isSelected) {
        const distance = this.distances[dest];
        const distText = distance === 0 ? "HIER" : distance < 1000 ? `${distance} km` : `${Math.floor(distance / 1000)}k km`;
        this.add.text(x + w - 20, itemY, distText, {
          fontSize: "11px",
          color: "#00ff88",
        }).setOrigin(1, 0.5).setDepth(3).setName(`nav-dist-${idx}`);
      }
    });

    // "SET COURSE" button at bottom
    const buttonY = y + h - 25;
    const buttonBg = this.add.graphics();
    buttonBg.setDepth(3);
    buttonBg.fillStyle(0x00ff88, 0.2);
    buttonBg.fillRoundedRect(x + 20, buttonY - 10, w - 40, 25, 5);
    buttonBg.lineStyle(2, 0x00ff88, 1);
    buttonBg.strokeRoundedRect(x + 20, buttonY - 10, w - 40, 25, 5);

    this.add.text(x + w / 2, buttonY + 2, "STEL KOERS IN", {
      fontSize: "13px",
      color: "#00ff88",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(3);
  }

  private drawEnergyMeter(x: number, y: number, maxWidth: number) {
    // Label
    this.add.text(x, y - 22, "ENERGIE", {
      fontSize: "13px",
      color: "#00ff88",
    }).setDepth(3);

    // Meter background
    const meterBg = this.add.graphics();
    meterBg.setDepth(3);
    meterBg.fillStyle(0x0a0a0a, 1);
    meterBg.fillRect(x, y, maxWidth, 30);
    meterBg.lineStyle(2, 0x00ff88, 0.6);
    meterBg.strokeRect(x, y, maxWidth, 30);

    // Energy bar (dynamic)
    this.energyBar = this.add.graphics();
    this.energyBar.setDepth(3);
    this.updateEnergyBar();
  }

  private updateEnergyBar() {
    if (!this.energyBar) return;

    const { width, height } = this.scale;
    const dashTop = height * 0.5;
    const leftPanelW = width * 0.18;
    const centerPanelX = 20 + leftPanelW + 20;
    const centerPanelW = width * 0.45;
    const rightPanelX = centerPanelX + centerPanelW + 20;
    const rightPanelW = width - rightPanelX - 20;

    const x = rightPanelX + 10;
    const y = dashTop + 35;
    const maxWidth = rightPanelW - 20;

    this.energyBar.clear();

    const barWidth = (this.energyLevel / 100) * maxWidth;
    let color = 0x00ff00;
    if (this.energyLevel < 30) color = 0xff0000;
    else if (this.energyLevel < 60) color = 0xffaa00;

    this.energyBar.fillStyle(color, 0.8);
    this.energyBar.fillRect(x + 2, y + 2, barWidth - 4, 26);

    // Percentage text
    const percentage = Math.round(this.energyLevel);
    // Remove old text if exists
    const oldText = this.children.getByName("energyText");
    if (oldText) oldText.destroy();

    this.add
      .text(x + maxWidth / 2, y + 15, `${percentage}%`, {
        fontSize: "18px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setName("energyText")
      .setDepth(3);
  }

  private drawGauge(cx: number, cy: number, radius: number) {
    const gfx = this.add.graphics();
    gfx.setDepth(3);

    // Gauge circle background
    gfx.fillStyle(0x0a0a0a, 1);
    gfx.fillCircle(cx, cy, radius);
    gfx.lineStyle(2, 0x0099ff, 0.6);
    gfx.strokeCircle(cx, cy, radius);

    // Center dot
    gfx.fillStyle(0x0099ff, 1);
    gfx.fillCircle(cx, cy, 3);

    // Needle (rotatable)
    this.needle = this.add.graphics();
    this.needle.setDepth(3);
    this.updateNeedle(cx, cy, radius, 45); // Initial angle

    // Animate needle
    this.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => {
        const angle = Math.sin(this.time.now / 1000) * 60 + 90;
        this.updateNeedle(cx, cy, radius, angle);
      },
    });

    // Label
    this.add
      .text(cx, cy + radius + 12, "SNELHEID", {
        fontSize: "10px",
        color: "#0099ff",
      })
      .setOrigin(0.5)
      .setDepth(3);
  }

  private updateNeedle(cx: number, cy: number, radius: number, angleDeg: number) {
    if (!this.needle) return;

    this.needle.clear();
    this.needle.lineStyle(2, 0x00ffff, 1);

    const angleRad = Phaser.Math.DegToRad(angleDeg - 90);
    const endX = cx + Math.cos(angleRad) * (radius - 5);
    const endY = cy + Math.sin(angleRad) * (radius - 5);

    this.needle.lineBetween(cx, cy, endX, endY);
  }

  private updateLamps() {
    this.lamps.forEach((lamp, name) => {
      lamp.clear();
      const isOn = this.lampStates[name];
      const lampColors = {
        stroom: 0x00ff00,
        waarschuwing: 0xff0000,
        brandstof: 0xffaa00,
        zuurstof: 0x00ddff,
        motor: 0x00ff88,
        schild: 0x0099ff,
        deuren: 0xffff00,
      };
      const color = isOn ? lampColors[name as keyof typeof lampColors] : 0x333333;
      const alpha = isOn ? 1 : 0.3;

      // Get position from existing graphics
      const x = 35;
      const y = this.scale.height * 0.5 + 35 + Array.from(this.lamps.keys()).indexOf(name) * 24;

      lamp.fillStyle(color, alpha);
      lamp.fillCircle(x, y, 6);

      if (isOn) {
        lamp.fillStyle(color, 0.3);
        lamp.fillCircle(x, y, 10);
      }
    });
  }

  private updateNavigationPanel() {
    // Remove old navigation text elements
    this.children.getAll().forEach((child) => {
      if (child.name && child.name.startsWith("nav-")) {
        child.destroy();
      }
    });

    // Redraw navigation panel
    const { width, height } = this.scale;
    const dashTop = height * 0.5;
    const leftPanelW = width * 0.18;
    const centerPanelX = 20 + leftPanelW + 20;
    const centerPanelW = width * 0.45;

    const x = centerPanelX;
    const y = dashTop + 20;
    const w = centerPanelW;
    const listY = y + 40;
    const itemHeight = 22;

    this.destinations.forEach((dest, idx) => {
      const itemY = listY + idx * itemHeight;
      const isSelected = idx === this.selectedDestination;

      // Selection indicator (arrow)
      if (isSelected) {
        this.add.text(x + 15, itemY, "▶", {
          fontSize: "14px",
          color: "#ffaa00",
        }).setOrigin(0, 0.5).setDepth(3).setName(`nav-arrow`);
      }

      // Destination text
      this.add.text(x + 35, itemY, dest, {
        fontSize: isSelected ? "15px" : "13px",
        color: isSelected ? "#ffffff" : "#888888",
        fontStyle: isSelected ? "bold" : "normal",
      }).setOrigin(0, 0.5).setDepth(3).setName(`nav-dest-${idx}`);

      // Distance indicator (only for selected)
      if (isSelected) {
        const distance = this.distances[dest];
        const distText = distance === 0 ? "HIER" : distance < 1000 ? `${distance} km` : `${Math.floor(distance / 1000)}k km`;
        this.add.text(x + w - 20, itemY, distText, {
          fontSize: "11px",
          color: "#00ff88",
        }).setOrigin(1, 0.5).setDepth(3).setName(`nav-dist-${idx}`);
      }
    });
  }

  private drawStickControl(width: number, height: number) {
    const gfx = this.add.graphics();
    gfx.setDepth(3);
    const cx = width / 2;
    const cy = height - 80;

    // Base
    gfx.fillStyle(0x2d2d44, 1);
    gfx.fillRect(cx - 30, cy + 30, 60, 20);

    // Stick
    gfx.fillStyle(0x444455, 1);
    gfx.fillRect(cx - 8, cy - 30, 16, 60);

    // Grip
    gfx.fillStyle(0xff6b35, 1);
    gfx.fillCircle(cx, cy - 30, 15);

    // Grip detail
    gfx.lineStyle(2, 0x333344, 1);
    for (let i = 0; i < 3; i++) {
      gfx.lineBetween(cx - 10, cy - 35 + i * 8, cx + 10, cy - 35 + i * 8);
    }

  }

  update() {
    this.stars?.update();
  }
}
