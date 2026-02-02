# Telemetry Plan: Bug Reports, Error Logging & Analytics

## Overzicht

Drie features die dezelfde basis delen (device info, session ID, Firestore writes):

1. **Bug report knop** — testers melden handmatig bugs, device info wordt automatisch bijgevoegd
2. **Error logging** — JS errors worden automatisch naar Firestore gestuurd
3. **Game analytics** — sessies, puzzle starts/completions en tijdsduur bijhouden

Alle telemetry is fire-and-forget — mag nooit het spel breken. Budget systeem beschermt de Firestore Spark-limiet (20k writes/dag) zodat prijsinzendingen altijd werken.

---

## Architectuur

### Nieuwe bestanden

```
src/telemetry/
  deviceInfo.ts          — device info verzamelen (browser, OS, mobiel/desktop, scherm)
  session.ts             — session ID, scene tracker, initTelemetry() entry point
  telemetryFirestore.ts  — Firestore write functies + budget counter
  errorLogger.ts         — window.onerror + unhandledrejection handlers
  analytics.ts           — puzzle timing + event tracking via registry events
  bugReportButton.ts     — DOM overlay knop + modal (zelfde patroon als DebugMenu)
```

### Bestaande bestanden die aangepast worden

- `src/main.ts` — `initTelemetry(game)` aanroepen na game creation
- `firestore.rules` — 4 nieuwe collectie-regels toevoegen

---

## Gedeelde basis

### deviceInfo.ts
Verzamelt eenmalig en cachet:
- `navigator.userAgent` (max 300 chars)
- `navigator.platform`
- `screen.width` / `screen.height`
- `isMobile` (via `pointer: coarse` media query of scherm < 768px)
- `navigator.language`

### session.ts
- Genereert random `sessionId` per page load via `crypto.randomUUID()` (met fallback)
- Houdt referentie naar `Phaser.Game` voor `getCurrentSceneKey()` (via `game.scene.getScenes(true)[0]`, zelfde patroon als DebugMenu)
- Exporteert `initTelemetry(game)` als enige entry point (zie Wijzigingen in main.ts)

### telemetryFirestore.ts
Async functies via `addDoc` op `db` (uit bestaande `firebase/firestore.ts`):
- `submitBugReport(data)` → collectie `telemetry-bug-reports`
- `submitError(data)` → collectie `telemetry-errors`
- `submitAnalytics(data)` → collectie `telemetry-analytics`
- `checkAndReserveBudget(estimatedWrites)` → leest/update `telemetry-meta/today`

### Budget systeem
Voorkomt dat telemetry de Spark-limiet (20k writes/dag) opeet ten koste van prijsinzendingen.

- Document `telemetry-meta/today` bevat `{ date: "2026-02-02", count: 1234 }`
- Bij sessie-start: lees dit document
  - Document bestaat niet (eerste keer ooit) → behandel als count=0
  - `date` is niet vandaag → reset naar `{ date: vandaag, count: 0 }`
  - `count >= 15.000` → disable error logging en analytics voor deze sessie
  - Anders → increment `count` met geschat aantal writes (~10) via `FieldValue.increment()`
- Kost 1 read + 1 write per sessie
- **Bug reports schrijven altijd**, ongeacht budget
- Bij budget overschrijding: alleen error logging en analytics worden uitgeschakeld
- Marge: 5.000 writes/dag gereserveerd voor prijsinzendingen en leaderboard
- Bij read-fout (Firestore down): telemetry optimistisch inschakelen

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
  - `deviceInfo`, `currentScene`, `sessionId`
  - `registrySnapshot` (energy + alle `_solved` keys uit `PUZZLE_REWARDS`)
  - `createdAt` timestamp
- Na submit: kort "Bedankt!" bericht, modal sluit
- **Rate limit:** max 5 bug reports per sessie
- **Phaser input:** keyboard input gepauzeerd terwijl modal open is (`game.input.keyboard.enabled = false`), hersteld bij sluiten
- Altijd zichtbaar, niet achter `DEBUG` flag

---

## Feature 2: Error Logging

### errorLogger.ts
- `window.addEventListener("error", ...)` en `window.addEventListener("unhandledrejection", ...)`
- Per error wordt opgeslagen:
  - `message` (max 500 chars), `stack` (max 2000 chars)
  - `type` ("error" | "unhandledrejection")
  - `currentScene`, `sessionId`, `deviceInfo`, `url`
  - `createdAt` timestamp
- **Rate limit:** max 10 errors per sessie (voorkomt infinite loop → infinite writes)
- Writes zijn fire-and-forget

---

## Feature 3: Game Analytics

### analytics.ts
Houdt events bij in een array in memory. Flusht naar Firestore bij belangrijke momenten. Elk flush-document bevat alle events tot dan toe — het laatste document per `sessionId` is het meest compleet.

**Events:**
| Event | Trigger | Extra data |
|---|---|---|
| `session_start` | Bij init | — |
| `puzzle_start` | Scene wisselt naar puzzle scene | `puzzle` (scene key) |
| `puzzle_complete` | Registry `_solved` key wordt `true` | `puzzle`, `approxDurationMs`, `registryKey` |
| `game_complete` | Scene wisselt naar EndCreditsScene | `puzzlesSolved[]`, `energy` |

Elk document bevat ook `sessionId`, `deviceInfo` en `createdAt`.

**Flush momenten:**
1. Bij elke `puzzle_complete` — belangrijkste datapunten, minimaliseert dataverlies
2. Bij `game_complete` — finale snapshot
3. Bij `document.visibilitychange` → hidden — tab weg / telefoon lock
4. Bij `window.beforeunload` — tab sluiten (backup, onbetrouwbaar op mobiel)

Geen flush bij `puzzle_start` of `session_start` — meegenomen in eerstvolgende flush.

**Flush deduplicatie:** Niet flushen als er geen nieuwe events zijn sinds de laatste flush. Voorkomt lege writes bij snel alt-tabben.

**Puzzle detectie:**
- Set van bekende puzzle scene keys (uit DebugMenu's SCENES config)
- Scene-wisselingen: 500ms interval op `getCurrentSceneKey()`
- Puzzle completions: `game.registry.events.on("setdata")` EN `on("changedata")` op `puzzleSolvedRegistryKey`s uit `PUZZLE_REWARDS`. Beide events nodig: `setdata` vuurt bij nieuw spel (key bestaat nog niet), `changedata` bij hervat spel (key was als `false` geladen door BootScene).

**Hervat spel (resumed sessions):**
- BootScene laadt opgeslagen `_solved: true` keys → vuurt `setdata` events
- Zonder bescherming zou analytics phantom `puzzle_complete` events loggen
- **Oplossing:** Bij analytics init, snapshot van alle `_solved` keys die al `true` zijn. Event handler negeert keys die in de snapshot staan.
- De async budget check (Firestore read) zorgt dat analytics init na BootScene's save restore draait. De snapshot is extra beveiliging.

**Puzzle timing:**
- Bij `puzzle_start`: `startTime = Date.now()`
- Bij `visibilitychange` → hidden: accumuleer verstreken tijd, pauzeer
- Bij `visibilitychange` → visible: hervat timer
- Bij `puzzle_complete`: bereken `approxDurationMs` (bewust "approx" — benadering)

**Write volume:** ~8-10 writes per sessie. Met budget systeem: ~1.500 sessies/dag binnen 15k telemetry limiet.

---

## Firestore Security Rules

```
telemetry-bug-reports:  create only, velden gevalideerd
telemetry-errors:       create only, velden gevalideerd
telemetry-analytics:    create only, velden gevalideerd
telemetry-meta/today:   read + create + update (budget counter)
```

Lichtere validatie dan PII-collecties — alleen type checks en max lengtes.

---

## Wijzigingen in main.ts

Na de bestaande `DebugMenu` initialisatie:

```typescript
import { initTelemetry } from "./telemetry/session";
initTelemetry(game);
```

`initTelemetry(game)` doet:
1. Genereer sessionId
2. Start bug report knop (altijd, ongeacht budget)
3. `await checkAndReserveBudget(10)`
4. Budget ok → start error logger en analytics
5. Budget op → error logger en analytics niet gestart

Niet achter `DEBUG` flag — telemetry draait altijd.

---

## Data uitlezen

Collecties zijn write-only vanuit de client. Lezen kan via:
- Firebase Console (handmatig)
- Firestore REST API (Claude kan aanroepen en samenvatten)
- `firebase` CLI

---

## Verificatie

1. `npm run build` — compileert zonder errors
2. Browser → bug report knop zichtbaar links-onder
3. Bug melden → verstuur → check Firebase Console `telemetry-bug-reports`
4. Console: `throw new Error("test")` → check `telemetry-errors`
5. Puzzel spelen → check `telemetry-analytics` voor events
6. Hervat spel → check dat al opgeloste puzzels NIET als nieuwe events verschijnen
7. `firebase deploy --only firestore:rules`

---

## AVG / Privacy

- Geen persoonsgegevens (alleen technische device info)
- Geen cookies nodig
- Rechtsgrond: gerechtvaardigd belang (foutopsporing)
- Vermeld in privacybeleid dat technische gegevens worden gelogd
- Verwijder telemetry-collecties wanneer niet meer nodig
