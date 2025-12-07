# TypeScript Null Safety in oa LogicTower.ts

## Waarom krijg je "Object is possibly null" warnings?

In `tsconfig.json` staat:

```json
{
    "strict": true
}
```

Dit betekent: **TypeScript checkt ALLES**. Als je schrijft:

```typescript
private dialogBox: Phaser.GameObjects.Rectangle;

create() {
  this.dialogBox = this.add.rectangle(...);
}
```

Dan zegt TypeScript: "Wacht! Tussen de `constructor` en `create()` is `dialogBox` undefined! Dat kan crashen!"

**Rode golven** = TypeScript waarschuwingen in je editor (VS Code). Ze **stoppen je code niet** - je kan gewoon `npm run dev` draaien en het werkt. Maar TypeScript probeert je te beschermen tegen runtime crashes.

---

## Oplossing 1: Uitroepteken (`!`) - "Trust me"

```typescript
private dialogBox!: Phaser.GameObjects.Rectangle;
//                ^ "Definite Assignment Assertion"

create() {
  this.dialogBox = this.add.rectangle(...);
}

showDialog() {
  this.dialogBox.setVisible(true);  // Geen warnings!
}
```

### Wat doet `!`?

Je zegt tegen TypeScript: "Ik weet dat dit undefined lijkt, maar **trust me**, ik initialiseer dit voordat ik het gebruik."

### Wanneer handig?

-   ✅ **Kleine scenes** die je zelf test
-   ✅ **Visuele dingen** (panels, sprites, tekst) - je ziet het direct als het ontbreekt
-   ✅ **Phaser lifecycle** - je weet zeker dat `create()` altijd voor `update()` draait
-   ✅ **Snel prototypen** - weinig code, geen boilerplate

### Nadelen:

-   ❌ Als het toch undefined is → **cryptische crash**: `Cannot read property 'setVisible' of undefined`
-   ❌ TypeScript kan je niet meer helpen
-   ❌ Bij refactoring kan TypeScript je niet waarschuwen

**Gebruik voor:** Panel, sprites, tekst, dialogs - dingen die je **ziet** als ze ontbreken.

---

## Oplossing 2: Vraagteken (`?`) + Optional Chaining (`?.`) - Stil falen

```typescript
private dialogBox?: Phaser.GameObjects.Rectangle;
//                ^ "Optional property"

create() {
  this.dialogBox = this.add.rectangle(...);
}

showDialog() {
  this.dialogBox?.setVisible(true);  // Als undefined → doet niks
  //            ^ "Optional chaining"
}
```

### Wat doet `?`?

Je zegt tegen TypeScript: "Dit **kan** undefined zijn, ik ga daar rekening mee houden."

De `?.` betekent: "Als het bestaat, doe dan `setVisible(true)`, anders skip gewoon deze regel."

### Wanneer handig?

-   ✅ **Echt optionele features** (achievement popup, particle effects, debug info)
-   ✅ **Dingen die mogen falen** zonder de game te breken
-   ✅ **Graceful degradation** - als iets niet werkt, ga gewoon door

**Voorbeeld:**

```typescript
// Achievement popup is optioneel - mag stil falen
private achievementPopup?: Phaser.GameObjects.Container;

showAchievement() {
  this.achievementPopup?.show();  // Als het er niet is, geen probleem!
}
```

### Nadelen:

-   ❌ **Verborgen bugs!** Als iets niet werkt, zie je geen error
-   ❌ **Puzzel werkt niet** maar je weet niet waarom
-   ❌ **Debugging kost tijd** - je moet zelf ontdekken waar het stil faalt

**Gebruik NIET voor:** Kritieke gameplay (input, puzzel mechanics, navigation).

---

## Oplossing 3: `?` + Expliciete checks - Defensief programmeren

```typescript
private dialogBox?: Phaser.GameObjects.Rectangle;

create() {
  this.dialogBox = this.add.rectangle(...);
}

showDialog() {
  if (!this.dialogBox) {
    console.error("[MyScene] Dialog box not initialized!");
    return;
  }

  this.dialogBox.setVisible(true);  // Nu weet TypeScript: dit bestaat!
}
```

### Wat doet dit?

Je gebruikt `?` (eerlijk zijn), maar checkt **expliciet** met een `if` statement. Als het undefined is, log je een **duidelijke error** en stop je.

### Wanneer handig?

-   ✅ **DOM elementen** (getElementById, createFromHTML) - timing issues!
-   ✅ **User input** - kritiek voor puzzels
-   ✅ **Dingen die MOETEN werken** voor gameplay
-   ✅ **Debugging** - je weet EXACT wat er mis is

**Voorbeeld:**

```typescript
private answerInput?: Phaser.GameObjects.DOMElement;

showRiddle() {
  this.answerInput = this.add.dom(...).createFromHTML(`<input id="answerBox">`);

  if (!this.answerInput) {
    console.error("[LogicTower] Failed to create answer input!");
    return;  // Stop hier - puzzel kan niet werken
  }

  this.answerInput.on("change", () => {
    const input = document.getElementById("answerBox") as HTMLInputElement | null;

    if (!input) {
      console.error("[LogicTower] Input field not found in DOM!");
      return;
    }

    const value = input.value.trim().toLowerCase();
    if (value === "ster") {
      this.completePuzzle();
    }
  });
}
```

### Voordelen:

-   ✅ **Duidelijke errors** - console vertelt precies wat er mis is
-   ✅ **Snel debuggen** - geen uren zoeken
-   ✅ **TypeScript blij** - je bent eerlijk én veilig
-   ✅ **Productie klaar** - bugs vang je vroeg

### Nadelen:

-   ❌ **Meer code** - 3-4 regels per check
-   ❌ **Kan overkill zijn** voor kleine dingen

**Gebruik voor:** DOM operations, user input, critical gameplay, data loading.

---

## Praktisch advies voor jouw LogicTower

### Gebruik `!` voor:

```typescript
private panel!: Phaser.GameObjects.Image;           // Zie je als zwart scherm
private dialogBox!: Phaser.GameObjects.Rectangle;   // Zie je als geen dialog
private dialogText!: Phaser.GameObjects.Text;       // Zie je als geen tekst
```

### Gebruik `?` + checks voor:

```typescript
private answerInput?: Phaser.GameObjects.DOMElement;

// Check na creatie:
if (!this.answerInput) {
  console.error("Input creation failed!");
  return;
}

// Check voor DOM:
const input = document.getElementById("answerBox") as HTMLInputElement | null;
if (!input) {
  console.error("DOM element not found!");
  return;
}
```

---

## Samenvatting

| Methode       | Code                     | Gebruik voor            | Voordeel          | Nadeel             |
| ------------- | ------------------------ | ----------------------- | ----------------- | ------------------ |
| **`!`**       | `private x!: Type;`      | Visuele Phaser objecten | Minste code       | Cryptische crashes |
| **`?.`**      | `this.x?.method()`       | Optionele features      | Geen crashes      | Stille bugs        |
| **`if (!x)`** | Expliciete check + error | DOM & kritieke gameplay | Duidelijke errors | Meer code          |

**Voor kleine scenes die je zelf test:** Gebruik `!` voor visuele dingen, en `if (!x)` voor DOM/input.

**Algemene regel:**

-   Zie je het direct als het ontbreekt? → `!`
-   Moet het werken voor gameplay? → `if (!x)` + `console.error`
-   Mag het stil falen? → `?.`

---

## Bonus: Waarom is DOM speciaal?

```typescript
// Dit lijkt te werken...
this.add.dom(...).createFromHTML(`<input id="answerBox">`);

// Maar getElementById kan falen door:
// 1. Timing - DOM nog niet klaar
// 2. Typo - "answerBox" vs "answerbox"
// 3. Browser verschillen
// 4. Phaser DOM config issues

// Daarom ALTIJD checken:
const input = document.getElementById("answerBox");
if (!input) {
  console.error("Not found!");  // Veel duidelijker dan stil falen!
  return;
}
```

Je ziet WEL een input veld op het scherm, maar events werken niet. Zonder check weet je niet waarom! 🐛

---

## Veranderingen in LogicTower

De LogicTower scene is aangepast met deze principes:

**Voor (alles met `?` + checks):**

-   Te veel defensive checks voor visuele elementen
-   ~15 regels extra boilerplate code

**Na (mix van `!` en `?` + checks):**

-   `!` voor panel, dialogBox, dialogText, riddleText (visueel)
-   `?` + checks alleen voor answerInput en DOM elements (kritiek)
-   ~15 regels minder code
-   Nog steeds veilig waar het moet
