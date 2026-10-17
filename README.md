# Ravnens Ed

Et nordisk 3D action-RPG i browseren. Soulslike kamp møder dialog med terningeslag, sat i Fimbulvinterens Midgard.

## Spil lokalt

Spillet er statiske filer uden byggetrin. Start en lokal server i projektmappen:

```bash
python3 tools/serve.py
```

Åbn derefter http://localhost:8765 i en browser.

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
| E | Tal, hvil, interagér |
| Hjul | Zoom |
| Esc | Pause |
| M | Lyd til og fra |

## Opbygning

- `index.html` – sidens opmærkning, HUD og menuer
- `styles.css` – al styling
- `src/main.js` – spilmotor, verden, kamp, dialog og lyd (Three.js 0.160 via CDN)

## Udgivelse

Projektet kører direkte på GitHub Pages: Settings → Pages → Deploy from a branch → `main` / root.
