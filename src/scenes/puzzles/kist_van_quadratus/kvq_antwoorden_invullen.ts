import Phaser from "phaser";
import { createBackButton } from "../../../utils/BackButton";

export default class KVQAntwoordenInvullen extends Phaser.Scene {

  constructor() {
    super("kvq_antwoorden_invullen");
  }

  create() {
    createBackButton(this, "Face7Scene");
  }
}
