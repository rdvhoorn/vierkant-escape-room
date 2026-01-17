import Phaser from "phaser";
import { WarpStars } from "../utils/TwinklingStars";

export default class EndCreditsScene extends Phaser.Scene {
  private stars?: WarpStars;

  // Phaser UI
  private panel?: Phaser.GameObjects.Rectangle;
  private titleText?: Phaser.GameObjects.Text;
  private bodyText?: Phaser.GameObjects.Text;

  // DOM UI (scrolling form inside panel)
  private domRoot?: HTMLDivElement;
  private domForm?: HTMLDivElement;
  private domStatus?: HTMLDivElement;

  private inputName?: HTMLInputElement;
  private inputAge?: HTMLInputElement;
  private inputEmail?: HTMLInputElement;
  private submitBtn?: HTMLButtonElement;

  private isSubmitting = false;

  private onResizeBound = () => this.onResize();

  constructor() {
    super("EndCreditsScene");
  }

  create() {
    const { width, height } = this.scale;

    // -------------------------
    // Background: Warp Stars
    // -------------------------
    const stars = new WarpStars(this, 600, width, height, {
      baseSpeed: 700,
      depth: 1400,
      fov: 280,
      fadeInZPortion: 0.25,
    });
    stars.setDepth(-10);
    this.stars = stars;

    this.events.on("update", (_time: number, delta: number) => {
      this.stars?.update(delta);
    });

    // -------------------------
    // Panel + text (Phaser)
    // -------------------------
    this.panel = this.add
      .rectangle(width / 2, height / 2, 10, 10, 0x111a2e, 0.96)
      .setStrokeStyle(2, 0x66a3ff);

    this.titleText = this.add
      .text(width / 2, 0, "Gefeliciteerd!", {
        fontFamily: "sans-serif",
        fontSize: "56px",
        fontStyle: "900",
        color: "#e7f3ff",
        stroke: "#66a3ff",
        strokeThickness: 2,
      })
      .setOrigin(0.5, 0);

    this.bodyText = this.add
      .text(
        width / 2,
        0,
        "Je hebt de escaperoom voltooid en bent teruggekeerd naar Aarde.\n\nVul hieronder je gegevens in om je deelname te registreren.",
        {
          fontFamily: "sans-serif",
          fontSize: "22px",
          color: "#cfe8ff",
          align: "center",
          lineSpacing: 10,
          wordWrap: { width: Math.min(900, width * 0.9) - 120 },
        }
      )
      .setOrigin(0.5, 0);

    // -------------------------
    // DOM form
    // -------------------------
    this.createDomForm();

    // -------------------------
    // Responsive layout hooks
    // -------------------------
    this.scale.on("resize", this.onResize, this);
    window.addEventListener("resize", this.onResizeBound);
    window.addEventListener("orientationchange", this.onResizeBound);
    window.addEventListener("scroll", this.onResizeBound, true);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroyDom());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.destroyDom());

    // Initial layout
    this.onResize();
  }

  // =========================================================
  // Layout (responsive)
  // =========================================================
  private onResize() {
    const { width, height } = this.scale;

    // Panel sizing
    const panelW = Math.min(980, width * 0.92);
    const panelH = Math.min(720, height * 0.90);

    const panelX = width / 2;
    const panelY = height / 2;

    this.panel?.setPosition(panelX, panelY).setSize(panelW, panelH);

    // Responsive typography (simple scaling)
    const s = Phaser.Math.Clamp(width / 1100, 0.72, 1.0);
    const titleSize = Math.round(56 * s);
    const bodySize = Math.round(22 * s);

    this.titleText?.setStyle({
      fontFamily: "sans-serif",
      fontSize: `${titleSize}px`,
      fontStyle: "900",
      color: "#e7f3ff",
      stroke: "#66a3ff",
      strokeThickness: 2,
    });

    this.bodyText?.setStyle({
      fontFamily: "sans-serif",
      fontSize: `${bodySize}px`,
      color: "#cfe8ff",
      align: "center",
      lineSpacing: Math.round(10 * s),
      wordWrap: { width: panelW - 120 },
    });

    const pad = Phaser.Math.Clamp(panelW * 0.06, 22, 56);

    const titleY = panelY - panelH / 2 + pad;
    this.titleText?.setPosition(panelX, titleY);

    const bodyY = titleY + titleSize + 18 * s;
    this.bodyText?.setPosition(panelX, bodyY);

    // DOM overlay pinned to canvas and DOM form placed inside panel
    this.syncDomRootToCanvas();

    // Compute form rectangle under the body text, inside panel
    const bodyBounds = this.bodyText?.getBounds();
    const formTop = (bodyBounds?.bottom ?? bodyY + 140) + 20 * s;

    const innerLeft = panelX - panelW / 2 + pad;
    const innerRight = panelX + panelW / 2 - pad;
    const innerBottom = panelY + panelH / 2 - pad;

    const formX = innerLeft;
    const formY = formTop;
    const formW = Math.max(10, innerRight - innerLeft);
    const formH = Math.max(80, innerBottom - formTop);

    this.placeDomInGameRect(this.domForm, formX, formY, formW, formH);

    // Tweak input/button sizes for small screens
    const isSmall = width < 520;
    const inputH = isSmall ? 64 : 72;
    const font = isSmall ? 18 : 20;
    const labelFont = isSmall ? 14 : 16;

    this.applyFormSizing({ inputH, font, labelFont });
  }

  private applyFormSizing(opts: { inputH: number; font: number; labelFont: number }) {
    const { inputH, font, labelFont } = opts;

    const styleInput = (el?: HTMLInputElement) => {
      if (!el) return;
      el.style.height = `${inputH}px`;
      el.style.fontSize = `${font}px`;
      el.style.padding = "14px 14px";
      el.style.borderRadius = "14px";
    };

    styleInput(this.inputName);
    styleInput(this.inputAge);
    styleInput(this.inputEmail);

    // Labels inside the form are simple divs; update via query
    if (this.domForm) {
      const labels = this.domForm.querySelectorAll<HTMLDivElement>("[data-label]");
      labels.forEach((l) => (l.style.fontSize = `${labelFont}px`));
    }

    if (this.submitBtn) {
      this.submitBtn.style.fontSize = `${font}px`;
      this.submitBtn.style.padding = "14px 18px";
      this.submitBtn.style.borderRadius = "14px";
      this.submitBtn.style.minWidth = "160px";
    }
  }

  // =========================================================
  // DOM form creation
  // =========================================================
  private createDomForm() {
    const canvas = this.game.canvas;
    if (!canvas) return;

    // Root pinned to canvas rect (fixed in viewport coordinates)
    const root = document.createElement("div");
    root.style.position = "fixed";
    root.style.pointerEvents = "none";
    root.style.zIndex = "9999";
    root.style.left = "0";
    root.style.top = "0";
    root.style.width = "0";
    root.style.height = "0";
    document.body.appendChild(root);
    this.domRoot = root;

    // Scroll container that sits inside the panel
    const form = document.createElement("div");
    form.style.position = "absolute";
    form.style.pointerEvents = "auto";
    form.style.overflowY = "auto";
    form.style.overflowX = "hidden";
    form.style.boxSizing = "border-box";
    form.style.padding = "6px 2px";
    form.style.display = "flex";
    form.style.flexDirection = "column";
    form.style.gap = "14px";

    // (nice on iOS)
    (form.style as any).webkitOverflowScrolling = "touch";

    root.appendChild(form);
    this.domForm = form;

    // Build fields
    const makeField = (labelText: string, placeholder: string, type: string) => {
      const wrap = document.createElement("div");
      wrap.style.display = "flex";
      wrap.style.flexDirection = "column";
      wrap.style.gap = "8px";

      const label = document.createElement("div");
      label.textContent = labelText;
      label.setAttribute("data-label", "1");
      label.style.fontFamily = "sans-serif";
      label.style.fontSize = "16px";
      label.style.color = "#cfe8ff";
      label.style.opacity = "0.95";
      label.style.userSelect = "none";

      const input = document.createElement("input");
      input.type = type;
      input.placeholder = placeholder;
      input.autocapitalize = "off";
      input.autocomplete = "off";
      input.spellcheck = false;

      // game-like styling
      input.style.width = "100%";
      input.style.boxSizing = "border-box";
      input.style.borderRadius = "14px";
      input.style.border = "2px solid rgba(60, 90, 153, 0.95)";
      input.style.outline = "none";
      input.style.background = "rgba(17, 26, 46, 0.92)";
      input.style.color = "#e7f3ff";

      input.addEventListener("focus", () => {
        input.style.border = "2px solid rgba(102, 163, 255, 1)";
        input.style.background = "rgba(38, 54, 95, 0.92)";
      });
      input.addEventListener("blur", () => {
        input.style.border = "2px solid rgba(60, 90, 153, 0.95)";
        input.style.background = "rgba(17, 26, 46, 0.92)";
      });

      wrap.appendChild(label);
      wrap.appendChild(input);
      form.appendChild(wrap);

      return input;
    };

    this.inputName = makeField("Naam", "Bijv. Sam", "text");
    this.inputAge = makeField("Leeftijd", "Bijv. 11", "number");
    this.inputAge.min = "1";
    this.inputAge.max = "120";
    this.inputAge.inputMode = "numeric";

    this.inputEmail = makeField("E-mailadres", "Bijv. sam@email.nl", "email");
    this.inputEmail.autocomplete = "email";

    // Button row (right-aligned)
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.justifyContent = "flex-end";
    row.style.gap = "12px";
    row.style.marginTop = "6px";

    const btn = document.createElement("button");
    btn.textContent = "Verstuur";
    btn.style.cursor = "pointer";
    btn.style.border = "2px solid rgba(60, 90, 153, 0.95)";
    btn.style.background = "rgba(30, 42, 74, 0.88)";
    btn.style.color = "#cfe8ff";
    btn.style.fontFamily = "sans-serif";
    btn.style.fontWeight = "700";
    btn.style.transition = "transform 120ms ease, background 120ms ease, border-color 120ms ease";
    btn.style.userSelect = "none";

    btn.addEventListener("mouseenter", () => {
      if (this.isSubmitting) return;
      btn.style.borderColor = "rgba(102, 163, 255, 1)";
      btn.style.background = "rgba(38, 54, 95, 0.92)";
      btn.style.transform = "scale(1.02)";
      btn.style.color = "#ffffff";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.transform = "scale(1)";
      if (this.isSubmitting) return;
      btn.style.borderColor = "rgba(60, 90, 153, 0.95)";
      btn.style.background = "rgba(30, 42, 74, 0.88)";
      btn.style.color = "#cfe8ff";
    });

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      this.handleSubmit();
    });

    this.submitBtn = btn;
    row.appendChild(btn);
    form.appendChild(row);

    // Status message (inside scroll area, so it never overlaps)
    const status = document.createElement("div");
    status.style.fontFamily = "sans-serif";
    status.style.fontSize = "16px";
    status.style.color = "#b6d5ff";
    status.style.opacity = "0.95";
    status.style.marginTop = "2px";
    status.style.minHeight = "22px";
    status.textContent = "";
    form.appendChild(status);
    this.domStatus = status;

    // Enter submits (from any input)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.handleSubmit();
      }
    };
    this.inputName.addEventListener("keydown", onKey);
    this.inputAge.addEventListener("keydown", onKey);
    this.inputEmail.addEventListener("keydown", onKey);
    (root as any).__onKey = onKey;

    // Initial pin
    this.syncDomRootToCanvas();
  }

  private syncDomRootToCanvas() {
    if (!this.domRoot) return;
    const rect = this.game.canvas.getBoundingClientRect();
    this.domRoot.style.left = `${rect.left}px`;
    this.domRoot.style.top = `${rect.top}px`;
    this.domRoot.style.width = `${rect.width}px`;
    this.domRoot.style.height = `${rect.height}px`;
  }

  private placeDomInGameRect(el: HTMLElement | undefined, gx: number, gy: number, gw: number, gh: number) {
    if (!el) return;
    const rect = this.game.canvas.getBoundingClientRect();
    const sx = rect.width / this.scale.width;
    const sy = rect.height / this.scale.height;

    el.style.left = `${gx * sx}px`;
    el.style.top = `${gy * sy}px`;
    el.style.width = `${gw * sx}px`;
    el.style.height = `${gh * sy}px`;
  }

  private destroyDom() {
    this.scale.off("resize", this.onResize, this);
    window.removeEventListener("resize", this.onResizeBound);
    window.removeEventListener("orientationchange", this.onResizeBound);
    window.removeEventListener("scroll", this.onResizeBound, true);

    const root = this.domRoot;
    if (!root) return;

    const onKey = (root as any).__onKey as ((e: KeyboardEvent) => void) | undefined;
    if (onKey) {
      this.inputName?.removeEventListener("keydown", onKey);
      this.inputAge?.removeEventListener("keydown", onKey);
      this.inputEmail?.removeEventListener("keydown", onKey);
    }

    root.remove();

    this.domRoot = undefined;
    this.domForm = undefined;
    this.domStatus = undefined;
    this.inputName = undefined;
    this.inputAge = undefined;
    this.inputEmail = undefined;
    this.submitBtn = undefined;
  }

  // =========================================================
  // Submit logic
  // =========================================================
  private handleSubmit() {
    if (this.isSubmitting) return;

    const name = (this.inputName?.value ?? "").trim();
    const ageRaw = (this.inputAge?.value ?? "").trim();
    const email = (this.inputEmail?.value ?? "").trim();

    const age = Number(ageRaw);

    if (!name) return this.setStatus("Vul je naam in.", true);
    if (!ageRaw || !Number.isFinite(age) || age < 6 || age > 120) {
      return this.setStatus("Vul een geldige leeftijd in.", true);
    }
    if (!this.isValidEmail(email)) return this.setStatus("Vul een geldig e-mailadres in.", true);

    this.setStatus("", false);

    this.isSubmitting = true;
    this.setSubmittingVisual(true);

    // Integration point
    const payload = { name, age, email, submittedAt: new Date().toISOString() };
    console.log("[ESCAPEROOM SUBMISSION]", payload);

    // Fake success
    this.time.delayedCall(450, () => {
      this.isSubmitting = false;
      this.setSubmittingVisual(false);
      this.setStatus("Dankjewel! Je gegevens zijn ontvangen.", false);
    });
  }

  private setSubmittingVisual(submitting: boolean) {
    if (!this.submitBtn) return;
    if (submitting) {
      this.submitBtn.disabled = true;
      this.submitBtn.textContent = "Bezig...";
      this.submitBtn.style.opacity = "0.75";
      this.submitBtn.style.cursor = "default";
      this.submitBtn.style.transform = "scale(1)";
    } else {
      this.submitBtn.disabled = false;
      this.submitBtn.textContent = "Verstuur";
      this.submitBtn.style.opacity = "1";
      this.submitBtn.style.cursor = "pointer";
    }
  }

  private setStatus(msg: string, isError: boolean) {
    if (!this.domStatus) return;
    this.domStatus.textContent = msg;
    this.domStatus.style.color = isError ? "#ffb3b3" : "#b6d5ff";
  }

  private isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email);
  }
}
