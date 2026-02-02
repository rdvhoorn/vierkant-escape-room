# Telemetry Plan: Bug Reports, Error Logging & Analytics

## Overzicht

Drie features die dezelfde basis delen (device info, session ID, Firestore writes):

1. **Bug report knop** — testers melden handmatig bugs, device info wordt automatisch bijgevoegd
2. **Error logging** — JS errors worden automatisch naar Firestore gestuurd
3. **Game analytics** — sessies, puzzle starts/completions en tijdsduur bijhouden

## Nieuwe bestanden

```
src/telemetry/
  deviceInfo.ts          — device info verzamelen (browser, OS, mobiel/desktop, scherm)
  session.ts             — session ID + huidige scene opvragen
  telemetryFirestore.ts  — Firestore write functies voor de 3 collecties
  errorLogger.ts         — window.onerror + unhandledrejection handlers
  analytics.ts           — puzzle timing + event tracking via registry events
  bugReportButton.ts     — DOM overlay knop + modal (zelfde patroon als DebugMenu)
```

## Bestaande bestanden die aangepast worden

- `src/main.ts` — telemetry initialiseren na game creation (4 imports + 4 regels init)
- `firestore.rules` — 3 nieuwe collectie-regels toevoegen

## Gedeelde basis

### deviceInfo.ts
Verzamelt eenmalig en cachet:
- `navigator.userAgent` (max 300 chars)
- `navigator.platform`
- `screen.width` / `screen.height`
- `isMobile` (via `pointer: coarse` media query of scherm < 768px)
- `navigator.language`

### session.ts
- Genereert een random `sessionId` per page load via `crypto.randomUUID()` (met fallback)
- Houdt referentie naar `Phaser.Game` voor `getCurrentSceneKey()` (via `game.scene.getScenes(true)[0]`, zelfde patroon als DebugMenu)

### telemetryFirestore.ts
Drie async functies die `addDoc` aanroepen op `db` (geimporteerd uit bestaande `firebase/firestore.ts`):
- `submitBugReport(data)` → collectie `telemetry-bug-reports`
- `submitError(data)` → collectie `telemetry-errors`
- `submitAnalytics(data)` → collectie `telemetry-analytics`

Alle writes zijn fire-and-forget (`.catch(() => {})` in de callers). Telemetry mag nooit het spel breken.

---

## Feature 1: Bug Report Knop

### bugReportButton.ts
DOM overlay, zelfde patroon als `src/ui/DebugMenu.ts`:
- Kleine ronde knop links-onder (`position: fixed; bottom: 12px; left: 12px`)
- Tekst: "Bug melden" (tooltip), icoon: kever-emoji
- Klik opent modal met:
  - Textarea ("Beschrijf de bug..."), max 2000 chars
  - "Verstuur" en "Annuleer" knoppen
- Bij submit wordt automatisch bijgevoegd:
  - `deviceInfo` (uit deviceInfo.ts)
  - `currentScene` (welke scene is actief)
  - `sessionId`
  - `registrySnapshot` (energy + alle `_solved` keys uit `PUZZLE_REWARDS`)
  - `createdAt` timestamp
- Na submit: kort "Bedankt!" bericht, modal sluit

De knop is altijd zichtbaar, niet achter `DEBUG` flag (testers hebben hem nodig).

---

## Feature 2: Error Logging

### errorLogger.ts
- Registreert `window.addEventListener("error", ...)` en `window.addEventListener("unhandledrejection", ...)`
- Per error wordt opgeslagen:
  - `message` (max 500 chars)
  - `stack` (max 2000 chars)
  - `type` ("error" | "unhandledrejection")
  - `currentScene`, `sessionId`, `deviceInfo`, `url`
  - `createdAt` timestamp
- **Rate limit**: max 10 errors per sessie (voorkomt infinite loop → infinite writes)
- Writes zijn fire-and-forget

---

## Feature 3: Game Analytics

### analytics.ts
Houdt events bij in een array in memory, flusht naar Firestore bij sessie-einde.

**Events die worden getrackt:**
| Event | Trigger | Extra data |
|---|---|---|
| `session_start` | Bij init | — |
| `puzzle_start` | Scene wisselt naar puzzle scene | `puzzle` (scene key) |
| `puzzle_complete` | Registry `_solved` key wordt `true` | `puzzle`, `approxDurationMs`, `registryKey` |
| `game_complete` | Scene wisselt naar EndCreditsScene | `puzzlesSolved[]`, `energy` |

**Puzzle detectie:**
- Set van bekende puzzle scene keys (uit DebugMenu's SCENES config)
- Scene-wisselingen gedetecteerd via 500ms interval op `getCurrentSceneKey()` (zelfde als DebugMenu)
- Puzzle completions gedetecteerd via `game.registry.events.on("changedata")` — luistert op de `puzzleSolvedRegistryKey`s uit `PUZZLE_REWARDS`

**Timing:**
- Bij puzzle_start: sla `startTime = Date.now()` op
- Bij `document.visibilitychange` → `hidden`: accumuleer verstreken tijd, pauzeer
- Bij `document.visibilitychange` → `visible`: hervat timer
- Bij puzzle_complete: bereken `approxDurationMs` (inclusief pauze-correctie)
- Veld heet bewust `approxDurationMs` — het is een benadering

**Flush strategie:**
- Events stapelen op in memory
- Flush (schrijf naar Firestore) bij:
  1. `document.visibilitychange` → hidden (tab weg / telefoon lock)
  2. `window.beforeunload` (tab sluiten)
  3. Game complete (EndCreditsScene bereikt)
- Elke flush maakt een nieuw document met alle events tot dan toe
- Laatste document per `sessionId` is het meest compleet

---

## Firestore Security Rules

Drie nieuwe collecties, allemaal write-only (geen reads/updates/deletes):

```
telemetry-bug-reports: create only, velden gevalideerd
telemetry-errors: create only, velden gevalideerd
telemetry-analytics: create only, velden gevalideerd
```

Lichtere validatie dan de PII-collecties — alleen type checks en max lengtes.

---

## Wijzigingen in main.ts

Na de bestaande `DebugMenu` initialisatie (regel 122-124):

```typescript
import { initSession } from "./telemetry/session";
import { initErrorLogger } from "./telemetry/errorLogger";
import { initAnalytics } from "./telemetry/analytics";
import { BugReportButton } from "./telemetry/bugReportButton";

// Na game creation:
initSession(game);
initErrorLogger();
initAnalytics(game);
new BugReportButton(game);
```

Niet achter `DEBUG` flag — telemetry draait altijd tijdens testfase.

---

## Data uitlezen achteraf

De collecties zijn write-only vanuit de client. Om data te lezen:
- Via Firebase Console (handmatig)
- Via Firestore REST API (Claude kan dit aanroepen om data samen te vatten)
- Via `firebase` CLI

---

## Verificatie

1. `npm run build` — TypeScript compileert zonder errors
2. Open het spel in de browser → bug report knop zichtbaar links-onder
3. Klik "Bug melden" → vul tekst in → verstuur → check Firebase Console voor document
4. Gooi een error in de console (`throw new Error("test")`) → check `telemetry-errors`
5. Speel een puzzel → check `telemetry-analytics` voor session_start + puzzle_start + puzzle_complete events
6. `firebase deploy --only firestore:rules` → security rules actief

---

## AVG / Privacy

- Geen persoonsgegevens in telemetry (alleen technische device info)
- Geen cookies nodig
- Rechtsgrond: gerechtvaardigd belang (foutopsporing)
- Vermeld in privacybeleid dat technische gegevens worden gelogd voor foutopsporing
- Verwijder telemetry-collecties na de testfase
