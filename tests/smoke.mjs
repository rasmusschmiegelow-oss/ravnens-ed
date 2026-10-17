// Automated playtest: boots the game in headless Chrome, clicks through the menus, runs the combat
// and campaign bots, and fails if anything errors or the balance drifts out of its bands.
// Usage: start the server (python3 tools/serve.py 8765), then `node tests/smoke.mjs`.
import {chromium} from 'playwright';
import {appendFileSync} from 'node:fs';

const URL = process.env.GAME_URL || 'http://localhost:8765/?dev';
const BOSSES = ['jarl', 'vogter', 'lindorm', 'jotun', 'garm', 'glodkaempe', 'surt'];
const failures = [];
const lines = [];
const out = (s) => { console.log(s); lines.push(s); };
const fail = (s) => { failures.push(s); out(`FEJL: ${s}`); };

const browser = await chromium.launch({args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
const page = await browser.newPage({viewport: {width: 960, height: 600}});
const errors = [];
page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

// 1. Boot
for (let i = 0; i < 20; i++) { try { await page.goto(URL); break; } catch { await page.waitForTimeout(1000); } }
await page.waitForFunction(() => window.__gameReady === true, null, {timeout: 180000});
out('Spillet starter.');

// 2. Menus and the main flows through the real UI
const ui = await page.evaluate(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms)), r = {};
  document.getElementById('bNew').click(); await W(200);
  document.getElementById('bStart').click(); await W(1500);
  r.state = G.state;
  openPause(); openSettings('pause'); r.settings = document.querySelectorAll('#setBody .setrow').length; closeSettings(); document.getElementById('pzGo').click();
  openJournal(); r.journal = document.querySelectorAll('#jrBody .jq').length; closeJournal();
  openInv(); document.getElementById('invGo').click();
  talk('ulfr'); await W(200); r.dialog = document.querySelectorAll('#dlgOpts button').length;
  [...document.querySelectorAll('#dlgOpts button')].pop().click();
  openRest(0); await W(100); r.talents = document.querySelectorAll('#rTalents .tcard').length; document.getElementById('restLeave').click();
  // weapon art, a boss intro (skipped with a key) and the switch to the second act
  const until = async (f, ms = 4000) => { for (let t = 0; t < ms && !f(); t += 50) await W(50); return !!f(); };
  P.st = maxSt(); buf = {k: 'art', t: G.time}; r.art = await until(() => (P.artUses || 0) > 0, 15000);
  const j = G.enemies.find(e => e.boss === 'jarl'); P.x = j.x + 150; P.y = j.y;
  // the CI browser renders in software and runs at a few frames per second, so allow plenty of time
  r.intro = await until(() => G.state === 'cine', 20000) && await until(() => !document.getElementById('bossCard').hidden, 20000);
  dispatchEvent(new KeyboardEvent('keydown', {code: 'Escape', key: 'Escape'})); await until(() => G.state !== 'cine', 10000); r.afterIntro = G.state;
  G.flags.jotunDone = true; startAct2(); r.act2 = G.enemies.filter(e => e.x > 3600).length; r.ice = ICEWALL.gone;
  return r;
});
if (ui.state !== 'play') fail(`Nyt spil endte i tilstanden "${ui.state}" i stedet for "play"`);
if (!ui.settings || !ui.journal || !ui.dialog || ui.talents !== 6 || !ui.art || !ui.intro || ui.afterIntro !== 'play' || ui.act2 < 20 || !ui.ice) fail(`Menuer mangler indhold: ${JSON.stringify(ui)}`);
else out(`Menuer, dialog og evner virker: ${JSON.stringify(ui)}`);

// 3. Combat balance: every class against every foe and group
const sim = await page.evaluate(() => __rv.simAll(8));
out('\n| Klasse | Fjende | Sejre | Liv tilbage |\n| --- | --- | --- | --- |');
for (const r of sim) {
  const boss = BOSSES.includes(r.foe);
  if (boss) out(`| ${r.cls} | ${r.foe} | ${r.win} % | ${r.hp} % |`);
  if (!boss && r.win < 75) fail(`${r.cls} mod ${r.foe}: kun ${r.win} % sejre (mindst 75 %)`);
  if (boss && r.win < 25) fail(`${r.cls} mod ${r.foe}: kun ${r.win} % sejre (bossen er for svær)`);
  if (boss && r.win === 100 && r.hp > 88) fail(`${r.cls} mod ${r.foe}: ${r.hp} % liv tilbage (bossen er for let)`);
}

// 4. Full playthrough for each class (best of two, since the bot plays with chance)
out('\n| Klasse | Gennemført | Dødsfald | Sprunget over | Niveau ved bosserne |\n| --- | --- | --- | --- | --- |');
const skippedLines = [];
for (const cls of ['berserker', 'skjoldmo', 'volve']) {
  let best = null;
  for (let i = 0; i < 2 && !(best && best.done && !best.problems.length); i++) {
    const r = await page.evaluate(c => __rv.campaign(c), cls);
    if (!best || (r.done && !r.problems.length)) best = r;
  }
  out(`| ${cls} | ${best.done ? 'ja' : 'nej'} | ${best.deaths} | ${best.skipped.length} | ${JSON.stringify(best.levelAtBoss)} |`);
  for (const s of best.skipped) skippedLines.push(`- ${cls} sprang over: ${s.slice(0, 160)}`);
  if (!best.done) fail(`${cls} kunne ikke gennemføre spillet: ${best.problems.join('; ')}`);
  else if (best.problems.length) fail(`${cls}: ${best.problems.join('; ')}`);
  if (best.deaths > 40) fail(`${cls} døde ${best.deaths} gange i gennemløbet (højst 40)`);
}

if (skippedLines.length) out('\nOmråder botten sprang over (ikke en fejl):\n' + skippedLines.join('\n'));

// 5. No errors at any point
for (const e of [...new Set(errors)].slice(0, 10)) fail(e);

await browser.close();
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Spiltest\n\n${lines.join('\n')}\n\n${failures.length ? `**${failures.length} fejl**` : '**Alt bestået**'}\n`);
out(failures.length ? `\n${failures.length} fejl.` : '\nAlt bestået.');
process.exit(failures.length ? 1 : 0);
