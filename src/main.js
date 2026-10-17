import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {BokehPass} from 'three/addons/postprocessing/BokehPass.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {loadAll,makeChar,makeProp} from './models.js';
import {AU,audioInit,sfx,music,setMuted} from './audio.js';

/* =========================================================
   UTIL
   ========================================================= */
const $=id=>document.getElementById(id);
const TAU=Math.PI*2, S=0.05; // 20 logic px = 1 metre
const clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,t)=>a+(b-a)*t;
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function angDiff(a,b){let d=a-b;while(d>Math.PI)d-=TAU;while(d<-Math.PI)d+=TAU;return d;}
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const mod=s=>Math.floor((s-10)/2);
const fmtMod=m=>(m>=0?'+':'')+m;
const rand=(a,b)=>a+Math.random()*(b-a);

/* =========================================================
   WORLD LAYOUT (logic in px on the XZ plane)
   ========================================================= */
const WORLD={w:3600,h:3000}, PAD=270;
const LAKE={x:2850,y:1400,rx:380,ry:260}, ICE_Y=-0.32;
const lakeE=(x,y)=>((x-LAKE.x)/LAKE.rx)**2+((y-LAKE.y)/LAKE.ry)**2;
const LM={village:{x:1800,y:2380},camp:{x:1450,y:1850},barrow:{x:560,y:1200},jotun:{x:1800,y:500},gate:{x:1800,y:840}};
const PATHS=[
  [[1800,2250],[1700,2050],[1450,1850],[1150,1600],[900,1420],[720,1250]],
  [[1450,1850],[1700,1400],[1800,1150],[1800,1020],[1800,840],[1800,560]],
  [[1800,2250],[2150,2050],[2450,1700],[2650,1500]]
];
function segDist(px,py,ax,ay,bx,by){const vx=bx-ax,vy=by-ay;const t=clamp(((px-ax)*vx+(py-ay)*vy)/(vx*vx+vy*vy),0,1);return Math.hypot(px-(ax+vx*t),py-(ay+vy*t));}
function pathDist(x,y){let m=1e9;for(const p of PATHS)for(let i=0;i<p.length-1;i++)m=Math.min(m,segDist(x,y,p[i][0],p[i][1],p[i+1][0],p[i+1][1]));return m;}
function flatK(x,y,cx,cy,r){const d=Math.hypot(x-cx,y-cy);return d<r?1:d<r*1.7?1-(d-r)/(r*.7):0;}
function hgt(x,y){
  let h=Math.sin(x*.004)*.9+Math.cos(y*.0035)*.8+Math.sin((x+y)*.0021)*1.2+Math.sin(x*.011+y*.007)*.3+Math.cos(x*.017-y*.013)*.15;
  const f=Math.max(flatK(x,y,1800,2380,320),flatK(x,y,560,1200,300),flatK(x,y,1800,500,380),flatK(x,y,1450,1850,150),flatK(x,y,1800,840,200),flatK(x,y,2900,520,380),flatK(x,y,1180,1380,90));
  h*=1-f*.85;
  const le=lakeE(x,y); if(le<1.7) h=lerp(h,-0.95,sstep(1.7,1.0,le));
  const e=Math.min(x,y,WORLD.w-x,WORLD.h-y);
  if(e<PAD){const k=(PAD-e)/PAD;h+=k*k*20+Math.max(0,k)**3*Math.abs(Math.sin(x*.013)*Math.cos(y*.011))*26;}
  return h;
}
function groundY(x,y){if(CRYPT_FLOOR&&inCrypt(x,y))return CRYPT_FLOOR;const h=hgt(x,y);return lakeE(x,y)<1.25?Math.max(h,ICE_Y):h;}

const OBS=[]; // collision: {x,y,r} circles or {x,y,w,h} rects
const TREES=[],ROCKS=[],STONES=[],RINGROCKS=[];
const HOUSES=[{x:1600,y:2390,w:110,h:80},{x:1890,y:2420,w:120,h:80},{x:1720,y:2540,w:110,h:70},{x:1930,y:2270,w:90,h:70}];
HOUSES.forEach(h=>OBS.push(h));
const FIRES=[{x:1800,y:2410,big:1},{x:1478,y:1872,big:0}];
FIRES.forEach(f=>OBS.push({x:f.x,y:f.y,r:12}));
const RUNESTONES=[{id:0,name:'Ravnsholm',x:1800,y:2250,lit:true},{id:1,name:'Gravhøjens Vej',x:900,y:1420,lit:false},{id:2,name:'Jötunportens Skygge',x:1800,y:1020,lit:false}];
RUNESTONES.forEach(r=>OBS.push({x:r.x,y:r.y,r:14}));
const WALL_Y=820, WALL_H=40;
OBS.push({x:0,y:WALL_Y,w:1720,h:WALL_H},{x:1880,y:WALL_Y,w:1720,h:WALL_H});
const GATE={x:1720,y:WALL_Y,w:160,h:WALL_H,gate:true,gone:false}; OBS.push(GATE);
OBS.push({x:380,y:1200,r:110}); // burial mound
// The crypt beneath the barrow: an enclosed hall reached through the mound's door.
const CRYPT={x0:2560,x1:3240,y0:320,y1:720,inX:2900,inY:655,exitX:2900,exitY:695,doorX:505,doorY:1200};
const inCrypt=(x,y)=>x>CRYPT.x0-20&&x<CRYPT.x1+20&&y>CRYPT.y0-20&&y<CRYPT.y1+20;
OBS.push({x:CRYPT.x0-20,y:CRYPT.y0-20,w:CRYPT.x1-CRYPT.x0+40,h:20},{x:CRYPT.x0-20,y:CRYPT.y1,w:CRYPT.x1-CRYPT.x0+40,h:20},
  {x:CRYPT.x0-20,y:CRYPT.y0,w:20,h:CRYPT.y1-CRYPT.y0},{x:CRYPT.x1,y:CRYPT.y0,w:20,h:CRYPT.y1-CRYPT.y0});
for(const [x,y] of [[2740,450],[3060,450],[2740,600],[3060,600]]) OBS.push({x,y,r:22});
OBS.push({x:1180,y:1380,r:46}); // ruined hall on the barrow road
// Chests: what each holds; crypt chests sit in the hall, the gold one needs the guardian's key.
const CHESTS=[
  {id:'ruin',x:1225,y:1325,item:'ravnefjer',runes:150},
  {id:'wild',x:2560,y:1770,item:'ulvepels',runes:150},
  {id:'cA',x:2630,y:380,item:'mjolnir',runes:250,crypt:1},
  {id:'cB',x:3170,y:380,item:'idunn',runes:250,crypt:1},
  {id:'gold',x:2900,y:362,item:'ulfberht',also:'brynje',runes:600,gold:1,crypt:1},
];
CHESTS.forEach(c=>OBS.push({x:c.x,y:c.y,r:16}));
const WELL={x:1630,y:2235}; OBS.push({x:WELL.x,y:WELL.y,r:24});
OBS.push({x:2850,y:1400,r:20}); // Mimir altar
for(let i=0;i<14;i++){const a=i/14*TAU;if(Math.abs(angDiff(a,0))<.5)continue;const s={x:560+Math.cos(a)*265,y:1200+Math.sin(a)*265,r:15,h:rand(2.2,3.4),rot:a};STONES.push(s);OBS.push(s);}
for(let i=0;i<24;i++){const a=i/24*TAU;if(Math.abs(angDiff(a,Math.PI/2))<.33)continue;const s={x:1800+Math.cos(a)*350,y:500+Math.sin(a)*330,r:rand(24,34)};RINGROCKS.push(s);OBS.push(s);}

function clearZone(x,y,pad){
  if(x>CRYPT.x0-140&&y<CRYPT.y1+120) return false;
  if(Math.hypot(x-1180,y-1380)<120+pad) return false;
  for(const c of CHESTS) if(Math.hypot(x-c.x,y-c.y)<60) return false;
  if(Math.hypot(x-1800,y-2380)<360+pad) return false;
  if(Math.hypot(x-1450,y-1850)<150+pad) return false;
  if(Math.hypot(x-560,y-1200)<330+pad) return false;
  if(Math.hypot(x-1800,y-500)<420+pad) return false;
  if(lakeE(x,y)<1.25) return false;
  if(y>WALL_Y-60&&y<WALL_Y+WALL_H+60) return false;
  for(const r of RUNESTONES) if(Math.hypot(x-r.x,y-r.y)<110) return false;
  if(pathDist(x,y)<80+pad*.3) return false;
  return true;
}
{
  const R=rng(1337);
  let tries=0;
  while(TREES.length<640&&tries++<9000){
    const x=PAD-40+R()*(WORLD.w-2*PAD+80), y=PAD-40+R()*(WORLD.h-2*PAD+80);
    if(!clearZone(x,y,0)) continue;
    let ok=true; for(const t of TREES){if(Math.abs(t.x-x)<46&&Math.abs(t.y-y)<46){ok=false;break;}} if(!ok) continue;
    const s=.8+R()*.7; const t={x,y,r:12*s,s,rot:R()*TAU,col:true}; TREES.push(t); OBS.push(t);
  }
  // decorative forest on the mountain slopes
  for(let i=0;i<900;i++){
    const x=-500+R()*(WORLD.w+1000), y=-500+R()*(WORLD.h+1000);
    const e=Math.min(x,y,WORLD.w-x,WORLD.h-y); if(e>PAD-30||e<-450) continue;
    TREES.push({x,y,r:0,s:.9+R()*.9,rot:R()*TAU,col:false});
  }
  tries=0;
  while(ROCKS.length<110&&tries++<4000){
    const x=PAD+R()*(WORLD.w-2*PAD), y=PAD+R()*(WORLD.h-2*PAD);
    if(!clearZone(x,y,-20)) continue;
    const r=10+R()*18; let ok=true; for(const t of OBS){if(t.r&&Math.hypot(t.x-x,t.y-y)<t.r+r+8){ok=false;break;}} if(!ok) continue;
    const o={x,y,r}; ROCKS.push(o); OBS.push(o);
  }
}

/* =========================================================
   RENDERER / SCENE
   ========================================================= */
const cv=$('cv');
const renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,powerPreference:'high-performance'});
// Graphics quality: 'high' (default) or 'ultra' (ambient occlusion, sharper shadows, full pixel density)
let GFX='high'; try{GFX=localStorage.getItem('ravnensEd.gfx')||'high';}catch(e){}
renderer.setPixelRatio(Math.min(devicePixelRatio||1,GFX==='ultra'?2:1.5));
renderer.setSize(innerWidth,innerHeight,false);
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=.82;
const scene=new THREE.Scene();
const FOG_COL=new THREE.Color(0x1b2738);
scene.fog=new THREE.FogExp2(FOG_COL,.0135);
scene.background=FOG_COL;
const camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,.1,700);
// Render chain: multisampled scene -> AO (ultra) -> depth of field (dialogue) -> bloom -> tone mapping -> colour grade
const composer=new EffectComposer(renderer,new THREE.WebGLRenderTarget(innerWidth,innerHeight,{type:THREE.HalfFloatType,samples:4}));
composer.addPass(new RenderPass(scene,camera));
const gtao=new GTAOPass(scene,camera,innerWidth,innerHeight); gtao.blendIntensity=.85;
gtao.updateGtaoMaterial({radius:1.2,distanceExponent:1.4,thickness:1.2,scale:1,samples:12}); gtao.enabled=GFX==='ultra'; composer.addPass(gtao);
const dof=new BokehPass(scene,camera,{focus:6,aperture:.0035,maxblur:.008}); dof.enabled=false; composer.addPass(dof);
const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.6,.5,1.05);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade=new ShaderPass({uniforms:{tDiffuse:{value:null},uTime:{value:0},uDark:{value:0}},
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform sampler2D tDiffuse;uniform float uTime;uniform float uDark;varying vec2 vUv;
  void main(){vec2 c=vUv-.5;float r2=dot(c,c);
    vec2 off=c*r2*.012;vec3 col=vec3(texture2D(tDiffuse,vUv+off).r,texture2D(tDiffuse,vUv).g,texture2D(tDiffuse,vUv-off).b);
    float l=dot(col,vec3(.299,.587,.114));
    col=mix(vec3(l),col,1.08);
    col+=mix(vec3(-.012,-.004,.022),vec3(.018,.008,-.012),smoothstep(.15,.75,l));
    col=pow(max(col,0.),vec3(1.04));
    col*=1.-smoothstep(.18,.62,r2)*(.32+uDark*.25);
    gl_FragColor=vec4(col,1.);}`});
composer.addPass(grade);
function onResize(){renderer.setSize(innerWidth,innerHeight,false);composer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}
function applyGfx(q){
  GFX=q; try{localStorage.setItem('ravnensEd.gfx',q);}catch(e){}
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,q==='ultra'?2:1.5)); onResize();
  gtao.enabled=q==='ultra';
  const size=q==='ultra'?4096:2048; if(moon.shadow.mapSize.x!==size){moon.shadow.mapSize.set(size,size);if(moon.shadow.map){moon.shadow.map.dispose();moon.shadow.map=null;}}
  const b=document.getElementById('pzGfx'); if(b) b.textContent='Grafik: '+(q==='ultra'?'Ultra':'Høj');
}
addEventListener('resize',onResize);

// --- Sky with aurora, stars and moon
const skyUniforms={uTime:{value:0}};
const skyMat=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms:skyUniforms,
  vertexShader:`varying vec3 vDir;void main(){vDir=normalize(position);vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;}`,
  fragmentShader:`uniform float uTime;varying vec3 vDir;
  float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float h3(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
  float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y);}
  float fbm(vec2 p){float a=0.,w=.5;for(int i=0;i<4;i++){a+=w*n2(p);p*=2.03;w*=.5;}return a;}
  void main(){vec3 d=normalize(vDir);float y=d.y;
    vec3 col=mix(vec3(.105,.15,.215),vec3(.012,.018,.04),smoothstep(-.02,.55,y));
    col=mix(col,vec3(.08,.1,.14),smoothstep(0.,-.3,y));
    vec3 sp=floor(d*420.);float s=h3(sp);col+=vec3(.9,.95,1.)*step(.9965,s)*smoothstep(.02,.35,y)*(.55+.45*sin(uTime*2.+s*90.));
    if(y>0.){vec2 uv=d.xz/(y+.18);float a=0.;
      for(int i=0;i<3;i++){float fi=float(i);float wav=uv.y+.35*sin(uv.x*1.3+uTime*.07+fi*2.)+.15*sin(uv.x*3.1-uTime*.11)-.5+fi*.45;
        float band=exp(-wav*wav*5.);float cur=fbm(vec2(uv.x*2.2+fi*7.,uTime*.05+fi))*.8+.2;float rays=.6+.4*n2(vec2(uv.x*16.+uTime*.3,fi));a+=band*cur*rays;}
      vec3 ac=mix(vec3(.15,1.,.62),vec3(.55,.3,1.),smoothstep(.15,.65,y));col+=ac*a*.55*smoothstep(.0,.22,y);}
    vec3 md=normalize(vec3(-.35,.42,-.84));float m=dot(d,md);col+=vec3(1.,.98,.92)*1.6*smoothstep(.99935,.99965,m)+vec3(.35,.45,.7)*pow(max(m,0.),300.)*.5+vec3(.2,.25,.4)*pow(max(m,0.),20.)*.12;
    gl_FragColor=vec4(col,1.);}`});
const sky=new THREE.Mesh(new THREE.SphereGeometry(450,48,24),skyMat); sky.renderOrder=-1; sky.frustumCulled=false; scene.add(sky);
{ // environment map from a copy of the sky
  const pm=new THREE.PMREMGenerator(renderer); const es=new THREE.Scene(); es.add(new THREE.Mesh(new THREE.SphereGeometry(10,32,16),skyMat));
  scene.environment=pm.fromScene(es,.04).texture; scene.environmentIntensity=1;
}

// --- Lights
const hemi=new THREE.HemisphereLight(0x7f97bd,0x1d222c,.62); scene.add(hemi);
const moon=new THREE.DirectionalLight(0xb4c8f4,1.45);
moon.castShadow=true; moon.shadow.mapSize.set(GFX==='ultra'?4096:2048,GFX==='ultra'?4096:2048);
Object.assign(moon.shadow.camera,{left:-32,right:32,top:32,bottom:-32,near:1,far:160});
moon.shadow.bias=-.0004; moon.shadow.normalBias=.035;
scene.add(moon,moon.target);
const MOON_OFF=new THREE.Vector3(-28,52,-44);
const lantern=new THREE.PointLight(0xffb072,10,14,1.7); lantern.castShadow=false; scene.add(lantern);

/* --- Procedural textures */
function canvasTex(w,h,draw,repeat){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');draw(g,w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;if(repeat){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeat,repeat);}return t;}
const snowTex=canvasTex(256,256,(g,w,h)=>{g.fillStyle='#fff';g.fillRect(0,0,w,h);const r=rng(5);for(let i=0;i<5000;i++){const v=200+r()*55|0;g.fillStyle=`rgba(${v},${v+3},${Math.min(255,v+10)},${.25+r()*.4})`;g.fillRect(r()*w,r()*h,1+r()*2,1+r()*2);}for(let i=0;i<40;i++){g.fillStyle=`rgba(170,185,205,${r()*.18})`;g.beginPath();g.ellipse(r()*w,r()*h,8+r()*30,4+r()*10,r()*3,0,TAU);g.fill();}},90);
const woodTex=canvasTex(128,128,(g,w,h)=>{g.fillStyle='#4a3424';g.fillRect(0,0,w,h);const r=rng(9);for(let y=0;y<h;y+=16){g.fillStyle=`rgba(0,0,0,${.25+r()*.2})`;g.fillRect(0,y,w,2);for(let i=0;i<14;i++){g.fillStyle=`rgba(${110+r()*40|0},${80+r()*20|0},50,${.15})`;g.fillRect(0,y+2+r()*13,w,1);}}},1);
const stoneTex=canvasTex(128,128,(g,w,h)=>{g.fillStyle='#6b7279';g.fillRect(0,0,w,h);const r=rng(3);for(let i=0;i<900;i++){const v=80+r()*90|0;g.fillStyle=`rgba(${v},${v+4},${v+10},.35)`;g.fillRect(r()*w,r()*h,2+r()*4,2+r()*4);}for(let i=0;i<30;i++){g.fillStyle=`rgba(110,140,90,${r()*.25})`;g.beginPath();g.arc(r()*w,r()*h,3+r()*8,0,TAU);g.fill();}},1);
function runeTex(glyphs,col){return canvasTex(128,384,(g,w,h)=>{g.fillStyle='#000';g.fillRect(0,0,w,h);g.font='54px "Noto Sans Runic", sans-serif';g.textAlign='center';g.fillStyle=col;g.shadowColor=col;g.shadowBlur=14;[...glyphs].forEach((c,i)=>g.fillText(c,w/2,70+i*62));g.strokeStyle=col;g.lineWidth=3;g.beginPath();g.moveTo(18,14);g.lineTo(18,h-14);g.moveTo(w-18,14);g.lineTo(w-18,h-14);g.stroke();});}
const iceTex=canvasTex(512,512,(g,w,h)=>{const gr=g.createRadialGradient(w/2,h/2,10,w/2,h/2,w/2);gr.addColorStop(0,'#cfe9f5');gr.addColorStop(1,'#6f9fb8');g.fillStyle=gr;g.fillRect(0,0,w,h);const r=rng(11);g.strokeStyle='rgba(255,255,255,.55)';for(let i=0;i<40;i++){let x=r()*w,y=r()*h;g.lineWidth=.5+r()*1.4;g.beginPath();g.moveTo(x,y);for(let j=0;j<8;j++){x+=(r()-.5)*70;y+=(r()-.5)*70;g.lineTo(x,y);}g.stroke();}for(let i=0;i<300;i++){g.fillStyle=`rgba(255,255,255,${r()*.25})`;g.beginPath();g.arc(r()*w,r()*h,r()*3,0,TAU);g.fill();}});
const shieldTex=canvasTex(128,128,(g,w,h)=>{g.fillStyle='#e6dcc4';g.fillRect(0,0,w,h);g.fillStyle='#8c2a22';for(let i=0;i<4;i++){g.beginPath();g.moveTo(64,64);g.arc(64,64,64,i*Math.PI/2,i*Math.PI/2+Math.PI/4);g.fill();}g.strokeStyle='#2a1d12';g.lineWidth=5;g.beginPath();g.arc(64,64,60,0,TAU);g.stroke();});
const softDot=canvasTex(64,64,(g,w,h)=>{const gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.4,'rgba(255,255,255,.5)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);});
const fogTex=canvasTex(256,256,(g,w,h)=>{const r=rng(21);for(let i=0;i<26;i++){const x=60+r()*136,y=60+r()*136,rad=30+r()*70;const gr=g.createRadialGradient(x,y,0,x,y,rad);gr.addColorStop(0,'rgba(255,255,255,.22)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);}});

/* --- Photographed textures (Poly Haven, CC0) */
const texL=new THREE.TextureLoader();
function ptex(name,srgb,rep){const t=texL.load('assets/textures/'+name);if(srgb)t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep,rep);t.anisotropy=8;return t;}
const SNOW_REP=120;
/* --- Materials */
const MAT={
  snowMount:new THREE.MeshStandardMaterial({color:0xffffff,map:ptex('snow_02_diff_1k.jpg',1,SNOW_REP),normalMap:ptex('snow_02_nor_gl_1k.jpg',0,SNOW_REP),roughnessMap:ptex('snow_02_rough_1k.jpg',0,SNOW_REP),normalScale:new THREE.Vector2(.9,.9),vertexColors:true,roughness:1}),
  bark:new THREE.MeshStandardMaterial({color:0x3b2c22,roughness:1}),
  pine:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95,flatShading:true}),
  rock:new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true,map:ptex('rock_face_diff_1k.jpg',1,1),normalMap:ptex('rock_face_nor_gl_1k.jpg',0,1),roughnessMap:ptex('rock_face_rough_1k.jpg',0,1)}),
  wood:new THREE.MeshStandardMaterial({map:woodTex,roughness:.9}),
  roof:new THREE.MeshStandardMaterial({color:0xe9eef4,roughness:.85,map:snowTex}),
  stone:new THREE.MeshStandardMaterial({color:0xb4b8bc,roughness:1,map:ptex('rock_face_diff_1k.jpg',1,1),normalMap:ptex('rock_face_nor_gl_1k.jpg',0,1),flatShading:true}),
  iron:new THREE.MeshStandardMaterial({color:0x2c3035,roughness:.45,metalness:.85}),
  steel:new THREE.MeshStandardMaterial({color:0xaab3bd,roughness:.25,metalness:1}),
  gold:new THREE.MeshStandardMaterial({color:0xd4ae55,roughness:.3,metalness:1}),
  ember:new THREE.MeshBasicMaterial({color:new THREE.Color(2,.7,.15)}),
  window:new THREE.MeshBasicMaterial({color:new THREE.Color(2.4,1.3,.5)}),
  dark:new THREE.MeshBasicMaterial({color:0x050608}),
  iceGlow:new THREE.MeshStandardMaterial({color:0xa8e4ff,emissive:0x5fb8e6,emissiveIntensity:.75,roughness:.15,metalness:.1,flatShading:true,transparent:true,opacity:.92}),
  ice:new THREE.MeshPhysicalMaterial({color:0xc6e7f5,map:iceTex,roughness:.08,metalness:0,clearcoat:1,clearcoatRoughness:.05,envMapIntensity:1.6}),
  banner:new THREE.MeshStandardMaterial({color:0x7d1f1a,roughness:.9,side:THREE.DoubleSide}),
};

/* --- Trees between the camera and the player turn see-through (screen-door dither) */
const SEE={uPlayer:{value:new THREE.Vector3()},uCam:{value:new THREE.Vector3()},uFade:{value:0}};
const WIND={uTime:{value:0},uWind:{value:1}};
function seeThrough(mat,sway=0){
  mat.onBeforeCompile=sh=>{
    Object.assign(sh.uniforms,SEE,WIND);
    sh.vertexShader='varying vec3 vWP;uniform float uTime;uniform float uWind;\n'+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec2 ip=instanceMatrix[3].xz;
      #else
        vec2 ip=vec2(0.);
      #endif
      float sw=${sway.toFixed(3)}*max(transformed.y,0.)*max(transformed.y,0.);
      transformed.x+=sw*(sin(uTime*1.1+ip.x*.13+ip.y*.07)*.6+sin(uTime*2.7+ip.y*.21)*.25)*uWind;
      transformed.z+=sw*sin(uTime*.9+ip.x*.11)*.35*uWind;`).replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
      #ifdef USE_INSTANCING
        vWP=(modelMatrix*instanceMatrix*vec4(transformed,1.0)).xyz;
      #else
        vWP=(modelMatrix*vec4(transformed,1.0)).xyz;
      #endif`);
    sh.fragmentShader='varying vec3 vWP;uniform vec3 uPlayer;uniform vec3 uCam;uniform float uFade;\n'+sh.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
      if(uFade>0.5){vec2 pc=uPlayer.xz,ab=uCam.xz-pc;float t=clamp(dot(vWP.xz-pc,ab)/max(dot(ab,ab),.001),0.,1.);
        float dseg=length(vWP.xz-(pc+ab*t));float hLine=mix(uPlayer.y+.6,uCam.y,t);
        if(dseg<3.4&&vWP.y>uPlayer.y+.7&&vWP.y<hLine+4.){vec2 f=mod(floor(gl_FragCoord.xy),3.);if(!(f.x==0.&&f.y==0.))discard;}}`);
  };
  return mat;
}

/* =========================================================
   TERRAIN
   ========================================================= */
{
  const ext=900, TW=WORLD.w+ext*2, TH=WORLD.h+ext*2;
  const geo=new THREE.PlaneGeometry(TW*S,TH*S,600,500); geo.rotateX(-Math.PI/2);
  const pos=geo.attributes.position, cols=new Float32Array(pos.count*3), nr=rng(77);
  for(let i=0;i<pos.count;i++){
    const px=pos.getX(i)/S+WORLD.w/2, py=pos.getZ(i)/S+WORLD.h/2;
    pos.setY(i,hgt(px,py));
    let r=.7,g=.76,b=.88; const v=.93+nr()*.07;
    const pd=pathDist(px,py); const pk=sstep(70,20,pd);
    r=lerp(r,.42,pk*.8);g=lerp(g,.43,pk*.8);b=lerp(b,.46,pk*.8);
    const vk=sstep(340,120,Math.hypot(px-1800,py-2380)); r=lerp(r,.5,vk*.55);g=lerp(g,.45,vk*.55);b=lerp(b,.42,vk*.55);
    const bk=sstep(340,80,Math.hypot(px-560,py-1200)); r=lerp(r,.36,bk*.6);g=lerp(g,.42,bk*.6);b=lerp(b,.36,bk*.6);
    const jk=sstep(420,100,Math.hypot(px-1800,py-500)); r=lerp(r,.75,jk*.4);g=lerp(g,.9,jk*.4);b=lerp(b,1.05,jk*.4);
    const le=lakeE(px,py); if(le<1.6){const k=sstep(1.6,1.05,le);r=lerp(r,.55,k);g=lerp(g,.62,k);b=lerp(b,.7,k);}
    cols[i*3]=r*v;cols[i*3+1]=g*v;cols[i*3+2]=b*v;
  }
  geo.setAttribute('color',new THREE.BufferAttribute(cols,3)); geo.computeVertexNormals();
  const terr=new THREE.Mesh(geo,MAT.snowMount); terr.position.set(WORLD.w/2*S,0,WORLD.h/2*S); terr.receiveShadow=true; scene.add(terr);
  // frozen lake
  const lg=new THREE.CircleGeometry(1,72); lg.rotateX(-Math.PI/2);
  const lake=new THREE.Mesh(lg,MAT.ice); lake.scale.set(LAKE.rx*S*1.12,1,LAKE.ry*S*1.12); lake.position.set(LAKE.x*S,ICE_Y,LAKE.y*S); lake.receiveShadow=true; scene.add(lake);
}

/* =========================================================
   VEGETATION & PROPS (instanced)
   ========================================================= */
const dummy=new THREE.Object3D();
{
  // pine: stacked jittered cones with snow patches
  const parts=[];
  const lr=rng(4);
  [[2.3,3.2,2.2],[1.85,2.8,3.7],[1.35,2.4,5.0],[.8,2,6.2]].forEach(([r,h,y])=>{
    let c=new THREE.ConeGeometry(r,h,8,2).toNonIndexed(); c.translate(0,y,0);
    const p=c.attributes.position; for(let i=0;i<p.count;i++){const yy=p.getY(i);if(yy<y+h/2-.05){p.setX(i,p.getX(i)*(1+(lr()-.5)*.18));p.setZ(i,p.getZ(i)*(1+(lr()-.5)*.18));p.setY(i,yy+(lr()-.5)*.15);}}
    c.computeVertexNormals();
    const col=new Float32Array(p.count*3);
    for(let i=0;i<p.count;i+=3){ // per face
      const ny=(c.attributes.normal.getY(i)+c.attributes.normal.getY(i+1)+c.attributes.normal.getY(i+2))/3;
      const snow=ny>.55||lr()<.28; const k=snow?[.84,.9,.97]:[.07+lr()*.03,.16+lr()*.05,.12];
      for(let j=0;j<3;j++){col[(i+j)*3]=k[0];col[(i+j)*3+1]=k[1];col[(i+j)*3+2]=k[2];}
    }
    c.setAttribute('color',new THREE.BufferAttribute(col,3)); c.deleteAttribute('uv'); parts.push(c);
  });
  const fol=mergeGeometries(parts);
  const trunk=new THREE.CylinderGeometry(.18,.32,2.6,7); trunk.translate(0,1.2,0);
  const nT=TREES.length;
  seeThrough(MAT.pine,.0022); seeThrough(MAT.bark,.0012);
  const imF=new THREE.InstancedMesh(fol,MAT.pine,nT), imT=new THREE.InstancedMesh(trunk,MAT.bark,nT);
  imF.castShadow=imT.castShadow=true; imF.receiveShadow=true;
  TREES.forEach((t,i)=>{dummy.position.set(t.x*S,hgt(t.x,t.y)-.1,t.y*S);dummy.rotation.set((Math.random()-.5)*.06,t.rot,(Math.random()-.5)*.06);dummy.scale.setScalar(t.s);dummy.updateMatrix();imF.setMatrixAt(i,dummy.matrix);imT.setMatrixAt(i,dummy.matrix);});
  scene.add(imF,imT);
  // rocks
  const rg=new THREE.IcosahedronGeometry(1,1).toNonIndexed(); const rp=rg.attributes.position; const rr=rng(8);
  const seen=new Map(); for(let i=0;i<rp.count;i++){const k=rp.getX(i).toFixed(3)+rp.getY(i).toFixed(3)+rp.getZ(i).toFixed(3);let s=seen.get(k);if(!s){s=.8+rr()*.4;seen.set(k,s);}rp.setXYZ(i,rp.getX(i)*s,rp.getY(i)*s,rp.getZ(i)*s);}
  rg.computeVertexNormals();
  const rc=new Float32Array(rp.count*3); for(let i=0;i<rp.count;i+=3){const ny=(rg.attributes.normal.getY(i)+rg.attributes.normal.getY(i+1)+rg.attributes.normal.getY(i+2))/3;const k=ny>.62?[.9,.94,1]:[.42,.45,.5];for(let j=0;j<3;j++){rc[(i+j)*3]=k[0];rc[(i+j)*3+1]=k[1];rc[(i+j)*3+2]=k[2];}}
  rg.setAttribute('color',new THREE.BufferAttribute(rc,3));
  const allRocks=[...ROCKS,...RINGROCKS];
  const imR=new THREE.InstancedMesh(rg,MAT.rock,allRocks.length); imR.castShadow=imR.receiveShadow=true;
  allRocks.forEach((o,i)=>{const big=RINGROCKS.includes(o);dummy.position.set(o.x*S,hgt(o.x,o.y)+(big?.4:0),o.y*S);dummy.rotation.set(Math.random(),Math.random()*TAU,Math.random()*.4);dummy.scale.set(o.r*S*1.25,o.r*S*(big?1.8:.85),o.r*S*1.1);dummy.updateMatrix();imR.setMatrixAt(i,dummy.matrix);});
  scene.add(imR);
  // ground detail: frost-bitten grass, pebbles, shrubs and fallen logs scattered through the snow
  {
    const dr=rng(99), pts=(n,ok)=>{const out=[];let tries=0;while(out.length<n&&tries++<n*6){const x=PAD+dr()*(WORLD.w-2*PAD),y=PAD+dr()*(WORLD.h-2*PAD);if(ok(x,y))out.push([x,y]);}return out;};
    const open=(x,y,pad)=>lakeE(x,y)>1.15&&!inCrypt(x,y)&&pathDist(x,y)>pad&&Math.hypot(x-1800,y-2380)>250&&!(y>WALL_Y-30&&y<WALL_Y+WALL_H+30);
    // grass: three crossed blades per tuft, straw to dark green, swaying in the wind
    const blades=[]; for(let b=0;b<3;b++){const g=new THREE.PlaneGeometry(.09,.55,1,3).translate(0,.27,0);const pa=g.attributes.position;for(let i=0;i<pa.count;i++){const yy=pa.getY(i);pa.setX(i,pa.getX(i)*(1-yy/.6));pa.setZ(i,yy*yy*.25);}g.rotateY(b*Math.PI/3+dr()*.3);blades.push(g);}
    const gg=mergeGeometries(blades); const gc=new Float32Array(gg.attributes.position.count*3);
    for(let i=0;i<gg.attributes.position.count;i++){const t=gg.attributes.position.getY(i)/.55;gc[i*3]=lerp(.18,.62,t);gc[i*3+1]=lerp(.2,.52,t);gc[i*3+2]=lerp(.12,.3,t);}
    gg.setAttribute('color',new THREE.BufferAttribute(gc,3));
    const gm=seeThrough(new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide}),.55);
    const gp=pts(9000,(x,y)=>open(x,y,40)); const ig=new THREE.InstancedMesh(gg,gm,gp.length); ig.receiveShadow=true;
    gp.forEach(([x,y],i)=>{const sc=.6+dr()*.9;dummy.position.set(x*S,hgt(x,y)-.04,y*S);dummy.rotation.set(0,dr()*TAU,0);dummy.scale.set(sc,sc*(.7+dr()*.6),sc);dummy.updateMatrix();ig.setMatrixAt(i,dummy.matrix);});
    scene.add(ig);
    // pebbles
    const pg=new THREE.DodecahedronGeometry(.12,0); const pp=pts(3200,(x,y)=>open(x,y,10));
    const ip=new THREE.InstancedMesh(pg,MAT.rock,pp.length); ip.castShadow=false; ip.receiveShadow=true;
    pp.forEach(([x,y],i)=>{const sc=.5+dr()*1.6;dummy.position.set(x*S,hgt(x,y),y*S);dummy.rotation.set(dr()*3,dr()*3,dr()*3);dummy.scale.set(sc,sc*.6,sc);dummy.updateMatrix();ip.setMatrixAt(i,dummy.matrix);});
    scene.add(ip);
    // frosty shrubs
    const sparts=[];for(let k=0;k<4;k++){const g=new THREE.IcosahedronGeometry(.35+dr()*.15,0).toNonIndexed();g.translate((dr()-.5)*.6,.25+dr()*.15,(dr()-.5)*.6);sparts.push(g);}
    const sg2=mergeGeometries(sparts);const sc2=new Float32Array(sg2.attributes.position.count*3);sg2.computeVertexNormals();
    for(let i=0;i<sg2.attributes.position.count;i+=3){const ny=sg2.attributes.normal.getY(i);const k=ny>.5?[.82,.88,.95]:[.1,.17,.13];for(let j=0;j<3;j++){sc2[(i+j)*3]=k[0];sc2[(i+j)*3+1]=k[1];sc2[(i+j)*3+2]=k[2];}}
    sg2.setAttribute('color',new THREE.BufferAttribute(sc2,3));
    const sm2=seeThrough(new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true}),.25);
    const sp=pts(900,(x,y)=>open(x,y,55)&&clearZone(x,y,-40)); const is2=new THREE.InstancedMesh(sg2,sm2,sp.length); is2.castShadow=true; is2.receiveShadow=true;
    sp.forEach(([x,y],i)=>{const sc=.7+dr()*.8;dummy.position.set(x*S,hgt(x,y)-.05,y*S);dummy.rotation.set(0,dr()*TAU,0);dummy.scale.set(sc,sc*(.7+dr()*.5),sc);dummy.updateMatrix();is2.setMatrixAt(i,dummy.matrix);});
    scene.add(is2);
    // fallen logs with snow on top
    const lp=pts(70,(x,y)=>open(x,y,70)&&clearZone(x,y,-30));
    const lg=new THREE.CylinderGeometry(.22,.26,1,7).rotateZ(Math.PI/2); const lsnow=new THREE.CylinderGeometry(.2,.24,1,7,1,false,-Math.PI*.35,Math.PI*.7).rotateZ(Math.PI/2).translate(0,.06,0);
    const il=new THREE.InstancedMesh(lg,MAT.bark,lp.length), ils=new THREE.InstancedMesh(lsnow,new THREE.MeshStandardMaterial({color:0xe6eef6,roughness:.9}),lp.length);
    il.castShadow=il.receiveShadow=ils.receiveShadow=true;
    lp.forEach(([x,y],i)=>{const len=2.5+dr()*3;dummy.position.set(x*S,hgt(x,y)+.15,y*S);dummy.rotation.set(0,dr()*TAU,(dr()-.5)*.08);dummy.scale.set(len,1,1);dummy.updateMatrix();il.setMatrixAt(i,dummy.matrix);ils.setMatrixAt(i,dummy.matrix);});
    scene.add(il,ils);
  }
  // barrow standing stones
  const sg=new THREE.BoxGeometry(.9,1,.5,1,3,1); {const p=sg.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i);const k=1-(y+.5)*.35;p.setX(i,p.getX(i)*k);p.setZ(i,p.getZ(i)*k);}sg.computeVertexNormals();}
  const imS=new THREE.InstancedMesh(sg,MAT.stone,STONES.length); imS.castShadow=true;
  STONES.forEach((s,i)=>{dummy.position.set(s.x*S,hgt(s.x,s.y)+s.h/2-.2,s.y*S);dummy.rotation.set((Math.random()-.5)*.12,-s.rot+Math.PI/2,(Math.random()-.5)*.12);dummy.scale.set(1,s.h,1);dummy.updateMatrix();imS.setMatrixAt(i,dummy.matrix);});
  scene.add(imS);
}

/* --- Buildings */
const SMOKERS=[]; const FIRE_FX=[]; const BANNERS=[];
/** Places a loaded prop on the terrain. fit scales its widest side to that many metres. */
function placeProp(key,x,y,{rot=0,scale=1,fit=0,collide=0,lift=0,ground}={}){
  const p=makeProp(key); const s=fit?fit/Math.max(p.size.x,p.size.z):scale;
  p.obj.scale.setScalar(s); p.obj.rotation.y=rot; p.obj.position.set(x*S,(ground??hgt(x,y))-p.minY*s+lift,y*S);
  scene.add(p.obj); if(collide) OBS.push({x,y,r:collide}); p.s=s; return p;
}
const CHEST_M={}, CRYPT_LIGHTS=[];
function buildWorldProps(){
  // village: longhouse, sawmill, granary and watchtower on the old house plots, all facing the fire
  ['building_barracks_red','building_lumbermill_red','building_grain','building_tower_A_red'].forEach((k,i)=>{
    const h=HOUSES[i], cx=h.x+h.w/2, cy=h.y+h.h/2, rot=Math.atan2(1800-cx,2400-cy);
    const p=placeProp(k,cx,cy,{rot,fit:Math.max(h.w,h.h)*S*1.25,lift:-.05});
    SMOKERS.push(new THREE.Vector3(cx*S,hgt(cx,cy)+p.size.y*p.s*.85,cy*S));
    const wl=new THREE.PointLight(0xff9a50,5,8,2); wl.position.set((cx+Math.sin(rot)*h.h*.7)*S,hgt(cx,cy)+1.4,(cy+Math.cos(rot)*h.h*.7)*S); scene.add(wl);
  });
  placeProp('building_well_red',WELL.x,WELL.y,{fit:2.6,rot:.4});
  placeProp('bucket_water',WELL.x+30,WELL.y+12,{fit:.5});
  [['barrel',1588,2486,0],['barrel',1606,2500,1],['crate_A_big',1722,2482,.3],['sack',1702,2490,0],['weaponrack',1612,2366,Math.PI],['resource_lumber',2032,2470,1.2],
   ['wheelbarrow',1868,2522,2.4],['crate_B_small',1842,2534,.2],['target',2060,2250,-.6],['barrel',2028,2350,0],['sack',1990,2532,1]].forEach(([k,x,y,r])=>placeProp(k,x,y,{rot:r,fit:k==='resource_lumber'?2.4:k==='weaponrack'?1.8:k==='target'?1.6:k==='wheelbarrow'?1.6:1.1,collide:10}));
  for(let x=1560;x<=2040;x+=44) if(Math.abs(x-1800)>40) placeProp('fence_wood_straight',x,2660,{fit:2.3,rot:0});
  for(let y=2300;y<=2640;y+=44) {placeProp('fence_wood_straight',1540,y,{fit:2.3,rot:Math.PI/2});placeProp('fence_wood_straight',2080,y,{fit:2.3,rot:Math.PI/2});}
  // Astrid's camp and the ruined hall on the barrow road
  placeProp('tent',1400,1815,{fit:3.4,rot:.6,collide:30}); placeProp('crate_A_big',1505,1830,{fit:1,collide:10}); placeProp('sack',1490,1812,{fit:.9});
  placeProp('building_destroyed',1180,1380,{fit:6.5,rot:.8});
  placeProp('flag_red',1700,895,{fit:1.2}); placeProp('flag_red',1900,895,{fit:1.2});
  // chests across the world and in the crypt
  for(const c of CHESTS){
    const g=c.crypt?hgt(2900,520):undefined;
    const p=placeProp(c.gold?'chest_gold':'chest',c.x,c.y,{fit:1.15,rot:c.crypt?0:Math.atan2(1800-c.x,2400-c.y),ground:g});
    CHEST_M[c.id]={obj:p.obj,lid:p.obj.getObjectByName(c.gold?'chest_gold_lid':'chest_lid'),open:0};
  }
  buildCrypt();
}
let CRYPT_FLOOR=0, CRYPT_VOID=null;
function buildCrypt(){
  CRYPT_FLOOR=hgt(2900,520); const g=CRYPT_FLOOR;
  for(let x=CRYPT.x0+40;x<CRYPT.x1;x+=80) for(let y=CRYPT.y0+40;y<CRYPT.y1;y+=80) placeProp((x+y)%240?'floor_tile_large':'floor_dirt_large',x,y,{ground:g,lift:-.04});
  for(let x=CRYPT.x0+40;x<CRYPT.x1;x+=80) placeProp(x===2920?'wall_arched':'wall',x,CRYPT.y0-10,{ground:g});
  for(let y=CRYPT.y0+40;y<CRYPT.y1;y+=80){placeProp('wall',CRYPT.x0-10,y,{rot:Math.PI/2,ground:g});placeProp('wall',CRYPT.x1+10,y,{rot:Math.PI/2,ground:g});}
  for(const [x,y] of [[2740,450],[3060,450],[2740,600],[3060,600]]) placeProp('pillar_decorated',x,y,{ground:g,fit:2});
  const torch=(x,y,rot,lx,ly)=>{placeProp('torch_lit',x,y,{ground:g,lift:2.2,fit:.6,rot});
    const L=new THREE.PointLight(0xff8a3a,0,20,1.4); L.position.set(lx*S,g+2.8,ly*S); scene.add(L); CRYPT_LIGHTS.push(L);
    FIRE_FX.push({x:x*S,y:g+2.9,z:y*S,light:L,base:34,small:1,crypt:1});};
  for(const x of [2700,2900,3100]) torch(x,CRYPT.y0+12,0,x,CRYPT.y0+40);
  torch(CRYPT.x0+12,560,Math.PI/2,CRYPT.x0+40,560); torch(CRYPT.x1-12,560,-Math.PI/2,CRYPT.x1-40,560);
  // darkness around the hall so the snow outside never shows through
  const vm=new THREE.MeshBasicMaterial({color:0x020304});
  const vg=new THREE.PlaneGeometry(90,60).rotateX(-Math.PI/2); CRYPT_VOID=new THREE.Group();
  for(const [x,z,w,h] of [[2900,1020,1600,560],[2900,100,1600,420],[2300,520,520,1400],[3500,520,520,1400]]){const m=new THREE.Mesh(new THREE.PlaneGeometry(w*S,h*S).rotateX(-Math.PI/2),vm);m.position.set(x*S,g+.25,z*S);CRYPT_VOID.add(m);}
  CRYPT_VOID.visible=false; scene.add(CRYPT_VOID);
  for(const x of [2800,3000]) placeProp('banner_patternA_red',x,CRYPT.y0+6,{ground:g,lift:1.2,fit:1.2});
  [['barrel_large',2590,690],['barrel_large',3210,690],['candle_triple',2860,350],['candle_triple',2940,350],['coin_stack_large',2955,375],['sword_shield_broken',2660,470],['keyring_hanging',3150,330],['column',2600,350],['column',3200,350]]
    .forEach(([k,x,y])=>placeProp(k,x,y,{ground:g,fit:k==='column'?1.4:k.startsWith('barrel')?1.2:.9}));
  // exit rune circle
  const ring=new THREE.Mesh(new THREE.RingGeometry(.7,.95,40).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:new THREE.Color(.4,1.6,2.6),transparent:true,opacity:.8}));
  ring.position.set(CRYPT.exitX*S,g+.06,CRYPT.exitY*S); scene.add(ring);
  const exitL=new THREE.PointLight(0x7fd6ff,0,8,1.6); exitL.position.set(CRYPT.exitX*S,g+1,CRYPT.exitY*S); scene.add(exitL); CRYPT_LIGHTS.push(exitL);
}
function buildFire(f){
  const g=new THREE.Group(); g.position.set(f.x*S,hgt(f.x,f.y),f.y*S);
  for(let i=0;i<9;i++){const a=i/9*TAU;const s=new THREE.Mesh(new THREE.DodecahedronGeometry(.22,0),MAT.stone);s.position.set(Math.cos(a)*.6,.08,Math.sin(a)*.6);s.castShadow=true;g.add(s);}
  for(let i=0;i<4;i++){const l=new THREE.Mesh(new THREE.CylinderGeometry(.07,.08,1,6),MAT.bark);l.rotation.z=Math.PI/2-.35;l.rotation.y=i*Math.PI/2;l.position.y=.25;g.add(l);}
  const core=new THREE.Mesh(new THREE.SphereGeometry(.22,8,6),MAT.ember);core.position.y=.2;g.add(core);
  const L=new THREE.PointLight(0xff8a3a,f.big?26:18,f.big?22:16,1.7);L.position.y=1.2;L.castShadow=!!f.big;if(f.big){L.shadow.mapSize.set(512,512);L.shadow.bias=-.002;}g.add(L);
  scene.add(g); FIRE_FX.push({x:f.x*S,y:hgt(f.x,f.y),z:f.y*S,light:L,base:f.big?26:18});
}
FIRES.forEach(buildFire);
// camp tent + logs
// village banners & carved raven pillar
function addBanner(x,y){const g=new THREE.Group();g.position.set(x*S,hgt(x,y),y*S);const p=new THREE.Mesh(new THREE.CylinderGeometry(.06,.07,4.2,6),MAT.wood);p.position.y=2.1;p.castShadow=true;g.add(p);
  const bg=new THREE.PlaneGeometry(1,1.8,6,6);bg.translate(.5,0,0);const b=new THREE.Mesh(bg,MAT.banner);b.position.y=3.1;b.castShadow=true;g.add(b);scene.add(g);BANNERS.push({mesh:b,geo:bg,base:bg.attributes.position.array.slice()});}
addBanner(1740,2190);addBanner(1860,2190);addBanner(1690,2300);
{const g=new THREE.Group();g.position.set(1935*S,hgt(1935,2215),2215*S);const p=new THREE.Mesh(new THREE.CylinderGeometry(.25,.32,3.2,8),MAT.wood);p.position.y=1.6;p.castShadow=true;g.add(p);
  const bird=new THREE.Mesh(new THREE.ConeGeometry(.25,.9,5),new THREE.MeshStandardMaterial({color:0x111216,roughness:.5}));bird.rotation.z=-Math.PI/2;bird.position.set(.2,3.4,0);g.add(bird);
  for(const s of [-1,1]){const w=new THREE.Mesh(new THREE.BoxGeometry(.5,.05,.8),bird.material);w.position.set(0,3.45,s*.4);w.rotation.x=s*.5;g.add(w);}scene.add(g);}
// wall, gate, braziers
let gateDoors=[], gateTop=[];
{
  const wallMat=MAT.stone;
  const n=Math.ceil(WORLD.w/40)+30; const g=new THREE.BoxGeometry(1,1,1);
  const im=new THREE.InstancedMesh(g,wallMat,n*2); im.castShadow=im.receiveShadow=true; let k=0; const r=rng(31);
  for(let x=-600;x<WORLD.w+600;x+=40){ if(x>1700&&x<1880) continue;
    for(let row=0;row<2;row++){ if(k>=n*2) break; const hh=row?1.3+r()*.6:2+r()*.6;
      dummy.position.set((x+20)*S,hgt(x+20,WALL_Y+20)+(row?2.3+hh/2:hh/2),(WALL_Y+20)*S); dummy.rotation.set((r()-.5)*.05,(r()-.5)*.06,(r()-.5)*.05); dummy.scale.set(2+r()*.3,hh,2+r()*.2); dummy.updateMatrix(); im.setMatrixAt(k++,dummy.matrix);} }
  im.count=k; scene.add(im);
  const gy=hgt(1800,WALL_Y+20);
  const gg=new THREE.Group(); gg.position.set(1800*S,gy,(WALL_Y+20)*S); scene.add(gg);
  for(const s of [-1,1]){const p=new THREE.Mesh(new THREE.BoxGeometry(1.6,7,2.6),MAT.stone);p.position.set(s*4.8,3.5,0);p.castShadow=true;gg.add(p);
    const strip=new THREE.Mesh(new THREE.PlaneGeometry(.7,5.6),new THREE.MeshStandardMaterial({color:0x000000,emissiveMap:runeTex('ᚦᛁᚢᛉᛊ','#7fd6ff'),emissive:0xffffff,emissiveIntensity:2.2,transparent:false}));strip.position.set(s*4.8,3.6,1.31);gg.add(strip);
    const br=new THREE.Group();br.position.set(s*6.4,0,1.6);gg.add(br);const pole=new THREE.Mesh(new THREE.CylinderGeometry(.08,.1,2.4,6),MAT.iron);pole.position.y=1.2;br.add(pole);
    const bowl=new THREE.Mesh(new THREE.CylinderGeometry(.45,.25,.4,10),MAT.iron);bowl.position.y=2.5;br.add(bowl);const em=new THREE.Mesh(new THREE.SphereGeometry(.28,8,6),MAT.ember);em.position.y=2.65;br.add(em);
    const L=new THREE.PointLight(0xff8a3a,18,16,1.7);L.position.y=3.2;br.add(L);
    FIRE_FX.push({x:1800*S+s*6.4,y:gy+2.7,z:(WALL_Y+20)*S+1.6,light:L,base:18,small:1});}
  const lint=new THREE.Mesh(new THREE.BoxGeometry(11.4,1.4,2.8),MAT.stone);lint.position.y=7.4;lint.castShadow=true;gg.add(lint);gateTop.push(lint);
  for(const s of [-1,1]){const hinge=new THREE.Group();hinge.position.set(s*4,0,0);gg.add(hinge);
    const d=new THREE.Mesh(new THREE.BoxGeometry(4,6.6,.4),new THREE.MeshStandardMaterial({color:0x1d2228,roughness:.5,metalness:.7}));d.position.set(-s*2,3.3,0);d.castShadow=true;hinge.add(d);
    for(let i=0;i<3;i++){const band=new THREE.Mesh(new THREE.BoxGeometry(4.05,.2,.5),MAT.iron);band.position.set(-s*2,1+i*2.2,0);hinge.add(band);}
    const ice=new THREE.Mesh(new THREE.OctahedronGeometry(.45,0),MAT.iceGlow);ice.position.set(-s*.4,3.4,.3);ice.scale.y=1.6;hinge.add(ice);
    gateDoors.push({hinge,s});}
}
// runestones
const RS_MESH=[];
RUNESTONES.forEach(rs=>{
  const g=new THREE.Group(); g.position.set(rs.x*S,hgt(rs.x,rs.y),rs.y*S);
  const geo=new THREE.BoxGeometry(1.1,3,.45,1,4,1); {const p=geo.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i);const k=1-(y+1.5)*.12;p.setX(i,p.getX(i)*k*(y>1.2?.85:1));}geo.computeVertexNormals();}
  const tex=runeTex('ᚱᚨᚢᚾ','#ffcf6a');
  const m=new THREE.MeshStandardMaterial({color:0x7d848b,map:stoneTex,roughness:.85,emissiveMap:tex,emissive:0xffffff,emissiveIntensity:rs.lit?2.6:0});
  const st=new THREE.Mesh(geo,m); st.position.y=1.45; st.castShadow=true; st.rotation.y=.25; g.add(st);
  for(let i=0;i<7;i++){const a=i/7*TAU;const s=new THREE.Mesh(new THREE.DodecahedronGeometry(.2+Math.random()*.15,0),MAT.stone);s.position.set(Math.cos(a)*1.3,.05,Math.sin(a)*1.3);g.add(s);}
  const L=new THREE.PointLight(0xffc062,rs.lit?22:0,14,1.6); L.position.set(0,2,.8); g.add(L);
  scene.add(g); RS_MESH.push({mat:m,light:L,pos:g.position.clone()});
});
// barrow mound with glowing doorway
{
  const mg=new THREE.SphereGeometry(1,32,16,0,TAU,0,Math.PI/2); const m=new THREE.Mesh(mg,new THREE.MeshStandardMaterial({color:0xb7c0c4,map:snowTex,roughness:.95}));
  m.scale.set(115*S,4.2,115*S); m.position.set(380*S,hgt(380,1200)-.4,1200*S); m.castShadow=m.receiveShadow=true; scene.add(m);
  const dg=new THREE.Group(); dg.position.set((380+108)*S,hgt(488,1200),1200*S); dg.rotation.y=-Math.PI/2; scene.add(dg);
  for(const s of [-1,1]){const p=new THREE.Mesh(new THREE.BoxGeometry(.5,2.4,.5),MAT.stone);p.position.set(s*.9,1.2,0);p.castShadow=true;dg.add(p);}
  const l=new THREE.Mesh(new THREE.BoxGeometry(2.6,.5,.6),MAT.stone);l.position.y=2.5;dg.add(l);
  const d=new THREE.Mesh(new THREE.PlaneGeometry(1.3,2.2),new THREE.MeshBasicMaterial({color:new THREE.Color(.25,.9,1.4)}));d.position.set(0,1.1,-.05);dg.add(d);
  const L=new THREE.PointLight(0x6fd0ff,18,14,1.6);L.position.set(0,1.4,1.2);dg.add(L);
}
// Jötun throne and ice crystals
const CRYSTALS=[];
{
  const throne=new THREE.Group(); throne.position.set(1800*S,hgt(1800,260),260*S); scene.add(throne);
  const seat=new THREE.Mesh(new THREE.BoxGeometry(7,2.4,4),MAT.iceGlow); seat.position.y=1.2; throne.add(seat);
  const back=new THREE.Mesh(new THREE.BoxGeometry(7,9,1.4),MAT.iceGlow); back.position.set(0,5,-1.6); throne.add(back);
  for(let i=0;i<5;i++){const c=new THREE.Mesh(new THREE.ConeGeometry(.7,4+Math.random()*3,5),MAT.iceGlow);c.position.set(-3+i*1.5,9.5+Math.random(),-1.6);throne.add(c);}
  const r=rng(51);
  for(let i=0;i<30;i++){const a=r()*TAU, d=290+r()*120; const x=1800+Math.cos(a)*d, y=500+Math.sin(a)*d*.9; if(Math.abs(angDiff(a,Math.PI/2))<.45) continue;
    const c=new THREE.Mesh(new THREE.OctahedronGeometry(1,0),MAT.iceGlow); const s=.5+r()*1.4; c.scale.set(s*.6,s*2.2,s*.6); c.position.set(x*S,hgt(x,y)+s,y*S); c.rotation.set((r()-.5)*.6,r()*3,(r()-.5)*.6); scene.add(c); CRYSTALS.push(c);}
  const L=new THREE.PointLight(0x7fd6ff,22,36,1.5); L.position.set(1800*S,6,330*S); scene.add(L);
}
// Mimir altar
let mimirGlow;
{
  const g=new THREE.Group(); g.position.set(2850*S,ICE_Y,1400*S); scene.add(g);
  const a=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.4,1,8),MAT.stone); a.position.y=.5; a.castShadow=true; g.add(a);
  const w=new THREE.Mesh(new THREE.CylinderGeometry(.9,.9,.08,24),new THREE.MeshBasicMaterial({color:new THREE.Color(.3,1.1,1.6)})); w.position.y=1.02; g.add(w);
  mimirGlow=new THREE.PointLight(0x7fd6ff,26,16,1.5); mimirGlow.position.y=2.2; g.add(mimirGlow);
}

/* =========================================================
   PARTICLES
   ========================================================= */
class PSys{
  constructor(n,blending){
    this.n=n;this.i=0;this.alive=new Uint8Array(n);
    this.p=new Float32Array(n*3);this.v=new Float32Array(n*3);this.c=new Float32Array(n*3);this.sz=new Float32Array(n);this.a=new Float32Array(n);
    this.life=new Float32Array(n);this.max=new Float32Array(n);this.grav=new Float32Array(n);this.drag=new Float32Array(n);this.s0=new Float32Array(n);this.grow=new Float32Array(n);
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(this.p,3));g.setAttribute('pcol',new THREE.BufferAttribute(this.c,3));g.setAttribute('psize',new THREE.BufferAttribute(this.sz,1));g.setAttribute('palpha',new THREE.BufferAttribute(this.a,1));
    this.g=g;
    const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending,uniforms:{uPR:{value:renderer.getPixelRatio()},uTex:{value:softDot}},
      vertexShader:`attribute vec3 pcol;attribute float psize;attribute float palpha;varying vec3 vC;varying float vA;uniform float uPR;void main(){vC=pcol;vA=palpha;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=psize*uPR*(420./-mv.z);gl_Position=projectionMatrix*mv;}`,
      fragmentShader:`uniform sampler2D uTex;varying vec3 vC;varying float vA;void main(){float t=texture2D(uTex,gl_PointCoord).a;if(vA<=0.001)discard;gl_FragColor=vec4(vC,t*vA);}`});
    this.pts=new THREE.Points(g,m);this.pts.frustumCulled=false;scene.add(this.pts);
  }
  emit(x,y,z,vx,vy,vz,life,size,r,g,b,alpha=1,grav=0,drag=0,grow=0){
    const i=this.i;this.i=(this.i+1)%this.n;this.alive[i]=1;
    this.p[i*3]=x;this.p[i*3+1]=y;this.p[i*3+2]=z;this.v[i*3]=vx;this.v[i*3+1]=vy;this.v[i*3+2]=vz;
    this.c[i*3]=r;this.c[i*3+1]=g;this.c[i*3+2]=b;this.life[i]=life;this.max[i]=life;this.s0[i]=size;this.sz[i]=size;this.a[i]=alpha;this.grav[i]=grav;this.drag[i]=drag;this.grow[i]=grow;this.a0=alpha;
    this.aBase??=new Float32Array(this.n);this.aBase[i]=alpha;
  }
  update(dt){
    for(let i=0;i<this.n;i++){ if(!this.alive[i]) continue;
      this.life[i]-=dt; if(this.life[i]<=0){this.alive[i]=0;this.a[i]=0;continue;}
      const k=this.life[i]/this.max[i], dr=1-this.drag[i]*dt;
      this.v[i*3]*=dr;this.v[i*3+2]*=dr;this.v[i*3+1]=this.v[i*3+1]*dr-this.grav[i]*dt;
      this.p[i*3]+=this.v[i*3]*dt;this.p[i*3+1]+=this.v[i*3+1]*dt;this.p[i*3+2]+=this.v[i*3+2]*dt;
      this.a[i]=this.aBase[i]*Math.min(1,k*2.2)*Math.min(1,(1-k)*12+.2);
      this.sz[i]=this.s0[i]*(1+this.grow[i]*(1-k));
    }
    this.g.attributes.position.needsUpdate=true;this.g.attributes.pcol.needsUpdate=true;this.g.attributes.psize.needsUpdate=true;this.g.attributes.palpha.needsUpdate=true;
  }
}
const FXA=new PSys(4000,THREE.AdditiveBlending), FXN=new PSys(2500,THREE.NormalBlending);
function burst(x,y,z,n,spd,life,size,r,g,b,{sys=FXA,up=1,grav=4,drag=1.5,alpha=1,grow=0}={}){
  for(let i=0;i<n;i++){const a=Math.random()*TAU,s=spd*(.3+Math.random()*.7);sys.emit(x,y,z,Math.cos(a)*s,up*(Math.random()*spd*.8+spd*.2),Math.sin(a)*s,life*(.6+Math.random()*.6),size*(.6+Math.random()*.7),r,g,b,alpha,grav,drag,grow);}
}

/* --- Ground decals: footprints in the snow and marks where blows landed */
const TEX_FOOT=canvasTex(64,128,(g,w,h)=>{g.clearRect(0,0,w,h);const gr=(cx,cy,rx,ry)=>{const r=g.createRadialGradient(cx,cy,0,cx,cy,Math.max(rx,ry));r.addColorStop(0,'rgba(255,255,255,.95)');r.addColorStop(.7,'rgba(255,255,255,.6)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.beginPath();g.ellipse(cx,cy,rx,ry,0,0,TAU);g.fill();};gr(32,40,20,32);gr(32,98,16,20);});
const TEX_SPLAT=canvasTex(128,128,(g,w,h)=>{g.clearRect(0,0,w,h);const r=rng(17);for(let i=0;i<26;i++){const a=r()*TAU,d=r()*r()*48,x=64+Math.cos(a)*d,y=64+Math.sin(a)*d,rad=4+r()*(18-d*.25);const gr=g.createRadialGradient(x,y,0,x,y,rad);gr.addColorStop(0,'rgba(255,255,255,.9)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.beginPath();g.arc(x,y,rad,0,TAU);g.fill();}});
const DECALS=[]; let decalI=0;
{const dg=new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2);
  for(let i=0;i<220;i++){const m=new THREE.Mesh(dg,new THREE.MeshBasicMaterial({transparent:true,depthWrite:false,opacity:0,polygonOffset:true,polygonOffsetFactor:-2}));m.visible=false;m.renderOrder=1;scene.add(m);DECALS.push({m,t:0,life:1,op:1});}}
function decal(tex,x,y,rot,w,l,col,life,op){
  const d=DECALS[decalI];decalI=(decalI+1)%DECALS.length;
  d.m.material.map=tex;d.m.material.color.setRGB(col[0],col[1],col[2]);d.m.material.needsUpdate=true;
  d.m.position.set(x*S,groundY(x,y)+.03,y*S);d.m.rotation.y=rot;d.m.scale.set(w,1,l);d.m.visible=true;d.t=0;d.life=life;d.op=op;d.m.material.opacity=op;
}
function updDecals(dt){for(const d of DECALS){if(!d.m.visible)continue;d.t+=dt;const k=d.t/d.life;if(k>=1){d.m.visible=false;continue;}d.m.material.opacity=d.op*Math.min(1,(1-k)*3.5);}}
const SPLAT_COL={bone:[.82,.78,.7],ice:[.6,.85,1],ichor:[.45,.15,.6],blood:[.32,.02,.03]};
function splatType(t){return ['draugr','archer','minion','seidr','vogter','jarl'].includes(t)?'bone':['jotun','lindorm','frostvaette','lindyngel'].includes(t)?'ice':['gjenganger','gjenganger2','vaette','ildvaette','stenvaette','stenvaette2'].includes(t)?'ichor':'blood';}

// Snowfall around the camera
const SNOW_N=9000;
const snowGeo=new THREE.BufferGeometry(); const snowPos=new Float32Array(SNOW_N*3), snowSeed=new Float32Array(SNOW_N);
for(let i=0;i<SNOW_N;i++){snowPos[i*3]=rand(-40,40);snowPos[i*3+1]=rand(0,26);snowPos[i*3+2]=rand(-40,40);snowSeed[i]=Math.random();}
snowGeo.setAttribute('position',new THREE.BufferAttribute(snowPos,3));
const snow=new THREE.Points(snowGeo,new THREE.PointsMaterial({size:.13,map:softDot,transparent:true,opacity:.85,depthWrite:false,color:0xe8f1ff}));
snow.frustumCulled=false; scene.add(snow);
const NEAR_N=320; const nearGeo=new THREE.BufferGeometry(); const nearPos=new Float32Array(NEAR_N*3), nearSeed=new Float32Array(NEAR_N);
for(let i=0;i<NEAR_N;i++){nearPos[i*3]=rand(-7,7);nearPos[i*3+1]=rand(-5,5);nearPos[i*3+2]=rand(-7,7);nearSeed[i]=Math.random();}
nearGeo.setAttribute('position',new THREE.BufferAttribute(nearPos,3));
const nearSnow=new THREE.Points(nearGeo,new THREE.PointsMaterial({size:.32,map:softDot,transparent:true,opacity:.42,depthWrite:false,color:0xf2f6ff,fog:false}));
nearSnow.frustumCulled=false; scene.add(nearSnow);
let wind=0;
function updateSnow(dt,center,t){
  wind=Math.sin(t*.13)*2.2+Math.sin(t*.41)*1.2;
  for(let i=0;i<SNOW_N;i++){const s=snowSeed[i];let x=snowPos[i*3],y=snowPos[i*3+1],z=snowPos[i*3+2];
    y-=dt*(1.1+s*1.3); x+=dt*(wind+Math.sin(t*1.3+s*40)*.4); z+=dt*(Math.cos(t*.9+s*30)*.3+.4);
    if(y<0){y+=26;} const dx=x-center.x,dz=z-center.z; if(dx>40)x-=80;else if(dx<-40)x+=80; if(dz>40)z-=80;else if(dz<-40)z+=80;
    snowPos[i*3]=x;snowPos[i*3+1]=y+0;snowPos[i*3+2]=z;}
  snowGeo.attributes.position.needsUpdate=true;
  const cp=camera.position;
  for(let i=0;i<NEAR_N;i++){const sd=nearSeed[i];let x=nearPos[i*3],y=nearPos[i*3+1],z=nearPos[i*3+2];
    y-=dt*(.7+sd*.8);x+=dt*(wind*.8+Math.sin(t*1.7+sd*50)*.5);z+=dt*Math.cos(t*1.1+sd*20)*.4;
    if(y<-5)y+=10;if(x>7)x-=14;else if(x<-7)x+=14;if(z>7)z-=14;else if(z<-7)z+=14;nearPos[i*3]=x;nearPos[i*3+1]=y;nearPos[i*3+2]=z;}
  nearSnow.position.copy(cp); nearGeo.attributes.position.needsUpdate=true; nearSnow.visible=snow.visible;
}
// Ground mist planes
const MIST=[]; {const mm=new THREE.MeshBasicMaterial({map:fogTex,transparent:true,opacity:.0,depthWrite:false,color:0xb9cbe0,fog:true});
  for(let i=0;i<34;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(14,14),mm.clone());m.rotation.x=-Math.PI/2;m.material.opacity=.22+Math.random()*.2;m.renderOrder=2;scene.add(m);MIST.push({m,ox:rand(-34,34),oz:rand(-34,34),sp:rand(.2,.6),rot:rand(-.05,.05),h:rand(.3,1.4)});}}
// Ravens circling
const RAVENS=[]; {const bm=new THREE.MeshStandardMaterial({color:0x0c0d10,roughness:.6,side:THREE.DoubleSide});
  for(let i=0;i<14;i++){const g=new THREE.Group();const body=new THREE.Mesh(new THREE.ConeGeometry(.12,.6,5),bm);body.rotation.z=-Math.PI/2;g.add(body);
    const wl=new THREE.Mesh(new THREE.PlaneGeometry(.35,.7),bm);wl.position.z=.35;const wr=wl.clone();wr.position.z=-.35;g.add(wl,wr);
    const c=[[1800,2300],[560,1200],[1800,500],[2850,1400],[1450,1850]][i%5];
    scene.add(g);RAVENS.push({g,wl,wr,cx:c[0]*S,cz:c[1]*S,r:rand(6,16),h:rand(12,22),sp:rand(.25,.5)*(Math.random()<.5?-1:1),ph:Math.random()*TAU});}}

/* =========================================================
   CHARACTER MODELS
   ========================================================= */
const G3={cap:(r,l)=>new THREE.CapsuleGeometry(r,l,4,10),sph:(r,a=14,b=10)=>new THREE.SphereGeometry(r,a,b),box:(x,y,z)=>new THREE.BoxGeometry(x,y,z),cyl:(a,b,h,s=10)=>new THREE.CylinderGeometry(a,b,h,s),cone:(r,h,s=8)=>new THREE.ConeGeometry(r,h,s)};
const sm=(c,r=.8,m=0,o={})=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m,...o});
function addM(par,geo,mat,x=0,y=0,z=0){const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.castShadow=true;par.add(o);return o;}
const glowMat=c=>new THREE.MeshBasicMaterial({color:c});

function makeWolf(){
  const mats=[];const M=(c,r)=>{const m=sm(c,r??.95);mats.push(m);return m;};
  const fur=M(0x6e6d6b),dark=M(0x3e3c3a);
  const root=new THREE.Group(),body=new THREE.Group();body.position.y=.65;root.add(body);
  const tor=addM(body,G3.cap(.26,.75),fur,0,0,0);tor.rotation.z=Math.PI/2;
  addM(body,G3.sph(.3,10,8),fur,.32,.06,0).scale.set(1,1.05,1.1);
  const neck=new THREE.Group();neck.position.set(.55,.15,0);body.add(neck);
  addM(neck,G3.sph(.2,10,8),fur,.08,0,0);const sn=addM(neck,G3.cone(.11,.32,7),dark,.32,-.04,0);sn.rotation.z=-Math.PI/2;
  for(const s of [-1,1]){addM(neck,G3.cone(.06,.16,4),dark,.0,.2,s*.1);addM(neck,G3.sph(.03,6,6),glowMat(new THREE.Color(3,2,.4)),.2,.06,s*.08);}
  const tail=addM(body,G3.cone(.09,.6,6),fur,-.7,.05,0);tail.rotation.z=Math.PI/2+.5;
  const legs=[];[[.38,-1],[.38,1],[-.38,-1],[-.38,1]].forEach(([x,s])=>{const l=new THREE.Group();l.position.set(x,-.1,s*.15);body.add(l);addM(l,G3.cap(.06,.45),dark,0,-.3,0);legs.push(l);});
  return {root,body,neck,legs,mats,wolf:true,scale:1};
}
function addIceSpikes(m){
  const ch=m.bone('chest'); if(!ch) return;
  for(let i=0;i<10;i++){const c=new THREE.Mesh(new THREE.OctahedronGeometry(.07,0),MAT.iceGlow);c.position.set((Math.random()-.5)*.5,.25+Math.random()*.25,-.12-Math.random()*.15);c.scale.y=2.6;c.rotation.set(-.5+Math.random()*.4,0,(Math.random()-.5)*1.4);ch.add(c);}
}
function buildPlayerModel(cls){const m=makeChar(cls);scene.add(m.root);return m;}
function buildEnemyModel(t){
  let m;
  m=makeChar(t,{iceMaterial:MAT.iceGlow}); if(t==='jotun') addIceSpikes(m); m.skel=['draugr','archer','minion','seidr','vogter','jarl'].includes(t);
  scene.add(m.root); return m;
}
function buildNPC(id){
  let r;
  if(id==='mimir'){r={root:new THREE.Group(),mats:[]};addM(r.root,G3.sph(.4,18,14),sm(0x9fb2b0,.6),0,1.45,0);addM(r.root,G3.cone(.32,.8,9),sm(0xe8f0f0,.9),.1,1.0,0).rotation.z=Math.PI;
    for(const s of [-1,1])addM(r.root,G3.sph(.05,8,6),glowMat(new THREE.Color(1.2,3,4)),.34,1.55,s*.13);addM(r.root,new THREE.TorusGeometry(.42,.03,6,20),MAT.gold,0,1.62,0).rotation.x=Math.PI/2;}
  else { r=makeChar(id); r.anim.play(id==='astrid'?'Sit_Floor_Idle':'Idle'); }
  scene.add(r.root); return r;
}
// Plays a looping clip, or restarts a one-shot whenever its key changes.
function drive(m,w){
  if(!w) return;
  if(w.key!==undefined){ if(w.key!==m.lastKey){m.lastKey=w.key;m.anim.play(w.n,{loop:false,fit:w.fit||0,speed:w.speed||1,restart:true,fade:w.fade??.1});} return; }
  m.lastKey=undefined; m.anim.play(w.n,{speed:w.speed||1,fade:w.fade??.2});
}
const PANIM={
  berserker:{idle:'2H_Melee_Idle',run:'Running_A',atk:['2H_Melee_Attack_Slice','2H_Melee_Attack_Chop'],heavy:'2H_Melee_Attack_Spin',roar:'Cheer',heal:'Use_Item'},
  skjoldmo:{idle:'Idle',run:'Running_A',atk:['1H_Melee_Attack_Slice_Horizontal','1H_Melee_Attack_Slice_Diagonal'],bash:'Block_Attack',heal:'Use_Item'},
  volve:{idle:'Idle',run:'Running_B',cast:'Spellcast_Shoot',nova:'Spellcast_Long',special:'Spellcast_Raise',heal:'Use_Item'},
};
function poseHum(r,a){
  if(r.wolf){const w=Math.sin(a.phase*1.3)*a.move;r.legs[0].rotation.z=w*.8;r.legs[3].rotation.z=w*.8;r.legs[1].rotation.z=-w*.8;r.legs[2].rotation.z=-w*.8;
    r.body.position.y=.65+Math.abs(Math.sin(a.phase*1.3))*.05*a.move-(a.crouch||0)*.18;r.body.rotation.z=(a.crouch||0)*.15;r.neck.rotation.z=-(a.crouch||0)*.3+Math.sin(a.t*2)*.03;}
}

/* =========================================================
   GAME STATE
   ========================================================= */
const CLASSES={
  berserker:{name:'Berserker',rune:'ᚢ',base:{sty:16,smi:12,vil:8,kar:10},desc:'Økse og raseri. Brede hug, et snurrende tungt angreb og Berserkergang, der gør dig stærkere og heler dig, når du rammer.',special:'Berserkergang',scd:22,ico:'<svg viewBox="0 0 40 40" width="36" height="36"><path d="M12 34L28 8" stroke="#8a6a44" stroke-width="3"/><path d="M24 6c6 0 10 5 10 11-4-1-8-3-10-6z" fill="#c8d0d8" stroke="#222" /></svg>'},
  skjoldmo:{name:'Skjoldmø',rune:'ᛉ',base:{sty:14,smi:13,vil:10,kar:12},desc:'Sværd og skjold. Hurtige stød, blokering med højre museknap og et skjoldstød, der lammer fjender.',special:'Skjoldstød',scd:7,ico:'<svg viewBox="0 0 40 40" width="36" height="36"><circle cx="20" cy="20" r="14" fill="#e6dcc4" stroke="#2a1d12" stroke-width="2"/><path d="M20 20L20 6A14 14 0 0 1 34 20zM20 20L20 34A14 14 0 0 1 6 20z" fill="#8c2a22"/><circle cx="20" cy="20" r="3.5" fill="#aab3bd"/></svg>'},
  volve:{name:'Völve',rune:'ᛟ',base:{sty:8,smi:12,vil:16,kar:13},desc:'Seiðr og runer. Runebolte på afstand, en frostnova tæt på og en flok ravne, der jager dine fjender.',special:'Ravneflok',scd:12,ico:'<svg viewBox="0 0 40 40" width="36" height="36"><path d="M6 22c6-6 12-8 18-6l10-4-6 8c-2 8-10 12-20 10l6-4z" fill="#14161c" stroke="#7fb8ff" stroke-width="1.2"/><circle cx="27" cy="16" r="1.3" fill="#9fe6ff"/></svg>'},
};
const STATN={sty:['STY','Styrke','Liv og skade med økse'],smi:['SMI','Smidighed','Udholdenhed og fart'],vil:['VIL','Vilje','Seiðr-skade og indsigt'],kar:['KAR','Karisma','Overtalelse og handel']};
const ED={
  draugr:{name:'Draugr',hp:75,r:15,spd:78,dmg:16,reach:46,runes:60},
  archer:{name:'Draugr-skytte',hp:48,r:14,spd:66,dmg:13,reach:420,runes:70},
  wolf:{name:'Gråulv',hp:52,r:15,spd:150,dmg:14,reach:160,runes:50},
  jarl:{name:'Hrafnkel, Draugr-jarlen',hp:820,r:26,spd:92,dmg:28,reach:100,runes:1600},
  minion:{name:'Gravtræl',hp:45,r:13,spd:96,dmg:12,reach:42,runes:45},
  seidr:{name:'Seiðr-draugr',hp:58,r:14,spd:58,dmg:15,reach:400,runes:95},
  trold:{name:'Skovtrold',hp:55,r:13,spd:92,dmg:12,reach:42,runes:45},
  bjergtrold:{name:'Bjergtrold',hp:160,r:19,spd:72,dmg:22,reach:58,runes:150},
  rimtrold:{name:'Rimtrold',hp:360,r:26,spd:80,dmg:26,reach:86,runes:450},
  ildvaette:{name:'Ildvætte',hp:95,r:16,spd:112,dmg:18,reach:50,runes:120},
  frostvaette:{name:'Frostvætte',hp:95,r:16,spd:106,dmg:16,reach:50,runes:120},
  gjenganger:{name:'Gjenganger',hp:60,r:14,spd:125,dmg:14,reach:170,runes:75},
  gjenganger2:{name:'Dødningehoved',hp:75,r:14,spd:130,dmg:16,reach:170,runes:90},
  stenvaette:{name:'Stenvætte',hp:170,r:18,spd:56,dmg:20,reach:54,runes:150},
  stenvaette2:{name:'Klippevætte',hp:280,r:23,spd:50,dmg:28,reach:62,runes:260},
  lindyngel:{name:'Lindyngel',hp:48,r:13,spd:140,dmg:11,reach:160,runes:60},
  vaette:{name:'Lysvætte',hp:55,r:13,spd:70,dmg:13,reach:380,runes:90},
  lindorm:{name:'Lindormen fra Isfjorden',hp:1150,r:32,spd:96,dmg:30,reach:120,runes:2600,aggro:220},
  vogter:{name:'Gravvogteren',hp:560,r:22,spd:86,dmg:24,reach:92,runes:1300,aggro:190},
  jotun:{name:'Hrimgrimr, Rimtursen',hp:2400,r:46,spd:64,dmg:40,reach:170,runes:6000},
};
// How each enemy fights: melee swings, ranged casters, lunging beasts, brutes with leaps, or a boss of its own.
const KIND={draugr:'melee',minion:'melee',trold:'melee',bjergtrold:'melee',ildvaette:'melee',frostvaette:'melee',stenvaette:'melee',stenvaette2:'melee',
  archer:'ranged',seidr:'ranged',vaette:'ranged',wolf:'lunge',gjenganger:'lunge',gjenganger2:'lunge',lindyngel:'lunge',
  jarl:'brute',vogter:'brute',rimtrold:'brute',jotun:'jotun',lindorm:'lindorm'};
const FLOAT={gjenganger:.9,gjenganger2:.9,lindyngel:1.6,vaette:.8,stenvaette:.25,stenvaette2:.25,lindorm:2.2};
const SPAWNS=[
  {t:'draugr',x:1640,y:1930},{t:'draugr',x:1960,y:1940},{t:'wolf',x:2150,y:1800},{t:'wolf',x:2200,y:1850},
  {t:'archer',x:1300,y:1600},{t:'draugr',x:1200,y:1560},
  {t:'draugr',x:1020,y:1260},{t:'archer',x:900,y:1080},{t:'draugr',x:1080,y:1130},{t:'archer',x:760,y:1540},
  {t:'wolf',x:2500,y:1220},{t:'wolf',x:2560,y:1270},{t:'wolf',x:2620,y:1580},{t:'draugr',x:2400,y:1650},
  {t:'draugr',x:1600,y:1100},{t:'draugr',x:2000,y:1100},{t:'archer',x:1800,y:1220},{t:'wolf',x:1500,y:1300},{t:'wolf',x:2100,y:1300},
  {t:'archer',x:1450,y:700},{t:'archer',x:2150,y:700},
  {t:'jarl',x:600,y:1200,boss:'jarl'},
  {t:'seidr',x:2700,y:430},{t:'seidr',x:3100,y:430},{t:'minion',x:2650,y:540},{t:'minion',x:3150,y:540},{t:'minion',x:2900,y:540},
  {t:'vogter',x:2900,y:445,boss:'vogter'},
  {t:'ildvaette',x:2620,y:650},{t:'ildvaette',x:3180,y:650},{t:'vaette',x:2900,y:390},
  {t:'trold',x:1350,y:2150},{t:'trold',x:1385,y:2195},{t:'trold',x:1320,y:2205},{t:'trold',x:2300,y:2300},{t:'trold',x:2345,y:2262},
  {t:'bjergtrold',x:1255,y:1455},{t:'stenvaette',x:1100,y:1480},{t:'stenvaette2',x:2660,y:1880},{t:'stenvaette',x:2480,y:1900},
  {t:'gjenganger',x:2750,y:1220},{t:'gjenganger2',x:2960,y:1190},{t:'gjenganger',x:2700,y:1560},
  {t:'lindyngel',x:3010,y:1150},{t:'lindyngel',x:3160,y:1300},{t:'lindorm',x:3120,y:1180,boss:'lindorm'},
  {t:'frostvaette',x:2220,y:960},{t:'frostvaette',x:2360,y:1050},{t:'rimtrold',x:2500,y:1000},{t:'rimtrold',x:2320,y:560},
  {t:'bjergtrold',x:1150,y:950},{t:'trold',x:1100,y:1000},{t:'trold',x:1190,y:1020},{t:'jotun',x:1800,y:470,boss:'jotun'},
];
// Equipment found in chests or bought from Dvalin. slot: weapon, armor or talisman (two talisman slots).
const ITEMS={
  ulfberht:{name:'Ulfberht-runen',slot:'weapon',desc:'+20 % skade med dit våben.'},
  brynje:{name:'Jarnhud-brynje',slot:'armor',desc:'Du tager 15 % mindre skade.'},
  lindskael:{name:'Lindormskæl',slot:'armor',desc:'Du tager 20 % mindre skade.'},
  ulvepels:{name:'Ulvepels',slot:'armor',desc:'Udholdenhed vender 30 % hurtigere tilbage.'},
  ravnefjer:{name:'Ravnefjer',slot:'talisman',desc:'Rul koster 40 % mindre udholdenhed.'},
  mjolnir:{name:'Mjølnirs ekko',slot:'talisman',desc:'Din klasse-evne lader 30 % hurtigere op.'},
  idunn:{name:'Idunns æble',slot:'talisman',desc:'+1 mjødhorn.'},
  fenrir:{name:'Fenrirs tand',slot:'talisman',desc:'+15 % skade, men 10 % mindre liv.'},
};
const SLOTN={weapon:'Våbenrune',armor:'Rustning',t1:'Talisman I',t2:'Talisman II'};
const eqHas=id=>!!G.eq&&Object.values(G.eq).includes(id);
const NPCS=[
  {id:'ulfr',name:'Gamle Ulfr',x:1748,y:2272,face:Math.PI*.4},
  {id:'dvalin',name:'Dvalin',x:1650,y:2352,face:-Math.PI/2},
  {id:'astrid',name:'Astrid',x:1440,y:1838,face:Math.PI*.25},
  {id:'thorgrim',name:'Jarl Thorgrim',x:1880,y:2365,face:-Math.PI/2},
  {id:'mimir',name:'Mimirs Hoved',x:2850,y:1400,face:Math.PI/2,head:true},
];

const G={state:'loading',flags:{},weaponLvl:0,extraFlasks:0,discount:1,lastRS:0,stain:null,enemies:[],hazards:[],projs:[],fx:[],boss:null,shake:0,time:0,play:0,deaths:0,deadT:0,hitStop:0,slowmo:0,zoom:.35,camPos:new THREE.Vector3(),camLook:new THREE.Vector3(),dlgTarget:null,endT:0};
let P=null, C=null, PM=null, CM=null;
let buf=null;
const keys={}, mouse={x:innerWidth/2,y:innerHeight/2,l:false,r:false};
const mouseW={x:0,y:0};

const maxHp=()=>Math.round((64+P.stats.sty*5+P.stats.smi+P.level*4)*(eqHas('fenrir')?.9:1));
const maxSt=()=>Math.round(72+P.stats.smi*4);
const maxFlasks=()=>3+G.extraFlasks+(G.flags.ulfrGift?1:0)+(eqHas('idunn')?1:0);
const specialCd=()=>CLASSES[P.cls].scd*(eqHas('mjolnir')?.7:1);
function atkMult(){const s=P.stats;const base=P.cls==='berserker'?s.sty:P.cls==='skjoldmo'?(s.sty+s.smi)/2:s.vil;return(1+(base-10)*.065)*(1+.15*G.weaponLvl)*(P.rage>0?1.5:1)*(eqHas('fenrir')?1.15:1)*(eqHas('ulfberht')?1.2:1);}
const lvlCost=L=>Math.floor(130*Math.pow(1.17,L-1));

function newPlayer(cls,stats,name){
  P={x:1800,y:2330,r:13,cls,name,stats:{...stats},level:1,runes:0,face:-Math.PI/2,act:null,roll:0,rdx:0,rdy:0,iframes:0,stagger:0,specialT:0,rage:0,blocking:false,dash:null,dead:false,phase:0,move:0,combo:0,stepT:0};
  P.hp=maxHp();P.st=maxSt();P.flasks=maxFlasks();P.hpLag=P.hp;
  if(PM){scene.remove(PM.root);} PM=buildPlayerModel(cls);
}

/* --- NPC & enemy instances */
const NPCM={};
function initNPCs(){NPCS.forEach(n=>{const m=buildNPC(n.id);NPCM[n.id]=m;m.root.position.set(n.x*S,(n.head?ICE_Y+.55:hgt(n.x,n.y)),n.y*S);m.root.rotation.y=-n.face;n.anim={phase:0,move:0,t:Math.random()*5};});}

function spawnEnemy(t,x,y,extra={}){
  const d=ED[t];const e={t,def:d,x,y,home:{x,y},r:d.r,hp:d.hp,maxHp:d.hp,aggro:false,busy:0,cd:Math.random(),sched:[],face:Math.PI/2,flash:0,stun:0,slow:0,dash:null,dead:false,phase:0,move:0,t0:Math.random()*9,anim:{},...extra};
  e.model=buildEnemyModel(t); G.enemies.push(e); return e;
}
function clearEnemies(){for(const e of G.enemies){scene.remove(e.model.root);if(e.hpEl)e.hpEl.remove();}G.enemies=[];for(const h of G.hazards)disposeHaz(h);G.hazards=[];for(const p of G.projs)scene.remove(p.mesh);G.projs=[];}
function resetWorld(){
  clearEnemies();G.boss=null;
  for(const s of SPAWNS){
    if(s.boss==='jarl'&&G.flags.jarlDead) continue;
    if(s.boss==='jotun'&&G.flags.jotunDone) continue;
    if(s.boss==='vogter'&&G.flags.vogterDead) continue;
    if(s.boss==='lindorm'&&G.flags.lindormDead) continue;
    if(s.t==='rimtrold'){spawnEnemy(s.t,s.x,s.y,{summoned:true});continue;}
    spawnEnemy(s.t,s.x,s.y,s.boss?{boss:s.boss,summoned:s.boss==='vogter',dormant:s.boss==='jotun'&&!G.flags.jotunTalked,dmgMult:s.boss==='jotun'&&G.flags.enraged?1.2:1}:{});
  }
  if(C){C.down=false;C.hp=C.maxHp;C.x=P.x-30;C.y=P.y+30;}
}

/* =========================================================
   COLLISION
   ========================================================= */
function collide(e){
  for(const o of OBS){ if(o.gone) continue;
    if(o.w!==undefined){
      if(e.x<o.x-e.r-2||e.x>o.x+o.w+e.r+2||e.y<o.y-e.r-2||e.y>o.y+o.h+e.r+2) continue;
      const nx=clamp(e.x,o.x,o.x+o.w),ny=clamp(e.y,o.y,o.y+o.h);const dx=e.x-nx,dy=e.y-ny,d2=dx*dx+dy*dy;
      if(d2<e.r*e.r){ if(d2<1e-6){const l=e.x-o.x,r=o.x+o.w-e.x,t=e.y-o.y,b=o.y+o.h-e.y,m=Math.min(l,r,t,b);if(m===l)e.x=o.x-e.r;else if(m===r)e.x=o.x+o.w+e.r;else if(m===t)e.y=o.y-e.r;else e.y=o.y+o.h+e.r;}
        else{const d=Math.sqrt(d2);e.x=nx+dx/d*e.r;e.y=ny+dy/d*e.r;} }
    } else if(o.r>0){
      const dx=e.x-o.x,dy=e.y-o.y,m=o.r+e.r; if(dx>m||dx<-m||dy>m||dy<-m) continue;
      const d=Math.hypot(dx,dy); if(d<m){ if(d<.01){e.x+=m;continue;} e.x=o.x+dx/d*m;e.y=o.y+dy/d*m; }
    }
  }
  e.x=clamp(e.x,PAD+e.r,WORLD.w-PAD-e.r); e.y=clamp(e.y,PAD-60+e.r,WORLD.h-PAD-e.r);
}
function blockedPt(x,y){for(const o of OBS){if(o.gone)continue;if(o.w!==undefined){if(x>o.x&&x<o.x+o.w&&y>o.y&&y<o.y+o.h)return true;}else if(o.r>0&&o.r>13){const dx=x-o.x,dy=y-o.y;if(dx*dx+dy*dy<o.r*o.r*.6)return true;}}return false;}

/* =========================================================
   UI helpers: toasts, banner, labels
   ========================================================= */
function toast(t){const d=document.createElement('div');d.className='toast';d.textContent=t;$('toasts').appendChild(d);setTimeout(()=>d.remove(),3800);while($('toasts').children.length>5)$('toasts').firstChild.remove();}
let bannerTO;
function banner(t,s='',cls=''){const b=$('banner');b.hidden=true;void b.offsetWidth;b.className=cls;$('bannerT').textContent=t;$('bannerS').textContent=s;b.hidden=false;clearTimeout(bannerTO);bannerTO=setTimeout(()=>b.hidden=true,3500);}
const labels=$('labels');
const NUMS=[];
const _v=new THREE.Vector3();
function toScreen(x,y,z){_v.set(x,y,z).project(camera);return{x:(_v.x*.5+.5)*innerWidth,y:(-_v.y*.5+.5)*innerHeight,vis:_v.z<1&&_v.z>-1};}
function num(x,y,val,cls=''){const d=document.createElement('div');d.className='dmg '+cls;d.textContent=val;labels.appendChild(d);NUMS.push({el:d,x:x*S,y:groundY(x,y)+2.2,z:y*S,t:0,dx:rand(-.4,.4)});}
const npcLbl={};NPCS.forEach(n=>{const d=document.createElement('div');d.className='lbl';d.textContent=n.name;d.hidden=true;labels.appendChild(d);npcLbl[n.id]=d;});

/* =========================================================
   PLAYER
   ========================================================= */
function spend(c){P.st=Math.max(0,P.st-c);P.stDelay=.6;}
function swipe(x,y,ang,arc,range,col=0xfff2c8,life=.2,h=1.1){
  const geo=new THREE.RingGeometry(range*S*.55,range*S,32,1,-arc/2,arc);geo.rotateX(-Math.PI/2);
  const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.38,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
  m.position.set(x*S,groundY(x,y)+h,y*S);m.rotation.y=-ang;scene.add(m);G.fx.push({mesh:m,t:0,life});
}
function meleeHit(range,arc,dmg,opts={}){
  let hit=false;
  for(const e of G.enemies){ if(e.dead) continue;
    const d=dist(P,e); if(d>range+e.r) continue;
    const a=Math.atan2(e.y-P.y,e.x-P.x); if(arc<TAU-.01&&Math.abs(angDiff(a,P.face))>arc/2+Math.atan2(e.r,Math.max(d,1))) continue;
    damageEnemy(e,dmg*atkMult(),opts); hit=true;
  }
  if(hit){G.hitStop=opts.stagger?.09:.055;}
}
function tryAction(k,ix,iy){
  const p=P;
  if(k==='roll'){ if(p.st<=0) return false; spend(eqHas('ravnefjer')?12:20); let dx=ix,dy=iy; if(!dx&&!dy){dx=Math.cos(p.face);dy=Math.sin(p.face);} p.rdx=dx;p.rdy=dy;p.roll=.36;p.rollId=(p.rollId||0)+1;p.iframes=Math.max(p.iframes,.32);p.act=null;sfx('roll');
    const gy=groundY(p.x,p.y); burst(p.x*S,gy+.1,p.y*S,14,2.2,.7,.5,.85,.9,1,{sys:FXN,up:.5,grav:1,drag:3,alpha:.5,grow:2}); return true;}
  if(k==='heal'){ if(p.flasks<=0){toast('Mjødhornet er tomt. Hvil ved en runesten.');return true;}
    p.act={kind:'heal',t:0,dur:1,hit:.6,move:.35,fn:()=>{p.flasks--;const h=Math.round(maxHp()*.45);p.hp=Math.min(maxHp(),p.hp+h);num(p.x,p.y,'+'+h,'heal');sfx('drink');
      for(let i=0;i<26;i++)FXA.emit(p.x*S+rand(-.4,.4),groundY(p.x,p.y)+rand(.2,1.6),p.y*S+rand(-.4,.4),0,rand(.5,1.6),0,rand(.6,1.2),rand(.2,.4),1.4,1.1,.4,1,0,.5);}}; return true;}
  if(k==='special'){
    if(p.specialT>0) return true;
    if(p.cls==='berserker'){p.rage=8;p.specialT=specialCd();G.shake=.4;sfx('heavy');toast('Berserkergang: mere skade, og du heler når du rammer');
      p.act={kind:'roar',t:0,dur:.5,hit:.2,move:0,fn:()=>burst(p.x*S,groundY(p.x,p.y)+1,p.y*S,50,5,.8,.4,2.2,.4,.2,{grav:2})};return true;}
    if(p.cls==='skjoldmo'){ if(p.st<=0) return false; spend(15);p.specialT=specialCd();p.dash={dx:Math.cos(p.face),dy:Math.sin(p.face),sp:540,t:.2};
      p.act={kind:'bash',t:0,dur:.45,hit:.16,move:0,fn:()=>{swipe(p.x,p.y,p.face,1.8,66,0xbfe2ff);for(const e of G.enemies){if(e.dead)continue;const d=dist(p,e);if(d<66+e.r&&Math.abs(angDiff(Math.atan2(e.y-p.y,e.x-p.x),p.face))<1.1){damageEnemy(e,14*atkMult(),{stun:e.boss?.3:1.7,kb:60});}}G.shake=.25;sfx('block');}};return true;}
    if(p.cls==='volve'){p.specialT=specialCd();sfx('raven');
      p.act={kind:'cast',t:0,dur:.55,hit:.22,move:.2,fn:()=>{for(let i=0;i<5;i++){const a=p.face+(i-2)*.35;spawnProj({x:p.x,y:p.y,vx:Math.cos(a)*300,vy:Math.sin(a)*300,dmg:12*atkMult(),friendly:true,kind:'raven',life:3,homing:true,r:8});}}};return true;}
  }
  if(k==='lmb'){
    if(p.st<=0) return false;
    if(p.cls==='berserker'){spend(15);p.combo^=1;p.act={kind:'atk',t:0,dur:.46,hit:.18,move:.25,arc:2.3,fn:()=>{swipe(p.x,p.y,p.face,2.3,64);meleeHit(64,2.3,19);}};sfx('swing');return true;}
    if(p.cls==='skjoldmo'){spend(11);p.combo^=1;p.act={kind:'atk',t:0,dur:.34,hit:.12,move:.35,arc:1.5,fn:()=>{swipe(p.x,p.y,p.face,1.5,58);meleeHit(58,1.5,15);}};sfx('swing');return true;}
    if(p.cls==='volve'){spend(9);p.act={kind:'cast',t:0,dur:.3,hit:.1,move:.4,fn:()=>{spawnProj({x:p.x+Math.cos(p.face)*16,y:p.y+Math.sin(p.face)*16,vx:Math.cos(p.face)*580,vy:Math.sin(p.face)*580,dmg:16*atkMult(),friendly:true,kind:'bolt',life:1.1,r:7});sfx('bolt');}};return true;}
  }
  if(k==='rmb'){
    if(p.cls==='skjoldmo') return true;
    if(p.st<=0) return false;
    if(p.cls==='berserker'){spend(30);p.act={kind:'heavy',t:0,dur:.8,hit:.44,move:.15,fn:()=>{swipe(p.x,p.y,0,TAU,82,0xffd9a0,.28);meleeHit(82,TAU,36,{stagger:true,kb:30});G.shake=.3;}};sfx('heavy');return true;}
    if(p.cls==='volve'){spend(32);p.act={kind:'nova',t:0,dur:.64,hit:.34,move:.1,fn:()=>{const gy=groundY(p.x,p.y);
        for(let i=0;i<70;i++){const a=Math.random()*TAU,s=rand(5,9);FXA.emit(p.x*S,gy+.3,p.y*S,Math.cos(a)*s,rand(.2,1.2),Math.sin(a)*s,rand(.4,.7),rand(.25,.5),.7,1.6,2.4,1,0,3);}
        swipe(p.x,p.y,0,TAU,128,0x9fdcff,.35,.3);
        for(const e of G.enemies){if(e.dead)continue;if(dist(p,e)<128+e.r){damageEnemy(e,24*atkMult(),{stagger:true});e.slow=3;}}sfx('nova');G.shake=.2;}};return true;}
  }
  return false;
}
function updPlayer(dt){
  const p=P;
  p.iframes=Math.max(0,p.iframes-dt);p.stagger=Math.max(0,p.stagger-dt);p.specialT=Math.max(0,p.specialT-dt);p.rage=Math.max(0,p.rage-dt);p.stDelay=Math.max(0,(p.stDelay||0)-dt);
  if(p.dead) return;
  if(p.roll<=0&&!p.dash&&!(p.act&&p.act.done&&p.act.kind==='heavy')) p.face=Math.atan2(mouseW.y-p.y,mouseW.x-p.x);
  let ix=((keys.KeyD||keys.ArrowRight)?1:0)-((keys.KeyA||keys.ArrowLeft)?1:0), iy=((keys.KeyS||keys.ArrowDown)?1:0)-((keys.KeyW||keys.ArrowUp)?1:0);
  const il=Math.hypot(ix,iy); if(il){ix/=il;iy/=il;}
  if(p.act){const A=p.act;A.t+=dt;if(!A.done&&A.t>=A.hit){A.done=true;A.fn&&A.fn();}if(p.act===A&&A.t>=A.dur)p.act=null;}
  p.blocking=p.cls==='skjoldmo'&&mouse.r&&!p.act&&p.roll<=0&&p.stagger<=0&&p.st>0;
  if(buf&&G.time-buf.t>.4) buf=null;
  if(buf){const A=p.act;const can=p.stagger<=0&&p.roll<=0&&!p.dash&&(!A||(buf.k==='roll'&&A.kind!=='heal'&&A.done&&A.t>A.hit+.05)||(buf.k==='lmb'&&A.kind==='atk'&&A.t>A.dur*.72));
    if(can){if(A)p.act=null;if(tryAction(buf.k,ix,iy))buf=null;}}
  let vx=0,vy=0;
  if(p.roll>0){p.roll-=dt;const k=p.roll/.36;vx=p.rdx*(260+260*k);vy=p.rdy*(260+260*k);}
  else if(p.dash){p.dash.t-=dt;vx=p.dash.dx*p.dash.sp;vy=p.dash.dy*p.dash.sp;if(p.dash.t<=0)p.dash=null;}
  else if(p.stagger<=0){let sp=158*(1+(p.stats.smi-10)*.012);if(p.act)sp*=p.act.move??.3;if(p.blocking)sp*=.45;vx=ix*sp;vy=iy*sp;}
  p.x+=vx*dt;p.y+=vy*dt;
  const spd=Math.hypot(vx,vy);p.move=lerp(p.move,clamp(spd/158,0,1.2),Math.min(1,dt*10));p.phase+=dt*spd*.055;
  if(spd>20&&p.roll<=0){p.stepT-=dt;if(p.stepT<=0){p.stepT=.33;sfx('step');p.foot=-(p.foot||1);{const ma=Math.atan2(vy,vx);if(!inCrypt(p.x,p.y))decal(TEX_FOOT,p.x+Math.cos(ma+Math.PI/2)*2.6*p.foot,p.y+Math.sin(ma+Math.PI/2)*2.6*p.foot,Math.PI/2-ma,.24,.42,[.32,.4,.55],22,.55);}FXN.emit(p.x*S,groundY(p.x,p.y)+.05,p.y*S,rand(-.3,.3),.3,rand(-.3,.3),.6,.35,.9,.93,1,.35,0,2,1.5);}}
  collide(p);
  if(!p.act&&p.roll<=0&&p.stDelay<=0) p.st=Math.min(maxSt(),p.st+(p.blocking?12:52)*(eqHas('ulvepels')?1.3:1)*dt);
  p.hpLag+= (p.hp-p.hpLag)*Math.min(1,dt*(p.hpLag>p.hp?1.4:12));
  if(p.rage>0&&Math.random()<.5)FXA.emit(p.x*S+rand(-.3,.3),groundY(p.x,p.y)+rand(.3,1.6),p.y*S+rand(-.3,.3),0,1.2,0,.5,.3,2,.35,.15,1,0,1);
  // rune stain pickup
  if(G.stain&&dist(p,G.stain)<34){p.runes+=G.stain.amount;toast('Du genvandt '+G.stain.amount+' runer');sfx('rune');G.stain=null;}
  // light runestones
  for(const rs of RUNESTONES){if(!rs.lit&&dist(p,rs)<130){rs.lit=true;RS_MESH[rs.id].mat.emissiveIntensity=2.6;RS_MESH[rs.id].light.intensity=22;banner('RUNESTEN TÆNDT',rs.name);sfx('rune');}}
}
function hurt(tg,dmg,fx,fy){ if(tg===P) hurtPlayer(dmg,fx,fy); else if(tg===C) hurtComp(dmg); }
function hurtPlayer(dmg,fx,fy){
  const p=P; if(p.dead||G.state!=='play') return;
  if(p.iframes>0) return;
  if(p.blocking){const a=Math.atan2(fy-p.y,fx-p.x);if(Math.abs(angDiff(a,p.face))<1.35){
      p.st-=dmg*1.15;sfx('block');burst((p.x+Math.cos(p.face)*14)*S,groundY(p.x,p.y)+1,(p.y+Math.sin(p.face)*14)*S,18,4,.35,.15,3,2.4,1.2,{grav:9});
      if(p.st<=0){p.st=0;p.stagger=.7;dmg*=.5;toast('Din garde er brudt');}else{dmg*=.12;}
      p.stDelay=.6;}}
  if(eqHas('brynje')) dmg*=.85;
  if(eqHas('lindskael')) dmg*=.8;
  dmg=Math.round(dmg); if(dmg<=0) return;
  p.hp-=dmg; p.iframes=.22; p.hitId=(p.hitId||0)+1; num(p.x,p.y,dmg,'hurt');
  if(dmg>6){p.stagger=Math.max(p.stagger,.2);if(p.act&&p.act.kind!=='heavy')p.act=null;}
  G.shake=Math.min(.6,G.shake+dmg/60); sfx('hurt');
  burst(p.x*S,groundY(p.x,p.y)+1,p.y*S,12,2.5,.5,.18,.5,.04,.03,{sys:FXN,grav:7,alpha:.9});
  if(p.hp<=0) die();
}
function die(){
  P.dead=true;P.hp=0;G.deadT=0;G.deaths++;sfx('die');
  if(G.stain===null||true){G.stain=P.runes>0?{x:P.x,y:P.y,amount:P.runes}:null;P.runes=0;}
  $('deathScr').hidden=false; G.boss=null;
}
function respawn(){
  $('deathScr').hidden=true;
  const rs=RUNESTONES[G.lastRS];P.x=rs.x;P.y=rs.y+46;P.dead=false;P.hp=maxHp();P.hpLag=P.hp;P.st=maxSt();P.flasks=maxFlasks();P.act=null;P.roll=0;P.dash=null;P.stagger=0;P.rage=0;
  resetWorld(); snapCam();
}

/* =========================================================
   COMPANION
   ========================================================= */
function makeCompanion(){C={x:P.x-30,y:P.y+30,r:13,hp:150,maxHp:150,down:false,cd:0,face:0,phase:0,move:0,t:0,sayT:0};CM=buildNPC('astrid');CM.root.position.set(C.x*S,groundY(C.x,C.y),C.y*S);NPCM.astrid.root.visible=false;}
function hurtComp(dmg){if(!C||C.down)return;C.hp-=dmg;num(C.x,C.y,Math.round(dmg),'hurt');if(C.hp<=0){C.hp=0;C.down=true;C.downId=(C.downId||0)+1;toast('Astrid er faldet. Gå hen til hende og tryk E for at hjælpe hende op.');}}
function updComp(dt){
  if(!C) return; C.t+=dt;
  if(C.down){C.move=0;return;}
  let tgt=null,best=380;
  for(const e of G.enemies){if(e.dead||(!e.aggro&&!e.boss)||e.dormant)continue;const d=dist(C,e);if(d<best){best=d;tgt=e;}}
  const fx=P.x-Math.cos(P.face)*45+Math.cos(P.face+1.6)*30, fy=P.y-Math.sin(P.face)*45+Math.sin(P.face+1.6)*30;
  const dd=Math.hypot(fx-C.x,fy-C.y); let sp=0;
  if(dd>40){sp=Math.min(dd*3,dd>300?320:175);const a=Math.atan2(fy-C.y,fx-C.x);C.x+=Math.cos(a)*sp*dt;C.y+=Math.sin(a)*sp*dt;C.face=a;}
  if(dist(C,P)>700){C.x=P.x-30;C.y=P.y+30;}
  // dodge out of hazards
  for(const h of G.hazards){if(h.k==='circle'&&Math.hypot(C.x-h.x,C.y-h.y)<h.r+14){const a=Math.atan2(C.y-h.y,C.x-h.x);C.x+=Math.cos(a)*220*dt;C.y+=Math.sin(a)*220*dt;sp=220;}}
  collide(C); C.move=lerp(C.move,clamp(sp/170,0,1),dt*8); C.phase+=dt*sp*.055;
  C.cd-=dt;
  if(tgt){C.face=Math.atan2(tgt.y-C.y,tgt.x-C.x);if(C.cd<=0){C.cd=1.15;C.shotId=(C.shotId||0)+1;spawnProj({x:C.x,y:C.y,vx:Math.cos(C.face)*620,vy:Math.sin(C.face)*620,dmg:9+P.level*1.4,friendly:true,kind:'arrow',life:1,r:5});}}
}

/* =========================================================
   ENEMIES
   ========================================================= */
function targets(){const t=[];if(!P.dead)t.push(P);if(C&&!C.down)t.push(C);return t;}
function pickTarget(e){if(e.boss||!C||C.down)return P;return dist(e,C)<dist(e,P)*.7?C:P;}
function addHaz(h){h.t=0;if(h.owner&&h.owner.atkT!==G.time){h.owner.atkT=G.time;h.owner.atkSeq=(h.owner.atkSeq||0)+1;h.owner.atkHaz=h;}const col=h.frost?0x8fd8ff:0xff5533;
  let geo;if(h.k==='circle'){geo=new THREE.CircleGeometry(1,48);}else{geo=new THREE.CircleGeometry(1,40,-h.arc/2,h.arc);}geo.rotateX(-Math.PI/2);
  const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.15,blending:THREE.AdditiveBlending,depthWrite:false}));
  const rg=h.k==='circle'?new THREE.RingGeometry(.93,1,64):new THREE.RingGeometry(.93,1,48,1,-h.arc/2,h.arc);rg.rotateX(-Math.PI/2);
  const ring=new THREE.Mesh(rg,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false}));
  const inner=new THREE.Mesh(geo,m.material.clone()); inner.material.opacity=.32;
  const g=new THREE.Group();g.add(m,ring,inner);g.renderOrder=3;scene.add(g);h.mesh=g;h.inner=inner;G.hazards.push(h);return h;}
function disposeHaz(h){if(h.mesh){scene.remove(h.mesh);h.mesh.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});}}
function arcAtk(e,ang,arc,range,wind,dmg,extra={}){return addHaz({k:'arc',owner:e,ang,arc,range,wind,dmg,...extra});}
function circAtk(x,y,r,wind,dmg,extra={}){return addHaz({k:'circle',x,y,r,wind,dmg,...extra});}
function cancelAttacks(e){e.sched=[];e.dash=null;e.aim=null;e.air=0;e.airT=0;for(let i=G.hazards.length-1;i>=0;i--){if(G.hazards[i].owner===e){disposeHaz(G.hazards[i]);G.hazards.splice(i,1);}}}
function damageEnemy(e,dmg,o={}){
  if(e.dead) return;
  if(e.dormant) return;
  dmg=Math.round(dmg*(.9+Math.random()*.2)); const crit=e.stun>0&&!o.stun; if(crit)dmg=Math.round(dmg*1.5);
  e.hp-=dmg;e.flash=.13;e.aggro=true;{const st=splatType(e.t);decal(TEX_SPLAT,e.x+rand(-10,10),e.y+rand(-10,10),Math.random()*TAU,.6+Math.random()*.7*(e.r/16),.6+Math.random()*.7*(e.r/16),SPLAT_COL[st],30,st==='blood'?.75:.55);}sfx(e.t==='jotun'||e.t==='lindorm'||e.t==='frostvaette'?'icehit':e.model&&e.model.skel?'bonehit':'hit');
  num(e.x,e.y,dmg,crit?'crit':'');
  const gy=groundY(e.x,e.y)+(e.boss==='jotun'?4:1);
  burst(e.x*S,gy,e.y*S,10,3,.45,.2,e.t==='jotun'?.6:.3,e.t==='jotun'?1.6:.06,e.t==='jotun'?2.2:.05,{sys:e.t==='jotun'?FXA:FXN,grav:8,alpha:.9});
  burst(e.x*S,gy,e.y*S,6,4,.25,.12,2.5,2,1.2,{grav:10});
  if(P.rage>0){const h=Math.round(dmg*.15);P.hp=Math.min(maxHp(),P.hp+h);}
  if(o.stun){e.stunId=(e.stunId||0)+1;e.stun=Math.max(e.stun,o.stun);cancelAttacks(e);e.busy=0;}
  else if(o.stagger&&!e.boss){cancelAttacks(e);e.busy=.4;e.stunId=(e.stunId||0)+1;}
  if(o.kb&&!e.boss){const a=Math.atan2(e.y-P.y,e.x-P.x);e.x+=Math.cos(a)*o.kb;e.y+=Math.sin(a)*o.kb;collide(e);}
  if(e.hp<=0) killEnemy(e);
}
function killEnemy(e){
  e.dead=true;cancelAttacks(e);P.runes+=e.def.runes;sfx('coins');
  const gy=groundY(e.x,e.y);
  for(let i=0;i<(e.boss?160:30);i++)FXA.emit(e.x*S+rand(-.5,.5),gy+rand(.2,e.boss?6:1.6),e.y*S+rand(-.5,.5),rand(-.6,.6),rand(.5,2.5),rand(-.6,.6),rand(1,2.2),rand(.15,.35),2.2,1.6,.6,1,-.4,.6,0);
  burst(e.x*S,gy+.5,e.y*S,24,1.8,1.5,.9,.25,.3,.35,{sys:FXN,up:.4,grav:-.3,drag:2,alpha:.45,grow:2.5});
  if(e.hpEl){e.hpEl.remove();e.hpEl=null;}
  if(e.boss==='jarl'){G.flags.jarlDead=true;G.flags.horn=true;G.boss=null;banner('FJENDE FÆLDET','Hrafnkel, Draugr-jarlen');setTimeout(()=>toast('Du fik: Jarlens Horn'),1600);sfx('boom');G.slowmo=1.4;saveGame();}
  if(e.boss==='lindorm'){G.flags.lindormDead=true;G.boss=null;banner('FJENDE FÆLDET','Lindormen fra Isfjorden');setTimeout(()=>toast(G.flags.lindormQuest?'Bring nyheden til Jarl Thorgrim i Ravnsholm':'Jarl Thorgrim i Ravnsholm vil gerne høre om dette'),1600);sfx('boom');G.slowmo=1.3;saveGame();}
  if(e.boss==='vogter'){G.flags.vogterDead=true;G.boss=null;banner('FJENDE FÆLDET','Gravvogteren');setTimeout(()=>toast('Vogterens nøgle passer til guldkisten'),1600);sfx('boom');G.slowmo=1.2;saveGame();}
  if(e.boss==='jotun'){G.flags.jotunDone=true;G.boss=null;banner('RIMTURSEN ER FÆLDET','Hrimgrimr, Ymirs æt');sfx('boom');G.slowmo=2.2;G.endT=5.5;G.ending='sword';}
  setTimeout(()=>{scene.remove(e.model.root);},e.boss?4200:2400);
  e.deathT=0;
}
function updEnemy(e,dt){
  if(e.dead){e.deathT+=dt;return;}
  e.flash=Math.max(0,e.flash-dt);e.slow=Math.max(0,e.slow-dt);e.t0+=dt;
  if(e.stun>0){e.stun-=dt;e.move=lerp(e.move,0,dt*8);return;}
  for(let i=e.sched.length-1;i>=0;i--){const s=e.sched[i];s.t-=dt;if(s.t<=0){e.sched.splice(i,1);s.fn();if(e.dead)return;}}
  if(e.dash){e.x+=e.dash.dx*e.dash.sp*dt;e.y+=e.dash.dy*e.dash.sp*dt;e.dash.t-=dt;
    if(!e.dash.done)for(const tg of targets())if(dist(e,tg)<e.r+tg.r+6){hurt(tg,e.dash.dmg,e.x,e.y);e.dash.done=true;}
    if(e.dash.t<=0)e.dash=null;collide(e);}
  if(e.aim){e.aim.t-=dt;if(e.aim.track){const tg=pickTarget(e);e.face=Math.atan2(tg.y-e.y,tg.x-e.x);}if(e.aim.t<=0)e.aim=null;}
  if(e.busy>0){e.busy-=dt;e.move=lerp(e.move,0,dt*8);return;}
  if(e.dormant) return;
  const dP=dist(e,P);
  if(!e.aggro){
    if(!P.dead&&dP<(e.def.aggro||(e.boss?340:280))){e.aggro=true;e.returning=false;if(e.t==='wolf')sfx('howl');if(e.model.skel&&!e.awoke&&!e.boss){e.awoke=true;e.busy=1.1;e.cd=Math.max(e.cd,.3);}}
    else{
      if(e.returning){const a=Math.atan2(e.home.y-e.y,e.home.x-e.x);e.x+=Math.cos(a)*e.def.spd*dt;e.y+=Math.sin(a)*e.def.spd*dt;e.face=a;e.move=1;e.phase+=dt*e.def.spd*.055;e.hp=Math.min(e.maxHp,e.hp+e.maxHp*.2*dt);if(dist(e,e.home)<12)e.returning=false;collide(e);}
      else{e.move=lerp(e.move,0,dt*4);}
      return;
    }
  }
  const leash=e.boss?560:850;
  if(P.dead||dist(P,e.home)>leash){
    e.aggro=false;cancelAttacks(e);
    if(e.boss){e.x=e.home.x;e.y=e.home.y;e.hp=e.maxHp;e.phase2=false;e.summoned=false;if(G.boss===e)G.boss=null;}
    else e.returning=true;
    return;
  }
  if(e.boss&&G.boss!==e){G.boss=e;}
  const tg=pickTarget(e), d=dist(e,tg), a=Math.atan2(tg.y-e.y,tg.x-e.x);
  e.face=a;
  const sp=e.def.spd*(e.slow>0?.5:1)*(e.phase2?1.3:1);
  e.cd-=dt;
  let moving=0;
  const step=(dir,mult=1)=>{e.x+=Math.cos(dir)*sp*mult*dt;e.y+=Math.sin(dir)*sp*mult*dt;moving=mult;};
  const dm=e.dmgMult||1;
  const K=KIND[e.t];
  if(K==='melee'){
    if(d>e.def.reach*.8+tg.r) step(a);
    else if(e.cd<=0){arcAtk(e,a,1.9,e.def.reach+10,.55,e.def.dmg*dm);e.busy=.55+.55;e.cd=.9+Math.random()*.8;}
  } else if(K==='ranged'){
    if(d>330) step(a); else if(d<170) step(a+Math.PI,.8); else step(a+Math.PI/2*(Math.sin(e.t0*.7)>0?1:-1),.4);
    if(e.cd<=0&&d<430){e.aim={t:.8,track:true,len:d};e.busy=1.15;e.cd=1.8+Math.random()*.8;
      e.sched.push({t:.8,fn:()=>{e.shotId=(e.shotId||0)+1;const t2=pickTarget(e);const aa=Math.atan2(t2.y-e.y,t2.x-e.x);const mage=e.t!=='archer';spawnProj({x:e.x,y:e.y,vx:Math.cos(aa)*(mage?250:400),vy:Math.sin(aa)*(mage?250:400),dmg:e.def.dmg,friendly:false,kind:mage?'boltE':'arrowE',life:mage?2.4:1.4,r:mage?8:5,homingP:mage});if(mage)sfx('bolt');}});}
  } else if(K==='lunge'){
    if(d>140) step(a+Math.sin(e.t0*1.4)*.5); else if(e.cd>0) step(a+Math.PI/2,.5);
    if(e.cd<=0&&d<170){const la=a;e.aim={t:.45,len:150,lunge:true};e.busy=.45+.3+.45;e.cd=1.3+Math.random()*.8;
      e.dashSeq=(e.dashSeq||0)+1;e.sched.push({t:.45,fn:()=>{e.dash={dx:Math.cos(la),dy:Math.sin(la),sp:440,t:.3,dmg:e.def.dmg};}});}
  } else if(K==='brute') jarlAI(e,tg,d,a,step,dm);
  else if(K==='lindorm') lindormAI(e,tg,d,a,step,dm);
  else if(K==='jotun') jotunAI(e,tg,d,a,step,dm);
  e.move=lerp(e.move,moving,dt*8); e.phase+=dt*sp*moving*.055;
  collide(e);
  // separation
  for(const o of G.enemies){if(o===e||o.dead)continue;const dx=e.x-o.x,dy=e.y-o.y,m=e.r+o.r;const d2=dx*dx+dy*dy;if(d2<m*m&&d2>.01){const dd=Math.sqrt(d2),push=(m-dd)*.5;e.x+=dx/dd*push;e.y+=dy/dd*push;}}
}
function lindormAI(e,tg,d,a,step,dm){
  if(!e.phase2&&e.hp<e.maxHp*.5){e.phase2=true;e.busy=1.3;banner('Lindormen skriger','Ynglen vågner i isen','frost');sfx('howl');
    for(const sg of [-1,1]){const x=e.x+Math.cos(a+sg*1.4)*120,y=e.y+Math.sin(a+sg*1.4)*120;spawnEnemy('lindyngel',x,y,{aggro:true});burst(x*S,groundY(x,y)+1,y*S,40,3,1,.4,.6,1.6,2.4,{grav:1});}
    return;}
  if(e.cd>0){if(d>150)step(a);else step(a+Math.PI/2,.6);return;}
  const r=Math.random(), D=e.def.dmg*dm;
  if(d<160&&r<.5){arcAtk(e,a,2.4,e.def.reach+20,.7,D);e.busy=1.2;}
  else if(d<440&&r<.8){const la=a;e.aim={t:.65,len:Math.min(d+80,440),lunge:true};e.busy=.65+.45+.5;e.dashSeq=(e.dashSeq||0)+1;sfx('howl');
    e.sched.push({t:.65,fn:()=>{e.dash={dx:Math.cos(la),dy:Math.sin(la),sp:640,t:.45,dmg:D*1.1};}});}
  else{for(let i=1;i<=6;i++){const sp=(i%2?1:-1)*(i>3?.2:.08);const x=e.x+Math.cos(a+sp)*(50+i*62),y=e.y+Math.sin(a+sp)*(50+i*62);circAtk(x,y,46+i*3,.7+i*.08,D*.7,{owner:e,frost:true,onFire:()=>spikeFx(x,y)});}e.busy=1.35;}
  e.cd=.5+Math.random()*.6;
}
function jarlAI(e,tg,d,a,step,dm){
  if(!e.summoned&&e.hp<e.maxHp*.5){e.summoned=true;e.busy=1.2;banner('Hrafnkel kalder på sine huskarle','', 'frost');sfx('horn');
    for(const s of [-1,1]){const x=e.x+Math.cos(a+s*1.6)*90,y=e.y+Math.sin(a+s*1.6)*90;const m=spawnEnemy('draugr',x,y,{aggro:true});m.home={x:e.home.x,y:e.home.y};burst(x*S,groundY(x,y)+.5,y*S,40,3,1,.4,.4,1.6,2.4,{grav:1});}
    return;}
  if(e.cd>0){if(d>95)step(a);return;}
  const r=Math.random(), D=e.def.dmg*dm;
  if(d<135){
    if(r<.5){arcAtk(e,a,2.6,108,.62,D);e.busy=.62+.5;}
    else{arcAtk(e,a,2.6,108,.58,D);e.sched.push({t:.78,fn:()=>{const a2=Math.atan2(P.y-e.y,P.x-e.x);e.face=a2;arcAtk(e,a2,2.8,112,.45,D*1.1);}});e.busy=.78+.45+.6;}
    e.cd=.5+Math.random()*.6;
  } else if(d<420){
    const tx=tg.x,ty=tg.y;e.air=1;e.airT=0;
    circAtk(tx,ty,95,1.0,D*1.25,{owner:e,onFire:()=>{e.x=tx;e.y=ty;collide(e);e.air=0;G.shake=.5;sfx('boom');const gy=groundY(tx,ty);burst(tx*S,gy+.2,ty*S,60,6,.9,.6,.85,.9,1,{sys:FXN,up:.6,grav:3,drag:2,alpha:.6,grow:2});}});
    e.busy=1.0+.75;e.cd=.6+Math.random()*.5;
  } else step(a);
}
function jotunAI(e,tg,d,a,step,dm){
  if(!e.phase2&&e.hp<e.maxHp*.5){e.phase2=true;e.busy=1.4;banner('Rimtursen raser','Isen selv vender sig mod dig','frost');sfx('boom');G.shake=.8;frostRain(e,dm);return;}
  if(e.cd>0){if(d>150)step(a);return;}
  const r=Math.random(), D=e.def.dmg*dm;
  if(d<210){
    if(r<.45){circAtk(e.x,e.y,180,1.15,D*1.05,{owner:e,frost:true,onFire:()=>{G.shake=.7;sfx('boom');const gy=groundY(e.x,e.y);for(let i=0;i<90;i++){const aa=Math.random()*TAU,s=rand(6,12);FXA.emit(e.x*S,gy+.3,e.y*S,Math.cos(aa)*s,rand(.5,3),Math.sin(aa)*s,rand(.5,1),rand(.3,.6),.6,1.5,2.2,1,4,2.5,1);}}});e.busy=1.15+.85;}
    else{arcAtk(e,a,2.9,190,.85,D*.9);e.busy=.85+.6;if(e.phase2){e.sched.push({t:1.0,fn:()=>{const a2=Math.atan2(P.y-e.y,P.x-e.x);e.face=a2;arcAtk(e,a2,2.9,190,.55,D*.9);}});e.busy+=.6;}}
    e.cd=.5+Math.random()*.6;
  } else if(d<640){
    if(e.phase2&&r<.45) frostRain(e,dm); else iceLine(e,a,dm);
    e.cd=.6+Math.random()*.7;
  } else step(a);
}
function iceLine(e,a,dm){for(let i=1;i<=7;i++){const x=e.x+Math.cos(a)*(60+i*70),y=e.y+Math.sin(a)*(60+i*70);circAtk(x,y,50,.55+i*.11,e.def.dmg*.75*dm,{owner:e,frost:true,onFire:()=>spikeFx(x,y)});}e.busy=1.0;sfx('nova');}
function frostRain(e,dm){for(let i=0;i<8;i++){const a=Math.random()*TAU,r=Math.random()*210;const x=P.x+Math.cos(a)*r,y=P.y+Math.sin(a)*r;circAtk(x,y,62,1.0+Math.random()*.7,e.def.dmg*.7*dm,{owner:e,frost:true,onFire:()=>spikeFx(x,y)});}e.busy=1.1;}
function spikeFx(x,y){const gy=groundY(x,y);const c=new THREE.Mesh(new THREE.ConeGeometry(.9,3.4,5),MAT.iceGlow);c.position.set(x*S,gy-1,y*S);c.rotation.set(rand(-.2,.2),rand(0,3),rand(-.2,.2));scene.add(c);G.fx.push({mesh:c,t:0,life:1.1,spike:true,gy});
  for(let i=0;i<20;i++)FXA.emit(x*S,gy+.5,y*S,rand(-2,2),rand(2,6),rand(-2,2),rand(.4,.8),rand(.15,.3),.7,1.6,2.4,1,9,1);G.shake=Math.max(G.shake,.15);sfx('spike');}
function updHazards(dt){
  for(let i=G.hazards.length-1;i>=0;i--){const h=G.hazards[i];
    if(h.owner&&h.owner.dead){disposeHaz(h);G.hazards.splice(i,1);continue;}
    h.t+=dt;const k=clamp(h.t/h.wind,0,1);
    const ox=h.k==='arc'?h.owner.x:h.x, oy=h.k==='arc'?h.owner.y:h.y, R=(h.k==='arc'?h.range:h.r)*S;
    h.mesh.position.set(ox*S,groundY(ox,oy)+.12,oy*S); h.mesh.scale.set(R,1,R); if(h.k==='arc')h.mesh.rotation.y=-h.ang;
    h.inner.scale.set(k,1,k); h.inner.material.opacity=.18+.3*k;
    if(h.t>=h.wind){
      for(const tg of targets()){
        if(h.k==='circle'){if(Math.hypot(tg.x-h.x,tg.y-h.y)<h.r+tg.r*.5)hurt(tg,h.dmg,h.x,h.y);}
        else{const d=Math.hypot(tg.x-ox,tg.y-oy);if(d<h.range+tg.r&&Math.abs(angDiff(Math.atan2(tg.y-oy,tg.x-ox),h.ang))<h.arc/2+.12)hurt(tg,h.dmg,ox,oy);}
      }
      if(h.k==='arc'){swipe(ox,oy,h.ang,h.arc,h.range,h.frost?0x9fdcff:0xff8a6a,.22,1);sfx('swing');}
      h.onFire&&h.onFire();
      disposeHaz(h);G.hazards.splice(i,1);
    }
  }
}

/* --- Projectiles */
const PROJ_GEO={arrow:new THREE.CylinderGeometry(.02,.02,.9,4).rotateZ(Math.PI/2),bolt:new THREE.IcosahedronGeometry(.2,1),raven:new THREE.ConeGeometry(.12,.5,5).rotateZ(-Math.PI/2)};
const PROJ_MAT={boltE:glowMat(new THREE.Color(2.2,.7,3.4)),arrow:sm(0x8a6a44),arrowE:glowMat(new THREE.Color(.6,2.4,3.4)),bolt:glowMat(new THREE.Color(1,2.4,4)),raven:sm(0x0b0c10,.4)};
function spawnProj(o){const g=o.kind==='bolt'||o.kind==='boltE'?PROJ_GEO.bolt:o.kind==='raven'?PROJ_GEO.raven:PROJ_GEO.arrow;const m=new THREE.Mesh(g,PROJ_MAT[o.kind]);scene.add(m);o.mesh=m;o.h=1.25;G.projs.push(o);}
function updProjs(dt){
  for(let i=G.projs.length-1;i>=0;i--){const p=G.projs[i];p.life-=dt;
    if(p.homing){let best=null,bd=420;for(const e of G.enemies){if(e.dead||e.dormant)continue;const d=Math.hypot(e.x-p.x,e.y-p.y);if(d<bd){bd=d;best=e;}}
      if(best){const a=Math.atan2(best.y-p.y,best.x-p.x),c=Math.atan2(p.vy,p.vx),na=c+clamp(angDiff(a,c),-4*dt,4*dt),s=Math.hypot(p.vx,p.vy)*1.01;p.vx=Math.cos(na)*Math.min(s,520);p.vy=Math.sin(na)*Math.min(s,520);}}
    if(p.homingP&&!P.dead){const a=Math.atan2(P.y-p.y,P.x-p.x),c=Math.atan2(p.vy,p.vx),na=c+clamp(angDiff(a,c),-1.3*dt,1.3*dt),sp=Math.hypot(p.vx,p.vy);p.vx=Math.cos(na)*sp;p.vy=Math.sin(na)*sp;}
    p.x+=p.vx*dt;p.y+=p.vy*dt;
    let dead=p.life<=0||blockedPt(p.x,p.y);
    if(!dead){
      if(p.friendly){for(const e of G.enemies){if(e.dead||e.dormant)continue;if(Math.hypot(e.x-p.x,e.y-p.y)<e.r+p.r){damageEnemy(e,p.dmg,{});dead=true;break;}}}
      else{for(const tg of targets()){if(Math.hypot(tg.x-p.x,tg.y-p.y)<tg.r+p.r){hurt(tg,p.dmg,p.x-p.vx*.1,p.y-p.vy*.1);dead=true;break;}}}
    }
    const gy=groundY(p.x,p.y)+p.h;
    p.mesh.position.set(p.x*S,gy,p.y*S);p.mesh.rotation.y=-Math.atan2(p.vy,p.vx);
    if(p.kind==='bolt'){FXA.emit(p.x*S,gy,p.y*S,rand(-.3,.3),rand(-.3,.3),rand(-.3,.3),.35,.45,.6,1.4,2.6,1,0,2,1);}
    if(p.kind==='raven'){FXA.emit(p.x*S,gy,p.y*S,0,0,0,.4,.35,1.2,.5,2.2,.8,0,0,0);}
    if(p.kind==='boltE'){FXA.emit(p.x*S,gy,p.y*S,rand(-.3,.3),rand(-.3,.3),rand(-.3,.3),.4,.5,2,.6,2.6,1,0,2,1);}
    if(p.kind==='arrowE'){FXA.emit(p.x*S,gy,p.y*S,0,0,0,.25,.25,.5,1.6,2.2,.8,0,0,0);}
    if(dead){if(p.kind!=='arrow')burst(p.x*S,gy,p.y*S,14,3,.4,.25,.8,1.6,2.6,{grav:2});scene.remove(p.mesh);G.projs.splice(i,1);}
  }
}

/* =========================================================
   INTERACTION
   ========================================================= */
function interactTarget(){
  if(P.dead) return null;
  if(C&&C.down&&dist(P,C)<60) return {label:'Hjælp Astrid op',fn:()=>{C.down=false;C.hp=C.maxHp*.4;toast('Astrid er på benene igen');}};
  for(const n of NPCS){ if(n.id==='astrid'&&C) continue; const r=n.head?95:70; if(dist(P,n)<r) return {label:(n.head?'Tal med ':'Tal med ')+n.name,fn:()=>talk(n.id)}; }
  for(const rs of RUNESTONES){ if(dist(P,rs)<64) return {label:'Hvil ved runestenen',fn:()=>openRest(rs.id)}; }
  for(const c of CHESTS){ if(G.flags.chests?.[c.id]) continue; if(Math.hypot(P.x-c.x,P.y-c.y)<62) return {label:c.gold&&!G.flags.vogterDead?'Guldkisten er låst':'Åbn kisten',fn:()=>openChest(c)}; }
  if(Math.hypot(P.x-CRYPT.doorX,P.y-CRYPT.doorY)<70) return {label:G.flags.jarlDead?'Gå ned i gravkrypten':'Døren i højen er forseglet',fn:()=>{if(!G.flags.jarlDead){toast('En kold kraft holder døren lukket. Hrafnkel vogter stadig højen.');return;}travel(CRYPT.inX,CRYPT.inY,'GRAVKRYPTEN','Under Hrafnkels høj');}};
  if(Math.hypot(P.x-CRYPT.exitX,P.y-CRYPT.exitY)<55) return {label:'Forlad krypten',fn:()=>travel(CRYPT.doorX+45,CRYPT.doorY,'','')};
  if(!GATE.gone&&Math.abs(P.x-1800)<110&&P.y>WALL_Y+WALL_H&&P.y<WALL_Y+WALL_H+90) return {label:'Undersøg Jötunporten',fn:()=>talk('gate')};
  return null;
}

/* --- Wildlife, farm animals and villagers going about their day */
const CANIM={animal:{idle:'Idle',walk:'Walk',run:'Gallop',eat:'Eating'},person:{idle:'Idle',walk:'Walk',run:'Run',eat:'Interact'},guard:{idle:'Idle_Sword',walk:'Walk',run:'Run',eat:'Idle_Sword'}};
const CRITTER_SPAWNS=[
  ['deer',1250,2050,1],['deer',1290,2090,1],['stag',1180,2010,1],['fox',2250,2150,1],['fox',950,1750,1],['deer',2400,2250,1],['stag',2500,2280,1],['fox',1600,1500,1],['deer',700,2000,1],['stag',3000,1900,1],
  ['husky',1622,2326,0],['husky',1662,2316,0],['horse',1575,2440,0],['horse',1570,2478,0],['cow',1760,2632,0],['cow',1830,2640,0],['donkey',2050,2420,0],
  ['farmer',1750,2470,0],['worker',1980,2400,0],['guard',1768,2178,0],['hguard',1832,2178,0],
];
const CRITTERS=[];
function initCritters(){
  for(const [kind,x,y,wild] of CRITTER_SPAWNS){
    const m=makeChar(kind); scene.add(m.root);
    const person=['farmer','worker','guard','hguard'].includes(kind), guard=kind==='guard'||kind==='hguard';
    CRITTERS.push({kind,x,y,home:{x,y},r:person?11:kind==='horse'||kind==='cow'?18:12,wild,m,state:'idle',t:Math.random()*3,tx:x,ty:y,face:Math.random()*TAU,
      range:guard?0:person?160:wild?140:40,walk:person?42:kind==='fox'?55:38,run:kind==='fox'?260:220,A:CANIM[guard?'guard':person?'person':'animal']});
  }
}
function updCritters(dt){
  const cx=G.camLook.x/S, cz=G.camLook.z/S;
  for(const c of CRITTERS){
    const far=Math.hypot(c.x-cx,c.y-cz)>1400; c.m.root.visible=!far; if(far) continue;
    c.t-=dt; let sp=0;
    const dP=P&&!P.dead?Math.hypot(P.x-c.x,P.y-c.y):1e9;
    if(c.wild&&dP<230&&c.state!=='flee'){const a=Math.atan2(c.y-P.y,c.x-P.x);c.state='flee';c.t=2.6;c.tx=c.x+Math.cos(a)*340;c.ty=c.y+Math.sin(a)*340;}
    if(c.t<=0){
      if(c.range>0&&Math.random()<.55){const a=Math.random()*TAU,r=Math.random()*c.range;c.state='walk';c.tx=c.home.x+Math.cos(a)*r;c.ty=c.home.y+Math.sin(a)*r;c.t=7;}
      else{c.state=Math.random()<.45?'eat':'idle';c.t=3+Math.random()*4;}
      if(c.wild&&Math.hypot(c.x-c.home.x,c.y-c.home.y)>500){c.state='walk';c.tx=c.home.x;c.ty=c.home.y;c.t=9;}
    }
    if(c.state==='walk'||c.state==='flee'){const dx=c.tx-c.x,dy=c.ty-c.y,dd=Math.hypot(dx,dy);
      if(dd<8){c.state='idle';c.t=2+Math.random()*3;}else{sp=c.state==='flee'?c.run:c.walk;c.face=Math.atan2(dy,dx);const ox=c.x,oy=c.y;c.x+=dx/dd*sp*dt;c.y+=dy/dd*sp*dt;collide(c);if(Math.hypot(c.x-ox,c.y-oy)<sp*dt*.3){c.state='idle';c.t=1;}}}
    if(!c.wild&&!c.range&&P&&dP<160) c.face=Math.atan2(P.y-c.y,P.x-c.x);
    const gy=groundY(c.x,c.y); c.m.root.position.set(c.x*S,gy,c.y*S); c.m.root.rotation.y=lerpAng(c.m.root.rotation.y,-c.face,Math.min(1,dt*6));
    drive(c.m,{n:sp>0?(c.state==='flee'?c.A.run:c.A.walk):(c.state==='eat'?c.A.eat:c.A.idle)}); c.m.anim.update(dt);
  }
}

/* --- Chests, equipment and travelling through doors */
function openChest(c){
  if(c.gold&&!G.flags.vogterDead){toast('Låst. Gravvogteren bærer nøglen.');sfx('block');return;}
  G.flags.chests=G.flags.chests||{}; G.flags.chests[c.id]=true; sfx('chest');
  const m=CHEST_M[c.id]; if(m) m.opening=true;
  const gy=groundY(c.x,c.y); burst(c.x*S,gy+.8,c.y*S,40,2.2,1.4,.25,2.4,1.8,.6,{grav:-.4,drag:1});
  setTimeout(()=>{P.runes+=c.runes;num(c.x,c.y,'+'+c.runes+' runer','crit');giveItem(c.item);if(c.also)setTimeout(()=>giveItem(c.also),1400);saveGame();},500);
}
function giveItem(id){
  G.inv=G.inv||[]; if(G.inv.includes(id)) return; G.inv.push(id); const it=ITEMS[id];
  const slot=it.slot==='talisman'?(!G.eq.t1?'t1':!G.eq.t2?'t2':null):(!G.eq[it.slot]?it.slot:null);
  if(slot){G.eq[slot]=id; if(id==='idunn')P.flasks++;}
  banner('FUNDET',it.name); toast(it.desc+(slot?' (taget på)':' Tryk I for at tage det på.')); sfx('pickup');
}
function equip(id){
  const it=ITEMS[id]; for(const k in G.eq) if(G.eq[k]===id){G.eq[k]=null;if(id==='idunn')P.flasks=Math.min(P.flasks,maxFlasks());P.hp=Math.min(P.hp,maxHp());renderInv();return;}
  let slot=it.slot==='talisman'?(!G.eq.t1?'t1':!G.eq.t2?'t2':'t2'):it.slot;
  if(G.eq[slot]==='idunn') P.flasks=Math.max(0,P.flasks-1);
  G.eq[slot]=id; if(id==='idunn')P.flasks++; P.hp=Math.min(P.hp,maxHp()); sfx('pickup'); renderInv();
}
function renderInv(){
  const el=$('invSlots'); el.innerHTML='';
  for(const k of ['weapon','armor','t1','t2']){const id=G.eq[k];const d=document.createElement('div');d.className='slotrow';
    d.innerHTML=`<span class="ab">${SLOTN[k]}</span><span class="nm">${id?ITEMS[id].name+'<small>'+ITEMS[id].desc+'</small>':'<small>Tom</small>'}</span>`;el.appendChild(d);}
  const list=$('invItems'); list.innerHTML='';
  if(!(G.inv||[]).length){list.innerHTML='<p class="mute small">Du har intet udstyr endnu. Kig efter kister i verden og i gravkrypten under højen.</p>';return;}
  for(const id of G.inv){const it=ITEMS[id], on=eqHas(id);const b=document.createElement('button');b.type='button';b.className='invbtn'+(on?' on':'');
    b.innerHTML=`<span><b>${it.name}</b><small>${it.desc}</small></span><span class="tag">${on?'Tag af':'Tag på'}</span>`;b.addEventListener('click',()=>equip(id));list.appendChild(b);}
}
function openInv(){G.state='inv';renderInv();$('inv').hidden=false;$('invGo').focus({preventScroll:true});}
$('invGo').addEventListener('click',()=>{$('inv').hidden=true;G.state='play';});
function travel(x,y,title,sub){
  const f=$('fade'); f.classList.add('on'); G.state='travel'; sfx('gate');
  setTimeout(()=>{P.x=x;P.y=y;P.act=null;P.roll=0;if(C){C.x=x-20;C.y=y+15;}G.boss=null;snapCam();if(title)banner(title,sub);
    setTimeout(()=>{f.classList.remove('on');G.state='play';},250);},550);
}

/* =========================================================
   DIALOGUE + DICE
   ========================================================= */
const F=()=>G.flags;
const D={
  ulfr(){
    const f=F();
    if(!f.metUlfr){f.metUlfr=true;return ulfrHub('Den gamle mand læner sig på sin stav og ser længe på dig. «Endnu en, der vågnede ved stenen. Ravnene førte dig hertil, gjorde de ikke? Fimbulvinteren har varet i tre år. Rimtursen Hrimgrimr sidder bag Jötunporten i nord og ånder frost over Midgard. Porten åbnes kun med Jarlens Horn, og hornet ligger i gravhøjen mod vest hos Hrafnkel, der nægtede at dø.»');}
    if(!f.horn) return ulfrHub('«Vest, forbi den døde skov og ad den gamle sti. Gravhøjen står bag en ring af sten. Hrafnkel slår hårdt, men langsomt. Rul ind under hans hug, ikke væk fra dem.»');
    if(!f.gateOpen&&!f.vogterDead) return ulfrHub('Ulfr ser hornet i dit bælte og lukker øjnene. «Så har han fået fred. Nu hvor Hrafnkel er borte, er døren i højen ikke længere forseglet. Hans gravvogter ligger dernede med skatte fra den gamle tid. Gå derned, hvis du tør, eller gå nordpå til porten.»');
    if(!f.gateOpen) return ulfrHub('Ulfr ser hornet i dit bælte og lukker øjnene. «Så har han fået fred. Gå nordpå til porten. Blæs, og lad Rimtursen høre, at Midgard ikke er død endnu.»');
    return ulfrHub('«Ravnene flyver lavt i dag. Vend tilbage med livet i behold.»');
  },
  dvalin(){
    const f=F(); const c=x=>Math.round(x*G.discount);
    const wc=c(450*(G.weaponLvl+1)), fc=c(500+G.extraFlasks*250);
    const n={who:'Dvalin',text:G._dvText||'En lille, bred dværg slår gnister af en ambolt, han har slæbt med sig ud i sneen. «Dvalin, smed. Jeg handler med runer, ikke med medlidenhed. Hvad skal det være?»',opts:[]};
    G._dvText=null;
    if(G.weaponLvl<3) n.opts.push({t:`Forstærk mit våben (+15 % skade) · ${wc} runer`,go:()=>{if(P.runes<wc){G._dvText='«Det rækker ikke. Kom igen, når dine lommer klirrer.»';}else{P.runes-=wc;G.weaponLvl++;sfx('block');G._dvText=`Han hamrer runer ind i stålet, til de gløder. «Sådan. Det bider bedre nu.» (Våben +${G.weaponLvl})`;}return D.dvalin();}});
    if(G.extraFlasks<3) n.opts.push({t:`Køb et ekstra mjødhorn · ${fc} runer`,go:()=>{if(P.runes<fc){G._dvText='«Mjød er dyrt i en vinter som denne. Du har ikke nok.»';}else{P.runes-=fc;G.extraFlasks++;P.flasks++;sfx('drink');G._dvText='«Fyldt fra min egen tønde. Drik det ikke på én gang.» (+1 mjødhorn)';}return D.dvalin();}});
    const tc=c(900);
    if(!(G.inv||[]).includes('fenrir')) n.opts.push({t:`Køb Fenrirs tand (+15 % skade, −10 % liv) · ${tc} runer`,go:()=>{if(P.runes<tc){G._dvText='«Den tand har kostet bedre folk end dig en hånd. Kom med flere runer.»';}else{P.runes-=tc;G._dvText='«Bær den med respekt. Ulven glemmer ikke.»';giveItem('fenrir');}return D.dvalin();}});
    if(!f.haggled) n.opts.push({t:'Du tager vel ikke fuld pris af en, der skal redde din hals?',stat:'kar',dc:12,ok:()=>{f.haggled=true;G.discount=.75;G._dvText='Dvalin grynter og tørrer hænderne i forklædet. «Hmpf. Du minder mig om min bror. Tre fjerdedele af prisen, så. Sig det ikke til nogen.»';return D.dvalin();},fail:()=>{f.haggled=true;G._dvText='«Prisen er prisen. Min hals er dværgestærk.»';return D.dvalin();}});
    n.opts.push({t:'Farvel.'});
    return n;
  },
  astrid(){
    const f=F();
    const join=t=>{makeCompanion();f.astrid=true;return{who:'Astrid',text:t+' Astrid slutter sig til dig. Når hun er med, slår du med fordel på Karisma-slag.',opts:[{t:'Så går vi.'}]};};
    const n={who:'Astrid Jarnsdóttir',text:f.metAstrid?'«Stadig i live? Det er mere, end de fleste kan sige.»':'En kvinde med bue og fletninger stivnet af rim sidder ved et ulmende bål og skærer pile. «Astrid Jarnsdóttir. Jeg jager draugr for sølv. Du ligner en, der snart selv bliver én.»',opts:[]};
    f.metAstrid=true;
    if(f.jarlDead) n.opts.push({t:'Hrafnkel er død. Her er hans horn.',tag:'spc',tagT:'BEDRIFT',go:()=>join('Hun rejser sig og vejer hornet i hånden. «Du fældede jarlen? Så har jeg vist undervurderet dig.»')});
    if(!f.aTriedKar) n.opts.push({t:'Alene dør du derude. Sammen har vi en chance mod Rimtursen.',stat:'kar',dc:13,ok:()=>join('Hun ser ind i ilden, så på dig. «Pæne ord. Og sande, desværre.»'),fail:()=>{f.aTriedKar=true;return{who:'Astrid',text:'«Pæne ord. Kom tilbage, når du har fældet noget større end en ulv.»',opts:D.astrid().opts};}});
    if(!f.aTriedSty) n.opts.push({t:'Lad os armlægge om det. Vinder jeg, følger du mig.',stat:'sty',dc:14,ok:()=>join('Hendes arm giver efter med et knæk. «Fint! Fint. Jeg følger dig, kæmpe.»'),fail:()=>{f.aTriedSty=true;return{who:'Astrid',text:'Du ligger på ryggen i sneen, før du når at spænde armen. «Træn lidt mere.»',opts:D.astrid().opts};}});
    if(P.runes>=150) n.opts.push({t:'Jeg betaler. 150 runer for din bue.',go:()=>{P.runes-=150;return join('Hun bider i en af runerne. «Ægte nok. Du har købt dig en bue.»');}});
    n.opts.push({t:'Farvel.'});
    return n;
  },
  thorgrim(){
    const f=F(); const reward=f.lindormAdvance?550:800;
    if(f.lindormDead&&!f.lindormPaid){f.lindormPaid=true;P.runes+=reward;setTimeout(()=>giveItem('lindskael'),600);sfx('coins');
      return{who:'Jarl Thorgrim',text:`Thorgrim rejser sig, før du når at sige noget. «Jægerne så den falde fra hinanden på isen. Det her er dit.» Han lægger ${reward} runer i din hånd og et skjold af grønsort skæl over din skulder. «Lindormskæl. Smedet af dens egen hud. Ingen i Ravnsholm glemmer dette.»`,opts:[{t:'Tak, jarl.'}]};}
    if(f.lindormPaid) return{who:'Jarl Thorgrim',text:'«Skjaldene synger allerede om dig. Gå med Odin, lindormsbane.»',opts:[{t:'Farvel.'}]};
    const n={who:'Jarl Thorgrim',text:f.thorgrimMet?(f.lindormQuest?'«Ligger lindormen stadig på søen? Mine folk tør ikke gå ud på isen.»':'«Har du tænkt over mit tilbud?»'):'En bredskuldret mand med pelskappe og en sølvring om overarmen ser op fra et kort over fjorden. «Jarl Thorgrim af Ravnsholm. Du er den, Ulfr taler om. Godt. Jeg har brug for en, der ikke er bange for at dø.»',opts:[]};
    f.thorgrimMet=true;
    if(!f.lindormQuest) n.opts.push({t:'Hvad har du brug for?',go:()=>{f.lindormQuest=true;return{who:'Jarl Thorgrim',text:'«En lindorm er kravlet op fra Isfjorden og har lagt sig på den frosne sø mod øst, bag Mimirs sten. Den har taget vores rener og to af mine jægere. Dræb den, og du får 800 runer og et skæl af dens egen hud at bære.»',opts:D.thorgrim().opts};}});
    if(f.lindormQuest&&!f.thorgrimKar) n.opts.push({t:'Betal halvdelen nu, så jeg kan købe mjød til turen.',stat:'kar',dc:14,ok:()=>{f.thorgrimKar=true;f.lindormAdvance=true;P.runes+=250;sfx('coins');return{who:'Jarl Thorgrim',text:'Thorgrim griner kort. «Du har en tunge som en skjald. 250 nu, resten når jeg ser dens hoved.»',opts:D.thorgrim().opts};},fail:()=>{f.thorgrimKar=true;return{who:'Jarl Thorgrim',text:'«Jeg betaler for et lig, ikke for løfter.»',opts:D.thorgrim().opts};}});
    if(f.lindormQuest&&!f.thorgrimVil) n.opts.push({t:'Hvad så dine jægere, før de døde?',stat:'vil',dc:12,ok:()=>{f.thorgrimVil=true;return{who:'Jarl Thorgrim',text:'Han tøver. «Den eneste, der kom tilbage, sagde, at den skriger, før den kaster sig frem i en lige linje. Rul til siden, ikke bagud. Og når den bløder, vågner ynglen i isen.»',opts:D.thorgrim().opts};},fail:()=>{f.thorgrimVil=true;return{who:'Jarl Thorgrim',text:'«De så den. Så døde de. Mere ved jeg ikke.»',opts:D.thorgrim().opts};}});
    n.opts.push({t:'Farvel.'});
    return n;
  },
  mimir(){
    const f=F();
    if(f.mimir) return {who:'Mimirs Hoved',text:'«Jeg har sagt, hvad jeg ville sige. Husk navnet: Sigrun.»',opts:[{t:'Farvel.'}]};
    if(f.mimirFailed) return {who:'Mimirs Hoved',text:'Øjnene er lukkede nu. Vandet omkring hovedet er frosset til.',opts:[{t:'Gå.'}]};
    return {who:'Mimirs Hoved',text:'Et afhugget hoved hviler på en sten midt på isen. Vandet omkring det fryser ikke. Øjnene åbner sig. «Odin betalte med et øje for at drikke af min brønd. Hvad vil du betale, lille ravnebærer?»',opts:[
      {t:'Stil mig en gåde. Svarer jeg rigtigt, giver du mig din visdom.',go:()=>({who:'Mimirs Hoved',text:'«Jeg har ingen mund, men svarer, når du råber. Jeg har ingen krop, men bor i bjerget. Hvad er jeg?»',opts:[
        {t:'Ekko.',go:mimirWin},{t:'Ravnen.',go:mimirLose},{t:'Vinden.',go:mimirLose},
        {t:'Lyt efter svaret i isen.',stat:'vil',dc:14,ok:()=>{const n=mimirWin();n.text='Du lukker øjnene. Dit eget hvisken kommer tilbage fra fjeldet, svagt og forsinket. «Ekko,» siger du. '+n.text;return n;},fail:mimirLose}]})},
      {t:'Intet. Farvel.'}]};
  },
  gate(){
    const f=F();
    if(f.horn) return {who:'Jötunporten',text:'To døre af sort jern og is, højere end tre mænd. I midten sidder en fordybning formet som et horn.',opts:[{t:'Blæs i Jarlens Horn.',tag:'spc',tagT:'JARLENS HORN',go:()=>{openGate('Lyden ruller ud over isen. Runerne i søjlerne lyser op, og portens døre glider langsomt op.');return null;}},{t:'Ikke endnu.'}]};
    return {who:'Jötunporten',text:'To døre af sort jern og is, højere end tre mænd. De rokker sig ikke. I midten sidder en fordybning formet som et horn.',opts:[
      {t:'Sæt skulderen mod porten og bryd den op.',stat:'sty',dc:19,ok:()=>{f.gateForced=true;openGate('Isen knager, så brister den. Med et brøl presser du dørene fra hinanden.');return null;},fail:()=>{P.hp=Math.max(1,P.hp-18);num(P.x,P.y,18,'hurt');return{who:'Jötunporten',text:'Kulden bider sig fast i dine hænder. Porten rokker sig ikke, og du mister huden på knoerne. (−18 liv)',opts:[{t:'Gå.'}]};}},
      {t:'Gå.'}]};
  },
  jotun(){
    const f=F(); f.jotunTalked=true;
    const opener=f.gateForced?'«DU BRØD MIN PORT, LILLE MENNESKE. SÅ BRYDER JEG DIG.»':'«LILLE MENNESKE. DU BÆRER JARLENS HORN. HRAFNKEL FIK FRED. DET FÅR DU IKKE.»';
    const n={who:'Hrimgrimr, Rimtursen',text:'Jorden ryster. En kæmpe af blåt is rejser sig fra tronen, og frost driver fra hans skæg som røg. '+opener,opts:[]};
    if(f.mimir) n.opts.push({t:'Sigrun ville ikke have ønsket dette, Hrimgrimr.',tag:'spc',tagT:'MIMIRS VISDOM',go:peaceEnd});
    n.opts.push({t:'Vinteren dræber også dine egne. Lad den slutte nu.',stat:'kar',dc:20,ok:peaceEnd,fail:()=>{f.enraged=true;const j=jotunEnt();if(j)j.dmgMult=1.2;return{who:'Hrimgrimr, Rimtursen',text:'«NOK ORD!» Isen omkring ham flammer op i blåt lys. Han er rasende nu.',opts:[{t:'Kæmp.',go:startJotun}]};}});
    n.opts.push({t:'Jeg er kommet efter dit hoved.',tag:'sty',tagT:'KÆMP',go:startJotun});
    return n;
  },
};
function ulfrHub(text){
  const f=F();
  const n={who:'Gamle Ulfr',text,opts:[]};
  if(!f.ulfrWhy) n.opts.push({t:'Hvorfor skulle jeg hjælpe jer?',go:()=>{f.ulfrWhy=true;return ulfrHub('«Fordi du ellers fryser ihjel sammen med os andre. Og fordi de faldnes runer gør dig stærkere. Bær dem til en runesten og hvil. Men husk: dør du, ligger dine runer, hvor du faldt.»');}});
  if(!f.ulfrCheck) n.opts.push({t:'Du skjuler noget, gamle mand.',stat:'vil',dc:10,ok:()=>{f.ulfrCheck=true;f.ulfrGift=true;P.flasks++;return ulfrHub('Ulfr sænker blikket. «Hrafnkel… draugr-jarlen var engang min søn. Tag mit eget horn, og giv ham fred.» Du får et ekstra mjødhorn.');},fail:()=>{f.ulfrCheck=true;return ulfrHub('«Jeg skjuler intet andet end gigt i knæene.» Han vender sig mod ilden.');}});
  if(!f.ulfrLore) n.opts.push({t:'Hvad ved du om Mimirs Hoved?',go:()=>{f.ulfrLore=true;return ulfrHub('«Den frosne sø mod øst. Hovedet af Odins gamle rådgiver hviler der. Det taler i gåder. Svar rigtigt, og det fortæller dig ting, selv guderne har glemt.»');}});
  n.opts.push({t:f.horn?'Jeg går nordpå.':'Jeg finder hornet.'});
  return n;
}
function mimirWin(){F().mimir=true;sfx('rune');return{who:'Mimirs Hoved',text:'«Klogt. Hør da: Rimtursen var engang Hrimgrimr Ymirsson, og han elskede en menneskekvinde ved navn Sigrun. Hun døde i den første vinter, og siden har han villet, at alle skulle fryse som hun. Nævn hende, og han husker, hvem han var.» Du har fået Mimirs Visdom: +2 på alle terningeslag.',opts:[{t:'Tak, vise hoved.'}]};}
function mimirLose(){const f=F();f.mimirFailed=true;setTimeout(()=>{for(let i=0;i<3;i++){const a=i*2.1;spawnEnemy('wolf',2850+Math.cos(a)*240,1400+Math.sin(a)*180,{aggro:true});}sfx('howl');},400);return{who:'Mimirs Hoved',text:'«Forkert.» Øjnene lukker sig. Isen sprækker under dig, og ulve hyler i tågen.',opts:[{t:'Træk våbnet.'}]};}
function jotunEnt(){return G.enemies.find(e=>e.boss==='jotun'&&!e.dead);}
function startJotun(){const j=jotunEnt();if(j){j.dormant=false;j.aggro=true;G.boss=j;}banner('Hrimgrimr, Rimtursen','','frost');return null;}
function peaceEnd(){G.flags.jotunDone=true;G.flags.peace=true;G.ending='word';const j=jotunEnt();if(j){j.leaving=true;}G.endT=6.5;sfx('ok');
  return{who:'Hrimgrimr',text:'Kæmpen står længe stille. Så knæler han, og isen i hans skæg begynder at dryppe. «Sigrun…» Han rejser sig, vender ryggen til dig og går ind i tågen mod nord. Bag dig synger en fugl for første gang i tre år.',opts:[{t:'Se ham gå.'}]};}
function openGate(text){G.flags.gateOpen=true;GATE.gone=true;G.gateAnim=0;sfx('horn');setTimeout(()=>sfx('gate'),900);G.shake=.5;toast(text);banner('JÖTUNPORTEN ER ÅBEN','');saveGame();}

const dlgEl=$('dlg'), dlgOpts=$('dlgOpts');
let dlgCur=null, dlgNPC=null;
function talk(id){
  const node=D[id](); if(!node) return;
  dlgNPC=NPCS.find(n=>n.id===id)||(id==='gate'?{x:1800,y:WALL_Y+20,gate:true}:id==='jotun'?jotunEnt():null);
  if(dlgNPC&&!dlgNPC.gate){P.face=Math.atan2(dlgNPC.y-P.y,dlgNPC.x-P.x);}
  G.state='dialog';$('letterbox').classList.add('on');$('hud').style.opacity=0;mouse.l=mouse.r=false;buf=null;
  showNode(node);
}
function showNode(n){
  if(!n){closeDialog();return;}
  sfx('page');
  dlgCur=n;dlgEl.hidden=false;$('dlgWho').textContent=n.who;$('dlgText').textContent=n.text;dlgOpts.innerHTML='';
  (n.opts&&n.opts.length?n.opts:[{t:'Farvel.'}]).forEach((o,i)=>{
    const li=document.createElement('li');const b=document.createElement('button');b.className='opt';b.type='button';
    let tag='';if(o.stat){tag=`<span class="tag ${o.stat}">[${STATN[o.stat][1].toUpperCase()}]</span>`;}else if(o.tagT){tag=`<span class="tag ${o.tag||''}">[${o.tagT}]</span>`;}
    const dc=o.stat?`<span class="dc">SV ${o.dc}${o.stat==='kar'&&C&&!C.down?' · fordel':''}</span>`:'';
    b.innerHTML=`<span class="n">${i+1}.</span><span>${tag} ${escapeHtml(o.t)}</span>${dc}`;
    b.addEventListener('click',()=>choose(o));li.appendChild(b);dlgOpts.appendChild(li);
  });
  setTimeout(()=>dlgOpts.querySelector('button')?.focus({preventScroll:true}),30);
}
function escapeHtml(s){return s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function choose(o){
  if(G.state!=='dialog') return;
  if(o.stat){dlgEl.hidden=true;rollCheck(o.stat,o.dc,ok=>{const nx=ok?o.ok():o.fail();showNode(nx);});}
  else showNode(o.go?o.go():null);
}
function closeDialog(){dlgEl.hidden=true;$('letterbox').classList.remove('on');$('hud').style.opacity=1;dlgCur=null;dlgNPC=null;if(G.state==='dialog')G.state='play';saveGame();}

// --- 3D d20
const diceR=new THREE.WebGLRenderer({canvas:$('diceCv'),antialias:true,alpha:true});diceR.setPixelRatio(Math.min(devicePixelRatio,2));diceR.setSize(260,260,false);
diceR.toneMapping=THREE.ACESFilmicToneMapping;
const dScene=new THREE.Scene(), dCam=new THREE.PerspectiveCamera(32,1,.1,50); dCam.position.set(0,0,6.4);
dScene.environment=scene.environment;
dScene.add(new THREE.AmbientLight(0x404858,1.2));const dl1=new THREE.DirectionalLight(0xfff0d0,3);dl1.position.set(3,4,5);dScene.add(dl1);const dl2=new THREE.PointLight(0x7fd6ff,30,20);dl2.position.set(-3,-2,3);dScene.add(dl2);
const d20=new THREE.Mesh(new THREE.IcosahedronGeometry(1.35,0),new THREE.MeshStandardMaterial({color:0x2a1d0e,metalness:.9,roughness:.28,flatShading:true,emissive:0x1a0f04}));
d20.add(new THREE.LineSegments(new THREE.EdgesGeometry(d20.geometry),new THREE.LineBasicMaterial({color:0xf3d68a})));dScene.add(d20);
let diceAnim=null;
function rollCheck(stat,dc,cb){
  const adv=stat==='kar'&&C&&!C.down;
  const r1=1+Math.floor(Math.random()*20), r2=adv?1+Math.floor(Math.random()*20):0, nat=adv?Math.max(r1,r2):r1;
  const sm=mod(P.stats[stat]), prof=2, mim=G.flags.mimir?2:0, total=nat+sm+prof+mim;
  const ok=nat===20||(nat!==1&&total>=dc);
  $('dice').hidden=false;$('diceHead').textContent=`${STATN[stat][1].toUpperCase()} · SVÆRHEDSGRAD`;$('diceDC').textContent=dc;
  $('diceRes').textContent='';$('diceRes').className='';$('diceInfo').textContent=adv?'Astrid er med dig: du slår med fordel':'';$('dieN').style.opacity=0;$('diceGo').hidden=true;
  diceAnim={stat,t:0,dur:1.5,vx:rand(8,12),vy:rand(8,12),vz:rand(4,8),done:false,cb,ok,nat,r1,r2,adv,sm,prof,mim,total,dc,tick:0};
  d20.material.emissive.setHex(0x1a0f04);
  $('diceGo').onclick=()=>{$('dice').hidden=true;const a=diceAnim;diceAnim=null;a.cb(a.ok);};
}
function updDice(dt){
  if(!diceAnim) return; const a=diceAnim; a.t+=dt; const k=clamp(a.t/a.dur,0,1), sp=Math.pow(1-k,2.2);
  d20.rotation.x+=a.vx*sp*dt;d20.rotation.y+=a.vy*sp*dt;d20.rotation.z+=a.vz*sp*dt;
  d20.position.y=Math.abs(Math.sin(k*Math.PI*3))*(1-k)*.5;
  a.tick-=dt; if(k<1&&a.tick<=0){a.tick=.06+k*.12;sfx('tick');$('dieN').style.opacity=.5;$('dieN').textContent=1+Math.floor(Math.random()*20);}
  if(k>=1&&!a.done){a.done=true;$('dieN').textContent=a.nat;$('dieN').style.opacity=1;
    const parts=[(a.adv?`Slag ${a.r1} og ${a.r2}, bedste ${a.nat}`:`Slag ${a.nat}`),`${STATN[a.stat][0]} ${fmtMod(a.sm)}`,`Færdighed +${a.prof}`];
    if(a.mim)parts.push('Mimir +2');
    $('diceInfo').textContent=parts.join(' · ')+` = ${a.total}`;
    const R=$('diceRes');R.textContent=a.nat===20?'KRITISK SUCCES':a.nat===1?'KRITISK FIASKO':a.ok?'SUCCES':'FIASKO';R.className=a.ok?'ok':'no';
    d20.material.emissive.setHex(a.ok?0x6a4a10:0x4a0806);sfx(a.ok?'ok':'no');$('diceGo').hidden=false;$('diceGo').focus({preventScroll:true});}
  diceR.render(dScene,dCam);
}

/* =========================================================
   REST / LEVEL UP / SAVE
   ========================================================= */
function openRest(id){
  const rs=RUNESTONES[id]; G.lastRS=id; G.state='rest';
  P.hp=maxHp();P.hpLag=P.hp;P.st=maxSt();P.flasks=maxFlasks();P.rage=0;
  resetWorld(); saveGame(); sfx('rune');
  burst(rs.x*S,hgt(rs.x,rs.y)+1.5,rs.y*S,60,1.5,2,.3,2.2,1.6,.6,{grav:-.6,drag:.5});
  renderRest(); $('rest').hidden=false; $('restLeave').focus({preventScroll:true});
}
function statRows(el,editable){
  el.innerHTML='';
  for(const k of Object.keys(STATN)){
    const v=P.stats[k];const row=document.createElement('div');row.className='srow';
    row.innerHTML=`<span class="ab">${STATN[k][0]}</span><span class="nm">${STATN[k][1]}<small>${STATN[k][2]}</small></span><span class="v">${v}</span><span class="m">${fmtMod(mod(v))}</span>`;
    const bx=document.createElement('div');bx.className='sbtns';
    if(editable){const b=document.createElement('button');b.className='sbtn up';b.type='button';b.textContent='Styrk';const cost=lvlCost(P.level);b.disabled=P.runes<cost||v>=30;
      b.addEventListener('click',()=>{if(P.runes<lvlCost(P.level))return;P.runes-=lvlCost(P.level);P.stats[k]++;P.level++;P.hp=maxHp();P.st=maxSt();sfx('rune');renderRest();});bx.appendChild(b);}
    row.appendChild(bx);el.appendChild(row);
  }
}
function derived(){const dm=Math.round(atkMult()*100);return`<span>Liv <b>${maxHp()}</b></span><span>Udholdenhed <b>${maxSt()}</b></span><span>Skade <b>${dm} %</b></span><span>Mjødhorn <b>${maxFlasks()}</b></span><span>Våben <b>+${G.weaponLvl}</b></span><span>Udstyr <b>${Object.values(G.eq||{}).filter(Boolean).map(i=>ITEMS[i].name).join(', ')||'intet'}</b></span>`;}
function renderRest(){
  const rs=RUNESTONES[G.lastRS];$('restName').textContent=rs.name;$('rLvl').textContent=P.level;$('rRunes').textContent=P.runes;$('rCost').textContent=lvlCost(P.level);
  statRows($('rStats'),true);$('rDerived').innerHTML=derived();
  const tr=$('rTravel');tr.innerHTML='';
  RUNESTONES.forEach(r=>{if(!r.lit||r.id===G.lastRS)return;const b=document.createElement('button');b.className='btn ghost';b.type='button';b.textContent=r.name;b.addEventListener('click',()=>{G.lastRS=r.id;P.x=r.x;P.y=r.y+46;if(C){C.x=P.x-30;C.y=P.y+30;}resetWorld();snapCam();saveGame();renderRest();});tr.appendChild(b);});
  if(!tr.children.length) tr.innerHTML='<span class="mute small">Tænd flere runesten ude i verden for at kunne rejse mellem dem.</span>';
}
$('restLeave').addEventListener('click',()=>{$('rest').hidden=true;G.state='play';});
const SAVE_KEY='ravnensEd.v1';
function makeSave(){return{name:P.name,cls:P.cls,stats:P.stats,level:P.level,runes:P.runes,flags:G.flags,weaponLvl:G.weaponLvl,extraFlasks:G.extraFlasks,discount:G.discount,lastRS:G.lastRS,lit:RUNESTONES.map(r=>r.lit),stain:G.stain,deaths:G.deaths,play:G.play,inv:G.inv,eq:G.eq};}
function saveGame(){if(!P||G.flags.jotunDone)return;try{localStorage.setItem(SAVE_KEY,JSON.stringify(makeSave()));}catch(e){}}
function loadSave(){try{const s=localStorage.getItem(SAVE_KEY);return s?JSON.parse(s):null;}catch(e){return null;}}
function clearSave(){try{localStorage.removeItem(SAVE_KEY);}catch(e){}}

/* =========================================================
   GAME FLOW
   ========================================================= */
function resetRun(){
  G.flags={};G.inv=[];G.eq={weapon:null,armor:null,t1:null,t2:null};G.weaponLvl=0;G.extraFlasks=0;G.discount=1;G.lastRS=0;G.stain=null;G.deaths=0;G.play=0;G.ending=null;G.endT=0;G.boss=null;
  for(const id in CHEST_M){const m=CHEST_M[id];m.opening=false;m.open=0;if(m.lid)m.lid.rotation.x=0;}
  RUNESTONES.forEach(r=>{r.lit=r.id===0;RS_MESH[r.id].mat.emissiveIntensity=r.lit?2.6:0;RS_MESH[r.id].light.intensity=r.lit?22:0;});
  GATE.gone=false;G.gateAnim=null;gateDoors.forEach(d=>d.hinge.rotation.y=0);
  if(C){scene.remove(CM.root);C=null;CM=null;} NPCM.astrid.root.visible=true;
}
function beginGame(fromSave){
  resetRun();
  if(fromSave){const s=fromSave;newPlayer(s.cls,s.stats,s.name);P.level=s.level;P.runes=s.runes;Object.assign(G.flags,s.flags||{});G.weaponLvl=s.weaponLvl||0;G.extraFlasks=s.extraFlasks||0;G.discount=s.discount||1;G.lastRS=s.lastRS||0;G.stain=s.stain||null;G.deaths=s.deaths||0;G.play=s.play||0;G.inv=s.inv||[];G.eq=s.eq||{weapon:null,armor:null,t1:null,t2:null};
    (s.lit||[]).forEach((l,i)=>{RUNESTONES[i].lit=l;RS_MESH[i].mat.emissiveIntensity=l?2.6:0;RS_MESH[i].light.intensity=l?22:0;});
    for(const id in (G.flags.chests||{})){const m=CHEST_M[id];if(m){m.open=1;if(m.lid)m.lid.rotation.x=-1.9;}}
    if(G.flags.gateOpen){GATE.gone=true;gateDoors.forEach(d=>d.hinge.rotation.y=d.s*1.6);}
    const rs=RUNESTONES[G.lastRS];P.x=rs.x;P.y=rs.y+46;P.hp=maxHp();P.hpLag=P.hp;P.st=maxSt();P.flasks=maxFlasks();
    if(G.flags.astrid)makeCompanion();
  }
  resetWorld();
  $('title').hidden=true;$('create').hidden=true;$('hud').hidden=false;
  $('hName').textContent=P.name;$('specName').textContent=CLASSES[P.cls].special;$('specIco').innerHTML=CLASSES[P.cls].ico;
  G.state='play';snapCam();audioInit();
  if(!fromSave){banner('RAVNSHOLM','Midgard · det tredje år af Fimbulvinteren');setTimeout(()=>toast('Tal med Gamle Ulfr ved runestenen (E)'),3600);}
  else toast('Velkommen tilbage, '+P.name);
}
function toTitle(){
  $('pause').hidden=true;$('end').hidden=true;$('hud').hidden=true;$('rest').hidden=true;$('deathScr').hidden=true;$('prompt').hidden=true;dlgEl.hidden=true;$('letterbox').classList.remove('on');
  clearEnemies(); if(PM){scene.remove(PM.root);PM=null;} if(C){scene.remove(CM.root);C=null;CM=null;} NPCM.astrid.root.visible=true; P=null;
  G.state='title';music('title');$('title').hidden=false;$('bCont').hidden=!loadSave();
  for(const n of NUMS)n.el.remove();NUMS.length=0;
}
function showEnd(){
  G.state='end';music('victory');$('hud').hidden=true;$('prompt').hidden=true;clearSave();
  const peace=G.ending==='word';
  $('endEy').textContent=peace?'Ordets vej':'Sværdets vej';
  $('endT').textContent='Fimbulvinteren er brudt';
  $('endP').textContent=peace?`Hrimgrimr gik mod nord med Sigruns navn på læben, og ingen så ham igen. Sneen smeltede fra Ravnsholms tage den forår, og skjaldene kalder dig ${P.name} Ordvise, den der fældede en jötun uden at trække våben.`:`Rimtursens hjerte af is splintrede mod sneen, og kulden gik ud af verden med ham. Ved næste midvinterblot rejste Ravnsholm en runesten med dit navn: ${P.name}, ${G.deaths?'den der rejste sig igen':'den der aldrig faldt'}.`;
  const m=Math.floor(G.play/60);
  $('endStats').innerHTML=`<span>Klasse <b>${CLASSES[P.cls].name}</b></span><span>Niveau <b>${P.level}</b></span><span>Dødsfald <b>${G.deaths}</b></span><span>Tid <b>${m} min</b></span>`;
  $('end').hidden=false;$('endGo').focus({preventScroll:true});
}
$('endGo').addEventListener('click',toTitle);

/* --- Character creation */
let crCls='berserker', crPts=3, crStats={};
function renderCreate(){
  const cards=$('cards');cards.innerHTML='';
  for(const [k,c] of Object.entries(CLASSES)){
    const b=document.createElement('button');b.type='button';b.className='ccard';b.setAttribute('aria-pressed',k===crCls);
    b.innerHTML=`<span class="cr-rune">${c.rune}</span><h3>${c.name}</h3><p>${c.desc}</p><span class="base">STY ${c.base.sty} · SMI ${c.base.smi} · VIL ${c.base.vil} · KAR ${c.base.kar}</span>`;
    b.addEventListener('click',()=>{crCls=k;crStats={...c.base};crPts=3;renderCreate();});cards.appendChild(b);
  }
  $('ptsLeft').textContent=crPts;
  const el=$('crStats');el.innerHTML='';
  for(const k of Object.keys(STATN)){
    const base=CLASSES[crCls].base[k],v=crStats[k];
    const row=document.createElement('div');row.className='srow';
    row.innerHTML=`<span class="ab">${STATN[k][0]}</span><span class="nm">${STATN[k][1]}<small>${STATN[k][2]}</small></span><span class="v">${v}</span><span class="m">${fmtMod(mod(v))}</span>`;
    const bx=document.createElement('div');bx.className='sbtns';
    const minus=document.createElement('button');minus.className='sbtn';minus.type='button';minus.textContent='−';minus.setAttribute('aria-label','Sænk '+STATN[k][1]);minus.disabled=v<=base;
    minus.addEventListener('click',()=>{crStats[k]--;crPts++;renderCreate();});
    const plus=document.createElement('button');plus.className='sbtn';plus.type='button';plus.textContent='+';plus.setAttribute('aria-label','Hæv '+STATN[k][1]);plus.disabled=crPts<=0||v>=18;
    plus.addEventListener('click',()=>{crStats[k]++;crPts--;renderCreate();});
    bx.append(minus,plus);row.appendChild(bx);el.appendChild(row);
  }
}
$('bNew').addEventListener('click',()=>{audioInit();crCls='berserker';crStats={...CLASSES.berserker.base};crPts=3;renderCreate();$('title').hidden=true;$('create').hidden=false;});
$('bBack').addEventListener('click',()=>{$('create').hidden=true;$('title').hidden=false;});
$('bStart').addEventListener('click',()=>{clearSave();const name=($('inName').value||'').trim()||'Ravnebåren';newPlayer(crCls,crStats,name);beginGame(null);});
$('bCont').addEventListener('click',()=>{const s=loadSave();if(s){audioInit();beginGame(s);}});
function openPause(){G.state='pause';$('pzName').textContent=P.name;$('pzClass').textContent=`${CLASSES[P.cls].name} · niveau ${P.level} · ${P.runes} runer`;statRows($('pzStats'),false);$('pzDerived').innerHTML=derived();$('pause').hidden=false;$('pzGo').focus({preventScroll:true});}
$('pzGo').addEventListener('click',()=>{$('pause').hidden=true;G.state='play';});
$('pzQuit').addEventListener('click',()=>{saveGame();toTitle();});
$('pzGfx').addEventListener('click',()=>applyGfx(GFX==='ultra'?'high':'ultra'));
applyGfx(GFX);

/* =========================================================
   INPUT
   ========================================================= */
addEventListener('keydown',e=>{
  if(e.target&&e.target.tagName==='INPUT') return;
  keys[e.code]=true;
  if(e.code==='KeyM'){setMuted(AU.on);toast(AU.on?'Lyd til':'Lyd fra');}
  if(G.state==='play'){
    if(e.code==='Space'){buf={k:'roll',t:G.time};e.preventDefault();}
    if(e.code==='KeyR') buf={k:'heal',t:G.time};
    if(e.code==='KeyF') buf={k:'special',t:G.time};
    if(e.code==='KeyE'){const it=interactTarget();if(it)it.fn();}
    if(e.code==='Escape') openPause();
    if(e.code==='KeyI') openInv();
  } else if(G.state==='dialog'&&dlgCur&&!diceAnim){
    const n=parseInt(e.key,10);if(n>=1&&n<=9){const b=dlgOpts.querySelectorAll('button')[n-1];if(b){b.click();e.preventDefault();}}
  } else if(G.state==='pause'&&e.code==='Escape'){$('pause').hidden=true;G.state='play';}
  else if(G.state==='inv'&&(e.code==='Escape'||e.code==='KeyI')){$('inv').hidden=true;G.state='play';}
  else if(G.state==='rest'&&e.code==='Escape'){$('rest').hidden=true;G.state='play';}
  if(e.code==='Space'&&G.state!=='play'&&document.activeElement===document.body) e.preventDefault();
});
addEventListener('keyup',e=>{keys[e.code]=false;});
addEventListener('pointerdown',()=>audioInit(),{once:true});
addEventListener('keydown',()=>audioInit(),{once:true});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;mouse.l=mouse.r=false;});
addEventListener('mousemove',e=>{mouse.x=e.clientX;mouse.y=e.clientY;});
cv.addEventListener('mousedown',e=>{if(G.state!=='play')return;if(e.button===0){mouse.l=true;buf={k:'lmb',t:G.time};}if(e.button===2){mouse.r=true;buf={k:'rmb',t:G.time};}});
addEventListener('mouseup',e=>{if(e.button===0)mouse.l=false;if(e.button===2)mouse.r=false;});
cv.addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('wheel',e=>{if(G.state==='play'){G.zoom=clamp(G.zoom+e.deltaY*.0009,0,1);e.preventDefault();}},{passive:false});

/* =========================================================
   CAMERA
   ========================================================= */
const ray=new THREE.Raycaster(), plane=new THREE.Plane(new THREE.Vector3(0,1,0),0), hitV=new THREE.Vector3(), ndc=new THREE.Vector2();
function camGoal(){
  let tx=P.x*S, tz=P.y*S; const ty=groundY(P.x,P.y);
  const B=G.boss&&!G.boss.dead?G.boss:null, big=B&&B.t==='jotun';
  G.zEff=lerp(G.zEff??G.zoom,big?Math.max(G.zoom,.82):B?Math.max(G.zoom,.55):G.zoom,.03);
  if(B){const k=big?.3:.2;tx=lerp(tx,B.x*S,k);tz=lerp(tz,B.y*S,k);}
  const z=G.zEff, d=lerp(11,27,z), pitch=lerp(.5,.98,z);
  return {pos:new THREE.Vector3(tx,ty+1+Math.sin(pitch)*d,tz+Math.cos(pitch)*d),look:new THREE.Vector3(tx,ty+1.2,tz-lerp(1.6,0,z))};
}
function snapCam(){const g=camGoal();G.camPos.copy(g.pos);G.camLook.copy(g.look);}
let titleT=0;
function updateCamera(dt){
  let goal;
  if(G.state==='title'||G.state==='loading'){
    titleT+=dt*.035;const cx=1800*S,cz=2300*S;
    const tr=15;goal={pos:new THREE.Vector3(cx+Math.cos(titleT)*tr,hgt(1800,2300)+4.2+Math.sin(titleT*.7)*.8,cz+Math.sin(titleT)*tr),look:new THREE.Vector3(cx,hgt(1800,2300)+6.5,cz-30)};
    G.camPos.lerp(goal.pos,G.state==='loading'?1:Math.min(1,dt*.8));G.camLook.lerp(goal.look,Math.min(1,dt*1.2));
  } else if(G.state==='dialog'&&dlgNPC&&P){
    const n=dlgNPC, tall=n.boss==='jotun'?8:n.gate?4:n.head?1.4:1.5;
    const nx=n.x*S, nz=n.y*S, ny=(n.head?ICE_Y+.4:groundY(n.x,n.y))+tall;
    const px=P.x*S, pz=P.y*S, py=groundY(P.x,P.y);
    const dx=nx-px, dz=nz-pz, l=Math.hypot(dx,dz)||1, ux=dx/l, uz=dz/l;
    const J=n.boss==='jotun', back=J?6:n.gate?6:3.1, side=J?8:2.5;
    goal={pos:new THREE.Vector3(px-ux*back+(-uz)*side,py+(J?2.4:1.75),pz-uz*back+ux*side),look:new THREE.Vector3(nx-ux*.4,ny-(J?4:1.05),nz-uz*.4)};
    G.camPos.lerp(goal.pos,Math.min(1,dt*2.6));G.camLook.lerp(goal.look,Math.min(1,dt*3));
  } else if(P){
    goal=camGoal();G.camPos.lerp(goal.pos,Math.min(1,dt*5));G.camLook.lerp(goal.look,Math.min(1,dt*6));
  }
  camera.position.copy(G.camPos);
  if(G.shake>0){const s=G.shake*.35;camera.position.x+=rand(-s,s);camera.position.y+=rand(-s,s);camera.position.z+=rand(-s,s);G.shake=Math.max(0,G.shake-dt*1.8);}
  camera.lookAt(G.camLook);
  SEE.uFade.value=P&&G.state!=='title'&&G.state!=='dialog'?1:0; if(P){SEE.uPlayer.value.set(P.x*S,groundY(P.x,P.y),P.y*S);} SEE.uCam.value.copy(camera.position);
  sky.position.copy(camera.position);
  // depth of field frames the speaker during dialogue
  const talking=G.state==='dialog'&&dlgNPC; dof.enabled=!!talking;
  if(talking){const nx=dlgNPC.x*S,nz=dlgNPC.y*S;dof.uniforms.focus.value=Math.hypot(camera.position.x-nx,camera.position.z-nz);}
  grade.uniforms.uDark.value=G.cryptK||0;
  const fc=P?{x:P.x*S,y:groundY(P.x,P.y),z:P.y*S}:{x:G.camLook.x,y:G.camLook.y,z:G.camLook.z};
  moon.position.set(fc.x+MOON_OFF.x,fc.y+MOON_OFF.y,fc.z+MOON_OFF.z);moon.target.position.set(fc.x,fc.y,fc.z);
  if(P){ndc.set(mouse.x/innerWidth*2-1,-(mouse.y/innerHeight)*2+1);ray.setFromCamera(ndc,camera);plane.constant=-(groundY(P.x,P.y)+1);if(ray.ray.intersectPlane(plane,hitV)){mouseW.x=hitV.x/S;mouseW.y=hitV.z/S;}}
}

/* =========================================================
   RENDER SYNC
   ========================================================= */
/* --- Weapon trail: a fading ribbon from hand to blade tip while swinging */
const TRAIL_N=16, trailPts=[];
const trailGeo=new THREE.BufferGeometry(); trailGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(TRAIL_N*2*3),3)); trailGeo.setAttribute('color',new THREE.BufferAttribute(new Float32Array(TRAIL_N*2*3),3));
{const idx=[];for(let i=0;i<TRAIL_N-1;i++){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}trailGeo.setIndex(idx);}
const trail=new THREE.Mesh(trailGeo,new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
trail.frustumCulled=false; scene.add(trail);
const _h=new THREE.Vector3(), _c=new THREE.Vector3();
function updTrail(dt){
  for(const q of trailPts) q.age+=dt;
  while(trailPts.length&&trailPts[0].age>.2) trailPts.shift();
  const A=P&&P.act, swinging=A&&(A.kind==='atk'||A.kind==='heavy'||A.kind==='bash')&&P.cls!=='volve'&&PM;
  if(swinging){const hand=PM.bone('handslot.r');if(hand){hand.getWorldPosition(_h);_c.set(P.x*S,groundY(P.x,P.y)+1.15,P.y*S);const dir=_h.clone().sub(_c).setY(0).normalize();
      const len=P.cls==='berserker'?1.15:.95;trailPts.push({a:_h.clone(),b:_h.clone().addScaledVector(dir,len).add(new THREE.Vector3(0,.15,0)),age:0});if(trailPts.length>TRAIL_N)trailPts.shift();}}
  const pa=trailGeo.attributes.position.array, ca=trailGeo.attributes.color.array, n=trailPts.length;
  const col=P&&P.rage>0?[2.4,.5,.25]:[1.5,1.35,1.05];
  for(let i=0;i<TRAIL_N;i++){const q=trailPts[Math.min(n-1,Math.max(0,i-(TRAIL_N-n)))];if(!q){pa.fill(0);break;}
    const k=n<2?0:Math.max(0,1-q.age/.2)*Math.max(0,(i-(TRAIL_N-n))/Math.max(1,n-1));
    pa.set([q.a.x,q.a.y,q.a.z],i*6);pa.set([q.b.x,q.b.y,q.b.z],i*6+3);
    ca.set([col[0]*k*.15,col[1]*k*.15,col[2]*k*.15],i*6);ca.set([col[0]*k,col[1]*k,col[2]*k],i*6+3);}
  trailGeo.attributes.position.needsUpdate=true; trailGeo.attributes.color.needsUpdate=true; trail.visible=n>1;
}
function syncPlayer(dt){
  if(!P||!PM) return; const p=P, an=PANIM[p.cls];
  const gy=groundY(p.x,p.y);
  PM.root.position.set(p.x*S,gy,p.y*S);
  PM.root.rotation.y=lerpAng(PM.root.rotation.y,-p.face,Math.min(1,dt*18));
  const A=p.act; let w;
  if(p.dead) w={n:'Death_A',key:'dead',fade:.2};
  else if(p.roll>0) w={n:'Dodge_Forward',key:'roll'+p.rollId,fit:.42};
  else if(A){
    const k=A.kind;
    if(k==='atk') w={n:an.atk[p.combo],key:A,fit:A.dur*1.25};
    else if(k==='heavy') w={n:an.heavy,key:A,fit:A.dur};
    else if(k==='cast') w={n:p.cls==='volve'&&A.dur>.4?an.special:an.cast,key:A,fit:A.dur*1.3};
    else if(k==='nova') w={n:an.nova,key:A,fit:A.dur*1.4};
    else if(k==='bash') w={n:an.bash,key:A,fit:A.dur*1.1};
    else if(k==='roar') w={n:an.roar,key:A,fit:.9};
    else if(k==='heal') w={n:an.heal,key:A,fit:A.dur};
  }
  else if(p.stagger>.08) w={n:'Hit_A',key:'hit'+p.hitId,fit:.35};
  else if(p.blocking) w={n:'Blocking'};
  else if(p.move>.12) w={n:an.run,speed:lerp(.75,1.15,clamp(p.move,0,1))};
  else w={n:an.idle};
  drive(PM,w); PM.anim.update(dt);
  if(p.cls==='berserker') PM.show('Mug',!!(A&&A.kind==='heal'));
  lantern.position.set(p.x*S-.6,gy+3.6,p.y*S+.8);
  PM.tintEmissive(p.rage>0?.22:0,0,0);
}
const QA={idle:'Idle',calm:'Idle',move:'Run',walk:'Walk',death:'Death',hit:'HitReact'}, QF={idle:'Flying_Idle',calm:'Flying_Idle',move:'Fast_Flying',walk:'Flying_Idle',aim:'Flying_Idle',dash:'Headbutt',arc:'Punch',death:'Death',hit:'HitReact'};
const EANIM={
  wolf:{idle:'Idle',calm:'Idle_2',move:'Gallop',walk:'Walk',aim:'Idle_2_HeadLow',dash:'Attack',death:'Death',hit:'Idle_HitReact_Left'},
  trold:{...QA,move:'Walk',arc:'Bite_Front',hit:'HitRecieve'}, bjergtrold:{...QA,arc:'Weapon'}, rimtrold:{...QA,arc:'Punch',leap:'Jump'},
  ildvaette:{...QA,arc:'Weapon'}, frostvaette:{...QA,arc:'Weapon'},
  gjenganger:QF, gjenganger2:QF, stenvaette:QF, stenvaette2:QF, vaette:{...QF,shoot:'Punch'}, lindorm:{...QF,breath:'Yes'},
  lindyngel:{idle:'Dragon_Flying',calm:'Dragon_Flying',move:'Dragon_Flying',walk:'Dragon_Flying',aim:'Dragon_Flying',dash:'Dragon_Attack',death:'Dragon_Death',hit:'Dragon_Hit'},
  minion:{idle:'Idle_Combat',calm:'Skeleton_Inactive_Standing_Pose',move:'Running_C',arc:'1H_Melee_Attack_Chop',death:'Death_C_Skeletons'},
  seidr:{idle:'Idle_Combat',calm:'Skeleton_Inactive_Standing_Pose',move:'Running_C',aim:'Spellcasting',shoot:'Spellcast_Shoot',death:'Death_C_Skeletons'},
  vogter:{idle:'Idle_Combat',calm:'Idle_B',move:'Running_A',arc:'2H_Melee_Attack_Slice',leap:'1H_Melee_Attack_Jump_Chop',summon:'Spellcast_Summon',death:'Death_C_Skeletons'},
  draugr:{idle:'Idle_Combat',calm:'Skeleton_Inactive_Standing_Pose',move:'Running_C',arc:'1H_Melee_Attack_Slice_Diagonal',death:'Death_C_Skeletons'},
  archer:{idle:'Idle_Combat',calm:'Skeleton_Inactive_Standing_Pose',move:'Running_C',aim:'1H_Ranged_Aiming',shoot:'1H_Ranged_Shoot',death:'Death_C_Skeletons'},
  jarl:{idle:'Idle_Combat',calm:'Idle_B',move:'Running_A',arc:'1H_Melee_Attack_Slice_Horizontal',leap:'1H_Melee_Attack_Jump_Chop',summon:'Spellcast_Summon',death:'Death_C_Skeletons'},
  jotun:{idle:'2H_Melee_Idle',calm:'Idle',move:'Walking_A',arc:'2H_Melee_Attack_Slice',stomp:'2H_Melee_Attack_Chop',cast:'Spellcast_Shoot',rain:'Spellcast_Long',death:'Death_B'},
};
function animEnemy(e,m,dt,gy){
  const an=EANIM[e.t]; let w;
  if(e.dead){
    w={n:an.death,key:'dead',fade:.1};
    const k=clamp((e.deathT-(e.boss?2.2:1.3))/(e.boss?1.6:.8),0,1); if(k>0){m.opacity(1-k);m.root.position.y=gy-k*(e.boss?1.5:.3);} if(k>=1)m.root.visible=false;
  }
  else if(e.stun>0) w={n:an.hit||'Hit_B',key:'st'+e.stunId,fit:.5};
  else if(e.atkHaz&&G.hazards.includes(e.atkHaz)){
    const h=e.atkHaz, own=h.k==='circle'&&Math.hypot(h.x-e.x,h.y-e.y)<20;
    let n=an.arc, fit=h.wind+.35;
    if(KIND[e.t]==='brute'&&h.k==='circle'){n=an.leap;fit=h.wind+.5;}
    if(e.t==='lindorm'&&h.k==='circle'){n=an.breath;fit=h.wind+.3;}
    if(e.t==='jotun'&&h.k==='circle'){n=own?an.stomp:(G.hazards.filter(x=>x.owner===e).length>7?an.rain:an.cast);fit=own?h.wind+.4:h.wind+.3;}
    w={n,key:'a'+e.atkSeq,fit};
  }
  else if(e.summoned&&e.busy>.5&&e.t==='jarl') w={n:an.summon,key:'sum',fit:1.2};
  else if(e.dash&&an.dash) w={n:an.dash,key:'d'+e.dashSeq,fit:.5};
  else if(e.aim&&an.aim) w={n:an.aim};
  else if(e.shotId&&e.busy>0&&an.shoot) w={n:an.shoot,key:'s'+e.shotId,fit:.45};
  else if(e.awoke&&e.busy>.05&&!e.awakeDone) w={n:'Skeletons_Awaken_Standing',key:'awake',fit:1.1};
  else if(e.leaving||e.move>.15) w={n:e.aggro||e.leaving?an.move:(an.walk||'Walking_D_Skeletons'),speed:e.t==='jotun'?.75:1};
  else w={n:e.aggro?an.idle:(e.dormant&&e.t==='jotun'?'Sit_Chair_Idle':an.calm)};
  if(e.awoke&&e.busy<=.05) e.awakeDone=true;
  if(!m.anim.has(w.n)) w={...w,n:m.anim.has('Idle')?'Idle':w.n};
  drive(m,w); m.anim.update(dt);
  const fl=e.flash>0?1:0; m.flash(fl);
}
const easeOut=t=>1-Math.pow(1-t,3), easeInOut=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
function lerpAng(a,b,t){return a+angDiff(b,a)*t;}
function syncEnemies(dt){
  for(const e of G.enemies){
    const m=e.model; if(!m) continue;
    const gy=groundY(e.x,e.y);
    let lift=0;
    if(e.air){e.airT=(e.airT||0)+dt;lift=Math.sin(clamp(e.airT/1,0,1)*Math.PI)*5;}
    if(FLOAT[e.t]&&!e.dead) lift+=FLOAT[e.t]+Math.sin(e.t0*2.2)*.15;
    m.root.position.set(e.x*S,gy+lift,e.y*S);
    if(e.leaving){e.y-=dt*40;e.face=-Math.PI/2;e.move=1;e.fade=Math.max(0,(e.fade??1)-dt*.16);m.opacity(e.fade);if(e.fade<=0)m.root.visible=false;}
    m.root.rotation.y=lerpAng(m.root.rotation.y,-e.face,Math.min(1,dt*(e.boss?6:12)));
    if(m.kk) animEnemy(e,m,dt,gy);
    else {
      const a={phase:e.phase,move:e.move,t:e.t0};
      if(e.aim) a.crouch=1; if(e.dash) a.crouch=-.6;
      if(e.dead){const k=clamp(e.deathT/.8,0,1);m.body.rotation.z=k*1.4;m.root.position.y=gy-k*.6;m.mats.forEach(mt=>{mt.transparent=true;mt.opacity=1-k;});if(k>=1)m.root.visible=false;}
      else poseHum(m,a);
      const fl=e.flash>0?1.6:0; m.mats.forEach(mt=>{if(mt.emissive)mt.emissive.setScalar(fl*.5);});
    }
    if(e.stun>0&&Math.random()<.4)FXA.emit(e.x*S+rand(-.3,.3),gy+(e.boss?4:2),e.y*S+rand(-.3,.3),0,.4,0,.5,.25,2.4,2.2,.8,1,0,0);
    if(e.t==='jotun'&&!e.dead&&!e.leaving){if(Math.random()<.35)FXN.emit(e.x*S+rand(-2.2,2.2),gy+rand(.2,1.5),e.y*S+rand(-2.2,2.2),rand(-.3,.3),rand(.1,.4),rand(-.3,.3),2.5,.6,.85,.92,1,.12,-.03,.3,2.5);if(Math.random()<.3)FXA.emit(e.x*S+rand(-.3,.3)+Math.cos(e.face)*.8,gy+7.6,e.y*S+rand(-.3,.3)+Math.sin(e.face)*.8,Math.cos(e.face)*1.2,-.2,Math.sin(e.face)*1.2,1.2,.35,.4,.7,.9,.6,-.1,.5,2);}
    if(e.t==='draugr'||e.t==='archer'||e.t==='jarl'){if(Math.random()<.04)FXA.emit(e.x*S,gy+(e.t==='jarl'?2.6:1.4),e.y*S,rand(-.2,.2),rand(.3,.7),rand(-.2,.2),1,.15,.4,1.4,2,1,-.1,0,0);}
    // aim line telegraph
    if(e.aim&&!e.dead){const L=(e.aim.lunge?150:Math.min(e.aim.len||300,420));for(let i=0;i<3;i++){const t=Math.random()*L;FXA.emit((e.x+Math.cos(e.face)*t)*S,gy+(e.aim.lunge?.3:1.3),(e.y+Math.sin(e.face)*t)*S,0,0,0,.12,.22,e.aim.lunge?2.4:.6,e.aim.lunge?.5:1.4,e.aim.lunge?.2:2.4,1,0,0,0);}}
    // hp bars
    if(!e.boss&&!e.dead&&e.hp<e.maxHp){
      if(!e.hpEl){e.hpEl=document.createElement('div');e.hpEl.className='ehp';e.hpEl.innerHTML='<i></i>';labels.appendChild(e.hpEl);}
      const s=toScreen(e.x*S,gy+(FLOAT[e.t]||0)+1.2+e.r*.06,e.y*S);e.hpEl.style.display=s.vis?'block':'none';e.hpEl.style.left=s.x+'px';e.hpEl.style.top=s.y+'px';e.hpEl.firstChild.style.width=(e.hp/e.maxHp*100)+'%';
    }
  }
  // clean dead
  G.enemies=G.enemies.filter(e=>!(e.dead&&e.deathT>(e.boss?4:2.2)));
}
function syncNPCs(dt){
  for(const n of NPCS){const m=NPCM[n.id];if(!m||!m.root.visible)continue;n.anim.t+=dt;
    if(!n.head){
      if(P&&dist(P,n)<170){const a=Math.atan2(P.y-n.y,P.x-n.x);m.root.rotation.y=lerpAng(m.root.rotation.y,-a,dt*3);}
    } else {m.root.position.y=ICE_Y+.55+Math.sin(n.anim.t*1.2)*.04;if(P){const a=Math.atan2(P.y-n.y,P.x-n.x);m.root.rotation.y=lerpAng(m.root.rotation.y,-a,dt*2);}}
    const lbl=npcLbl[n.id]; const near=P&&dist(P,n)<240&&G.state==='play';
    if(near){const s=toScreen(n.x*S,(n.head?ICE_Y+.5:groundY(n.x,n.y))+(n.id==='dvalin'?1.6:2.3),n.y*S);lbl.hidden=!s.vis;lbl.style.left=s.x+'px';lbl.style.top=s.y+'px';}else lbl.hidden=true;
  }
  if(C&&CM){
    const gy=groundY(C.x,C.y);CM.root.position.set(C.x*S,gy,C.y*S);CM.root.rotation.y=lerpAng(CM.root.rotation.y,-C.face,Math.min(1,dt*10));
    let w; if(C.down) w={n:'Death_B',key:'down'+C.downId}; else if(C.cd>.75) w={n:'2H_Ranged_Shoot',key:'sh'+C.shotId,fit:.5}; else if(C.move>.15) w={n:'Running_A',speed:lerp(.8,1.1,C.move)}; else w={n:'Idle'};
    drive(CM,w);
  }
  for(const id in NPCM){const m=NPCM[id]; if(m.anim&&m.root.visible) m.anim.update(dt);} if(CM) CM.anim.update(dt);
}
let smokeT=0;
const NIGHT_FOG=new THREE.Color(0x1b2738), CRYPT_FOG=new THREE.Color(0x040507);
scene.background=scene.fog.color;
function ambientFX(dt){
  const inC=!!P&&inCrypt(P.x,P.y); G.cryptK=lerp(G.cryptK||0,inC?1:0,Math.min(1,dt*(inC?6:2))); const ck=G.cryptK;
  hemi.intensity=lerp(.62,.2,ck); moon.intensity=lerp(1.45,.03,ck); scene.fog.density=lerp(.0135,.045,ck); if(CRYPT_VOID)CRYPT_VOID.visible=ck>.02;
  scene.fog.color.copy(NIGHT_FOG).lerp(CRYPT_FOG,ck); snow.visible=ck<.5; MIST.forEach(m=>m.m.visible=ck<.5);
  lantern.intensity=lerp(10,16,ck); CRYPT_LIGHTS.forEach(L=>{if(L.distance===8)L.intensity=ck*8;});
  for(const id in CHEST_M){const m=CHEST_M[id];if(m.opening&&m.open<1){m.open=Math.min(1,m.open+dt*2.2);if(m.lid)m.lid.rotation.x=-1.9*easeOut(m.open);}}
  smokeT-=dt;
  if(smokeT<=0){smokeT=.12;for(const s of SMOKERS){if(P&&Math.abs(s.x-P.x*S)>45)continue;FXN.emit(s.x+rand(-.2,.2),s.y,s.z+rand(-.2,.2),wind*.15+rand(-.1,.1),rand(.6,1),rand(-.1,.1),rand(4,6),rand(1,1.6),.32,.33,.36,.35,-.05,.1,3);}}
  for(const f of FIRE_FX){
    if(f.crypt&&G.cryptK<.05&&f.light.intensity===0) continue;
    f.light.intensity=(f.crypt?G.cryptK:1)*f.base*(.82+Math.sin(G.time*13+f.x)*.08+Math.sin(G.time*23.7+f.z)*.06+Math.random()*.06);
    if(P&&Math.abs(f.x-P.x*S)>50) continue;
    const n=f.small?1:3;
    for(let i=0;i<n;i++){FXA.emit(f.x+rand(-.22,.22),f.y+.15,f.z+rand(-.22,.22),rand(-.15,.15)+wind*.05,rand(1,2),rand(-.15,.15),rand(.35,.65),rand(.25,.45),1.3,.45,.1,.8,-.4,.2,-.5);}
    if(Math.random()<.3)FXA.emit(f.x,f.y+.5,f.z,rand(-.6,.6)+wind*.2,rand(2,4),rand(-.6,.6),rand(1.2,2.2),rand(.08,.14),3,1.6,.4,1,.4,.3,0);
    if(!f.small&&Math.random()<.35)FXN.emit(f.x,f.y+1.6,f.z,wind*.1,rand(.6,1),0,rand(3,4.5),rand(1,1.8),.25,.25,.28,.25,-.05,.1,2.5);
  }
  RUNESTONES.forEach((rs,i)=>{if(!rs.lit)return;const m=RS_MESH[i];m.mat.emissiveIntensity=2.3+Math.sin(G.time*1.7+i)*.4;
    if(Math.random()<.25)FXA.emit(m.pos.x+rand(-1.4,1.4),m.pos.y+rand(.2,.8),m.pos.z+rand(-1.4,1.4),rand(-.1,.1),rand(.3,.8),rand(-.1,.1),rand(2,3.4),rand(.12,.22),2.2,1.5,.5,1,-.05,.2,0);});
  if(mimirGlow){mimirGlow.intensity=22+Math.sin(G.time*1.4)*6;if(Math.random()<.2)FXA.emit(2850*S+rand(-1,1),ICE_Y+1.2,1400*S+rand(-1,1),0,rand(.2,.5),0,2.5,.18,.6,1.6,2.4,1,-.05,0,0);}
  CRYSTALS.forEach((c,i)=>{c.rotation.y+=dt*.1*(i%2?1:-1);});
  if(G.stain){const gy=groundY(G.stain.x,G.stain.y);for(let i=0;i<2;i++)FXA.emit(G.stain.x*S+rand(-.3,.3),gy+.1,G.stain.y*S+rand(-.3,.3),0,rand(.4,1.2),0,1.2,.3,2.2,1.6,.5,1,-.1,0,0);}
  BANNERS.forEach((b,i)=>{const p=b.geo.attributes.position;for(let j=0;j<p.count;j++){const x=b.base[j*3],y=b.base[j*3+1];p.setZ(j,Math.sin(x*3-G.time*3+i+y)*.12*x+Math.sin(G.time*1.3)*.05*x);}p.needsUpdate=true;});
  RAVENS.forEach(r=>{r.ph+=dt*r.sp;const x=r.cx+Math.cos(r.ph)*r.r,z=r.cz+Math.sin(r.ph)*r.r;r.g.position.set(x,r.h+Math.sin(r.ph*3)*.5,z);r.g.rotation.y=-(r.ph+Math.PI/2*Math.sign(r.sp));const f=Math.sin(G.time*9+r.ph*5)*.6;r.wl.rotation.x=-Math.PI/2+f;r.wr.rotation.x=-Math.PI/2-f;});
  // mist follows the camera region
  const c=G.camLook;MIST.forEach(m=>{m.ox+=dt*(wind*.2+m.sp*.4);if(m.ox>34)m.ox-=68;if(m.ox<-34)m.ox+=68;const x=c.x+m.ox,z=c.z+m.oz;m.m.position.set(x,(P?groundY(x/S,z/S):hgt(x/S,z/S))+m.h,z);m.m.rotation.z+=m.rot*dt;});
  // hide the gate lintel when the player stands north of it so it never blocks the view
  {const north=P&&P.y<WALL_Y+10&&G.state!=='title';gateTop.forEach(m=>m.visible=!north);}
  // gate opening
  if(G.gateAnim!=null&&G.gateAnim<1){G.gateAnim=Math.min(1,G.gateAnim+dt*.35);gateDoors.forEach(d=>d.hinge.rotation.y=d.s*1.6*easeInOut(G.gateAnim));}
}
function updFX(dt){
  for(let i=G.fx.length-1;i>=0;i--){const f=G.fx[i];f.t+=dt;const k=f.t/f.life;
    if(f.spike){const up=Math.min(1,f.t*9);f.mesh.position.y=f.gy-1+up*1.5-(k>.7?(k-.7)*6:0);}
    else{f.mesh.material.opacity=.38*(1-k);f.mesh.scale.setScalar(1+k*.15);}
    if(k>=1){scene.remove(f.mesh);if(!f.spike){f.mesh.geometry.dispose();f.mesh.material.dispose();}G.fx.splice(i,1);}}
  for(let i=NUMS.length-1;i>=0;i--){const n=NUMS[i];n.t+=dt;const s=toScreen(n.x+n.dx*n.t,n.y+n.t*1.1,n.z);n.el.style.left=s.x+'px';n.el.style.top=s.y+'px';n.el.style.opacity=String(1-Math.max(0,n.t-.5)/.5);n.el.style.display=s.vis?'block':'none';if(n.t>1){n.el.remove();NUMS.splice(i,1);}}
}

/* =========================================================
   HUD
   ========================================================= */
const miniCv=$('mini'), mctx=miniCv.getContext('2d');
const miniBg=document.createElement('canvas');miniBg.width=miniBg.height=900;
{const g=miniBg.getContext('2d'),k=900/WORLD.w;g.fillStyle='#1d2631';g.fillRect(0,0,900,900);
  g.fillStyle='#2a3542';g.fillRect(PAD*k,PAD*k,(WORLD.w-2*PAD)*k,(WORLD.h-2*PAD)*k);
  g.fillStyle='rgba(20,40,30,.85)';for(const t of TREES){if(!t.col)continue;g.beginPath();g.arc(t.x*k,t.y*k,2.2,0,TAU);g.fill();}
  g.strokeStyle='rgba(190,180,160,.55)';g.lineWidth=4;g.lineCap='round';for(const p of PATHS){g.beginPath();p.forEach(([x,y],i)=>i?g.lineTo(x*k,y*k):g.moveTo(x*k,y*k));g.stroke();}
  g.fillStyle='rgba(150,200,225,.55)';g.beginPath();g.ellipse(LAKE.x*k,LAKE.y*k,LAKE.rx*k,LAKE.ry*k,0,0,TAU);g.fill();
  g.fillStyle='#5a6068';g.fillRect(0,WALL_Y*k,WORLD.w*k,WALL_H*k);
  g.fillStyle='rgba(150,220,255,.25)';g.beginPath();g.arc(1800*k,500*k,330*k,0,TAU);g.fill();
  g.strokeStyle='rgba(200,200,200,.5)';g.lineWidth=2;g.beginPath();g.arc(560*k,1200*k,265*k,0,TAU);g.stroke();
  g.fillStyle='#6a4a30';for(const h of HOUSES)g.fillRect(h.x*k,h.y*k,h.w*k,h.h*k);}
function drawMini(){
  const W=340,k=900/WORLD.w,zoomMap=1.25;mctx.clearRect(0,0,W,W);mctx.save();mctx.beginPath();mctx.arc(W/2,W/2,W/2,0,TAU);mctx.clip();
  const view=W/zoomMap; const cx=P.x*k, cy=P.y*k;
  mctx.drawImage(miniBg,cx-view/2,cy-view/2,view,view,0,0,W,W);
  const tp=(x,y)=>[(x*k-cx)*zoomMap+W/2,(y*k-cy)*zoomMap+W/2];
  if(!GATE.gone){const [x,y]=tp(1800,WALL_Y+20);mctx.fillStyle='#9bd3ea';mctx.fillRect(x-10,y-4,20,8);}
  RUNESTONES.forEach(r=>{const [x,y]=tp(r.x,r.y);mctx.fillStyle=r.lit?'#f3d68a':'#5f646a';mctx.beginPath();mctx.moveTo(x,y-9);mctx.lineTo(x+6,y);mctx.lineTo(x,y+9);mctx.lineTo(x-6,y);mctx.closePath();mctx.fill();if(r.lit){mctx.shadowColor='#f3d68a';}});
  NPCS.forEach(n=>{if(n.id==='astrid'&&C)return;const [x,y]=tp(n.x,n.y);mctx.fillStyle='#e7e0cf';mctx.beginPath();mctx.arc(x,y,4.5,0,TAU);mctx.fill();});
  for(const e of G.enemies){if(e.dead||e.dormant)continue;const [x,y]=tp(e.x,e.y);if(x<0||x>W||y<0||y>W)continue;mctx.fillStyle=e.boss?'#ff6a4a':'rgba(220,80,60,.85)';mctx.beginPath();mctx.arc(x,y,e.boss?7:3,0,TAU);mctx.fill();}
  if(G.stain){const [x,y]=tp(G.stain.x,G.stain.y);mctx.fillStyle='#f3d68a';mctx.font='18px "Noto Sans Runic"';mctx.textAlign='center';mctx.fillText('ᚱ',x,y+6);}
  if(C){const [x,y]=tp(C.x,C.y);mctx.fillStyle='#a9e08a';mctx.beginPath();mctx.arc(x,y,4.5,0,TAU);mctx.fill();}
  mctx.save();mctx.translate(W/2,W/2);mctx.rotate(P.face+Math.PI/2);mctx.fillStyle='#f3d68a';mctx.beginPath();mctx.moveTo(0,-11);mctx.lineTo(7,8);mctx.lineTo(0,4);mctx.lineTo(-7,8);mctx.closePath();mctx.fill();mctx.restore();
  mctx.restore();
  mctx.fillStyle='#d4ae55';mctx.font='22px "IM Fell English SC", Georgia';mctx.textAlign='center';mctx.fillText('N',W/2,24);
}
function objective(){const f=G.flags;
  if(!f.metUlfr) return ['Tal med Gamle Ulfr ved runestenen i Ravnsholm',''];
  if(!f.horn&&!f.gateOpen) return ['Find Draugr-jarlen i gravhøjen mod vest','Valgfrit: Astrid ved lejren · Mimirs Hoved på den frosne sø mod øst'];
  if(!f.gateOpen) return ['Blæs i Jarlens Horn ved Jötunporten mod nord',!f.vogterDead?'Valgfrit: Gravkrypten under højen er åben nu':'Valgfrit: Mimirs Hoved kender Rimtursens hemmelighed'];
  return ['Konfrontér Rimtursen bag Jötunporten',G.flags.lindormQuest&&!G.flags.lindormDead?'Valgfrit: Dræb Lindormen på den frosne sø':G.flags.jarlDead&&!G.flags.vogterDead?'Valgfrit: Gravkrypten under højen er åben':''];}
let lastRunes=-1, shownRunes=0;
function updHUD(dt){
  if(!P) return;
  const mh=maxHp(), ms=maxSt();
  const hpW=Math.min(440,mh*1.55), stW=Math.min(360,ms*1.45);
  $('hpBar').style.width=hpW+'px';$('stBar').style.width=stW+'px';
  $('hpFill').style.width=(P.hp/mh*100)+'%';$('hpLag').style.width=(P.hpLag/mh*100)+'%';$('stFill').style.width=(P.st/ms*100)+'%';
  $('hLvl').textContent='· niveau '+P.level;$('hFlask').textContent=P.flasks;
  const cd=specialCd(), pr=P.specialT/cd;$('specCd').style.setProperty('--p',(pr*100)+'%');$('slSpec').classList.toggle('ready',P.specialT<=0);
  shownRunes+= (P.runes-shownRunes)*Math.min(1,dt*8); if(Math.abs(P.runes-shownRunes)<1)shownRunes=P.runes;
  const rr=Math.round(shownRunes); if(rr!==lastRunes){$('hRunes').textContent=rr.toLocaleString('da-DK');lastRunes=rr;}
  const [o1,o2]=objective();$('hObj').textContent=o1;$('hOpt').textContent=o2;
  $('hComp').hidden=!C; if(C)$('cFill').style.width=(C.hp/C.maxHp*100)+'%';
  const b=G.boss; $('hBoss').hidden=!b||b.dead;
  if(b&&!b.dead){$('bossName').textContent=b.def.name;b.lag=b.lag==null?b.hp:b.lag+(b.hp-b.lag)*Math.min(1,dt*(b.lag>b.hp?1.2:10));$('bossFill').style.width=(b.hp/b.maxHp*100)+'%';$('bossLag').style.width=(b.lag/b.maxHp*100)+'%';}
  const it=G.state==='play'?interactTarget():null; const pe=$('prompt');
  if(it){pe.hidden=false;pe.innerHTML='<kbd>E</kbd>'+escapeHtml(it.label);}else pe.hidden=true;
  drawMini();
}

/* --- Music follows the place and the fight */
let musicT=0;
function updMusic(dt){
  musicT-=dt; if(musicT>0) return; musicT=.5;
  if(!P||P.dead) return;
  const b=G.boss&&!G.boss.dead?G.boss:null;
  if(b) return music(b.t==='jotun'?'jotun':'jarl');
  const home=Math.hypot(P.x-1800,P.y-2380)<620||Math.hypot(P.x-1450,P.y-1850)<260;
  music(home?'village':'wild');
}

/* =========================================================
   MAIN LOOP
   ========================================================= */
let last=performance.now();
function frame(now){
  requestAnimationFrame(frame);
  let rdt=Math.min(.05,(now-last)/1000); last=now;
  let dt=rdt;
  if(G.slowmo>0){G.slowmo-=rdt;dt*=.3;}
  if(G.hitStop>0){G.hitStop-=rdt;dt*=.05;}
  G.time+=rdt; skyUniforms.uTime.value=G.time; WIND.uTime.value=G.time; WIND.uWind.value=1+Math.max(0,wind)*.25;
  if(G.state==='play'&&P){
    G.play+=rdt;
    updPlayer(dt); updComp(dt);
    for(const e of [...G.enemies]) updEnemy(e,dt);
    updHazards(dt); updProjs(dt);
    if(P.dead){G.deadT+=rdt;if(G.deadT>4.2)respawn();}
    // boss triggers
    if(!P.dead&&G.flags.gateOpen&&!G.flags.jotunTalked&&Math.hypot(P.x-1800,P.y-500)<210&&jotunEnt()) talk('jotun');
    if(G.endT>0){G.endT-=rdt;if(G.endT<=0)showEnd();}
    updMusic(rdt);
  } else if(G.state==='dialog'){ for(const e of G.enemies) if(e.leaving) {} }
  if(G.state==='dialog'||G.state==='end'){ if(G.endT>0&&G.state!=='end'){G.endT-=rdt;} }
  if(P&&G.state!=='title') syncPlayer(rdt);
  syncEnemies(rdt); syncNPCs(rdt); if(CRITTERS.length) updCritters(G.state==='play'||G.state==='title'?rdt:0);
  ambientFX(rdt); updDecals(rdt); updTrail(rdt); FXA.update(rdt); FXN.update(rdt); updFX(rdt);
  updateCamera(rdt);
  updateSnow(rdt,G.camLook,G.time);
  if(G.state!=='title'&&G.state!=='loading'&&P) updHUD(rdt);
  updDice(rdt);
  composer.render();
}

/* =========================================================
   BOOT
   ========================================================= */
function start(data){
  window.__gameReady=true;
  $('loading').hidden=true;
  G.state='title';music('title');$('title').hidden=false;$('bCont').hidden=!loadSave();
  if(matchMedia('(pointer:coarse)').matches&&!matchMedia('(pointer:fine)').matches) $('touchNote').hidden=false;
  if(data&&data.save){beginGame(data.save);if(data.pos&&P){P.x=data.pos.x;P.y=data.pos.y;snapCam();}}
}
// Developer handle, only with ?dev in the address.
if(new URLSearchParams(location.search).has('dev')) window.__rv={G,quick:c=>{newPlayer(c,CLASSES[c].base,'Test');beginGame(null);},get P(){return P},get C(){return C},talk,openRest,killEnemy,makeCompanion,mouse,giveItem,travel,AU,CHESTS,openChest};
G.camPos.set(1800*S+30,10,2300*S);G.camLook.set(1800*S,5,2300*S-8);
requestAnimationFrame(frame);
Promise.all([
  document.fonts?document.fonts.ready:Promise.resolve(),
  loadAll(f=>{$('loadTxt').textContent=`Ravnene samles … ${Math.round(f*100)} %`;}),
]).then(()=>{
  // redraw rune textures once the runic font is ready
  RS_MESH.forEach(m=>{m.mat.emissiveMap=runeTex('ᚱᚨᚢᚾ','#ffcf6a');m.mat.needsUpdate=true;});
  initNPCs(); buildWorldProps(); initCritters();
  start({});
}).catch(err=>{$('loadTxt').textContent='Spillets figurer kunne ikke indlæses ('+(err&&err.message||err)+'). Genindlæs siden.';});
