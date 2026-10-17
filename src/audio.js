// Sound for Ravnens Ed: recorded samples (Kenney, CC0), music per area (OpenGameArt, CC0)
// and a small synthesiser for wind, magic and fallbacks when a sample is missing.

export const AU = {ctx: null, on: true, buf: {}, music: null, track: '', musicVol: .5};

const SFX_FILES = [
  ...[0, 1, 2, 3, 4].map(i => `footstep_snow_00${i}`),
  ...[0, 1, 2, 3, 4].map(i => `impactPunch_medium_00${i}`),
  ...[0, 1, 2].map(i => `impactPunch_heavy_00${i}`),
  ...[0, 1, 2, 3].map(i => `impactMetal_medium_00${i}`),
  ...[0, 1, 2].map(i => `impactPlate_heavy_00${i}`),
  ...[0, 1, 2].map(i => `impactSoft_heavy_00${i}`),
  ...[0, 1, 2].map(i => `impactGlass_heavy_00${i}`),
  ...[0, 1, 2].map(i => `impactMining_00${i}`),
  'impactWood_heavy_000', 'impactWood_heavy_001', 'impactBell_heavy_000',
  'knifeSlice', 'knifeSlice2', 'drawKnife1', 'drawKnife2', 'drawKnife3', 'chop',
  'handleCoins', 'handleCoins2', 'cloth1', 'cloth2', 'cloth3', 'doorOpen_1', 'creak1',
  'metalLatch', 'bookFlip1', 'beltHandle1', 'dropLeather', 'metalPot1',
];
// Music per mood. Files live in assets/music.
const TRACKS = {
  title: 'vikings_at_shore.mp3', village: 'ditty_at_the_camp.mp3', wild: 'something_approaches.mp3',
  jarl: 'thor_bring_me_victory.mp3', jotun: 'epic_boss_battle.m4a', victory: 'viking_march.mp3',
  boss2: 'boss_phase2.mp3', ash: 'ash_lands.mp3',
};
const TRACK_VOL = {title: .55, village: .45, wild: .5, jarl: .55, jotun: .6, victory: .55, boss2: .55, ash: .55};

export function audioInit() {
  if (AU.ctx) { AU.ctx.resume?.(); return; }
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)(); AU.ctx = ac;
    AU.master = ac.createGain(); AU.master.gain.value = AU.on ? .8 : 0; AU.master.connect(ac.destination);
    AU.sfxBus = ac.createGain(); AU.sfxBus.gain.value = AU.sfxVol ?? .8; AU.sfxBus.connect(AU.master);
    const comp = ac.createDynamicsCompressor(); comp.connect(AU.sfxBus); AU.out = comp;
    AU.musicBus = ac.createGain(); AU.musicBus.gain.value = AU.musicLevel ?? .8; AU.musicBus.connect(AU.master);
    const len = ac.sampleRate * 2, b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; AU.noise = b;
    // wind bed under everything
    const n = ac.createBufferSource(); n.buffer = b; n.loop = true;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = .6;
    const wg = ac.createGain(); wg.gain.value = .07; n.connect(bp).connect(wg).connect(AU.out); n.start();
    const lfo = ac.createOscillator(); lfo.frequency.value = .06; const lg = ac.createGain(); lg.gain.value = 260; lfo.connect(lg).connect(bp.frequency); lfo.start();
    const lfo2 = ac.createOscillator(); lfo2.frequency.value = .11; const lg2 = ac.createGain(); lg2.gain.value = .04; lfo2.connect(lg2).connect(wg.gain); lfo2.start();
    AU.windGain = wg;
    // samples load in the background; the synth covers anything not ready yet
    for (const f of SFX_FILES) {
      fetch(`assets/sfx/${f}.ogg`).then(r => r.ok ? r.arrayBuffer() : Promise.reject())
        .then(a => ac.decodeAudioData(a)).then(buf => { AU.buf[f] = buf; }).catch(() => {});
    }
    if (AU.pending) { const p = AU.pending; AU.pending = null; music(p); }
  } catch (e) { AU.ctx = null; }
}

/** Music and effects volume, 0..1 each. */
export function setVolumes(music, effects) {
  AU.musicLevel = music; AU.sfxVol = effects;
  if (AU.musicBus) AU.musicBus.gain.value = music;
  if (AU.sfxBus) AU.sfxBus.gain.value = effects;
}
export function setMuted(muted) { AU.on = !muted; if (AU.master) AU.master.gain.value = AU.on ? .8 : 0; }

/* ---------- music: two HTMLAudio elements cross-faded through the music bus ---------- */
const decks = [];
function deck() {
  const a = new Audio(); a.loop = true; a.preload = 'auto'; a.crossOrigin = 'anonymous';
  const g = AU.ctx.createGain(); g.gain.value = 0;
  try { AU.ctx.createMediaElementSource(a).connect(g); g.connect(AU.musicBus); } catch (e) { return null; }
  return {a, g, name: ''};
}
export function music(name) {
  if (!AU.ctx) { AU.pending = name; return; }
  if (AU.track === name) return;
  AU.track = name;
  if (!decks.length) { const a = deck(), b = deck(); if (!a || !b) return; decks.push(a, b); AU.cur = 0; }
  const t = AU.ctx.currentTime, fade = (d, to, sec) => { d.g.gain.cancelScheduledValues(t); d.g.gain.setValueAtTime(d.g.gain.value, t); d.g.gain.linearRampToValueAtTime(to, t + sec); };
  const old = decks[AU.cur];
  if (old.name) { fade(old, 0, 2.2); const n = old.name; setTimeout(() => { if (AU.track !== n) old.a.pause(); }, 2400); }
  if (!name || !TRACKS[name]) return;
  AU.cur = 1 - AU.cur; const d = decks[AU.cur];
  if (d.name !== name) { d.a.src = `assets/music/${TRACKS[name]}`; d.name = name; }
  d.a.play().catch(() => {});
  fade(d, TRACK_VOL[name] * AU.musicVol * 2, 2.5);
}

/* ---------- synth helpers ---------- */
function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
function tone(type, f0, f1, dur, vol, delay = 0) {
  const ac = AU.ctx, t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  env(g, t, .005, vol, dur); o.connect(g).connect(AU.out); o.start(t); o.stop(t + dur + .05);
}
function noise(dur, ft, f0, f1, vol, delay = 0, q = .8) {
  const ac = AU.ctx, t = ac.currentTime + delay, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = AU.noise; f.type = ft; f.Q.value = q; f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  env(g, t, .004, vol, dur); s.connect(f).connect(g).connect(AU.out); s.start(t, Math.random() * 1.5); s.stop(t + dur + .05);
}
/** Plays one random sample whose name starts with prefix. Returns false if none is loaded. */
function sample(prefix, vol = 1, rate = 1, delay = 0) {
  const names = Object.keys(AU.buf).filter(n => n.startsWith(prefix)); if (!names.length) return false;
  const ac = AU.ctx, s = ac.createBufferSource(), g = ac.createGain();
  s.buffer = AU.buf[names[Math.floor(Math.random() * names.length)]];
  s.playbackRate.value = rate * (.92 + Math.random() * .16); g.gain.value = vol;
  s.connect(g).connect(AU.out); s.start(ac.currentTime + delay); return true;
}

export function sfx(k) {
  if (!AU.ctx || !AU.on) return;
  try {
    switch (k) {
      case 'swing': sample('drawKnife', .5, 1.1) || noise(.16, 'bandpass', 900, 3200, .22); break;
      case 'heavy': sample('chop', .6, .8); noise(.35, 'bandpass', 300, 1800, .25); tone('sine', 90, 40, .3, .2); break;
      case 'hit': sample('impactPunch_medium', .9) || noise(.12, 'lowpass', 2400, 500, .35); sample('knifeSlice', .35, .9); break;
      case 'bonehit': sample('impactPunch_medium', .8); sample('impactWood_heavy', .45, 1.4); break;
      case 'icehit': sample('impactGlass_heavy', .55, .8); sample('impactPunch_heavy', .5, .7); break;
      case 'roll': sample('cloth', .8) || noise(.28, 'lowpass', 700, 200, .25); noise(.25, 'lowpass', 500, 150, .12); break;
      case 'bolt': tone('sine', 600, 1400, .18, .12); tone('triangle', 900, 2200, .12, .06); break;
      case 'nova': noise(.6, 'lowpass', 4000, 300, .3); tone('sine', 300, 80, .5, .2); sample('impactGlass_heavy', .35, 1.3); break;
      case 'hurt': sample('impactPunch_heavy', .9) || tone('sawtooth', 120, 50, .25, .18); sample('impactSoft_heavy', .5); break;
      case 'block': sample('impactMetal_medium', .8) || tone('square', 1300, 900, .18, .06); break;
      case 'drink': for (let i = 0; i < 4; i++) tone('sine', 220 + i * 30, 150, .12, .08, i * .1); break;
      case 'boom': sample('impactWood_heavy', .9, .5); tone('sine', 70, 28, .9, .55); noise(.7, 'lowpass', 900, 100, .4); break;
      case 'spike': sample('impactMining', .6, .8) || noise(.2, 'highpass', 2000, 800, .2); sample('impactGlass_heavy', .3, 1.2); break;
      case 'rune': sample('handleCoins', .6); [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone('sine', f, 0, 2.2, .05, i * .09)); break;
      case 'coins': sample('handleCoins', .7) || tone('sine', 1200, 0, .2, .05); break;
      case 'die': tone('sawtooth', 110, 30, 2.4, .2); tone('sine', 55, 25, 3, .4); noise(2, 'lowpass', 600, 60, .2); sample('impactBell_heavy', .6, .5); break;
      case 'tick': sample('beltHandle', .25, 1.6) || tone('square', 1800 + Math.random() * 600, 0, .03, .03); break;
      case 'ok': [392, 493.88, 587.33, 783.99].forEach((f, i) => tone('triangle', f, 0, 1.2, .08, i * .07)); break;
      case 'no': tone('sawtooth', 196, 98, .8, .12); tone('sawtooth', 185, 92, .8, .1); break;
      case 'howl': tone('sine', 380, 620, .6, .08); tone('sine', 620, 420, 1, .08, .6); break;
      case 'raven': for (let i = 0; i < 2; i++) noise(.12, 'bandpass', 1400, 700, .18, i * .18, 4); break;
      case 'horn': tone('sawtooth', 146.83, 0, 2.6, .12); tone('sawtooth', 220, 0, 2.6, .08, .15); break;
      case 'gate': sample('doorOpen', .9, .6); sample('creak', .8, .7, .4); break;
      case 'chest': sample('metalLatch', .9); sample('creak', .6, 1.2, .2); break;
      case 'pickup': sample('dropLeather', .8) || tone('sine', 880, 0, .2, .05); break;
      case 'page': sample('bookFlip', .5); break;
      case 'dodge': noise(.35, 'bandpass', 2400, 600, .25); [880, 1320, 1760].forEach((f, i) => tone('sine', f, 0, .8, .04, i * .05)); break;
      case 'parry': sample('impactMetal_medium', 1, 1.25); sample('impactBell_heavy', .55, 1.6); tone('square', 2100, 1400, .25, .05); break;
      case 'warn': tone('sawtooth', 98, 70, .7, .16); tone('sawtooth', 147, 104, .7, .1); noise(.5, 'lowpass', 600, 150, .25); break;
      case 'heart': tone('sine', 62, 40, .14, .45); tone('sine', 58, 38, .14, .35, .2); break;
      case 'step': sample('footstep_snow', .35) || noise(.06, 'lowpass', 500, 200, .05); break;
    }
  } catch (e) {}
}
