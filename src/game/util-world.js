'use strict';
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
const WORLD={w:6000,h:3000}, PAD=270;
// Act two lies east of a mountain ridge: Askefjorden, where Surt's fire has burnt through the ice.
const ACT1_W=3600, RIDGE={x:3515,w:200,passY:2050,passW:95};
const ashK=x=>sstep(3420,3720,x), inAsh=x=>x>3500;
const LAVA=[{x:3990,y:1620,rx:150,ry:95},{x:5060,y:1930,rx:210,ry:120},{x:5420,y:1180,rx:150,ry:230},{x:5000,y:300,rx:330,ry:60},{x:3800,y:2520,rx:140,ry:90},{x:4700,y:640,rx:90,ry:60},{x:5300,y:640,rx:90,ry:60}];
const lavaE=(p,x,y)=>((x-p.x)/p.rx)**2+((y-p.y)/p.ry)**2;
function nearLava(x,y,k=1.25){for(const p of LAVA)if(lavaE(p,x,y)<k)return true;return false;}
const LAKE={x:2850,y:1400,rx:380,ry:260}, ICE_Y=-0.32;
const lakeE=(x,y)=>((x-LAKE.x)/LAKE.rx)**2+((y-LAKE.y)/LAKE.ry)**2;
const LM={village:{x:1800,y:2380},camp:{x:1450,y:1850},barrow:{x:560,y:1200},jotun:{x:1800,y:500},gate:{x:1800,y:840},
  skjoldvik:{x:4350,y:2380},garm:{x:4300,y:1260},surt:{x:5000,y:560},fgate:{x:5000,y:880}};
const PATHS=[
  [[1800,2250],[1700,2050],[1450,1850],[1150,1600],[900,1420],[720,1250]],
  [[1450,1850],[1700,1400],[1800,1150],[1800,1020],[1800,840],[1800,560]],
  [[1800,2250],[2150,2050],[2450,1700],[2650,1500]],
  [[2450,1700],[2800,1950],[3250,2050],[3700,2050],[3900,2090],[4150,2250],[4350,2330]],
  [[4350,2330],[4450,1900],[4350,1550],[4300,1400]],
  [[4350,1550],[4800,1400],[5000,1150],[5000,900],[5000,700]],
  [[4350,2330],[4800,2250],[5400,2350]],
  [[4450,1900],[4900,1700]],
];
function segDist(px,py,ax,ay,bx,by){const vx=bx-ax,vy=by-ay;const t=clamp(((px-ax)*vx+(py-ay)*vy)/(vx*vx+vy*vy),0,1);return Math.hypot(px-(ax+vx*t),py-(ay+vy*t));}
function pathDist(x,y){let m=1e9;for(const p of PATHS)for(let i=0;i<p.length-1;i++)m=Math.min(m,segDist(x,y,p[i][0],p[i][1],p[i+1][0],p[i+1][1]));return m;}
function flatK(x,y,cx,cy,r){const d=Math.hypot(x-cx,y-cy);return d<r?1:d<r*1.7?1-(d-r)/(r*.7):0;}
const FLATS=[[1800,2380,320],[560,1200,300],[1800,500,380],[1450,1850,150],[1800,840,200],[2900,520,380],[1180,1380,90],
  [4350,2380,270],[3850,2100,120],[4300,1260,240],[5000,1020,170],[5000,560,300],[3850,1350,90],[4900,1650,90],[5450,2350,90],[5060,2090,150]];
function hgtBase(x,y){
  let h=Math.sin(x*.004)*.9+Math.cos(y*.0035)*.8+Math.sin((x+y)*.0021)*1.2+Math.sin(x*.011+y*.007)*.3+Math.cos(x*.017-y*.013)*.15;
  if(x>3600) h+=Math.abs(Math.sin(x*.006+y*.004))*1.1-.4; // broken lava rock
  let f=0; for(const [cx,cy,r] of FLATS){if(Math.abs(x-cx)<r*1.7&&Math.abs(y-cy)<r*1.7)f=Math.max(f,flatK(x,y,cx,cy,r));}
  h*=1-f*.85;
  const le=lakeE(x,y); if(le<1.7) h=lerp(h,-0.95,sstep(1.7,1.0,le));
  const e=Math.min(x,y,WORLD.w-x,WORLD.h-y);
  if(e<PAD){const k=(PAD-e)/PAD;h+=k*k*20+Math.max(0,k)**3*Math.abs(Math.sin(x*.013)*Math.cos(y*.011))*26;}
  // the ridge between Midgard and Askefjorden, with one pass
  const rd=Math.abs(x-RIDGE.x);
  if(rd<RIDGE.w){let k=(RIDGE.w-rd)/RIDGE.w;k*=1-sstep(RIDGE.passW+70,RIDGE.passW-5,Math.abs(y-RIDGE.passY));h+=k*k*17+k**3*Math.abs(Math.sin(x*.013+1)*Math.cos(y*.011))*22;}
  return h;
}
LAVA.forEach(p=>p.lv=hgtBase(p.x,p.y)-.9);
function hgt(x,y){
  let h=hgtBase(x,y);
  if(x>3600) for(const p of LAVA){const le=lavaE(p,x,y);if(le<1.7)h=lerp(h,p.lv,sstep(1.7,1.0,le));}
  return h;
}
function groundY(x,y){if(CRYPT_FLOOR&&inCrypt(x,y))return CRYPT_FLOOR;const h=hgt(x,y);return lakeE(x,y)<1.25?Math.max(h,ICE_Y):h;}

const OBS=[]; // collision: {x,y,r} circles or {x,y,w,h} rects
const TREES=[],ROCKS=[],STONES=[],RINGROCKS=[];
const HOUSES=[{x:1600,y:2390,w:110,h:80},{x:1890,y:2420,w:120,h:80},{x:1720,y:2540,w:110,h:70},{x:1930,y:2270,w:90,h:70}];
HOUSES.forEach(h=>OBS.push(h));
const FIRES=[{x:1800,y:2410,big:1},{x:1478,y:1872,big:0}];
FIRES.forEach(f=>OBS.push({x:f.x,y:f.y,r:12}));
const RUNESTONES=[{id:0,name:'Ravnsholm',x:1800,y:2250,lit:true},{id:1,name:'Gravhøjens Vej',x:900,y:1420,lit:false},{id:2,name:'Jötunportens Skygge',x:1800,y:1020,lit:false},
  {id:3,name:'Askepasset',x:3790,y:2180,lit:false,act:2},{id:4,name:'Skjoldvik',x:4300,y:2260,lit:false,act:2},{id:5,name:'Flammeporten',x:5120,y:1070,lit:false,act:2}];
RUNESTONES.forEach(r=>OBS.push({x:r.x,y:r.y,r:14}));
const WALL_Y=820, WALL_H=40;
OBS.push({x:0,y:WALL_Y,w:1720,h:WALL_H},{x:1880,y:WALL_Y,w:1720,h:WALL_H});
const GATE={x:1720,y:WALL_Y,w:160,h:WALL_H,gate:true,gone:false}; OBS.push(GATE);
OBS.push({x:380,y:1200,r:110}); // burial mound
// the ridge east of Midgard; its pass is closed by ice until the Fimbulwinter breaks
OBS.push({x:RIDGE.x-130,y:0,w:260,h:RIDGE.passY-RIDGE.passW},{x:RIDGE.x-130,y:RIDGE.passY+RIDGE.passW,w:260,h:WORLD.h});
const ICEWALL={x:RIDGE.x-35,y:RIDGE.passY-RIDGE.passW-10,w:70,h:RIDGE.passW*2+20,gone:false}; OBS.push(ICEWALL);
// the wall of Muspel fire in the north of Askefjorden, and its gate
const FWALL_Y=860;
OBS.push({x:3640,y:FWALL_Y,w:1280,h:40},{x:5080,y:FWALL_Y,w:1000,h:40});
const FIREGATE={x:4920,y:FWALL_Y,w:160,h:40,gone:false}; OBS.push(FIREGATE);
// lava cannot be walked on: each pool is covered by a row of circles
for(const p of LAVA){const along=p.rx>=p.ry, R=Math.min(p.rx,p.ry), L=Math.max(p.rx,p.ry)-R;
  for(let t=-L;t<=L+.1;t+=Math.max(R*.8,1)) OBS.push({x:p.x+(along?t:0),y:p.y+(along?0:t),r:R*.95*Math.sqrt(Math.max(.25,1-(t/(L+R))**2)),lava:true});}
// Gnipahellir: a cliff of black rock with the hound's cave in the middle
const GNIPA={x:4300,y:1000};
for(let x=4020;x<=4580;x+=40){if(Math.abs(x-4300)<70)continue;OBS.push({x,y:1010-Math.abs(x-4300)*.18,r:30,cliff:true});}
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
  {id:'ash1',x:4120,y:2470,item:'tyrsrune',runes:500,act:2},
  {id:'ash2',x:5580,y:2440,item:'logisglod',runes:600,act:2},
];
CHESTS.forEach(c=>OBS.push({x:c.x,y:c.y,r:16}));
const WELL={x:1630,y:2235}; OBS.push({x:WELL.x,y:WELL.y,r:24});
OBS.push({x:2850,y:1400,r:20}); // Mimir altar
for(let i=0;i<14;i++){const a=i/14*TAU;if(Math.abs(angDiff(a,0))<.5)continue;const s={x:560+Math.cos(a)*265,y:1200+Math.sin(a)*265,r:15,h:rand(2.2,3.4),rot:a};STONES.push(s);OBS.push(s);}
for(let i=0;i<24;i++){const a=i/24*TAU;if(Math.abs(angDiff(a,Math.PI/2))<.33)continue;const s={x:1800+Math.cos(a)*350,y:500+Math.sin(a)*330,r:rand(24,34)};RINGROCKS.push(s);OBS.push(s);}

function clearZone(x,y,pad){
  if(x>3380){ // Askefjorden keeps its own rules
    if(nearLava(x,y,2.2)) return false;
    for(const [cx,cy,r] of FLATS) if(cx>3600&&Math.hypot(x-cx,y-cy)<r+40+pad) return false;
    if(y>FWALL_Y-60&&y<FWALL_Y+100) return false;
    if(Math.abs(x-RIDGE.x)<RIDGE.w+20) return false;
    if(Math.hypot(x-GNIPA.x,y-GNIPA.y)<320) return false;
    for(const r of RUNESTONES) if(Math.hypot(x-r.x,y-r.y)<110) return false;
    if(pathDist(x,y)<80+pad*.3) return false;
    return true;
  }
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
    const x=PAD-40+R()*(RIDGE.x-160-PAD+40), y=PAD-40+R()*(WORLD.h-2*PAD+80);
    if(!clearZone(x,y,0)) continue;
    let ok=true; for(const t of TREES){if(Math.abs(t.x-x)<46&&Math.abs(t.y-y)<46){ok=false;break;}} if(!ok) continue;
    const s=.8+R()*.7; const t={x,y,r:12*s,s,rot:R()*TAU,col:true}; TREES.push(t); OBS.push(t);
  }
  // decorative forest on the mountain slopes
  for(let i=0;i<900;i++){
    const x=-500+R()*(WORLD.w+1000), y=-500+R()*(WORLD.h+1000);
    const e=Math.min(x,y,WORLD.w-x,WORLD.h-y); if(e>PAD-30||e<-450||x>RIDGE.x-100) continue;
    TREES.push({x,y,r:0,s:.9+R()*.9,rot:R()*TAU,col:false});
  }
  tries=0;
  while(ROCKS.length<110&&tries++<4000){
    const x=PAD+R()*(RIDGE.x-200-PAD), y=PAD+R()*(WORLD.h-2*PAD);
    if(!clearZone(x,y,-20)) continue;
    const r=10+R()*18; let ok=true; for(const t of OBS){if(t.r&&Math.hypot(t.x-x,t.y-y)<t.r+r+8){ok=false;break;}} if(!ok) continue;
    const o={x,y,r}; ROCKS.push(o); OBS.push(o);
  }
}
