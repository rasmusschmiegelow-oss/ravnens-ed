// Boot: loads Three.js and the asset modules, exposes them, then runs the game scripts in order.
// The game scripts are plain scripts that share one global scope (state such as G, P and scene),
// split by concern so each file stays readable. Order matters: later files use earlier ones.
import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {BokehPass} from 'three/addons/postprocessing/BokehPass.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {loadAll, makeChar, makeProp} from './models.js';
import {AU, audioInit, sfx, music, setMuted, setVolumes} from './audio.js';

Object.assign(window, {THREE, EffectComposer, RenderPass, UnrealBloomPass, OutputPass, ShaderPass, GTAOPass, BokehPass,
  mergeGeometries, loadAll, makeChar, makeProp, AU, audioInit, sfx, music, setMuted, setVolumes});

const GAME_FILES = ["util-world.js", "settings.js", "render.js", "world-build.js", "world-act2.js", "effects.js", "characters.js", "state.js", "player.js", "enemies.js", "world-life.js", "dialogue.js", "journal.js", "talents.js", "progress.js", "tutorial.js", "cinematic.js", "input-camera.js", "gamepad.js", "sync-hud.js", "loop.js", "devtools.js", "start.js"];
for (const f of GAME_FILES) {
  await new Promise((resolve, reject) => {
    const s = document.createElement('script'); s.src = `src/game/${f}`;
    s.onload = resolve; s.onerror = () => reject(new Error(`Kunne ikke indlæse ${f}`));
    document.head.appendChild(s);
  });
}
