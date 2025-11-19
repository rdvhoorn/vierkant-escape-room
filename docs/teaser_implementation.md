# Teaser Implementation Plan

**Goal:** Playable teaser for escape room game
**Scope:** Intro → Cable puzzle → Cliffhanger
**Target:** Keep it simple, focus on story beats

---

## Scene Flow

```
TitleScene (exists)
   ↓
CrashIntroScene (NEW)
   ↓
WakeUpScene (NEW)
   ↓
ShipFuelScene (exists, adapt dialog)
   ↓
TeaserOutroScene (NEW)
```

---

## Scene 1: CrashIntroScene (NEW)

**What happens:**
- Background: Inside rocket/capsule interior
- Animation: Shaking/rumbling effect (camera shake)
- Sound: Alarm, crash sound
- Visual: Screen fades to black

**Implementation:**
- Static background image (rocket interior)
- Camera shake tween (200-400ms)
- Flash/fade to black
- Duration: ~3-5 seconds
- Auto-advance to WakeUpScene

**Assets needed:**
- [ ] Rocket interior background image
- [ ] Optional: alarm sound

---

## Scene 2: WakeUpScene (NEW)

**What happens:**
- Black screen → fade in to rocket interior (dusty/damaged)
- Dialog boxes with robot's thoughts:
  1. "Waar ben ik? Wat is er gebeurd? Waar is iedereen?"
  2. "Ik weet nog dat we gisteren onze ruimte-missie hebben afgerond..."
  3. "Zo te zien ben ik niet op de aarde. Ik moet uitzoeken waar ik ben."
  4. Click to examine panel → transition to ShipFuelScene

**Implementation:**
- Reuse dialog system from ShipFuelScene (click/space to advance)
- Static background (same as CrashIntroScene but maybe different filter/dust overlay?)
- Simple text boxes
- Last dialog: "Het paneel! De draden zijn los..." → fade to ShipFuelScene

**Assets needed:**
- [ ] Damaged rocket interior background (or reuse previous with overlay)

**Questions:**
- How many dialog lines? (Keep it short for teaser?)
- Eye-opening effect: Skip for now or simple fade-in?

---

## Scene 3: ShipFuelScene (EXISTS - ADAPT)

**Changes needed:**
- Update dialog text to match story:
  - "O nee, alle draden zijn los! Dit moet ik repareren."
  - "Elke draad had zijn eigen kleur. Dus ik moet dezelfde kleur draden met elkaar verbinden."
  - "Draden die elkaar kruisen zijn gevaarlijk!"
  - After solving: "Yes, gelukt! De capsule werkt weer... maar geen energie meer."

- Remove ESC to exit (or keep it?)
- After puzzle solved → TeaserOutroScene (instead of MoreToComeScene)

**Current state:**
- Puzzle works ✅
- Dialog system works ✅
- Just needs text updates

---

## Scene 4: TeaserOutroScene (NEW)

**What happens:**
- Background: Outside the capsule on alien planet
- Robot stands outside capsule
- Dialog:
  1. "Ik moet uitstappen om te onderzoeken waar ik ben."
  2. "He, wat zie ik daar? Het lijkt wel of iemand deze kant op komt lopen..."
  3. **"Wil je meer zien? Het volledige spel komt binnenkort!"**
  4. Button: "Speel opnieuw" → TitleScene

**Implementation:**
- Static background (exterior planet/capsule)
- Robot sprite visible
- Dialog boxes (same system)
- Simple button/text for replay

**Assets needed:**
- [ ] Exterior capsule/planet background
- [ ] Robot sprite (standing)

**Alternative (SIMPLER):**
- Skip "walking around capsule" part
- Just show: outside → sees something → cliffhanger
- No player movement needed

---

## Simplified Alternative (If time is limited)

**Ultra-minimal teaser:**

1. **TitleScene** → "Start"
2. **Simple crash screen** (text only: "CRASH! You wake up in your capsule...")
3. **ShipFuelScene** (with updated story text)
4. **End screen** ("Thanks for playing! Full game coming soon. Replay?")

This skips custom intro scenes and focuses on the working puzzle.

---

## Questions for Implementation

### Story:
1. **Robot walking around capsule** - Skip this for teaser? (Complex to implement)
2. **Who is walking towards robot?** - Show silhouette or just text hint?
3. **Panel zoom effect** - Fade transition or skip (direct to puzzle)?

### Technical:
4. **Background images** - Do you have these ready? Or placeholder colored rectangles?
5. **Robot sprite** - Do you have this? Or just text-based for teaser?
6. **Dialog system** - Keep simple (click to advance) or add auto-advance timer?

### Scope:
7. **Target time** - How much time do you have for implementation?
8. **Which scenes are MUST-HAVE** vs nice-to-have?
9. **Testing** - Will verhaalmakers test before launch?

---

## Next Steps

1. Decide on scope (full vs simplified)
2. List required assets
3. Implement scenes in order
4. Test flow
5. Deploy teaser-release branch

**Recommendation:** Start with simplified version, add polish if time permits.
