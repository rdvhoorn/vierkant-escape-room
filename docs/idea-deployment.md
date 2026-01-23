# Deployment Setup

## Doel

Testers toegang geven tot de escape room zonder:
- Dat ze de repo nodig hebben
- Dat de URL publiek vindbaar is (Google)
- Dat we per ongeluk naar productie deployen

## Strategie

| Omgeving | URL | Wanneer |
|----------|-----|---------|
| **Test** | `vierkantescaperoom--preview-[random].web.app` | Automatisch bij push naar `main` |
| **Productie** | `vierkantescaperoom.nl` | Handmatig bij release |

## Waarom Firebase Hosting?

- Firestore database al in gebruik
- Firebase config (`.firebaserc`, `firebase.json`) al aanwezig
- Gratis tier ruim voldoende (10GB/maand bandbreedte)
- Preview channels genereren random URLs

## Waarom preview channels?

- **Niet te raden** - random string in URL
- **Niet vindbaar** - Google crawlt alleen via links, die zijn er niet
- **robots.txt niet nodig** - obscure URL is voldoende
- **Automatisch** - GitHub Actions deployt bij elke push

## Setup stappen

### 1. Firebase CLI installeren (eenmalig)

```bash
npm install -g firebase-tools
firebase login
```

### 2. GitHub Actions workflow aanmaken

Maak `.github/workflows/firebase-preview.yml`:

```yaml
name: Deploy Preview

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Deploy to preview channel
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          channelId: test
          expires: 30d
```

### 3. Firebase service account koppelen

```bash
firebase init hosting:github
```

Dit voegt automatisch de `FIREBASE_SERVICE_ACCOUNT` secret toe aan de repo.

### 4. Productie deploy (bij release)

Handmatig wanneer je klaar bent:

```bash
npm run build
firebase deploy --only hosting
```

Daarna custom domain (`vierkantescaperoom.nl`) koppelen via Firebase console.

## Notities

- Preview URL delen met testers via DM/mail, niet publiek
- Preview channels verlopen na 30 dagen (configureerbaar)
- Testers hoeven niks te installeren, alleen URL openen
