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
// Buildings and props for the village (KayKit Medieval Hexagon) and the crypt (KayKit Dungeon Remastered).
for (const n of ['building_barracks_red', 'building_lumbermill_red', 'building_well_red', 'building_tower_A_red', 'building_watermill_red', 'building_grain',
  'building_destroyed', 'fence_wood_straight', 'fence_wood_straight_gate', 'barrel', 'crate_A_big', 'crate_B_small', 'sack', 'tent', 'weaponrack',
  'resource_lumber', 'wheelbarrow', 'bucket_water', 'target', 'flag_red', 'rock_single_A', 'rock_single_B', 'rock_single_C', 'rock_single_D', 'rock_single_E']) FILES[n] = `village/${n}.gltf`;
for (const n of ['chest', 'chest_gold', 'torch_lit', 'pillar_decorated', 'banner_patternA_red', 'barrel_large', 'wall', 'wall_arched', 'wall_doorway',
  'floor_tile_large', 'floor_dirt_large', 'candle_triple', 'column', 'coin_stack_large', 'sword_shield_broken', 'keyring_hanging']) FILES[n] = `crypt/${n}.glb`;
// Animated low-poly creatures and villagers by Quaternius (CC0, via poly.pizza)
for (const n of ['Wolf', 'Fox', 'Deer', 'Stag', 'Husky', 'Horse', 'Cow', 'Donkey']) FILES['q' + n] = `animals/${n}.glb`;
for (const n of ['Yeti', 'Orc', 'Orc_Enemy', 'Demon', 'Blue_Demon', 'Ghost', 'Ghost_Skull', 'Dragon', 'Dragon_Evolved', 'Goleling', 'Goleling_Evolved', 'Tribal']) FILES['q' + n] = `monsters/${n}.glb`;
for (const n of ['King', 'Farmer', 'Worker', 'Adventurer', 'Hooded_Adventurer']) FILES['q' + n] = `people/${n}.glb`;
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
  seidr: {file: 'Skeleton_Mage', h: 1.85, props: {r: 'Skeleton_Staff'}, tint: 0xb4bcd0, eyes: [2.2, .8, 3.6]},
  vogter: {file: 'Skeleton_Warrior', h: 2.7, props: {r: 'Skeleton_Axe', l: 'Skeleton_Shield_Large_A'}, tint: 0xa09890, eyes: [3.6, 1.2, .3], emissive: 0x140804},
  // Quaternius creatures: qt marks rigs whose size is measured at load time
  wolf: {file: 'qWolf', h: 1.05, qt: true}, fox: {file: 'qFox', h: .6, qt: true}, deer: {file: 'qDeer', h: 1.7, qt: true}, stag: {file: 'qStag', h: 2.2, qt: true},
  husky: {file: 'qHusky', h: .85, qt: true}, horse: {file: 'qHorse', h: 2.1, qt: true}, cow: {file: 'qCow', h: 1.6, qt: true}, donkey: {file: 'qDonkey', h: 1.5, qt: true},
  trold: {file: 'qOrc_Enemy', h: 1.4, qt: true}, bjergtrold: {file: 'qOrc', h: 2.3, qt: true}, rimtrold: {file: 'qYeti', h: 3.2, qt: true},
  ildvaette: {file: 'qDemon', h: 2.1, qt: true}, frostvaette: {file: 'qBlue_Demon', h: 2.1, qt: true},
  gjenganger: {file: 'qGhost', h: 1.5, qt: true, emissive: 0x2a1640}, gjenganger2: {file: 'qGhost_Skull', h: 1.5, qt: true, emissive: 0x241a30},
  stenvaette: {file: 'qGoleling', h: 1.7, qt: true}, stenvaette2: {file: 'qGoleling_Evolved', h: 2.6, qt: true},
  lindyngel: {file: 'qDragon', h: 1.7, qt: true}, lindorm: {file: 'qDragon_Evolved', h: 6.5, qt: true, emissive: 0x081420},
  vaette: {file: 'qTribal', h: 1.7, qt: true, emissive: 0x2a2008},
  eir: {file: 'Mage', h: 1.74, hide: ['Spellbook', 'Spellbook_open', '1H_Wand', 'Mage_Hat'], tint: 0xf2f0ea},
  bjorn: {file: 'qHooded_Adventurer', h: 1.8, qt: true, tint: 0xd8c0a0},
  thorgrim: {file: 'qKing', h: 1.9, qt: true}, farmer: {file: 'qFarmer', h: 1.75, qt: true}, worker: {file: 'qWorker', h: 1.75, qt: true},
  guard: {file: 'qAdventurer', h: 1.8, qt: true}, hguard: {file: 'qHooded_Adventurer', h: 1.8, qt: true},
  ulvekonge: {file: 'qWolf', h: 2.0, qt: true, tint: 0xe8eef4, emissive: 0x0a1a2a},
  ketil: {file: 'Skeleton_Warrior', h: 2.5, props: {r: 'Skeleton_Axe', l: 'Skeleton_Shield_Large_A'}, tint: 0x9a8a70, eyes: [3.4, 2.4, .6]},
  troldmor: {file: 'qOrc', h: 3.3, qt: true, tint: 0x9aa07a},
  askebrud: {file: 'Skeleton_Mage', h: 2.3, props: {r: 'Skeleton_Staff'}, tint: 0x5a3a3a, eyes: [3.6, 1.2, .3], emissive: 0x300800},
  // Askefjorden: burnt draugr, fire wolves, lava golems, Garm, Surt and the people of Skjoldvik
  askedraugr: {file: 'Skeleton_Warrior', h: 1.95, props: {r: 'Skeleton_Axe', l: 'Skeleton_Shield_Small_A'}, tint: 0x5c524c, eyes: [3.4, 1.1, .2], emissive: 0x160500},
  askeskytte: {file: 'Skeleton_Rogue', h: 1.85, props: {r: 'Skeleton_Crossbow'}, tint: 0x5c524c, eyes: [3.4, 1.1, .2], emissive: 0x160500},
  eldseidr: {file: 'Skeleton_Mage', h: 1.9, props: {r: 'Skeleton_Staff'}, tint: 0x6a4a40, eyes: [3.6, 1.4, .3], emissive: 0x240800},
  glodulv: {file: 'qWolf', h: 1.15, qt: true, tint: 0x6a4034, emissive: 0x3a0c00},
  lavavaette: {file: 'qGoleling_Evolved', h: 2.6, qt: true, tint: 0x4a3a34, emissive: 0x501200},
  glodkaempe: {file: 'qGoleling_Evolved', h: 3.6, qt: true, tint: 0x3a2a24, emissive: 0x8a2400},
  garm: {file: 'qWolf', h: 3.4, qt: true, tint: 0x3a2c2a, emissive: 0x2a0400},
  surt: {file: 'qDemon', h: 7.6, qt: true, tint: 0x6a3420, emissive: 0x7a2404},
  ragna: {file: 'Mage', h: 1.72, hide: ['Spellbook', 'Spellbook_open', '1H_Wand'], tint: 0xa87a6a},
  sindri: {file: 'Barbarian', h: 1.22, hide: ['1H_Axe_Offhand', 'Barbarian_Round_Shield', '2H_Axe', 'Mug', 'Barbarian_Cape'], tint: 0xb89080, wide: 1.35},
  logi: {file: 'qDemon', h: 2.8, qt: true, tint: 0xe09060, emissive: 0x6a2000},
  jotun: {file: 'Barbarian', h: 8.2, hide: ['1H_Axe_Offhand', 'Barbarian_Round_Shield', '1H_Axe', 'Mug'], tint: 0xd8f0ff, emissive: 0x1d4f6e, ice: true},
};

export function loadAll(onProgress) {
  const loader = new GLTFLoader();
  const keys = Object.keys(FILES);
  const prog = Object.fromEntries(keys.map(k => [k, 0]));
  const report = () => onProgress && onProgress(Object.values(prog).reduce((a, b) => a + b, 0) / keys.length);
  return Promise.all(keys.map(k => new Promise((res, rej) => {
    loader.load(BASE + FILES[k], g => { g.animations.forEach(c => { c.name = c.name.split('|').pop(); }); SRC[k] = g; prog[k] = 1; report(); res(); },
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

/** Height of a rig in its bind pose, measured once from the skinned meshes. */
function naturalHeight(key) {
  const g = SRC[key]; if (g.natH) return g.natH;
  g.scene.updateMatrixWorld(true);
  const box = new THREE.Box3();
  g.scene.traverse(o => { if (o.isSkinnedMesh) { o.computeBoundingBox(); box.union(o.boundingBox.clone().applyMatrix4(o.matrixWorld)); } else if (o.isMesh) box.expandByObject(o); });
  g.natH = Math.max(.01, box.max.y - box.min.y); g.minY = box.min.y;
  return g.natH;
}
/** Cool moonlit rim light so characters read clearly against the snow. */
function addRim(m) {
  m.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>',
      'outgoingLight += vec3(.2,.27,.42) * pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 3.0);\n#include <opaque_fragment>');
  };
  m.customProgramCacheKey = () => 'rim';
}
let iceMat = null;
export function makeChar(role, {iceMaterial} = {}) {
  const L = LOOKS[role]; const src = SRC[L.file];
  const inner = SkeletonUtils.clone(src.scene);
  const s = L.h / (L.qt ? naturalHeight(L.file) : RAW_H); inner.scale.set(s * (L.wide || 1), s, s * (L.wide || 1));
  inner.rotation.y = Math.PI / 2; // KayKit faces +Z, the game faces +X
  if (L.qt) inner.position.y = -(SRC[L.file].minY || 0) * s;
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
      else {
        // Quaternius colours are very dark and half metallic; lift them so they read in a moonlit scene
        if (L.qt) { m.metalness = 0; m.roughness = .78; m.color.setRGB(m.color.r ** .6, m.color.g ** .6, m.color.b ** .6);
          if (/eye/i.test(m.name) && !/black/i.test(m.name)) { m.emissive = new THREE.Color(.5, .55, .6); m.emissiveIntensity = 1; } }
        if (L.tint) m.color.multiply(new THREE.Color(L.tint)); if (L.emissive) { m.emissive = new THREE.Color(L.emissive); m.emissiveIntensity = 1; }
      }
      m.userData.baseEmissive = m.emissive ? m.emissive.clone() : new THREE.Color(0);
      addRim(m); seen.set(m0, m); mats.push(m);
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

/** A static prop: cloned scene with shadows and its footprint size (x/z) and height in metres before scaling. */
export function makeProp(key, {cast = true, receive = true} = {}) {
  const o = SRC[key].scene.clone(true);
  o.traverse(m => { if (m.isMesh) { m.castShadow = cast; m.receiveShadow = receive; } });
  const box = new THREE.Box3().setFromObject(o), size = box.getSize(new THREE.Vector3());
  return {obj: o, size, minY: box.min.y};
}
