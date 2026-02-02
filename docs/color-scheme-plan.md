# Plan: Switchable Color Schemes (Original vs Hemisphere)

## Probleem

Testers raken verdwaald op de planeet. De huidige kleuren zijn:
- Allemaal erg donker en desaturated
- Sommige bijna identiek (Face1 en Face3 zijn beide donkergroen)
- Er is geen visueel onderscheid tussen "boven" en "onder" op de dodecaëder

## Oplossing

Twee kleurschema's die developers/testers kunnen vergelijken via het debug menu:
- **original**: de huidige kleuren (als fallback)
- **hemisphere**: lichtere kleuren voor het noorden, donkerdere voor het zuiden

### Waarom hemisferen?

Van elk vlak op de planeet zie je altijd precies één pool:
- Vanuit Face2-6 (top ring) → je ziet altijd Face1 (noordpool)
- Vanuit Face7-11 (bottom ring) → je ziet altijd Face12 (zuidpool)

Als de twee hemisferen duidelijk visueel verschillen (licht vs donker), weet een speler meteen in welke helft van de planeet ze zijn. De polen dienen als ankerpunten.

## Nieuwe kleuren (hemisphere schema)

### Top hemisfeer (lichter, warmer)

| Face | Hex | Kleur | Rol |
|------|-----|-------|-----|
| Face1 | `0x4a9e3f` | helder groen | **Noordpool** — ankerpunt |
| Face2 | `0x4a7ab8` | helder blauw | top ring |
| Face3 | `0xb8a44a` | goud/geel | top ring |
| Face4 | `0xb84a7a` | roze/magenta | top ring |
| Face5 | `0xb8784a` | oranje/amber | top ring |
| Face6 | `0x8a4ab8` | paars/lavendel | top ring |

### Bottom hemisfeer (donkerder, koeler)

| Face | Hex | Kleur | Rol |
|------|-----|-------|-----|
| Face7 | `0x5e2d7a` | donker paars | bottom ring |
| Face8 | `0x2d5a7a` | donker teal | bottom ring |
| Face9 | `0x7a2d2d` | donker rood | bottom ring |
| Face10 | `0x7a5a2d` | donker bruin/amber | bottom ring |
| Face11 | `0x2d7a4a` | donker bosgroen | bottom ring |
| Face12 | `0x2a1a4d` | diep indigo | **Zuidpool** — ankerpunt |

### Burencontrast check

Elke face heeft 5 buren. Geen twee buren mogen te veel op elkaar lijken:

- **Face1** (groen) buren: blauw, goud, roze, oranje, paars ✓
- **Face2** (blauw) buren: groen, goud, paars, donkerpaars, donkerbosgroen ✓
- **Face3** (goud) buren: groen, blauw, donkerpaars, donkerteal, roze ✓
- **Face4** (roze) buren: groen, goud, donkerteal, donkerrood, oranje ✓
- **Face5** (oranje) buren: groen, roze, donkerrood, donkerbruin, paars ✓
- **Face6** (paars) buren: groen, oranje, donkerbruin, donkerbosgroen, blauw ✓
- **Face7** (donkerpaars) buren: blauw, goud, donkerteal, indigo, donkerbosgroen ✓
- **Face8** (donkerteal) buren: goud, roze, donkerrood, indigo, donkerpaars ✓
- **Face9** (donkerrood) buren: roze, oranje, donkerbruin, indigo, donkerteal ✓
- **Face10** (donkerbruin) buren: oranje, paars, donkerbosgroen, indigo, donkerrood ✓
- **Face11** (donkerbosgroen) buren: paars, blauw, donkerpaars, indigo, donkerbruin ✓
- **Face12** (indigo) buren: donkerpaars, donkerteal, donkerrood, donkerbruin, donkerbosgroen ✓

## Implementatie

### Bestanden

1. **`src/scenes/face_scenes/_FaceConfig.ts`**
   - Twee kleurpaletten: `PALETTE_ORIGINAL` en `PALETTE_HEMISPHERE`
   - Module-level state + exported getter/setter voor actief schema
   - `resolveFaceConfig()` leest kleur uit actief palet

2. **`src/ui/DebugMenu.ts`**
   - Dropdown in "Debug Visuals" sectie: kies "original" of "hemisphere"
   - Bij wisseling: `setColorScheme()` + herstart huidige scene

### Hoe het werkt

```
buildNeighborColorMap() → resolveFaceConfig() → actief palet → juiste kleur
Scene.create()          → resolveFaceConfig() → actief palet → juiste kleur
```

Eén source of truth, automatisch consistent voor zowel het vlak zelf als alle buurweergaven.

## Verificatie

- [ ] Open game, druk `\` voor debug menu
- [ ] Toggle tussen "original" en "hemisphere"
- [ ] Check dat elk vlak de juiste kleur toont
- [ ] Check dat geprojecteerde buurvlakken de juiste kleur van hun doelvlak tonen
- [ ] Navigeer tussen vlakken: kleuren zijn consistent
- [ ] Top hemisfeer voelt duidelijk lichter dan bottom hemisfeer
