# Face11 - Slot Puzzel Plan

## Verhaal

### Intro dialoog (bij interactie met UFO)
| Speaker | Tekst |
|---------|-------|
| ??? | "HELP! HELP! IEMAND HELP!!!" |
| Speler | "Hallo! Hoe kan ik helpen?" |
| ??? | "Nou kijk, ik was bezig met het vervangen van het tijdstof-filter. Daarna heb ik de koepel weer dichtgelast van binnenuit en nu zit ik opgesloten!" |
| Speler | "Hahaha, komt goed, ik zie hier een cijferslot op de deur. Vertel me de code en ik bevrijd je." |
| ??? | "OH NEEEE!! Die heb ik laatst vervangen en nu weet ik het niet meer." |
| Speler | "Heb je de code nergens opgeschreven?" |
| ??? | "Ja! Nee… Nou ja, ik wilde het niet letterlijk opschrijven, dus ik heb er een soort puzzel van gemaakt. In een vakje naast de deur kun je een briefje vinden. Daarop staan hints voor de code. Maar of dat genoeg is…" |

### Puzzel (Mastermind)
```
478 → 1 goed, verkeerde plaats
368 → 1 goed, goede plaats
374 → 1 goed, verkeerde plaats
740 → 2 goed, verkeerde plaats
```
**Antwoord: 067**

### Outro dialoog (na correct antwoord)
| Speaker | Tekst |
|---------|-------|
| Narrator | Je toetst de code in op het slot en... yes, de deur kan open! |
| Erwts | "Dankjewel voor je hulp!" |
| Erwts | "Ik ben Erwts, wat kan ik voor je doen om te laten zien hoe dankbaar ik ben dat je me hebt kunnen bevrijden?" |
| Speler | "Nou, ik moet terug naar planeet aarde, heb je misschien wat energie voor mij?" |
| Erwts | "Met zo'n groot ruimteschip heb ik altijd extra energie bij me. Hier, neem dit maar mee." |
| Speler | "Bedankt Erwts. En pas op met het slot, als je gaat klussen." |

---

## Technisch Plan

### 1. Face11Scene.ts
- Laad UFO image (`assets/decor/slot/ufo met slot.webp`)
- Toon UFO in het midden van de face
- Bij interactie: start intro dialoog
- Na dialoog: start SlotScene

### 2. SlotScene.ts (nieuwe scene)
- Toon het briefje met de 4 hints
- 3 draaiwielen/invoervelden voor cijfers (0-9)
- Check knop om antwoord te valideren
- Bij correct (067): terug naar Face11Scene met success state
- Bij fout: feedback ("Dat klopt niet, probeer opnieuw")

### 3. Reward
- Energie toevoegen aan speler inventory (hoeveel?)

---

## Vragen

### 1. Karakter "Erwts"
- Is er al een sprite/afbeelding voor Erwts? Of moet die nog gemaakt worden?
- Zo niet: moet Erwts zichtbaar zijn, of alleen stem vanuit het schip?

### 2. Energie reward
- Hoeveel energie levert deze puzzel op? (andere puzzels: KVQ=20, Tangram=10, ShipFuel=50, Tower=50)

### 3. SlotScene UI
- Wil je draaiwielen (zoals een echt cijferslot)?
- Of simpele +/- knoppen per cijfer?
- Of een numpad om de code in te typen?

### 4. Herhaalbaarheid
- Kan de speler de puzzel opnieuw doen na oplossen? Of is het eenmalig?
- Wat gebeurt er als je terugkomt op Face11 na oplossen?

### 5. Hints briefje
- Moet het briefje er uitzien als een echt papieren briefje?
- Of gewoon tekst op het scherm?

### 6. Assets
- `ufo met slot.webp` bestaat (17KB) - is dit groot genoeg / juiste formaat?
- Zijn er nog andere assets nodig?
