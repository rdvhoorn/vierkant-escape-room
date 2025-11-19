# Teaser Implementation - Current State

**Status:** ✅ Complete and functional

**Flow:** Crash → Wake up → Repair puzzle → Fuel check → Explore planet → End message

---

## Complete Scene Flow

```
TitleScene (exists)
   ↓ "Start"
CrashIntroScene ✅
   ↓ auto (2-3 sec)
WakeUpScene ✅
   ↓ 4 dialogs
ShipFuelScene ✅ (puzzle, no intro dialog)
   ↓ puzzle solved
TeaserOutroScene ✅ (cockpit, fuel check)
   ↓ 3 dialogs
FaceTopScene ✅ (teaser mode, explore planet)
   ↓ after 5 sec
[Teaser End Overlay] ✅
   ↓ "Sluiten"
FaceTopScene (stay on planet, keep exploring)
```

---

## Scene 1: CrashIntroScene ✅

**What happens:**
- Rocket interior with windows showing stars
- "APPROACHING DESTINATION..." → "⚠️ WARNING: COLLISION DETECTED"
- Camera shake + flash effect
- Fade to black → WakeUpScene

**Implementation:**
- ✅ Placeholder graphics (rectangles, text, stars)
- ✅ Camera shake (800ms)
- ✅ Flash effect (200ms)
- ✅ Auto-advance after 2 seconds
- ✅ Dev: Scene name visible

---

## Scene 2: WakeUpScene ✅

**What happens:**
- Fade in from black to damaged cockpit (dust particles floating)
- 4 dialog lines (click/space to advance):
  1. "Waar ben ik? Wat is er gebeurd? Waar is iedereen?"
  2. "Ik weet nog dat we gisteren onze ruimte-missie hebben afgerond..."
  3. "Zo te zien ben ik niet op de aarde. Ik moet uitzoeken waar ik ben."
  4. "Wacht... het paneel! Alle draden zijn los!"
- Fade to ShipFuelScene

**Implementation:**
- ✅ Cockpit interior with dust overlay (0.3 alpha)
- ✅ Floating dust particles (tweened circles)
- ✅ Red "SYSTEM ERROR" on damaged panel
- ✅ Dialog system (reused from ShipFuelScene)
- ✅ Fade in (1000ms) then delayed dialog start (1500ms)
- ✅ Dev: Scene name visible

---

## Scene 3: ShipFuelScene ✅

**Teaser adaptations:**
- ✅ No intro dialog - puzzle starts immediately
- ✅ ESC disabled (can't exit to planet)
- ✅ No energy check after completion
- ✅ After victory → TeaserOutroScene

**Puzzle mechanics:**
- ✅ 6x6 grid, 6 colored cable pairs
- ✅ Connect same colors, no overlaps, fill all cells
- ✅ Short circuit on wrong connection (wild electricity + explosions)
- ✅ Victory confetti animation

**Dev helpers:**
- ✅ SPACE to instantly solve puzzle (hardcoded solution)
- ✅ Scene name visible

---

## Scene 4: TeaserOutroScene ✅

**What happens:**
- Back in cockpit (clean, working)
- Green light: "SYSTEMS" (online)
- Red fuel bar: 0% with tiny red indicator
- 3 dialog lines:
  1. "Yes! De systemen werken weer!"
  2. "Maar... de brandstof is helemaal op. Ik kan niet meer verder vliegen."
  3. "Ik moet uitstappen en onderzoeken waar ik ben."
- Sets `registry.set("isTeaser", true)`
- Fade to FaceTopScene

**Implementation:**
- ✅ Cockpit interior (clean version)
- ✅ Visual fuel gauge (empty red bar)
- ✅ Green systems indicator
- ✅ Dialog system
- ✅ Sets teaser flag for FaceTopScene
- ✅ Dev: Scene name visible

---

## Scene 5: FaceTopScene ✅

**Teaser mode behavior:**
- Checks `registry.get("isTeaser")` flag
- **If true (teaser mode):**
  - ✅ Ship interaction disabled
  - ✅ Puzzle interactions disabled
  - ✅ After 5 seconds → Show teaser end overlay
- **If false:** Normal gameplay with all interactions

**Teaser end overlay:**
- Dark overlay (80% opacity)
- Message box with border
- Title: "✨ EINDE VAN DE TEASER ✨" (gold)
- Text: "Het volledige spel komt binnenkort.\nDan kun je verder op de planeet verkennen\nen meer puzzels oplossen!"
- Green button: "Sluiten"
- Click/Space/Enter → Overlay closes, **stay on planet**

**Implementation:**
- ✅ Conditional interaction system
- ✅ Overlay with fade-in animation
- ✅ Hover effects on button
- ✅ Keyboard shortcuts (Space/Enter)
- ✅ Overlay destroys on close (no scene change)
- ✅ Dev: Scene name visible

---

## Development Helpers

**Scene name display:**
- ✅ All scenes show name in top-left (green text on black background)
- ✅ Helper function: `showSceneName(scene)` from `utils/devHelpers.ts`

**Puzzle skip:**
- ✅ Press SPACE during ShipFuelScene puzzle → Instant victory
- ✅ Uses hardcoded solution for 6x6 grid
- ✅ Console log: "[DEV] Instantly solving puzzle..."

---

## Graphics

**Current state:** All placeholder graphics (shapes, text, emojis)

**For production, consider:**
- Cockpit interior background (can use DALL-E prompt from project notes)
- Damaged cockpit variant
- Planet exterior background
- Robot sprite (currently using 🤖 emoji)

**Placeholder is functional** - teaser works without custom assets!

---

## Known Issues / Notes

- ✅ State resets correctly when re-entering scenes
- ✅ No memory leaks (overlays properly destroyed)
- ✅ Teaser flag properly managed via registry
- ✅ All scenes tested with keyboard + mouse

**Next steps for full game:**
- Merge teaser-release branch when ready to extend
- Remove `isTeaser` flag checks to enable full gameplay
- Add more puzzles and planet exploration features
