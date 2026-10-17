// Animated KayKit characters: loading, per-instance cloning, weapons and an animation helper.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const BASE = 'assets/';
const FILES = {
  Barbarian: 'characters/Barbarian.glb', Knight: 'characters/Knight.glb', Mage: 'characters/Mage.glb', Rogue_Hooded: 'characters/Rogue_Hooded.glb',
  Skeleton_Warrior: 'characters/Skeleton_Warrior.glb', Skeleton_Rogue: 'characters/Skeleton_Rogue.glb',
  Skeleton_Mage: 'characters/Skeleton_Mage.glb', Skeleton_Minion: 'characters/Skeleton_Minion.glb',
  Skeleton_Blade: 'props/Skeleton_Blade.gltf', Skeleton_Axe: 'props/Skeleton_Axe.gltf', Skeleton_Crossbow: 'props/Skeleton_Crossbow.gltf',
  Skeleton_Staff: 'props/Skeleton_Staff.gltf', Skeleton_Shield_Large_A: 'props/Skeleton_Shield_Large_A.gltf', Skeleton_Shield_Small_A: 'props/Skeleton_Shield_Small_A.gltf',
};
const SRC = {};
const RAW_H = 2.2; // KayKit rigs stand about 2.2 units tall

// What each role looks like: source rig, height in metres, meshes to hide, props per hand, tint.
export const LOOKS = {
  berserker: {file: 'Barbarian', h: 1.85, hide: ['1H_Axe_Offhand', 'Barbarian_Round_Shield', '1H_Axe', 'Mug']},
  skjoldmo: {file: 'Knight', h: 1.8, hide: ['1H_Sword_Offhand', 'Badge_Shield', 'Rectangle_Shield', 'Spike_Shield', '2H_Sword']},
  volve: {file: 'Mage', h: 1.8, hide: ['Spellbook', 'Spellbook_open', '1H_Wand']},
  astrid: {file: 'Rogue_Hooded', h: 1.75, hide: ['Knife_Offhand', '1H_Crossbow', 'Knife', 'Throwable'], tint: 0xc8dcc0},
  ulfr: {file: 'Mage', h: 1.72, hide: ['Spellbook', 'Spellbook_open', '1H_Wand'], tint: 0x9c9890},
  dvalin: {file: 'Barbarian', h: 1.25, hide: ['1H_Axe_Offhand', 'Barbarian_Round_Shield', '2H_Axe', 'Mug', 'Barbarian_Cape'], tint: 0xd8a888, wide: 1.3},
  draugr: {file: 'Skeleton_Warrior', h: 1.85, props: {r: 'Skeleton_Blade', l: 'Skeleton_Shield_Small_A'}, tint: 0xb8c8c4, eyes: [0.5, 2.4, 3.4]},
  archer: {file: 'Skeleton_Rogue', h: 1.8, props: {r: 'Skeleton_Crossbow'}, tint: 0xb8c8c4, eyes: [0.5, 2.4, 3.4]},
  minion: {file: 'Skeleton_Minion', h: 1.75, props: {r: 'Skeleton_Blade'}, tint: 0xb8c8c4, eyes: [0.5, 2.4, 3.4]},
  jarl: {file: 'Skeleton_Warrior', h: 3.3, props: {r: 'Skeleton_Axe', l: 'Skeleton_Shield_Large_A'}, tint: 0x8a9aa0, eyes: [0.8, 2.8, 4.2], emissive: 0x06141a},
  jotun: {file: 'Barbarian', h: 8.2, hide: ['1H_Axe_Offhand', 'Barbarian_Round_Shield', '1H_Axe', 'Mug'], tint: 0xd8f0ff, emissive: 0x1d4f6e, ice: true},
};

export function loadAll(onProgress) {
  const loader = new GLTFLoader();
  const keys = Object.keys(FILES);
  const prog = Object.fromEntries(keys.map(k => [k, 0]));
  const report = () => onProgress && onProgress(Object.values(prog).reduce((a, b) => a + b, 0) / keys.length);
  return Promise.all(keys.map(k => new Promise((res, rej) => {
    loader.load(BASE + FILES[k], g => { SRC[k] = g; prog[k] = 1; report(); res(); },
      e => { if (e.total) { prog[k] = e.loaded / e.total; report(); } }, rej);
  })));
}

/** Plays named clips with cross-fades. One-shot clips can be stretched to a target duration. */
export class Anim {
  constructor(root, clips) { this.mixer = new THREE.AnimationMixer(root); this.clips = new Map(clips.map(c => [c.name, c])); this.cur = null; this.name = ''; }
  has(n) { return this.clips.has(n); }
  dur(n) { return this.clips.get(n)?.duration || 1; }
  play(n, {fade = .15, loop = true, speed = 1, restart = false, fit = 0} = {}) {
    const clip = this.clips.get(n); if (!clip) return;
    if (fit) speed = clip.duration / fit;
    if (this.name === n && !restart) { this.cur.timeScale = speed; return; }
    const a = this.mixer.clipAction(clip);
    a.reset(); a.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity); a.clampWhenFinished = !loop; a.timeScale = speed; a.enabled = true; a.setEffectiveWeight(1);
    if (this.cur && this.cur !== a) a.crossFadeFrom(this.cur, fade, false);
    a.play(); this.cur = a; this.name = n;
  }
  update(dt) { this.mixer.update(dt); }
}

let iceMat = null;
export function makeChar(role, {iceMaterial} = {}) {
  const L = LOOKS[role]; const src = SRC[L.file];
  const inner = SkeletonUtils.clone(src.scene);
  const s = L.h / RAW_H; inner.scale.set(s * (L.wide || 1), s, s * (L.wide || 1));
  inner.rotation.y = Math.PI / 2; // KayKit faces +Z, the game faces +X
  const root = new THREE.Group(); root.add(inner);
  const mats = []; const seen = new Map();
  inner.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false;
    if (L.hide && L.hide.includes(o.name)) { o.visible = false; return; }
    const m0 = o.material;
    let m = seen.get(m0);
    if (!m) {
      m = m0.clone();
      if (m0.name === 'Glow' && L.eyes) { m.emissive = new THREE.Color(...L.eyes); m.emissiveIntensity = 1; m.color.setRGB(.2, .6, .8); }
      else { if (L.tint) m.color.multiply(new THREE.Color(L.tint)); if (L.emissive) { m.emissive = new THREE.Color(L.emissive); m.emissiveIntensity = 1; } }
      m.userData.baseEmissive = m.emissive ? m.emissive.clone() : new THREE.Color(0);
      seen.set(m0, m); mats.push(m);
    }
    if (L.ice && o.name === '2H_Axe' && iceMaterial) o.material = iceMaterial; else o.material = m;
  });
  const bone = n => inner.getObjectByName(n);
  if (L.props) for (const [side, key] of Object.entries(L.props)) {
    const slot = bone('handslot.' + side); if (!slot) continue;
    const p = SRC[key].scene.clone(true);
    p.traverse(o => { if (o.isMesh) { o.castShadow = true; const m = o.material.clone(); if (L.tint) m.color.multiply(new THREE.Color(L.tint)); m.userData.baseEmissive = new THREE.Color(0); o.material = m; mats.push(m); } });
    slot.add(p);
  }
  const anim = new Anim(inner, src.animations);
  return {
    root, inner, anim, mats, bone, role, kk: true, scale: 1,
    show(name, v) { const o = inner.getObjectByName(name); if (o) o.visible = v; },
    flash(v) { for (const m of mats) { if (!m.emissive) continue; m.emissive.copy(m.userData.baseEmissive).addScalar(v * .6); } },
    tintEmissive(r, g, b) { for (const m of mats) if (m.emissive) m.emissive.setRGB(m.userData.baseEmissive.r + r, m.userData.baseEmissive.g + g, m.userData.baseEmissive.b + b); },
    opacity(v) { for (const m of mats) { m.transparent = v < 1; m.opacity = v; } },
  };
}
