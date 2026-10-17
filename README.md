# Ravnens Ed

Et nordisk 3D action-RPG i browseren. Soulslike kamp møder dialog med terningeslag, sat i Fimbulvinterens Midgard.

## Spil lokalt

Spillet er statiske filer uden byggetrin. Start en lokal server i projektmappen:

```bash
python3 tools/serve.py
```

Åbn derefter http://localhost:8765 i en browser.

## Indhold

- Tre klasser (Berserker, Skjoldmø, Völve) med animerede figurer
- Soulslike kamp med rul, blok, varslede angreb og runer, der tabes ved død
- Dialog med terningeslag (d20), ledsageren Astrid og to slutninger
- Bosser: Draugr-jarlen, Gravvogteren i krypten og Rimtursen
- Gravkrypten under højen, kister med udstyr og et udstyrsvindue (I)
- Musik der skifter med område og bosskamp, optagede lydeffekter

## Styring

| Tast | Handling |
| --- | --- |
| W A S D | Bevæg dig |
| Mus | Sigt |
| Venstreklik | Let angreb |
| Højreklik | Tungt angreb, blok eller frostnova (efter klasse) |
| Mellemrum | Rul (usårlig mens du ruller) |
| R | Drik mjød |
| F | Klasse-evne |
| E | Tal, hvil, åbn kister, interagér |
| I | Udstyr |
| Hjul | Zoom |
| Esc | Pause |
| M | Lyd til og fra |

## Opbygning

- `index.html` – sidens opmærkning, HUD og menuer
- `styles.css` – al styling
- `src/main.js` – verden, kamp, dialog, udstyr og spilforløb (Three.js 0.160 via CDN)
- `src/models.js` – indlæsning af figurer, bygninger og animationer
- `src/audio.js` – musik, lydeffekter og syntetiseret vind
- `assets/` – figurer, bygninger, musik, lyd og teksturer (se `assets/CREDITS.md`)
- Tilføj `?dev` til adressen for et udviklerhåndtag (`window.__rv`)

## Udgivelse

Projektet kører direkte på GitHub Pages: Settings → Pages → Deploy from a branch → `main` / root.
