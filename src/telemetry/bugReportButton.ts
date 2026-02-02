import Phaser from "phaser";
import { getDeviceInfo } from "./deviceInfo";
import { sessionId, getCurrentSceneKey } from "./session";
import { submitBugReport } from "./telemetryFirestore";
import { PUZZLE_REWARDS } from "../scenes/face_scenes/_FaceConfig";

const MAX_REPORTS = 5;

export class BugReportButton {
  private game: Phaser.Game;
  private modal?: HTMLDivElement;
  private reportCount = 0;

  constructor(game: Phaser.Game) {
    this.game = game;
    this.createButton();
  }

  private createButton(): void {
    const btn = document.createElement("button");
    btn.textContent = "\u{1f4ac}"; // speech bubble emoji
    btn.title = "Feedback geven";
    btn.style.cssText = `
      position: fixed; bottom: 12px; left: 12px; z-index: 9998;
      width: 40px; height: 40px; border-radius: 50%;
      background: rgba(30, 42, 74, 0.85); color: white;
      border: 2px solid rgba(60, 90, 153, 0.7);
      font-size: 18px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background 150ms ease, border-color 150ms ease;
      padding: 0; line-height: 1;
    `;
    btn.addEventListener("mouseenter", () => {
      btn.style.background = "rgba(38, 54, 95, 0.95)";
      btn.style.borderColor = "rgba(102, 163, 255, 1)";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.background = "rgba(30, 42, 74, 0.85)";
      btn.style.borderColor = "rgba(60, 90, 153, 0.7)";
    });
    btn.addEventListener("click", () => this.openModal());
    document.body.appendChild(btn);
  }

  private openModal(): void {
    if (this.modal) return;

    if (this.reportCount >= MAX_REPORTS) {
      this.showToast("Je hebt al 5 berichten gestuurd deze sessie.");
      return;
    }

    // Pause Phaser keyboard input
    if (this.game.input.keyboard) {
      this.game.input.keyboard.enabled = false;
    }

    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 9999;
      background: rgba(0, 0, 0, 0.6);
      display: flex; align-items: center; justify-content: center;
    `;

    const panel = document.createElement("div");
    panel.style.cssText = `
      background: #0f1a30; color: #dce6f5;
      border: 2px solid rgba(60, 90, 153, 0.7);
      border-radius: 12px; padding: 24px;
      width: 92%; max-width: 480px;
      font-family: sans-serif; font-size: 15px;
    `;

    const title = document.createElement("h3");
    title.textContent = "Feedback geven";
    title.style.cssText = "margin: 0 0 6px; font-size: 18px; color: #fff;";

    const subtitle = document.createElement("p");
    subtitle.textContent =
      "Ben je een bug tegengekomen? Is iets onduidelijk of heb je een suggestie? Laat het ons weten!";
    subtitle.style.cssText =
      "margin: 0 0 14px; font-size: 14px; color: #c8d8ef; line-height: 1.4;";

    const textarea = document.createElement("textarea");
    textarea.placeholder = "Schrijf hier je feedback...";
    textarea.maxLength = 2000;
    textarea.style.cssText = `
      width: 100%; height: 120px; box-sizing: border-box;
      background: #1a2744; color: #dce6f5;
      border: 1px solid rgba(60, 90, 153, 0.5);
      border-radius: 6px; padding: 8px; resize: vertical;
      font-family: sans-serif; font-size: 14px;
    `;

    const btnRow = document.createElement("div");
    btnRow.style.cssText =
      "display: flex; gap: 8px; margin-top: 12px; justify-content: flex-end;";

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Annuleer";
    cancelBtn.style.cssText = this.modalButtonStyle("#2a3a5c");
    cancelBtn.addEventListener("click", () => this.closeModal());

    const submitBtn = document.createElement("button");
    submitBtn.textContent = "Verstuur";
    submitBtn.style.cssText = this.modalButtonStyle("#1a5c3a");

    const status = document.createElement("div");
    status.style.cssText = "margin-top: 8px; font-size: 12px; min-height: 16px;";

    submitBtn.addEventListener("click", async () => {
      const description = textarea.value.trim();
      if (!description) {
        status.textContent = "Vul een beschrijving in.";
        status.style.color = "#ffb3b3";
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Versturen...";
      status.textContent = "";

      try {
        await submitBugReport({
          description: description.slice(0, 2000),
          currentScene: getCurrentSceneKey(),
          sessionId,
          deviceInfo: getDeviceInfo(),
          registrySnapshot: this.getRegistrySnapshot(),
        });
        this.reportCount++;
        this.closeModal();
        this.showToast("Bedankt voor je feedback!");
      } catch (err) {
        console.error("[BUG REPORT FAILED]", err);
        status.textContent = "Versturen mislukt. Probeer opnieuw.";
        status.style.color = "#ffb3b3";
        submitBtn.disabled = false;
        submitBtn.textContent = "Verstuur";
      }
    });

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(submitBtn);
    panel.appendChild(title);
    panel.appendChild(subtitle);
    panel.appendChild(textarea);
    panel.appendChild(btnRow);
    panel.appendChild(status);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    this.modal = overlay;

    // Close on overlay click (not panel)
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) this.closeModal();
    });

    // Focus textarea
    textarea.focus();
  }

  private closeModal(): void {
    if (this.modal) {
      this.modal.remove();
      this.modal = undefined;
    }
    // Restore Phaser keyboard input
    if (this.game.input.keyboard) {
      this.game.input.keyboard.enabled = true;
    }
  }

  private getRegistrySnapshot(): Record<string, unknown> {
    const snapshot: Record<string, unknown> = {};
    snapshot.energy = this.game.registry.get("energy") ?? 0;
    for (const config of Object.values(PUZZLE_REWARDS)) {
      snapshot[config.puzzleSolvedRegistryKey] =
        !!this.game.registry.get(config.puzzleSolvedRegistryKey);
    }
    return snapshot;
  }

  private showToast(message: string): void {
    const toast = document.createElement("div");
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed; bottom: 60px; left: 12px; z-index: 9999;
      background: rgba(30, 42, 74, 0.95); color: #b6d5ff;
      border: 1px solid rgba(60, 90, 153, 0.7);
      border-radius: 8px; padding: 8px 14px;
      font-family: sans-serif; font-size: 13px;
      transition: opacity 300ms ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  private modalButtonStyle(bg: string): string {
    return `
      padding: 6px 16px; border: none; border-radius: 6px;
      background: ${bg}; color: #dce6f5; cursor: pointer;
      font-size: 13px; font-family: sans-serif;
    `;
  }
}
