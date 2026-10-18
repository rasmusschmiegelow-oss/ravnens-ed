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
  jarl:{name:'Hrafnkel, Draugr-jarlen',hp:1080,r:26,spd:92,dmg:28,reach:100,runes:1600},
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
  vogter:{name:'Gravvogteren',hp:1000,r:22,spd:86,dmg:36,reach:92,runes:1300,aggro:140},
  jotun:{name:'Hrimgrimr, Rimtursen',hp:3600,r:46,spd:64,dmg:54,reach:170,runes:6000},
  // field bosses that roam the world
  ulvekonge:{name:'Fenrisætlingen',hp:1500,r:24,spd:150,dmg:30,reach:120,runes:2200,aggro:300},
  ketil:{name:'Hærfører Ketil',hp:1300,r:20,spd:88,dmg:30,reach:96,runes:1800,aggro:280},
  troldmor:{name:'Troldemoderen',hp:1700,r:26,spd:70,dmg:34,reach:80,runes:2400,aggro:280},
  askebrud:{name:'Askebruden',hp:3600,r:18,spd:62,dmg:56,reach:460,runes:5000,aggro:320,poise:4200},
  // Askefjorden
  askedraugr:{name:'Askedraugr',hp:620,r:15,spd:84,dmg:50,reach:48,runes:300},
  askeskytte:{name:'Askeskytte',hp:400,r:14,spd:66,dmg:42,reach:420,runes:320},
  glodulv:{name:'Glødulv',hp:440,r:15,spd:160,dmg:42,reach:160,runes:260},
  eldseidr:{name:'Ildseiðr',hp:460,r:14,spd:56,dmg:40,reach:460,runes:360},
  lavavaette:{name:'Lavavætte',hp:1150,r:22,spd:52,dmg:50,reach:64,runes:700},
  glodkaempe:{name:'Glødkæmpen',hp:4200,r:30,spd:58,dmg:70,reach:96,runes:4000,aggro:260},
  garm:{name:'Garm, Helhunden',hp:3800,r:30,spd:150,dmg:44,reach:140,runes:9000,aggro:320},
  surt:{name:'Surt, Herre over Muspelheim',hp:8000,r:44,spd:72,dmg:76,reach:210,runes:0,aggro:420},
};
// How each enemy fights: melee swings, ranged casters, lunging beasts, brutes with leaps, or a boss of its own.
const KIND={draugr:'melee',minion:'melee',trold:'melee',bjergtrold:'melee',ildvaette:'melee',frostvaette:'melee',stenvaette:'melee',stenvaette2:'melee',
  archer:'ranged',seidr:'ranged',vaette:'ranged',wolf:'lunge',gjenganger:'lunge',gjenganger2:'lunge',lindyngel:'lunge',
  jarl:'brute',vogter:'brute',rimtrold:'brute',jotun:'jotun',lindorm:'lindorm',
  askedraugr:'melee',lavavaette:'melee',askeskytte:'ranged',glodulv:'lunge',eldseidr:'mortar',glodkaempe:'brute',garm:'garm',surt:'surt',ulvekonge:'garm',ketil:'brute',troldmor:'brute',askebrud:'mortar'};
const FLOAT={gjenganger:.9,gjenganger2:.9,lindyngel:1.6,vaette:.8,stenvaette:.25,stenvaette2:.25,lindorm:2.2,lavavaette:.25,glodkaempe:.3};
const SPAWNS=[
  {t:'draugr',x:1640,y:1930},{t:'draugr',x:1960,y:1940},{t:'wolf',x:2150,y:1800},{t:'wolf',x:2200,y:1850},
  {t:'archer',x:1300,y:1600},{t:'draugr',x:1200,y:1560},
  {t:'draugr',x:1085,y:1330},{t:'archer',x:1010,y:960},{t:'draugr',x:1140,y:1060},{t:'archer',x:760,y:1540},
  {t:'wolf',x:2500,y:1220},{t:'wolf',x:2560,y:1270},{t:'wolf',x:2620,y:1580},{t:'draugr',x:2400,y:1650},
  {t:'draugr',x:1600,y:1100},{t:'draugr',x:2000,y:1100},{t:'archer',x:1800,y:1220},{t:'wolf',x:1500,y:1300},{t:'wolf',x:2100,y:1300},
  {t:'archer',x:1450,y:700},{t:'archer',x:2150,y:700},
  {t:'jarl',x:600,y:1200,boss:'jarl'},
  {t:'seidr',x:2640,y:400},{t:'seidr',x:3160,y:400},{t:'minion',x:2700,y:560},{t:'minion',x:3100,y:560},{t:'minion',x:2900,y:590},
  {t:'vogter',x:2900,y:425,boss:'vogter'},
  {t:'ildvaette',x:2610,y:520},{t:'ildvaette',x:3190,y:520},{t:'vaette',x:2900,y:375},
  {t:'trold',x:1350,y:2150},{t:'trold',x:1385,y:2195},{t:'trold',x:1320,y:2205},{t:'trold',x:2300,y:2300},{t:'trold',x:2345,y:2262},
  {t:'bjergtrold',x:1255,y:1455},{t:'stenvaette',x:1100,y:1480},{t:'stenvaette2',x:2660,y:1880},{t:'stenvaette',x:2480,y:1900},
  {t:'gjenganger',x:2750,y:1220},{t:'gjenganger2',x:2960,y:1190},{t:'gjenganger',x:2700,y:1560},
  {t:'lindyngel',x:3010,y:1150},{t:'lindyngel',x:3160,y:1300},{t:'lindorm',x:3120,y:1180,boss:'lindorm'},
  {t:'frostvaette',x:2220,y:960},{t:'frostvaette',x:2360,y:1050},{t:'rimtrold',x:2500,y:1000},{t:'rimtrold',x:2320,y:560},
  {t:'bjergtrold',x:1150,y:950},{t:'jotun',x:1800,y:470,boss:'jotun'},
  {t:'ulvekonge',x:3050,y:1950,boss:'ulvekonge'},{t:'ketil',x:700,y:2300,boss:'ketil'},{t:'troldmor',x:2450,y:2520,boss:'troldmor'},{t:'askebrud',x:5640,y:1260,boss:'askebrud',act:2},
  // Askefjorden (act two)
  {t:'askedraugr',x:4120,y:1990,act:2},{t:'askedraugr',x:4170,y:2100,act:2},{t:'glodulv',x:3990,y:1890,act:2},{t:'glodulv',x:4030,y:1860,act:2},
  {t:'askeskytte',x:4620,y:2200,act:2},{t:'askedraugr',x:4680,y:2330,act:2},
  {t:'askedraugr',x:3820,y:1290,act:2},{t:'askedraugr',x:3900,y:1300,act:2},{t:'eldseidr',x:3860,y:1220,act:2},
  {t:'lavavaette',x:4240,y:1650,act:2},
  {t:'glodulv',x:4460,y:1660,act:2},{t:'glodulv',x:4520,y:1700,act:2},{t:'glodulv',x:4420,y:1740,act:2},{t:'askeskytte',x:4220,y:1560,act:2},
  {t:'garm',x:4300,y:1150,boss:'garm',act:2},
  {t:'lavavaette',x:4950,y:1590,act:2},{t:'eldseidr',x:4860,y:1570,act:2},
  {t:'askedraugr',x:5300,y:1500,act:2},{t:'askedraugr',x:5360,y:1560,act:2},{t:'askeskytte',x:5250,y:1620,act:2},{t:'eldseidr',x:5600,y:1700,act:2},
  {t:'glodulv',x:5400,y:2300,act:2},{t:'glodulv',x:5500,y:2280,act:2},{t:'lavavaette',x:5480,y:2420,act:2},
  {t:'glodkaempe',x:5060,y:2110,boss:'glodkaempe',act:2},
  {t:'eldseidr',x:4790,y:1310,act:2},{t:'askedraugr',x:4950,y:1250,act:2},{t:'askedraugr',x:5050,y:1290,act:2},{t:'askeskytte',x:5200,y:1180,act:2},
  {t:'surt',x:5000,y:520,boss:'surt',act:2},
];
// Equipment found in chests or bought from Dvalin. slot: weapon, armor or talisman (two talisman slots).
const ITEMS={
  ulfberht:{name:'Ulfberht-runen',slot:'weapon',desc:'+20 % skade med dit våben.'},
  brynje:{name:'Jarnhud-brynje',slot:'armor',desc:'Du tager 15 % mindre skade.'},
  lindskael:{name:'Lindormskæl',slot:'armor',desc:'Du tager 20 % mindre skade.'},
  tvilling:{name:'Tvillingøkser',slot:'arm',cls:'berserker',desc:'To økser: hurtige, kortere hug der koster mindre udholdenhed.'},
  langsvaerd:{name:'Langsværd',slot:'arm',cls:'skjoldmo',desc:'Tohåndssværd: brede, tunge hug. Højreklik er et knusende hug i stedet for blok, så du kan ikke parere.'},
  galdrestav:{name:'Galdrestav',slot:'arm',cls:'volve',desc:'Kort tryllestav: hurtige, svagere bolte der søger mod fjenden.'},
  hrafnring:{name:'Hrafnkels ring',slot:'talisman',desc:'+10 % skade og +10 udholdenhed. Den føles kold.'},
  ulvepels:{name:'Ulvepels',slot:'armor',desc:'Udholdenhed vender 30 % hurtigere tilbage.'},
  ravnefjer:{name:'Ravnefjer',slot:'talisman',desc:'Rul koster 40 % mindre udholdenhed.'},
  mjolnir:{name:'Mjølnirs ekko',slot:'talisman',desc:'Din klasse-evne lader 30 % hurtigere op.'},
  idunn:{name:'Idunns æble',slot:'talisman',desc:'+1 mjødhorn.'},
  fenrir:{name:'Fenrirs tand',slot:'talisman',desc:'+15 % skade, men 10 % mindre liv.'},
  tyrsrune:{name:'Tyrs rune',slot:'weapon',desc:'+30 % skade med dit våben.'},
  askebrynje:{name:'Askebrynje',slot:'armor',desc:'Smedet af Sindri af Muspelsten. Du tager 25 % mindre skade.'},
  vardeflamme:{name:'Vardeflammen',slot:'talisman',desc:'+15 % liv, og mjød heler mere.'},
  garmtand:{name:'Garms tand',slot:'talisman',desc:'Våbenkunsten lader 30 % hurtigere op, og du giver 10 % mere skade.'},
  ulvehjerte:{name:'Ulvehjertet',slot:'talisman',desc:'Fenrisætlingens hjerte. Du løber 10 % hurtigere, og rul koster 20 % mindre.'},
  jarnring:{name:'Ketils jernring',slot:'talisman',desc:'Hærførerens ring. Du tager 10 % mindre skade.'},
  troldblod:{name:'Troldblod',slot:'talisman',desc:'Uden for kamp heler du 1,5 % liv i sekundet.'},
  askekrone:{name:'Askekronen',slot:'talisman',desc:'Kritiske stød giver 25 % mere skade, og fjendens balance brydes 20 % hurtigere.'},
  logisglod:{name:'Logis glød',slot:'talisman',desc:'Dine slag bryder fjendens balance 40 % hurtigere.'},
};
const SLOTN={arm:'Våben',weapon:'Våbenrune',armor:'Rustning',t1:'Talisman I',t2:'Talisman II'};
const eqHas=id=>!!G.eq&&Object.values(G.eq).includes(id);
const NPCS=[
  {id:'ulfr',name:'Gamle Ulfr',x:1748,y:2272,face:Math.PI*.4},
  {id:'dvalin',name:'Dvalin',x:1650,y:2352,face:-Math.PI/2},
  {id:'astrid',name:'Astrid',x:1440,y:1838,face:Math.PI*.25},
  {id:'eir',name:'Eir, helbrederske',x:1585,y:2282,face:0},
  {id:'thorgrim',name:'Jarl Thorgrim',x:1880,y:2365,face:-Math.PI/2},
  {id:'bjorn',name:'Bjørn, såret jæger',x:2425,y:2125,face:Math.PI,showIf:()=>G.flags.q_bjorn&&!G.flags.bjornDone},
  {id:'mimir',name:'Mimirs Hoved',x:2850,y:1400,face:Math.PI/2,head:true},
  {id:'ragna',name:'Ragna, völve af Skjoldvik',x:4270,y:2430,face:-Math.PI*.3,showIf:()=>G.flags.act2},
  {id:'sindri',name:'Sindri, smed',x:4470,y:2420,face:Math.PI,showIf:()=>G.flags.act2},
  {id:'logi',name:'Logi, Surts herold',x:4880,y:1190,face:Math.PI/2,showIf:()=>G.flags.act2&&!G.flags.logiGone,tall:1},
];

const G={state:'loading',flags:{},vb:{dmg:1,hp:1,st:1,flask:0,cd:1,def:1,roll:1,leech:0},weaponLvl:0,extraFlasks:0,discount:1,lastRS:0,stain:null,enemies:[],hazards:[],projs:[],fx:[],boss:null,shake:0,time:0,play:0,deaths:0,deadT:0,hitStop:0,slowmo:0,zoom:.35,camPos:new THREE.Vector3(),camLook:new THREE.Vector3(),dlgTarget:null,endT:0};
let P=null, C=null, PM=null, CM=null;
let buf=null;
const keys={}, mouse={x:innerWidth/2,y:innerHeight/2,l:false,r:false};
const mouseW={x:0,y:0};

const maxHp=()=>Math.round((64+P.stats.sty*5+P.stats.smi+P.level*4)*(eqHas('fenrir')?.9:1)*(T('b_hud')?1.15:1)*(eqHas('vardeflamme')?1.15:1)*G.vb.hp);
const maxSt=()=>Math.round((72+P.stats.smi*4+(eqHas('hrafnring')?10:0))*G.vb.st);
const maxFlasks=()=>3+G.extraFlasks+(G.flags.ulfrGift?1:0)+(eqHas('idunn')?1:0)+G.vb.flask;
const specialCd=()=>CLASSES[P.cls].scd*(eqHas('mjolnir')?.7:1)*(T('b_rasende')?.75:1)*G.vb.cd;
function atkMult(){const s=P.stats;const base=P.cls==='berserker'?s.sty:P.cls==='skjoldmo'?(s.sty+s.smi)/2:s.vil;return(1+(base-10)*.065)*(1+.15*G.weaponLvl)*(P.rage>0?1.35:1)*(eqHas('fenrir')?1.15:1)*(eqHas('ulfberht')?1.2:1)*(eqHas('hrafnring')?1.1:1)*(T('b_doeds')&&P.hp<maxHp()*.35?1.3:1)*(P.stormT>0?1.25:1)*(eqHas('tyrsrune')?1.3:1)*(eqHas('garmtand')?1.1:1)*G.vb.dmg*(P.buffT>0?1.25:1);}
const lvlCost=L=>Math.floor(130*Math.pow(1.32,L-1));

function newPlayer(cls,stats,name){
  P={x:1800,y:2330,r:13,cls,name,stats:{...stats},level:1,runes:0,face:-Math.PI/2,act:null,roll:0,rdx:0,rdy:0,iframes:0,stagger:0,specialT:0,rage:0,blocking:false,dash:null,dead:false,phase:0,move:0,combo:0,stepT:0};
  P.hp=maxHp();P.st=maxSt();P.flasks=maxFlasks();P.hpLag=P.hp;
  if(PM){scene.remove(PM.root);} PM=buildPlayerModel(cls);
}

/* --- NPC & enemy instances */
const NPCM={};
function initNPCs(){NPCS.forEach(n=>{const m=buildNPC(n.id);NPCM[n.id]=m;m.root.position.set(n.x*S,(n.head?ICE_Y+.55:hgt(n.x,n.y)),n.y*S);m.root.rotation.y=-n.face;n.anim={phase:0,move:0,t:Math.random()*5};});}

function spawnEnemy(t,x,y,extra={}){
  const d=ED[t];const hp0=Math.round(d.hp*DIFF[SET.diff].hp*(1+.6*(G.ng||0))*(G.mode==='valhalla'?G.vScale||1:1));const e={t,def:d,x,y,home:{x,y},r:d.r,hp:hp0,maxHp:hp0,aggro:false,busy:0,cd:Math.random(),sched:[],face:Math.PI/2,flash:0,stun:0,slow:0,dash:null,dead:false,phase:0,move:0,t0:Math.random()*9,anim:{},...extra};
  e.maxPoise=e.poise=Math.round(d.poise||hp0*(e.boss?.6:.75)); e.poiseT=0; e.broken=0;
  e.model=buildEnemyModel(t); G.enemies.push(e); return e;
}
function clearEnemies(){for(const e of G.enemies){scene.remove(e.model.root);if(e.hpEl)e.hpEl.remove();}G.enemies=[];for(const h of G.hazards)disposeHaz(h);G.hazards=[];for(const p of G.projs)scene.remove(p.mesh);G.projs=[];for(const r of RUNEB)scene.remove(r.mesh);RUNEB.length=0;for(const q of POTS)scene.remove(q.mesh);POTS.length=0;}
const BOSS_DEAD={ulvekonge:'fb_ulvekonge',ketil:'fb_ketil',troldmor:'fb_troldmor',askebrud:'fb_askebrud',jarl:'jarlDead',jotun:'jotunDone',vogter:'vogterDead',lindorm:'lindormDead',garm:'garmDead',glodkaempe:'glodDead',surt:'surtDone'};
function spawnFrom(s){
  if(s.boss&&G.flags[BOSS_DEAD[s.boss]]) return;
  if(s.t==='rimtrold'){spawnEnemy(s.t,s.x,s.y,{summoned:true});return;}
  spawnEnemy(s.t,s.x,s.y,s.boss?{boss:s.boss,summoned:s.boss==='vogter',dormant:(s.boss==='jotun'&&!G.flags.jotunTalked)||(s.boss==='surt'&&!G.flags.surtTalked),
    dmgMult:(s.boss==='jotun'&&G.flags.enraged?1.2:1)*(s.boss==='surt'?(G.flags.surtLore?.85:G.flags.logiAngry?1.15:1):1),vuln:s.boss==='garm'&&G.flags.garmLore?1.15:1}:{});
}
/** The second act's foes, when the winter has just broken. */
function spawnAct2(){for(const s of SPAWNS) if(s.act===2) spawnFrom(s);}
function resetWorld(){
  clearEnemies();G.boss=null;
  for(const s of SPAWNS){ if(s.act===2&&!G.flags.act2) continue; spawnFrom(s); }
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
function blockedPt(x,y){for(const o of OBS){if(o.gone||o.lava)continue;if(o.w!==undefined){if(x>o.x&&x<o.x+o.w&&y>o.y&&y<o.y+o.h)return true;}else if(o.r>0&&o.r>13){const dx=x-o.x,dy=y-o.y;if(dx*dx+dy*dy<o.r*o.r*.6)return true;}}return false;}

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
