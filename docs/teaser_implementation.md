# Teaser Implementation

## Scene Flow

```
PreloadScene → TitleScene → CockpitScene (intro) → ShipFuelScene (puzzel) → CockpitScene (na puzzel) → Face1Scene → Quadratus dialoog → Einde popup
```

---

## 1. PreloadScene
- Laadt alle assets
- Toont loading bar

## 2. TitleScene
- "Klik hier om te starten"
- → CockpitScene

---

## 3. CockpitScene - Intro fase 1
**Conditie:** `electricitySolved = false`, `introDone = false`

**Wat de speler ziet:**
- Binnenkant raket met sterren door ramen
- Lampjes groen
- Energie op 90%
- Navigatie wijst naar HEINO (onderweg naar aarde)
- De snelheidswijzer moet op ongeveer 2:00 uur staan. Klein beetje trillen.

**Na paar seconden automatisch → Intro fase 2**

---

## 4. CockpitScene - Intro fase 2 (crash)
**Wat er gebeurt:**
- Screenshake
- Lampjes springen op ALARM (rood knipperen)
- Optioneel: rondtollen effect
- Fade naar zwart

**Na fade → Capsule onderzoeken**
- Fade van zwart naar cockpitscene
- Eerste 3 seconde is alles wazig, maar het wordt langzaam scherp terwijl je met je ogen knippert
- Als je weer scherp ziet: Navigatie springt automatisch naar DEZONIA


---

## 5. CockpitScene - Capsule onderzoeken
**Conditie:** `electricitySolved = false`, `introDone = true`

**Wat de speler ziet:**
- Fade in van zwart
- Veel lampjes uit
- ELEKTRA paneel licht op (gloeit/pulseert)
- Energie leeg, geen percentage aanduiding (of "---")

**Interactie:**
- Klik op ELEKTRA → ShipFuelScene

---

## 6. ShipFuelScene - Puzzel
**De draadpuzzel (bestaat al)**

**Navigatie:**
- ESC → terug naar CockpitScene (capsule onderzoeken)
- Puzzel oplossen → `electricitySolved = true` → terug naar CockpitScene

---

## 7. CockpitScene - Na puzzel opgelost
**Conditie:** `electricitySolved = true`

**Wat de speler ziet:**
- Lampjes gaan weer aan (sommige groen)
- Energie op 10%
- Navigatie werkt weer

**TODO:** Gedachtewolkjes/dialoog hier?
- "Yes! De systemen werken weer!"
- "Maar de energie is bijna op..."
- "Ik moet uitstappen en onderzoeken waar ik ben."

**Interactie:**
- Knop "Uitstappen" of automatisch? → Face1Scene

---

## 8. Face1Scene - Buiten bij capsule
**Wat de speler ziet:**
- Rondlopen op planeet bij gecrashte capsule
- Na X seconden of bij bepaalde plek → Quadratus verschijnt

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
**Trigger:** Na Quadratus dialoog, of bij interactie met puzzleZone

**Tekst:**
"Dit was de teaser voor de escape room! Kom in januari terug voor meer!"

**Interactie:**
- Klik op popup om te sluiten
- Speler kan daarna nog rondlopen

---

## Registry Variabelen

| Variabele | Beschrijving |
|-----------|--------------|
| `introDone` | Intro crash sequence afgerond |
| `electricitySolved` | Draadpuzzel opgelost |
| `quadratusDialogSeen` | Quadratus dialoog is getoond |

---

## Bestaande Scenes

| Scene | Status | Aanpassingen nodig |
|-------|--------|-------------------|
| PreloadScene | ✅ | - |
| TitleScene | ✅ | - |
| CockpitScene | ✅ | Intro animatie, conditonele states |
| ShipFuelScene | ✅ | ESC naar CockpitScene (done) |
| Face1Scene | ✅ | Quadratus dialoog toevoegen |

---

## TODO

- [x] CockpitScene: Intro fase 1 (alles groen, onderweg)
- [x] CockpitScene: Intro fase 2 (crash, screenshake, alarm)
- [x] CockpitScene: Conditie voor "capsule onderzoeken" (lampjes uit)
- [x] CockpitScene: Conditie voor "na puzzel" (lampjes aan, 10%)
- [x] Face1Scene: Quadratus dialoog (met portrait)
- [x] Teaser einde popup
- [ ] Optioneel: Blur shader voor wake-up effect
