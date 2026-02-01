# Deploy Workflow

## De twee repo's

| Repo | Doel | Auto-deploy |
|------|------|-------------|
| `rdvhoorn/vierkant-escape-room` | Ontwikkeling | Nee |
| `HildoBijl/escaperoom` | Productie + previews | Ja, via GitHub Actions |

De repo's hebben **gescheiden git histories** — ze zijn niet geforkt.
Je kunt niet gewoon mergen of pushen tussen de twee.

Hildo's repo is een monorepo met twee apps:
- `apps/escape_a_2025/` — onze Phaser game
- `apps/escape_b_2024/` — Hildo's originele React escape room

## Git remotes (lokaal)

```bash
# Eenmalig instellen:
git remote add hildo https://github.com/HildoBijl/escaperoom.git
```

Daarna heb je:
```
origin  → rdvhoorn/vierkant-escape-room   (ontwikkeling)
hildo   → HildoBijl/escaperoom            (productie)
```

## Hoe deployen werkt

Op Hildo's repo draaien GitHub Actions:

- **PR naar elke branch** → Firebase bouwt een preview en plaatst de URL als comment op de PR
- **Merge naar `main`** → Automatische deploy naar `vierkantescaperoom.nl`

De build draait: `tsc && vite build` voor beide apps. Als een van beide faalt, geen deploy.

## Preview deployen (stap voor stap)

### 1. Zorg dat je lokaal schoon bent

```bash
# Op onze repo, branch main:
npx tsc --noEmit
```

Moet **0 errors** geven. De CI op Hildo's repo is strenger dan lokaal ontwikkelen —
unused variables, type-only imports etc. breken de build.

### 2. Maak een worktree van Hildo's full_version

```bash
git fetch hildo
git worktree add /tmp/hildo-deploy hildo/full_version
```

Dit checkt Hildo's `full_version` branch uit in een aparte map,
zonder je werkdirectory te verstoren.

### 3. Kopieer onze broncode

```bash
rsync -av --delete src/ /tmp/hildo-deploy/apps/escape_a_2025/src/
rsync -av --delete public/ /tmp/hildo-deploy/apps/escape_a_2025/public/
```

`--delete` verwijdert bestanden die bij ons niet meer bestaan.
Kopieer ALLEEN `src/` en `public/`. Config bestanden (`package.json`,
`tsconfig.json`, `vite.config.js`) staan al goed in Hildo's repo.

### 4. Commit en push naar `full_version`

```bash
cd /tmp/hildo-deploy
git add apps/escape_a_2025/
git commit -m "Update escape_a_2025 with latest changes"
git push hildo HEAD:full_version
```

Dit updatet Robin's `full_version` branch direct. Zijn bestaande PR #5
(full_version → main) wordt automatisch bijgewerkt, inclusief de preview URL.

> **Alternatief: eigen branch + aparte PR**
>
> Als je liever niet direct op `full_version` pusht (bijv. om eerst te testen):
> ```bash
> git checkout -b misha/mijn-update
> git push hildo misha/mijn-update
> gh pr create --repo HildoBijl/escaperoom \
>   --base full_version \
>   --head misha/mijn-update \
>   --title "Update beschrijving"
> ```
> Dit maakt een aparte PR met een eigen preview URL. Nadeel: de wijzigingen
> zitten dan niet in Robin's PR totdat je merget.

### 5. Wacht op de preview URL

GitHub Actions bouwt automatisch een preview bij elke PR (naar elke branch).
Na ~2 minuten verschijnt een comment op de PR met een URL als:
`https://vierkantescaperoom--pr5-full-version-abc123.web.app`

### 7. Opruimen

```bash
# Na afloop worktree verwijderen:
git worktree remove /tmp/hildo-deploy
```

## Veelvoorkomende problemen

### Build faalt op unused variables

```
error TS6133: 'foo' is declared but its value is never read.
```

Fix: variabele verwijderen. Draai `npx tsc --noEmit` lokaal voordat je pusht.

### Build faalt op type-only imports

```
error TS1484: 'Edge' is a type and must be imported using a type-only import
```

Fix: verander `import { Edge }` naar `import type { Edge }`.
Dit gebeurt als Hildo's tsconfig `verbatimModuleSyntax` aan heeft staan.

### Preview URL verschijnt niet

De preview wordt alleen gegenereerd als de build slaagt.
Check de Actions tab op Hildo's repo voor build logs.

## Alternatief: direct deployen vanuit onze repo

In plaats van code kopiëren naar Hildo's repo, kun je ook direct vanuit
onze repo een preview deployen via de Firebase CLI.

### Handmatig (eenmalig of incidenteel)

```bash
npm run build
firebase hosting:channel:deploy mijn-preview --expires 7d
```

Dit uploadt `dist/` naar een tijdelijke URL als:
`https://vierkantescaperoom--mijn-preview-abc123.web.app`

Vereist: Firebase CLI geïnstalleerd + ingelogd met een account dat
toegang heeft tot het Firebase project.

### Automatisch via GitHub Actions (structureel)

Voeg een workflow toe aan onze repo zodat elke push/PR automatisch
een preview genereert. Zie `docs/idea-deployment.md` voor een voorbeeld.

Hiervoor moet eenmalig een Firebase service account secret aan onze
GitHub repo worden toegevoegd:
```bash
firebase init hosting:github
```

### Verschil met Hildo's repo

Hildo's repo bouwt twee apps (`escape_a_2025` + `escape_b_2024`) en
merget ze samen. Vanuit onze repo deploy je alleen onze game. De 2024 app
wordt niet meer veranderd, dus voor previews maakt dit niet uit.

Voor de **productie-deploy** naar `vierkantescaperoom.nl` moet het nog
steeds via Hildo's repo (daar draait de merge van beide apps).

## Naar productie deployen

1. Zorg dat `full_version` up-to-date is (via bovenstaande workflow)
2. Robin of Hildo maakt een PR van `full_version` → `main`
3. Na review en merge deployt GitHub Actions automatisch naar `vierkantescaperoom.nl`

## Toegang nodig

- **GitHub**: uitgenodigd worden als collaborator op `HildoBijl/escaperoom`
- **Firebase console** (database, instellingen): Google-account toegevoegd door Hildo
- **Firebase CLI** (handmatig deployen): `npm install -g firebase-tools && firebase login`
