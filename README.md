# Ravnens Ed

Et nordisk 3D action-RPG i browseren. Soulslike kamp møder dialog med terningeslag, sat i Fimbulvinterens Midgard og den brændende Askefjord.

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
- To akter: Fimbulvinterens Midgard og Askefjorden bag bjergkammen, hvor Surts ild er brudt igennem isen
- Bosser: Draugr-jarlen, Gravvogteren, Lindormen og Rimtursen i akt I; Garm, Glødkæmpen og Surt i akt II
- Alle bosser har en anden fase med nye angreb og ny musik, og en filmisk indledning med navneskilt første gang
- Balance og brud: slag tærer på fjendens balance, og en fjende med brudt balance kan få et kritisk stød. Rygstød på intetanende fjender
- Våbenkunst (Q): hvert våben har sin egen, fx Jordkløver, Valkyriestød og Seiðstråle
- En slutning, der husker dine valg fra begge akter
- Over 20 fjendetyper, vildt der flygter, husdyr og landsbyfolk; Jarl Thorgrims opgave
- Træer bliver gennemsigtige, når de står mellem kameraet og spilleren
- Gravkrypten under højen, kister med udstyr og et udstyrsvindue (I)
- Evnetræer for hver klasse og alternative våben med egne angreb (Dvalin smeder dem)
- Dagbog (J) med hovedopgave, fire sideopgaver med valg og noter
- To ledsagere: Astrid, der holder øje med dine valg, og helbrederen Eir
- Indstillinger: lydstyrke, sværhedsgrad (Fortælling/Normal/Hård), skærmrystelse, tips, grafik og egne taster
- Controller-understøttelse og en kort introduktion med tips undervejs
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
| Q | Våbenkunst |
| E | Tal, hvil, åbn kister, interagér |
| I | Udstyr |
| J | Dagbog |
| Tab | Lås på fjende |

Med controller: RB let angreb, RT tungt angreb, LT blok, LB våbenkunst, B rul, X mjød, Y evne, A interagér, R3 lås, Start pause.
| Hjul | Zoom |
| Esc | Pause |
| M | Lyd til og fra |

## Opbygning

- `index.html` – sidens opmærkning, HUD og menuer · `styles.css` – al styling
- `src/main.js` – opstart: indlæser Three.js (0.160 via CDN) og modulerne og kører derefter spilfilerne i rækkefølge
- `src/models.js` – figurer, bygninger og animationer (ES-modul)
- `src/audio.js` – musik, lydeffekter og syntetiseret vind (ES-modul)
- `src/game/` – selve spillet, delt efter emne. Filerne deler ét globalt scope (fx `G`, `P`, `scene`) og indlæses i denne rækkefølge:

| Fil | Indhold |
| --- | --- |
| `util-world.js` | hjælpefunktioner, verdenskort, højdekort, kollisionsobjekter, kister |
| `render.js` | renderer, efterbehandling, grafikindstillinger, himmel, lys, materialer, terræn |
| `world-build.js` | træer, sten, græs, bygninger, runesten, krypten |
| `world-act2.js` | Askefjorden: døde træer, lava, isvæggen, Flammeporten, Gnipahellir, Skjoldvik |
| `effects.js` | partikler, spor på jorden, snefald |
| `characters.js` | figurbygning og animationstabeller |
| `state.js` | klasser, fjender, udstyr, spawn-steder, kollision, beskeder |
| `player.js` | spillerens handlinger, skade, parade, ledsageren |
| `enemies.js` | fjende-AI, bosser, angrebsvarsler, projektiler |
| `world-life.js` | interaktion, dyr og landsbyfolk, låsning, kister, rejser |
| `dialogue.js` | samtaler og terningeslag |
| `progress.js` | hvil, niveauer, gem/indlæs, spilforløb, karakteroprettelse |
| `input-camera.js` | tastatur, mus og kamera |
| `sync-hud.js` | animation af figurer, HUD, minikort, musikskift |
| `loop.js` | hovedløkken og titelskærmen |
| `settings.js` | lydstyrke, sværhedsgrad, tastebindinger |
| `journal.js` | dagbog, sideopgaver, Astrids holdning |
| `talents.js` | evnetræer |
| `tutorial.js` | tips de første minutter |
| `cinematic.js` | bossernes indledninger |
| `gamepad.js` | controller |
| `devtools.js` | spiltest-bot og udviklerhåndtag (kun med `?dev`) |
| `start.js` | starter løkken og indlæser aktiver |

## Spiltest

Ved hvert push til `main` kører GitHub Actions spillet automatisk (`.github/workflows/test.yml`): navnetjek, en browsertest der klikker gennem menuerne, kamp-botten med tærskler for balancen og et fuldt gennemløb af spillet for hver klasse. Siden udgives kun på GitHub Pages, når alt består. Lokalt (kræver Node):

```bash
npm install && npx playwright install chromium
python3 tools/serve.py 8765 & npm test
```

Manuelt i browseren:

Åbn spillet med `?dev` i adressen og kør i konsollen:

```js
__rv.simAll(6)        // alle klasser mod alle fjender og grupper, 6 kampe hver
__rv.campaign('volve') // hele spillet igennem med én klasse
__rv.bench(30)   // gennemsnitlig tid pr. billede i ms
```

Filerne i `src/game/` deler ét globalt scope, så hvert navn må kun erklæres ét sted. Tjek det med `python3 tools/check_globals.py`.

## Udgivelse

Projektet kører direkte på GitHub Pages: Settings → Pages → Deploy from a branch → `main` / root.
