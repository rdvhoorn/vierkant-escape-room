# Vierkant Escape Room - Project Context

## Project Doel

Een browser-based escape room game voor basisschoolleerlingen (groep 6, 7, 8). Kinderen die succesvol ontsnappen maken kans om gratis mee te gaan naar een wiskundekamp.

**Tech Stack:** Phaser 3, TypeScript, Vite

---

## Taalgebruik

- **Code:** Engels (variabelen, functies, comments, logs)
- **UI/gebruikerstekst:** Nederlands, geschikt voor 10-12 jarigen
- **Git commits:** Engels
- **Developer logs:** Engels

---

## Git Commits

**Voeg NOOIT toe:**
- ❌ `Co-Authored-By: Claude <noreply@anthropic.com>`
- ❌ `🤖 Generated with [Claude Code]`

Schrijf heldere commit messages in het Engels, volg bestaande stijl (`git log`).

---

## Communicatie met Claude

- **Wees kritisch** - niet overal "ja" op zeggen
- **Vraag door** bij onduidelijkheden
- **Zeg "nee"** als iets technisch niet werkt
- **Stel alternatieven voor** als je een betere aanpak ziet
- **Daag aannames uit** - help bij goede beslissingen

---

## Development Principes

### Scene State Management (Phaser)

Reset een variabele in `create()` als je wilt dat deze elke keer opnieuw start. `constructor()` draait maar 1x, `create()` bij elke `scene.start()`.

```typescript
// ✅ Reset bij elke scene start
create() {
  this.dialogIndex = 0;
  this.isPuzzleActive = false;
}

// ℹ️ Draait maar 1x - gebruik voor permanente state
constructor() {
  super("MyScene");
}
```

### Production Builds

Maak productie builds altijd in de `builds/` folder met timestamp:

```bash
npm run build
mkdir -p builds
zip -r "builds/teaser-$(date +%Y%m%d-%H%M%S).zip" dist/
```

De `builds/` folder en `*.zip` bestanden worden automatisch genegeerd door git.
