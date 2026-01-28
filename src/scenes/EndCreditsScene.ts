import Phaser from "phaser";
import { WarpStars } from "../utils/TwinklingStars";
import { submitLeaderboard, submitPrizes } from "../firebase/firestore";

type Mode = "leaderboard" | "prizes";
type KampVoorkeur = "A1" | "A2" | "geen";

export default class EndCreditsScene extends Phaser.Scene {
  private stars?: WarpStars;

  // Phaser UI
  private panel?: Phaser.GameObjects.Rectangle;
  private titleText?: Phaser.GameObjects.Text;
  private bodyText?: Phaser.GameObjects.Text;

  // DOM UI
  private domRoot?: HTMLDivElement;
  private domForm?: HTMLDivElement;
  private domStatus?: HTMLDivElement;

  // mode UI
  private mode: Mode = "leaderboard";
  private tabLeaderboardBtn?: HTMLButtonElement;
  private tabPrizesBtn?: HTMLButtonElement;

  // sections
  private prizesSection?: HTMLDivElement;

  // leaderboard fields
  private lbFirstName?: HTMLInputElement;
  private lbAge?: HTMLInputElement;

  // prizes fields (NEW)
  private pFirst?: HTMLInputElement; // voornaam*
  private pLast?: HTMLInputElement; // achternaam*
  private pAddress?: HTMLInputElement; // adres*
  private pPostcode?: HTMLInputElement; // postcode*
  private pCity?: HTMLInputElement; // plaats*
  private pEmail?: HTMLInputElement; // email*
  private pPhone?: HTMLInputElement; // telefoon*
  private pGender?: HTMLInputElement; // geslacht (open)
  private pBirthdate?: HTMLInputElement; // geboortedatum*
  private pGroup?: HTMLInputElement; // groep (met toevoeging)*
  private pSchool?: HTMLInputElement; // school*
  private pCampPref?: HTMLSelectElement; // kampvoorkeur* (A1/A2/geen)

  // keep existing restrictions (age + group 6/7/8) as well:
  // - Age is derived from birthdate (must be >= 8 to be eligible)
  // - Group eligibility is separately selected as 6/7/8/nee (like before)
  private pEligibilityGroup?: HTMLSelectElement; // 6/7/8/nee/""
  private pBeenBefore?: HTMLSelectElement; // ja/nee
  private pParentsPhone?: HTMLInputElement; // phone parents (required if eligible like before)

  // prizes extra option
  private pAlsoLeaderboard?: HTMLInputElement;

  // shared
  private submitBtn?: HTMLButtonElement;
  private isSubmitting = false;
  private hasSubmitted = false;

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
      baseSpeed: 200,
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
        "Je hebt de escaperoom voltooid en bent teruggekeerd naar Aarde.\n\nKies hieronder: alleen leaderboard, of meedoen met prijzen (met extra gegevens).",
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
    this.setMode("leaderboard");
  }

  // =========================================================
  // Layout (responsive)
  // =========================================================
  private onResize() {
    const { width, height } = this.scale;

    const panelW = Math.min(980, width * 0.92);
    const panelH = Math.min(740, height * 0.90);

    const panelX = width / 2;
    const panelY = height / 2;

    this.panel?.setPosition(panelX, panelY).setSize(panelW, panelH);

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

    const bodyBounds = this.bodyText?.getBounds();
    const formTop = (bodyBounds?.bottom ?? bodyY + 140) + 18 * s;

    const innerLeft = panelX - panelW / 2 + pad;
    const innerRight = panelX + panelW / 2 - pad;
    const innerBottom = panelY + panelH / 2 - pad;

    const formX = innerLeft;
    const formY = formTop;
    const formW = Math.max(10, innerRight - innerLeft);
    const formH = Math.max(80, innerBottom - formTop);

    this.placeDomInGameRect(this.domForm, formX, formY, formW, formH);

    const isSmall = width < 520;
    const inputH = isSmall ? 60 : 70;
    const font = isSmall ? 18 : 20;
    const labelFont = isSmall ? 14 : 16;

    this.applyFormSizing({ inputH, font, labelFont });
  }

  private applyFormSizing(opts: { inputH: number; font: number; labelFont: number }) {
    const { inputH, font, labelFont } = opts;

    const styleControl = (el?: HTMLInputElement | HTMLSelectElement) => {
      if (!el) return;
      el.style.height = `${inputH}px`;
      el.style.fontSize = `${font}px`;
      el.style.padding = "14px 14px";
      el.style.borderRadius = "14px";
    };

    styleControl(this.lbFirstName);
    styleControl(this.lbAge);

    // prizes
    styleControl(this.pFirst);
    styleControl(this.pLast);
    styleControl(this.pAddress);
    styleControl(this.pPostcode);
    styleControl(this.pCity);
    styleControl(this.pEmail);
    styleControl(this.pPhone);
    styleControl(this.pGender);
    styleControl(this.pBirthdate);
    styleControl(this.pGroup);
    styleControl(this.pSchool);
    styleControl(this.pCampPref);

    // eligibility bits (kept)
    styleControl(this.pEligibilityGroup);
    styleControl(this.pBeenBefore);
    styleControl(this.pParentsPhone);

    if (this.domForm) {
      const labels = this.domForm.querySelectorAll<HTMLDivElement>("[data-label]");
      labels.forEach((l) => (l.style.fontSize = `${labelFont}px`));
    }

    if (this.submitBtn) {
      this.submitBtn.style.fontSize = `${font}px`;
      this.submitBtn.style.padding = "14px 18px";
      this.submitBtn.style.borderRadius = "14px";
      this.submitBtn.style.minWidth = "180px";
    }

    const tabFont = Math.max(14, Math.round(font * 0.85));
    const tabPadV = Math.max(10, Math.round(inputH * 0.2));
    const tabPadH = Math.max(12, Math.round(inputH * 0.26));
    [this.tabLeaderboardBtn, this.tabPrizesBtn].forEach((b) => {
      if (!b) return;
      b.style.fontSize = `${tabFont}px`;
      b.style.padding = `${tabPadV}px ${tabPadH}px`;
      b.style.borderRadius = "999px";
    });
  }

  // =========================================================
  // DOM form creation
  // =========================================================
  private createDomForm() {
    const canvas = this.game.canvas;
    if (!canvas) return;

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
    (form.style as any).webkitOverflowScrolling = "touch";
    root.appendChild(form);
    this.domForm = form;

    const setControlStyle = (el: HTMLInputElement | HTMLSelectElement) => {
      el.style.width = "95%";
      el.style.boxSizing = "border-box";
      el.style.borderRadius = "14px";
      el.style.border = "2px solid rgba(60, 90, 153, 0.95)";
      el.style.outline = "none";
      el.style.background = "rgba(17, 26, 46, 0.92)";
      el.style.color = "#e7f3ff";

      el.addEventListener("focus", () => {
        el.style.border = "2px solid rgba(102, 163, 255, 1)";
        el.style.background = "rgba(38, 54, 95, 0.92)";
      });
      el.addEventListener("blur", () => {
        el.style.border = "2px solid rgba(60, 90, 153, 0.95)";
        el.style.background = "rgba(17, 26, 46, 0.92)";
      });
    };

    const makeField = (labelText: string, target: HTMLElement) => {
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

      wrap.appendChild(label);
      target.appendChild(wrap);

      return wrap;
    };

    const makeInput = (labelText: string, placeholder: string, type: string, target: HTMLElement) => {
      const wrap = makeField(labelText, target);
      const input = document.createElement("input");
      input.type = type;
      input.placeholder = placeholder;
      input.autocapitalize = "off";
      input.autocomplete = "off";
      input.spellcheck = false;
      setControlStyle(input);
      wrap.appendChild(input);
      return input;
    };

    const makeSelect = (
      labelText: string,
      options: Array<{ value: string; label: string }>,
      target: HTMLElement
    ) => {
      const wrap = makeField(labelText, target);
      const sel = document.createElement("select");
      setControlStyle(sel);
      options.forEach((o) => {
        const opt = document.createElement("option");
        opt.value = o.value;
        opt.textContent = o.label;
        sel.appendChild(opt);
      });
      wrap.appendChild(sel);
      return sel;
    };

    // ---------- tabs ----------
    const tabs = document.createElement("div");
    tabs.style.display = "flex";
    tabs.style.gap = "10px";
    tabs.style.alignItems = "center";
    tabs.style.justifyContent = "center";
    tabs.style.marginBottom = "4px";
    form.appendChild(tabs);

    const makeTabBtn = (text: string) => {
      const b = document.createElement("button");
      b.textContent = text;
      b.style.cursor = "pointer";
      b.style.border = "2px solid rgba(60, 90, 153, 0.95)";
      b.style.background = "rgba(30, 42, 74, 0.60)";
      b.style.color = "#cfe8ff";
      b.style.fontFamily = "sans-serif";
      b.style.fontWeight = "800";
      b.style.userSelect = "none";
      b.style.transition = "transform 120ms ease, background 120ms ease, border-color 120ms ease";
      b.addEventListener("mouseenter", () => {
        if (this.isSubmitting || this.hasSubmitted) return;
        b.style.borderColor = "rgba(102, 163, 255, 1)";
        b.style.background = "rgba(38, 54, 95, 0.80)";
        b.style.transform = "scale(1.02)";
        b.style.color = "#ffffff";
      });
      b.addEventListener("mouseleave", () => {
        b.style.transform = "scale(1)";
        this.refreshTabStyles();
      });
      return b;
    };

    this.tabLeaderboardBtn = makeTabBtn("Leaderboard");
    this.tabPrizesBtn = makeTabBtn("Prijzen");

    this.tabLeaderboardBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (this.hasSubmitted) return;
      this.setMode("leaderboard");
    });
    this.tabPrizesBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (this.hasSubmitted) return;
      this.setMode("prizes");
    });

    tabs.appendChild(this.tabLeaderboardBtn);
    tabs.appendChild(this.tabPrizesBtn);

    // ---------- sections ----------
    const lbSection = document.createElement("div");
    lbSection.setAttribute("data-section", "leaderboard");
    lbSection.style.display = "flex";
    lbSection.style.flexDirection = "column";
    lbSection.style.gap = "14px";
    form.appendChild(lbSection);

    const prizesSection = document.createElement("div");
    prizesSection.setAttribute("data-section", "prizes");
    prizesSection.style.display = "flex";
    prizesSection.style.flexDirection = "column";
    prizesSection.style.gap = "14px";
    form.appendChild(prizesSection);
    this.prizesSection = prizesSection;

    // ---------- leaderboard fields ----------
    this.lbFirstName = makeInput("Voornaam", "Bijv. Sam", "text", lbSection);

    this.lbAge = makeInput("Leeftijd", "Bijv. 11", "number", lbSection);
    this.lbAge.min = "1";
    this.lbAge.max = "120";
    this.lbAge.inputMode = "numeric";

    // =========================
    // ---------- prizes fields (NEW REQUIRED SET) ----------
    // Voornaam*, achternaam*, adres*, postcode*, plaats*, email*, telefoon*,
    // geslacht (open), geboortedatum*, groep (met toevoeging)*, school*, kampvoorkeur*
    // Plus: keep eligibility warnings/restrictions from before (>=8 and group 6/7/8)
    // =========================

    this.pFirst = makeInput("Voornaam *", "Bijv. Sam", "text", prizesSection);
    this.pLast = makeInput("Achternaam *", "Bijv. Jansen", "text", prizesSection);

    this.pAddress = makeInput("Adres *", "Straat + huisnummer", "text", prizesSection);

    this.pPostcode = makeInput("Postcode *", "Bijv. 1234 AB", "text", prizesSection);
    this.pPostcode.autocapitalize = "characters";

    this.pCity = makeInput("Plaats *", "Bijv. Utrecht", "text", prizesSection);

    this.pEmail = makeInput("E-mailadres *", "Bijv. sam@email.nl", "email", prizesSection);
    this.pEmail.autocomplete = "email";

    this.pPhone = makeInput("Telefoon *", "Bijv. 06 12345678", "tel", prizesSection);
    this.pPhone.autocomplete = "tel";

    this.pGender = makeInput("Geslacht (optioneel)", "Bijv. jongen / meisje / non-binair / anders", "text", prizesSection);

    // geboortedatum* (use date input)
    this.pBirthdate = makeInput("Geboortedatum *", "YYYY-MM-DD", "date", prizesSection);

    // groep (met toevoeging)* (free text, because you asked “inclusief mogelijke toevoeging”)
    // Examples: "groep 7", "7A", "8b", etc.
    this.pGroup = makeInput("Groep *", "Bijv. 7 / 7A / 8b", "text", prizesSection);

    this.pSchool = makeInput("School *", "Naam van je school", "text", prizesSection);

    this.pCampPref = makeSelect(
      "Kampvoorkeur *",
      [
        { value: "", label: "Kies…" },
        { value: "A1", label: "A1" },
        { value: "A2", label: "A2" },
        { value: "geen", label: "Geen voorkeur" },
      ],
      prizesSection
    );

    // ---------- keep existing eligibility controls (age+group restriction messaging) ----------
    // We now compute age from geboortedatum, but we keep the same gating:
    // "minimaal 8 jaar én in groep 6, 7 of 8"
    this.pEligibilityGroup = makeSelect(
      "Zit je in groep 6, 7 of 8?",
      [
        { value: "", label: "Kies…" },
        { value: "6", label: "Ik zit in groep 6" },
        { value: "7", label: "Ik zit in groep 7" },
        { value: "8", label: "Ik zit in groep 8" },
        { value: "nee", label: "Nee" },
      ],
      prizesSection
    );

    this.pBeenBefore = makeSelect(
      "Ben je ooit eerder op kamp mee geweest? *",
      [
        { value: "", label: "Kies…" },
        { value: "ja", label: "Ja" },
        { value: "nee", label: "Nee" },
      ],
      prizesSection
    );

    this.pParentsPhone = makeInput("Telefoonnummer ouders *", "Bijv. 06 12345678", "tel", prizesSection);
    this.pParentsPhone.autocomplete = "tel";

    // Checkbox: also submit to leaderboard
    const cbWrap = document.createElement("label");
    cbWrap.style.display = "flex";
    cbWrap.style.alignItems = "center";
    cbWrap.style.gap = "10px";
    cbWrap.style.padding = "10px 6px";
    cbWrap.style.border = "2px solid rgba(60, 90, 153, 0.55)";
    cbWrap.style.borderRadius = "14px";
    cbWrap.style.background = "rgba(17, 26, 46, 0.55)";
    cbWrap.style.cursor = "pointer";
    cbWrap.style.userSelect = "none";
    cbWrap.style.width = "95%";
    cbWrap.style.boxSizing = "border-box";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.style.transform = "scale(1.15)";
    cb.style.cursor = "pointer";
    this.pAlsoLeaderboard = cb;

    const cbText = document.createElement("div");
    cbText.textContent = "Ook toevoegen aan leaderboard (voornaam + leeftijd)";
    cbText.setAttribute("data-label", "1");
    cbText.style.fontFamily = "sans-serif";
    cbText.style.fontSize = "16px";
    cbText.style.color = "#cfe8ff";
    cbText.style.opacity = "0.95";

    cbWrap.appendChild(cb);
    cbWrap.appendChild(cbText);
    prizesSection.appendChild(cbWrap);

    // Prize eligibility messaging row
    const eligibility = document.createElement("div");
    eligibility.setAttribute("data-eligibility", "1");
    eligibility.style.fontFamily = "sans-serif";
    eligibility.style.fontSize = "15px";
    eligibility.style.color = "#b6d5ff";
    eligibility.style.opacity = "0.95";
    eligibility.style.marginTop = "4px";
    eligibility.style.minHeight = "20px";
    prizesSection.appendChild(eligibility);

    // ---------- submit row ----------
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.justifyContent = "flex-end";
    row.style.gap = "12px";
    row.style.marginTop = "6px";
    row.style.width = "95%";
    row.style.boxSizing = "border-box";
    form.appendChild(row);

    const btn = document.createElement("button");
    btn.textContent = "Verstuur";
    btn.style.cursor = "pointer";
    btn.style.border = "2px solid rgba(60, 90, 153, 0.95)";
    btn.style.background = "rgba(30, 42, 74, 0.88)";
    btn.style.color = "#cfe8ff";
    btn.style.fontFamily = "sans-serif";
    btn.style.fontWeight = "800";
    btn.style.transition = "transform 120ms ease, background 120ms ease, border-color 120ms ease";
    btn.style.userSelect = "none";

    btn.addEventListener("mouseenter", () => {
      if (this.isSubmitting || this.hasSubmitted) return;
      btn.style.borderColor = "rgba(102, 163, 255, 1)";
      btn.style.background = "rgba(38, 54, 95, 0.92)";
      btn.style.transform = "scale(1.02)";
      btn.style.color = "#ffffff";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.transform = "scale(1)";
      if (this.isSubmitting || this.hasSubmitted) return;
      btn.style.borderColor = "rgba(60, 90, 153, 0.95)";
      btn.style.background = "rgba(30, 42, 74, 0.88)";
      btn.style.color = "#cfe8ff";
    });

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      if (this.hasSubmitted) return;
      this.handleSubmit();
    });

    this.submitBtn = btn;
    row.appendChild(btn);

    // ---------- status message ----------
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

    // keep eligibility up to date when prizes inputs change
    const updateEligibility = () => this.updatePrizeEligibilityUI();
    this.pBirthdate?.addEventListener("change", updateEligibility);
    this.pEligibilityGroup?.addEventListener("change", updateEligibility);

    // Enter submits
    const onKey = (e: KeyboardEvent) => {
      if (this.hasSubmitted) return;
      if (e.key === "Enter") {
        e.preventDefault();
        this.handleSubmit();
      }
    };

    [
      this.lbFirstName,
      this.lbAge,

      // prizes
      this.pFirst,
      this.pLast,
      this.pAddress,
      this.pPostcode,
      this.pCity,
      this.pEmail,
      this.pPhone,
      this.pGender,
      this.pBirthdate,
      this.pGroup,
      this.pSchool,
      this.pParentsPhone,
    ].forEach((el) => el?.addEventListener("keydown", onKey));

    this.pCampPref?.addEventListener("keydown", onKey);
    this.pEligibilityGroup?.addEventListener("keydown", onKey);
    this.pBeenBefore?.addEventListener("keydown", onKey);

    (root as any).__onKey = onKey;

    // Initial pin + initial eligibility check
    this.syncDomRootToCanvas();
    this.updatePrizeEligibilityUI();
  }

  private setMode(mode: Mode) {
    this.mode = mode;
    this.setStatus("", false);

    if (!this.domForm) return;

    const lb = this.domForm.querySelector<HTMLElement>('[data-section="leaderboard"]');
    const pr = this.domForm.querySelector<HTMLElement>('[data-section="prizes"]');

    if (lb) lb.style.display = mode === "leaderboard" ? "flex" : "none";
    if (pr) pr.style.display = mode === "prizes" ? "flex" : "none";

    this.refreshTabStyles();

    if (mode === "prizes" && this.pAlsoLeaderboard) this.pAlsoLeaderboard.checked = true;

    // ensure button reflects eligibility when switching to prizes
    if (mode === "prizes") this.updatePrizeEligibilityUI();
    else this.setSubmitEnabled(true);
  }

  private refreshTabStyles() {
    const active = (b?: HTMLButtonElement, isActive?: boolean) => {
      if (!b) return;

      b.disabled = this.hasSubmitted || this.isSubmitting;

      if (isActive) {
        b.style.borderColor = "rgba(102, 163, 255, 1)";
        b.style.background = "rgba(38, 54, 95, 0.92)";
        b.style.color = "#ffffff";
      } else {
        b.style.borderColor = "rgba(60, 90, 153, 0.95)";
        b.style.background = "rgba(30, 42, 74, 0.60)";
        b.style.color = "#cfe8ff";
      }
      b.style.transform = "scale(1)";
      b.style.cursor = this.hasSubmitted || this.isSubmitting ? "default" : "pointer";
      b.style.opacity = this.hasSubmitted ? "0.6" : "1";
    };

    active(this.tabLeaderboardBtn, this.mode === "leaderboard");
    active(this.tabPrizesBtn, this.mode === "prizes");
  }

  private updatePrizeEligibilityUI() {
    if (this.mode !== "prizes") return;

    const birthRaw = (this.pBirthdate?.value ?? "").trim();
    const groupSel = (this.pEligibilityGroup?.value ?? "").trim();

    const age = this.birthdateToAge(birthRaw);
    const eligible =
      Number.isFinite(age) &&
      age >= 8 &&
      (groupSel === "6" || groupSel === "7" || groupSel === "8");

    const msgEl = this.prizesSection?.querySelector<HTMLDivElement>('[data-eligibility="1"]');
    if (msgEl) {
      if (!birthRaw && !groupSel) {
        msgEl.textContent = "Voor prijzen: minimaal 8 jaar én in groep 6, 7 of 8.";
        msgEl.style.color = "#b6d5ff";
      } else if (!eligible) {
        msgEl.textContent =
          "Je kunt helaas niet meedoen met de prijzen. (Minimaal 8 jaar én in groep 6, 7 of 8.)";
        msgEl.style.color = "#ffb3b3";
      } else {
        msgEl.textContent = "Je voldoet aan de voorwaarden voor de prijzen.";
        msgEl.style.color = "#b6d5ff";
      }
    }

    // Disable submit entirely in prizes mode if not eligible
    this.setSubmitEnabled(eligible);
  }

  private setSubmitEnabled(enabled: boolean) {
    if (!this.submitBtn) return;
    if (this.hasSubmitted) {
      this.submitBtn.disabled = true;
      return;
    }
    if (this.isSubmitting) {
      this.submitBtn.disabled = true;
      return;
    }
    this.submitBtn.disabled = !enabled;

    this.submitBtn.style.opacity = enabled ? "1" : "0.6";
    this.submitBtn.style.cursor = enabled ? "pointer" : "not-allowed";
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
      [
        this.lbFirstName,
        this.lbAge,

        // prizes
        this.pFirst,
        this.pLast,
        this.pAddress,
        this.pPostcode,
        this.pCity,
        this.pEmail,
        this.pPhone,
        this.pGender,
        this.pBirthdate,
        this.pGroup,
        this.pSchool,
        this.pParentsPhone,
      ].forEach((el) => el?.removeEventListener("keydown", onKey));
      this.pCampPref?.removeEventListener("keydown", onKey);
      this.pEligibilityGroup?.removeEventListener("keydown", onKey);
      this.pBeenBefore?.removeEventListener("keydown", onKey);
    }

    root.remove();

    this.domRoot = undefined;
    this.domForm = undefined;
    this.domStatus = undefined;

    this.tabLeaderboardBtn = undefined;
    this.tabPrizesBtn = undefined;

    this.prizesSection = undefined;

    this.lbFirstName = undefined;
    this.lbAge = undefined;

    // prizes
    this.pFirst = undefined;
    this.pLast = undefined;
    this.pAddress = undefined;
    this.pPostcode = undefined;
    this.pCity = undefined;
    this.pEmail = undefined;
    this.pPhone = undefined;
    this.pGender = undefined;
    this.pBirthdate = undefined;
    this.pGroup = undefined;
    this.pSchool = undefined;
    this.pCampPref = undefined;

    this.pEligibilityGroup = undefined;
    this.pBeenBefore = undefined;
    this.pParentsPhone = undefined;

    this.pAlsoLeaderboard = undefined;

    this.submitBtn = undefined;
  }

  // =========================================================
  // Submit logic
  // =========================================================
  private async handleSubmit() {
    if (this.isSubmitting || this.hasSubmitted) return;

    this.setStatus("", false);

    this.isSubmitting = true;
    this.setSubmittingVisual(true);

    try {
      if (this.mode === "leaderboard") {
        const firstName = (this.lbFirstName?.value ?? "").trim();
        const ageRaw = (this.lbAge?.value ?? "").trim();
        const age = Number(ageRaw);

        if (!firstName) return this.setStatus("Vul je voornaam in.", true);
        if (!ageRaw || !Number.isFinite(age) || age < 6 || age > 120) {
          return this.setStatus("Vul een geldige leeftijd in.", true);
        }

        await submitLeaderboard({ name: firstName, age });

        this.finishSubmittedScreen();
        return;
      }

      // prizes mode: enforce eligibility (same rule as before)
      const birthRaw = (this.pBirthdate?.value ?? "").trim();
      const age = this.birthdateToAge(birthRaw);
      const eligGroup = (this.pEligibilityGroup?.value ?? "").trim();

      const eligible =
        Number.isFinite(age) &&
        age >= 8 &&
        (eligGroup === "6" || eligGroup === "7" || eligGroup === "8");

      if (!eligible) {
        this.setStatus("Je kunt niet meedoen met de prijzen. Gebruik eventueel het leaderboard.", true);
        this.isSubmitting = false;
        this.setSubmittingVisual(false);
        this.updatePrizeEligibilityUI();
        return;
      }

      // REQUIRED fields (*)
      const firstName = (this.pFirst?.value ?? "").trim();
      const lastName = (this.pLast?.value ?? "").trim();
      const address = (this.pAddress?.value ?? "").trim();
      const postcode = (this.pPostcode?.value ?? "").trim();
      const city = (this.pCity?.value ?? "").trim();
      const email = (this.pEmail?.value ?? "").trim();
      const phone = (this.pPhone?.value ?? "").trim();
      const groupText = (this.pGroup?.value ?? "").trim();
      const school = (this.pSchool?.value ?? "").trim();
      const campPref = (this.pCampPref?.value ?? "").trim() as KampVoorkeur | "";

      // OPTIONAL
      const gender = (this.pGender?.value ?? "").trim();

      // kept from before (still required in prizes mode)
      const beenBefore = (this.pBeenBefore?.value ?? "").trim();
      const parentsPhone = (this.pParentsPhone?.value ?? "").trim();

      if (!firstName) return this.setStatus("Vul je voornaam in.", true);
      if (!lastName) return this.setStatus("Vul je achternaam in.", true);
      if (!address) return this.setStatus("Vul je adres in.", true);
      if (!this.isValidPostcode(postcode)) return this.setStatus("Vul een geldige postcode in (bijv. 1234 AB).", true);
      if (!city) return this.setStatus("Vul je plaats in.", true);
      if (!this.isValidEmail(email)) return this.setStatus("Vul een geldig e-mailadres in.", true);
      if (!phone) return this.setStatus("Vul je telefoonnummer in.", true);

      if (!birthRaw || !Number.isFinite(age) || age < 6 || age > 120) {
        return this.setStatus("Vul een geldige geboortedatum in.", true);
      }

      if (!groupText) return this.setStatus("Vul je groep in (bijv. 7A).", true);
      if (!school) return this.setStatus("Vul je school in.", true);
      if (!campPref) return this.setStatus("Kies je kampvoorkeur (A1, A2 of Geen voorkeur).", true);

      if (!beenBefore) return this.setStatus("Geef aan of je eerder mee op kamp bent geweest.", true);
      if (!parentsPhone) return this.setStatus("Vul het telefoonnummer van je ouders in.", true);

      const createdAt = new Date();

      await submitPrizes({
        // new required dataset
        firstName,
        lastName,
        address,
        postcode: this.normalizePostcode(postcode),
        city,
        email,
        phone,
        gender: gender || null,
        birthdate: birthRaw, // store ISO yyyy-mm-dd string
        groupText,
        eligibilityGroup: Number(eligGroup) as 6 | 7 | 8,
        school,
        campPreference: campPref as KampVoorkeur,
        age, // derived

        // kept fields
        createdAt,
        beenBefore: beenBefore === "ja",
        parentsPhone,
      } as any);

      // Optional: also leaderboard (voornaam only)
      const alsoLb = !!this.pAlsoLeaderboard?.checked;
      if (alsoLb) {
        await submitLeaderboard({ name: firstName, age });
      }

      this.finishSubmittedScreen();
    } catch (err) {
      console.error("[SUBMIT FAILED]", err);
      this.setStatus("Oeps! Versturen mislukte. Probeer opnieuw.", true);
    } finally {
      // finishSubmittedScreen sets hasSubmitted and disables UI; if we didn't submit, unlock
      if (!this.hasSubmitted) {
        this.isSubmitting = false;
        this.setSubmittingVisual(false);
        if (this.mode === "prizes") this.updatePrizeEligibilityUI();
      }
    }
  }

  // After successful submit, lock everything + show thanks screen
  private finishSubmittedScreen() {
    this.hasSubmitted = true;
    this.isSubmitting = false;

    // remove/hide DOM form completely
    if (this.domRoot) this.domRoot.style.display = "none";

    // show a simple thanks message in Phaser
    this.titleText?.setText("Bedankt!");
    this.bodyText?.setText("Bedankt voor het spelen!\n\nJe inzending is ontvangen.");

    // optional: soften panel glow
    this.panel?.setStrokeStyle(2, 0x66a3ff, 0.6);

    this.setSubmittingVisual(false);
  }

  private setSubmittingVisual(submitting: boolean) {
    if (this.tabLeaderboardBtn) this.tabLeaderboardBtn.disabled = submitting || this.hasSubmitted;
    if (this.tabPrizesBtn) this.tabPrizesBtn.disabled = submitting || this.hasSubmitted;
    this.refreshTabStyles();

    if (!this.submitBtn) return;

    if (this.hasSubmitted) {
      this.submitBtn.disabled = true;
      this.submitBtn.textContent = "Verstuurd";
      this.submitBtn.style.opacity = "0.6";
      this.submitBtn.style.cursor = "default";
      this.submitBtn.style.transform = "scale(1)";
      return;
    }

    if (submitting) {
      this.submitBtn.disabled = true;
      this.submitBtn.textContent = "Bezig...";
      this.submitBtn.style.opacity = "0.75";
      this.submitBtn.style.cursor = "default";
      this.submitBtn.style.transform = "scale(1)";
    } else {
      this.submitBtn.textContent = "Verstuur";
      // enabled/disabled is controlled by setSubmitEnabled in prizes mode
      if (this.mode === "leaderboard") {
        this.submitBtn.disabled = false;
        this.submitBtn.style.opacity = "1";
        this.submitBtn.style.cursor = "pointer";
      } else {
        this.updatePrizeEligibilityUI();
      }
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

  // NL postcode (simple + practical)
  private isValidPostcode(pc: string) {
    const s = pc.trim().toUpperCase().replace(/\s+/g, "");
    return /^[1-9][0-9]{3}[A-Z]{2}$/.test(s);
  }

  private normalizePostcode(pc: string) {
    const s = pc.trim().toUpperCase().replace(/\s+/g, "");
    return `${s.slice(0, 4)} ${s.slice(4)}`;
  }

  // Derive age from yyyy-mm-dd, using local date (good enough for eligibility)
  private birthdateToAge(iso: string) {
    if (!iso) return NaN;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) return NaN;

    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);

    if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return NaN;

    const now = new Date();
    let age = now.getFullYear() - y;

    const thisYearBirthdayPassed =
      now.getMonth() + 1 > mo || (now.getMonth() + 1 === mo && now.getDate() >= d);

    if (!thisYearBirthdayPassed) age -= 1;
    return age;
  }
}
