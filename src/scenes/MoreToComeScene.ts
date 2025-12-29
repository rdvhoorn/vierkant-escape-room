import Phaser from "phaser";
import { TwinklingStars } from "../utils/TwinklingStars";

export default class MoreToComeScene extends Phaser.Scene {
  private twinklingStars?: TwinklingStars;

  constructor() { super("MoreToComeScene"); }

  create() {
    const { width, height } = this.scale;

    // Background & twinkling stars
    this.add.rectangle(0, 0, width, height, 0x0f1630).setOrigin(0);
    this.twinklingStars = new TwinklingStars(this, 140, width, height);

    // Message
    const title = this.add.text(width/2, height*0.45, "Dit was de teaser voor de escape room!", {
      fontFamily: "sans-serif", fontSize: "24px", color: "#e7f3ff"
    }).setOrigin(0.5);
    
    this.add.text(width/2, title.y + 36, "Kom in februari terug voor nog veel meer!", {
      fontFamily: "sans-serif", fontSize: "16px", color: "#cfe8ff"
    }).setOrigin(0.5);
  }

  update(_time: number, delta: number) {
    this.twinklingStars?.update(delta);
  }
}
