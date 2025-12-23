# Teaser Implementation

## Scene Flow

```
PreloadScene → TitleScene → CockpitScene (intro) → ShipFuelScene (puzzel) → CockpitScene (na puzzel) → Face1Scene → Quadratus dialoog → Einde popup
```

---

## 1. PreloadScene

-   Laadt alle assets
-   Toont loading bar

## 2. TitleScene

-   "Klik hier om te starten"
-   → CockpitScene

---

## 3. CockpitScene - Intro fase 1

**Conditie:** `electricitySolved = false`, `introDone = false`

**Wat de speler ziet:**

-   Binnenkant raket met sterren door ramen
-   Lampjes groen
-   Energie op 90%
-   Navigatie wijst naar HEINO (onderweg naar aarde)
-   De snelheidswijzer moet op ongeveer 2:00 uur staan. Klein beetje trillen.

**Na paar seconden automatisch → Intro fase 2**

---

## 4. CockpitScene - Intro fase 2 (crash)

**Wat er gebeurt:**

-   Screenshake
-   Lampjes springen op ALARM (rood knipperen)
-   Optioneel: rondtollen effect
-   Fade naar zwart
-   `introDone = true` → scene restart in damaged state

**Na fade → Wake-up effect:**

-   Fade van zwart naar cockpitscene (damaged state)
-   Eerste 1.5 seconden: alles wazig + ogen knipperen effect (2x blink)
-   Blur verdwijnt geleidelijk
-   Navigatie blijft UIT (leeg scherm)

**Gedachtewolkjes na wake-up (geïmplementeerd):**

> "Waar ben ik? Wat is er gebeurd? Waar is iedereen?"
> "Ik weet nog dat we gisteren onze ruimte-missie hebben afgerond en dat we daarna allemaal in onze eigen capsules naar de aarde terug gingen."
> "Zo te zien ben ik niet op de aarde. Ik moet uitzoeken waar ik ben."
> "Wacht... het paneel! Alle draden zijn los!"

**Implementatie:** Dialoog overlay met 4 regels, speler klikt door met "Klik →" hint

---

## 5. CockpitScene - Capsule onderzoeken

**Conditie:** `electricitySolved = false`, `introDone = true`

**Wat de speler ziet:**

-   Fade in van zwart
-   Veel lampjes uit
-   ELEKTRA paneel licht op (gloeit/pulseert)
-   Energie leeg, geen percentage aanduiding (of "---")
-   Navigatie volledig UIT (leeg scherm, geen NAVIGATIE tekst, geen bestemmingen, geen afstand)
-   Snelheidsmeter staat stil op 0km/u op 7:00 uur positie (links beneden).

**Interactie:**

-   Klik op ELEKTRA → ShipFuelScene

---

## 6. ShipFuelScene - Puzzel

**De draadpuzzel (bestaat al)**

**Intro tekst bij puzzle (optioneel):**

> "O nee, alle draden zijn los! Dit moet ik repareren."
> "Elke draad had zijn eigen kleur. Dus ik moet dezelfde kleur draden met elkaar verbinden."
> "Draden die elkaar kruisen zijn gevaarlijk, dus ik moet ze zo verbinden dat ze elkaar niet kruisen."

**Instructies in beeld:**

-   "Verbind dezelfde kleuren met elkaar"
-   "Zorg dat draden elkaar niet kruisen"

**Navigatie:**

-   ESC → terug naar CockpitScene (capsule onderzoeken)
-   Puzzel oplossen → "Gelukt..." confetti → `electricitySolved = true` → automatisch terug naar CockpitScene (repaired state)

**Implementatie:** Intro tekst kan als dialog overlay, of in instructie rechts van puzzle

---

## 7. CockpitScene - Na puzzel opgelost

**Conditie:** `electricitySolved = true`

**Wat de speler ziet:**

-   Lampjes gaan weer aan (sommige groen, schild blijft uit)
-   Energie op 10% (rood)
-   Navigatie werkt weer (DEZONIA geselecteerd, afstand "HIER")
-   Snelheidsmeter blijft stil op 0km/u op 7:00 uur positie (links beneden).

**Gedachtewolkjes (geïmplementeerd):**

> "Yes! De systemen werken weer!"
> "Maar de energie is volledig op, reizen zal dus niet meer lukken."
> "Volgens mijn navigatie ben ik op Dezonia?"
> "Ik moet uitstappen om dit te onderzoeken."

**Interactie:**

-   4 gedachtewolkjes verschijnen automatisch na 800ms
-   Dialog box gepositioneerd voor het raam (35% van top)
-   Transparante overlay (25% alpha) voor zichtbaarheid dashboard
-   Speler klikt door de gedachtewolkjes (4 regels)
-   Na laatste klik: 500ms pauze → fade → Face1Scene

---

## 8. Face1Scene - Buiten bij capsule

**Wat de speler ziet:**

-   Rondlopen op planeet bij gecrashte capsule

**Quadratus trigger:**

-   Na 2 seconden automatisch → Quadratus dialog start
-   Of: bij interactie met puzzleZone (E-toets)

**Gedachtewolkje voor Quadratus (optioneel):**

> "He, wat zie ik daar? Het lijkt wel of iemand deze kant op komt lopen."

**Implementatie:** Dit kan ook overgeslagen, Quadratus dialog start gewoon direct

---

## 9. Quadratus Dialoog

**Locatie:** In Face1Scene of aparte DialogScene

**Dialoog:**

```
Q: "Hoi vreemdeling, ik ben Quadratus de Espirantus. Welkom op de planeet Dezonia!"
Ik (gedachte): "Quadratus lijkt vriendelijk en ik kan wel wat hulp gebruiken."
Ik: "Hoi Quadratus, ik ben ... en ik ben een beetje verdwaald geloof ik."
Ik: "Ik was op weg naar de Aarde met mijn capsule, maar nu ben ik ineens hier."
Ik: "Mijn capsule doet het nog, maar de energietank is helemaal leeg. Hoe kom ik nu naar huis?"
Q: "Ach vreemdeling toch, wat een pech. Gelukkig is er hier op Dezonia ook energie te vinden..."
Ik: "Nou, dat biedt hoop, dank je wel Quadratus!"
Q: "Veel succes, vreemdeling!"
Q: "Het is aan jou of je de hele planeet wil ontdekken, of al eerder terug wil keren naar huis."
Ik: "Wacht! Ga je niet met me mee?"
Q: "Nee, maar ik denk niet dat dit de laatste keer is dat we elkaar zien."
```

---

## 10. Teaser Einde Popup

**Trigger:** Automatisch 500ms na Quadratus dialoog afgelopen

**Visueel:**

-   Dark overlay (70% alpha)
-   Popup box met border
-   Confetti effect (50 particles)

**Tekst:**

```
✨ Gelukt! ✨

Dit was de teaser voor de escape room!
Kom in januari terug voor meer!
```

**Interactie:**

-   Klik op popup om te sluiten
-   Speler kan daarna nog vrij rondlopen op Face1Scene
-   Bij opnieuw naar puzzleZone gaan → popup verschijnt weer

---

## Registry Variabelen

| Variabele             | Beschrijving                  |
| --------------------- | ----------------------------- |
| `introDone`           | Intro crash sequence afgerond |
| `electricitySolved`   | Draadpuzzel opgelost          |
| `quadratusDialogSeen` | Quadratus dialoog is getoond  |

---

## Bestaande Scenes

| Scene         | Status | Aanpassingen nodig                 |
| ------------- | ------ | ---------------------------------- |
| PreloadScene  | ✅     | -                                  |
| TitleScene    | ✅     | -                                  |
| CockpitScene  | ✅     | Intro animatie, conditonele states |
| ShipFuelScene | ✅     | ESC naar CockpitScene (done)       |
| Face1Scene    | ✅     | Quadratus dialoog toevoegen        |

---

## Implementatie Status

✅ **Volledig geïmplementeerd:**

-   CockpitScene: Intro fase 1 (alles groen, 90% energie, HEINO)
-   CockpitScene: Intro fase 2 (crash sequence met shake/flash/fade)
-   CockpitScene: Wake-up effect (blink, blur fade-out)
-   CockpitScene: Damaged state (lampjes uit, ELEKTRA pulseert, 0% energie)
-   CockpitScene: Repaired state (lampjes aan, 10% energie, DEZONIA)
-   ShipFuelScene: Elektriciteitspuzzle met kortsluiting + confetti
-   Face1Scene: Quadratus dialoog met portrait (10 regels)
-   Face1Scene: Teaser einde popup met confetti
-   Registry state management (introDone, electricitySolved, quadratusDialogSeen)

⚠️ **Optionele toevoegingen:**

-   [x] Gedachtewolkjes na wake-up (4 regels) - GEÏMPLEMENTEERD
-   [ ] Intro tekst bij puzzle (3 regels) - kan in instructies rechts
-   [ ] Instructies rechts van puzzle visueel
-   [x] Gedachtewolkjes na puzzel (4 regels) - GEÏMPLEMENTEERD
-   [ ] Gedachtewolkje voor Quadratus (1 regel) - kan overgeslagen
