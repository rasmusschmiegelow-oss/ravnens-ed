// Automated playtest: boots the game in headless Chrome, clicks through the menus, runs the combat
// and campaign bots, and fails if anything errors or the balance drifts out of its bands.
// Usage: start the server (python3 tools/serve.py 8765), then `node tests/smoke.mjs`.
import {chromium} from 'playwright';
import {appendFileSync} from 'node:fs';

const URL = process.env.GAME_URL || 'http://localhost:8765/?dev';
const BOSSES = ['jarl', 'vogter', 'lindorm', 'jotun', 'garm', 'glodkaempe', 'surt', 'ulvekonge', 'ketil', 'troldmor', 'askebrud', 'isdronning'];
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
  document.getElementById('bStart').click(); await W(300); r.prolog = G.state === 'prolog'; skipPrologue(); await W(1200);
  r.state = G.state;
  openPause(); openSettings('pause'); r.settings = document.querySelectorAll('#setBody .setrow').length; closeSettings(); document.getElementById('pzGo').click();
  openJournal(); r.journal = document.querySelectorAll('#jrBody .jq').length; closeJournal();
  openInv(); document.getElementById('invGo').click();
  talk('ulfr'); await W(200); r.dialog = document.querySelectorAll('#dlgOpts button').length;
  [...document.querySelectorAll('#dlgOpts button')].pop().click();
  openRest(0); await W(100); r.talents = document.querySelectorAll('#rTalents .tcard').length; document.getElementById('restLeave').click();
  // weapon art, a boss intro (skipped with a key) and the switch to the second act
  // the CI browser renders in software at a frame or two per second, so step the game by hand while waiting
  const until = async (f, ms = 4000) => { for (let t = 0; t < ms && !f(); t += 50) { frame(last + 50, true); await W(50); } return !!f(); };
  P.st = maxSt(); buf = {k: 'art', t: G.time}; r.art = await until(() => (P.artUses || 0) > 0, 15000);
  const j = G.enemies.find(e => e.boss === 'jarl'); P.x = j.x + 150; P.y = j.y;
  // the CI browser renders in software and runs at a few frames per second, so allow plenty of time
  r.intro = await until(() => G.state === 'cine', 20000) && await until(() => !document.getElementById('bossCard').hidden, 20000);
  dispatchEvent(new KeyboardEvent('keydown', {code: 'Escape', key: 'Escape'})); await until(() => G.state !== 'cine', 10000); r.afterIntro = G.state;
  // belt, horse, map and save slots
  G.boss = null; resetWorld(); for (const e of G.enemies) e.aggro = false; // the woken jarl must not chase the hero through these checks
  const dr = G.enemies.find(e => e.t === 'draugr' && !e.dead); P.x = dr.x - 150; P.y = dr.y; mouseW.x = dr.x; mouseW.y = dr.y; const h0 = dr.hp;
  P.act = null; P.roll = 0; P.stagger = 0; G.cons.ild = 2; const used = useCons('ild'); r.pot = await until(() => dr.dead || dr.hp < h0, 30000);
  if (!r.pot) r.dbgPot = {used, st: G.state, dead: P.dead, act: P.act && P.act.kind, pots: POTS.length, d: Math.round(Math.hypot(dr.x - P.x, dr.y - P.y)), hp: [dr.hp, h0], t: G.time};
  for (const e of G.enemies) if (!e.dead && Math.hypot(e.x - 1500, e.y - 2300) < 1200) killEnemy(e);
  P.x = 1500; P.y = 2300; P.act = null; P.stagger = 0; G.flags.horse = true; toggleHorse(); r.horse = !!P.mount;
  const hx = P.x; keys[SET.bind.left] = true; await until(() => P.x < hx - 60, 30000); keys[SET.bind.left] = false; r.ride = P.x < hx - 60;
  if (!r.ride) r.dbgRide = {st: G.state, dead: P.dead, mount: P.mount, x: [P.x, hx], y: P.y, move: P.move, stag: P.stagger, keys: Object.keys(keys).filter(k => keys[k]), t: G.time}; dismount(false);
  openMap(); r.map = G.state === 'map'; closeMap();
  r.slots = document.querySelectorAll('#crSlots .slotpick').length;
  // runekast scoring and table, rune sockets, the shield-bearer's guard
  r.rk = rkScore([1, 1, 1]) === 1000 && rkScore([5, 5, 5, 1]) === 600 && rkScore([1, 2, 3, 4, 5, 6]) === 1500 && rkScore([2]) === -1;
  P.runes = 1000; openRunekast('dvalin', 'Dvalin'); document.querySelector('#rkStakeBtns button').click(); r.rkDice = document.querySelectorAll('#rkDice .rkdie').length > 0; closeRunekast();
  giveRune('torden', true); r.sock = hasRune('torden');
  { const sb = spawnEnemy('skjoldraugr', P.x + 60, P.y); sb.face = Math.atan2(P.y - sb.y, P.x - sb.x); const h = sb.hp; damageEnemy(sb, 40, {}); r.block = sb.hp > h - 20; G.enemies.splice(G.enemies.indexOf(sb), 1); scene.remove(sb.model.root); }
  // day and night, photo mode, the ice cave puzzle and the companion quests
  G.flags.tod = .5; await until(() => DN.day > .9, 15000); r.day = DN.day > .9; G.flags.tod = .9;
  openPhoto(); r.photo = G.state === 'photo'; closePhoto();
  travel(GROT.inX, GROT.inY, '', ''); r.grot = await until(() => inGrot(P.x, P.y) && G.state === 'play', 15000);
  for (const e of G.enemies) if (!e.dead && inGrot(e.x, e.y)) e.aggro = false;
  for (const id of [0, 1, 2]) touchPillar(RUNEPILLARS.find(p => p.id === id)); r.grotOpen = !!G.flags.grotOpen;
  travel(GROT.mouthX + 60, GROT.mouthY, '', ''); await until(() => !inGrot(P.x, P.y) && G.state === 'play', 15000);
  for (const ro of FROSTROSES) { G.flags.q_eir = true; pickRose(ro); } r.roses = Object.keys(G.flags.roses).length === 3;
  G.flags.jotunDone = true; startAct2(); r.act2 = G.enemies.filter(e => e.x > 3600).length; r.ice = ICEWALL.gone;
  // journal tabs, achievements, New Game+ and the Valhalla arena
  G.jrTab = 'a'; openJournal(); r.ach = document.querySelectorAll('.achrow').length; G.jrTab = 'q'; closeJournal();
  G.flags.surtDone = true; showEnd(); document.getElementById('endNG').click(); await W(300); r.ng = G.ng === 1 && G.state === 'play';
  toTitle(); document.getElementById('bValhalla').click(); await W(100); document.querySelector('#vhCls button').click();
  r.vh = await until(() => VH.wave === 1 && G.enemies.some(e => !e.dead), 20000);
  for (const e of G.enemies) if (!e.dead) killEnemy(e);
  r.boon = await until(() => !document.getElementById('boon').hidden, 20000);
  document.querySelector('#boonOpts button').click(); r.vh2 = await until(() => VH.wave === 2, 20000);
  toTitle();
  r.manifest = (await fetch('manifest.webmanifest')).ok && (await fetch('sw.js')).ok;
  return r;
});
if (ui.state !== 'play') fail(`Nyt spil endte i tilstanden "${ui.state}" i stedet for "play"`);
if (!ui.settings || !ui.journal || !ui.dialog || ui.talents !== 6 || !ui.art || !ui.intro || ui.afterIntro !== 'play' || ui.act2 < 20 || !ui.ice || ui.ach < 15 || !ui.ng || !ui.vh || !ui.boon || !ui.vh2 || !ui.manifest || !ui.pot || !ui.horse || !ui.ride || !ui.map || ui.slots !== 3 || !ui.day || !ui.photo || !ui.grot || !ui.grotOpen || !ui.roses || !ui.prolog || !ui.rk || !ui.rkDice || !ui.sock || !ui.block) fail(`Menuer mangler indhold: ${JSON.stringify(ui)}`);
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
