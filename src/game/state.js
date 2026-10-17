'use strict';
/* =========================================================
   GAME STATE
   ========================================================= */
const CLASSES={
  berserker:{name:'Berserker',rune:'ᚢ',base:{sty:16,smi:12,vil:8,kar:10},desc:'Økse og raseri. Brede hug, et snurrende tungt angreb og Berserkergang, der gør dig stærkere og heler dig, når du rammer.',special:'Berserkergang',scd:22,ico:'<svg viewBox="0 0 40 40" width="36" height="36"><path d="M12 34L28 8" stroke="#8a6a44" stroke-width="3"/><path d="M24 6c6 0 10 5 10 11-4-1-8-3-10-6z" fill="#c8d0d8" stroke="#222" /></svg>'},
  skjoldmo:{name:'Skjoldmø',rune:'ᛉ',base:{sty:14,smi:13,vil:10,kar:12},desc:'Sværd og skjold. Hurtige stød, blokering med højre museknap og et skjoldstød, der lammer fjender. Blokér lige før et slag for at parere og give et kritisk modstød.',special:'Skjoldstød',scd:7,ico:'<svg viewBox="0 0 40 40" width="36" height="36"><circle cx="20" cy="20" r="14" fill="#e6dcc4" stroke="#2a1d12" stroke-width="2"/><path d="M20 20L20 6A14 14 0 0 1 34 20zM20 20L20 34A14 14 0 0 1 6 20z" fill="#8c2a22"/><circle cx="20" cy="20" r="3.5" fill="#aab3bd"/></svg>'},
  volve:{name:'Völve',rune:'ᛟ',base:{sty:8,smi:12,vil:16,kar:13},desc:'Seiðr og runer. Runebolte på afstand, en frostnova tæt på og en flok ravne, der jager dine fjender.',special:'Ravneflok',scd:12,ico:'<svg viewBox="0 0 40 40" width="36" height="36"><path d="M6 22c6-6 12-8 18-6l10-4-6 8c-2 8-10 12-20 10l6-4z" fill="#14161c" stroke="#7fb8ff" stroke-width="1.2"/><circle cx="27" cy="16" r="1.3" fill="#9fe6ff"/></svg>'},
};
const STATN={sty:['STY','Styrke','Liv og skade med økse'],smi:['SMI','Smidighed','Udholdenhed og fart'],vil:['VIL','Vilje','Seiðr-skade og indsigt'],kar:['KAR','Karisma','Overtalelse og handel']};
const ED={
  draugr:{name:'Draugr',hp:172,r:15,spd:78,dmg:23,reach:46,runes:60},
  archer:{name:'Draugr-skytte',hp:110,r:14,spd:66,dmg:19,reach:420,runes:70},
  wolf:{name:'Gråulv',hp:120,r:15,spd:150,dmg:20,reach:160,runes:50},
  jarl:{name:'Hrafnkel, Draugr-jarlen',hp:1230,r:26,spd:92,dmg:38,reach:100,runes:1600},
  minion:{name:'Gravtræl',hp:103,r:13,spd:96,dmg:17,reach:42,runes:45},
  seidr:{name:'Seiðr-draugr',hp:133,r:14,spd:58,dmg:22,reach:400,runes:95},
  trold:{name:'Skovtrold',hp:126,r:13,spd:92,dmg:17,reach:42,runes:45},
  bjergtrold:{name:'Bjergtrold',hp:288,r:19,spd:72,dmg:31,reach:58,runes:150},
  rimtrold:{name:'Rimtrold',hp:648,r:26,spd:80,dmg:36,reach:86,runes:450},
  ildvaette:{name:'Ildvætte',hp:218,r:16,spd:112,dmg:26,reach:50,runes:120},
  frostvaette:{name:'Frostvætte',hp:218,r:16,spd:106,dmg:23,reach:50,runes:120},
  gjenganger:{name:'Gjenganger',hp:138,r:14,spd:125,dmg:20,reach:170,runes:75},
  gjenganger2:{name:'Dødningehoved',hp:172,r:14,spd:130,dmg:23,reach:170,runes:90},
  stenvaette:{name:'Stenvætte',hp:391,r:18,spd:56,dmg:29,reach:54,runes:150},
  stenvaette2:{name:'Klippevætte',hp:504,r:23,spd:50,dmg:39,reach:62,runes:260},
  lindyngel:{name:'Lindyngel',hp:110,r:13,spd:140,dmg:16,reach:160,runes:60},
  vaette:{name:'Lysvætte',hp:126,r:13,spd:70,dmg:19,reach:380,runes:90},
  lindorm:{name:'Lindormen fra Isfjorden',hp:1725,r:32,spd:96,dmg:40,reach:120,runes:2600,aggro:220},
  vogter:{name:'Gravvogteren',hp:840,r:22,spd:86,dmg:32,reach:92,runes:1300,aggro:190},
  jotun:{name:'Hrimgrimr, Rimtursen',hp:3600,r:46,spd:64,dmg:54,reach:170,runes:6000},
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
function atkMult(){const s=P.stats;const base=P.cls==='berserker'?s.sty:P.cls==='skjoldmo'?(s.sty+s.smi)/2:s.vil;return(1+(base-10)*.065)*(1+.15*G.weaponLvl)*(P.rage>0?1.35:1)*(eqHas('fenrir')?1.15:1)*(eqHas('ulfberht')?1.2:1);}
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
function toast(t){if(G.sim)return;const d=document.createElement('div');d.className='toast';d.textContent=t;$('toasts').appendChild(d);setTimeout(()=>d.remove(),3800);while($('toasts').children.length>5)$('toasts').firstChild.remove();}
let bannerTO;
function banner(t,s='',cls=''){if(G.sim)return;const b=$('banner');b.hidden=true;void b.offsetWidth;b.className=cls;$('bannerT').textContent=t;$('bannerS').textContent=s;b.hidden=false;clearTimeout(bannerTO);bannerTO=setTimeout(()=>b.hidden=true,3500);}
const labels=$('labels');
const NUMS=[];
const _v=new THREE.Vector3();
function toScreen(x,y,z){_v.set(x,y,z).project(camera);return{x:(_v.x*.5+.5)*innerWidth,y:(-_v.y*.5+.5)*innerHeight,vis:_v.z<1&&_v.z>-1};}
function num(x,y,val,cls=''){if(G.sim)return;const d=document.createElement('div');d.className='dmg '+cls;d.textContent=val;labels.appendChild(d);NUMS.push({el:d,x:x*S,y:groundY(x,y)+2.2,z:y*S,t:0,dx:rand(-.4,.4)});}
const npcLbl={};NPCS.forEach(n=>{const d=document.createElement('div');d.className='lbl';d.textContent=n.name;d.hidden=true;labels.appendChild(d);npcLbl[n.id]=d;});
