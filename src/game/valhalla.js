'use strict';
/* =========================================================
   VALHALLA: waves of foes in the Jötun arena. Between waves a gift from the gods; a hero of old every fifth wave.
   The best run is kept in this browser.
   ========================================================= */
const VH={x:1800,y:520,wave:0,active:false,kills:0,cls:'berserker',offer:[]};
const VB0={dmg:1,hp:1,st:1,flask:0,cd:1,def:1,roll:1,leech:0};
const BOONS=[
  {id:'dmg',name:'Tyrs styrke',desc:'+15 % skade.',fn:()=>{G.vb.dmg*=1.15;}},
  {id:'hp',name:'Thors livskraft',desc:'+20 % liv, og du heles helt.',fn:()=>{G.vb.hp*=1.2;P.hp=maxHp();}},
  {id:'flask',name:'Freyjas gave',desc:'+1 mjødhorn, og alle horn fyldes.',fn:()=>{G.vb.flask++;P.flasks=maxFlasks();}},
  {id:'cd',name:'Odins øje',desc:'Klasse-evne og våbenkunst lader 25 % hurtigere op.',fn:()=>{G.vb.cd*=.75;}},
  {id:'def',name:'Heimdals vagt',desc:'Du tager 12 % mindre skade.',fn:()=>{G.vb.def*=.88;}},
  {id:'st',name:'Ullrs fodspor',desc:'+20 % udholdenhed, og rul koster mindre.',fn:()=>{G.vb.st*=1.2;G.vb.roll*=.75;}},
  {id:'leech',name:'Fenrirs sult',desc:'Du heler 3 % af den skade, du giver.',fn:()=>{G.vb.leech+=.03;}},
  {id:'weapon',name:'Brokkrs hammer',desc:'Dit våben forstærkes ét trin (+15 % skade).',fn:()=>{G.weaponLvl++;}},
];
const VTIER=[['draugr','archer','wolf','trold','minion'],['bjergtrold','seidr','gjenganger','ildvaette','frostvaette','stenvaette','gjenganger2'],['askedraugr','askeskytte','glodulv','eldseidr','lavavaette','rimtrold','stenvaette2']];
const VBOSS={5:['jarl','vogter'],10:['garm','glodkaempe'],15:['surt']};
const pickOne=a=>a[Math.floor(Math.random()*a.length)];
function vhBest(){return META.n.valhallaBest||0;}
function openValhallaMenu(){
  audioInit(); $('title').hidden=true; $('vhMenu').hidden=false;
  $('vhBest').textContent=vhBest()?`Din rekord: ${vhBest()} ${vhBest()===1?'bølge':'bølger'}`:'Ingen rekord endnu.';
  const el=$('vhCls'); el.innerHTML='';
  for(const [k,c] of Object.entries(CLASSES)){const b=document.createElement('button');b.type='button';b.className='ccard';
    b.innerHTML=`<span class="cr-rune">${c.rune}</span><h3>${c.name}</h3><p>${c.special}</p>`;b.addEventListener('click',()=>startValhalla(k));el.appendChild(b);}
  setTimeout(()=>el.querySelector('button')?.focus({preventScroll:true}),30);
}
function startValhalla(cls){
  $('vhMenu').hidden=true; $('vhEnd').hidden=true; $('title').hidden=true; $('create').hidden=true; VH.cls=cls; audioInit();
  newPlayer(cls,{...CLASSES[cls].base},'Einherje'); resetRun(); G.mode='valhalla'; G.ng=0; G.vb={...VB0};
  // a seasoned hero: level 10, two weapon upgrades, gear from the crypt and four talents
  const main=cls==='berserker'?'sty':cls==='volve'?'vil':'smi';
  for(let i=1;i<10;i++){if(i%3===0)P.stats.smi++;else if(cls==='skjoldmo'&&i%2)P.stats.sty++;else P.stats[main]++;}
  P.level=10; G.weaponLvl=2; G.inv=['ravnefjer','brynje','mjolnir','ulfberht']; G.eq={weapon:'ulfberht',armor:'brynje',t1:'ravnefjer',t2:'mjolnir',arm:null};
  P.talents=TALENTS[cls].slice(0,4).map(t=>t.id); P.hp=maxHp(); P.hpLag=P.hp; P.st=maxSt(); P.flasks=maxFlasks();
  clearEnemies(); P.x=VH.x; P.y=VH.y+130;
  $('hud').hidden=false; $('hName').textContent='Einherje · Valhalla'; $('specName').textContent=CLASSES[cls].special; $('specIco').innerHTML=CLASSES[cls].ico;
  G.state='play'; snapCam(); applyWeaponLook();
  VH.wave=0; VH.kills=0; VH.active=false; banner('VALHALLA','Odin ser på. Kæmp, til du falder.');
  setTimeout(()=>{if(G.mode==='valhalla')nextWave();},2500);
}
function nextWave(){
  if(G.mode!=='valhalla'||!P||P.dead) return;
  VH.wave++; const n=VH.wave, list=[];
  const boss=VBOSS[n]||(n>15&&n%5===0?VBOSS[[5,10,15][Math.floor(Math.random()*3)]]:null);
  if(boss) list.push({t:pickOne(boss),boss:true});
  const tiers=n<=3?[0]:n<=7?[0,1]:n<=12?[1,2]:[2], count=boss?Math.min(4,Math.floor(n/5)):Math.min(9,2+Math.floor(n*.8));
  for(let i=0;i<count;i++) list.push({t:pickOne(VTIER[pickOne(tiers)])});
  G.vScale=1+Math.max(0,n-10)*.1; G.vScaleD=1+Math.max(0,n-10)*.06;
  list.forEach((s,i)=>{const a=-Math.PI/2+(i/list.length-.5)*2.6+rand(-.15,.15),r=s.boss?200:rand(200,250);const x=VH.x+Math.cos(a)*r,y=VH.y+Math.sin(a)*r*.8;
    const e=spawnEnemy(s.t,x,y,s.boss?{boss:s.t,aggro:true,summoned:s.t==='vogter'}:{aggro:true}); e.home={x:VH.x,y:VH.y+60};
    burst(x*S,groundY(x,y)+1,y*S,40,3,1,.4,2.2,1.4,.5,{grav:-1});});
  VH.active=true; sfx('horn');
  banner('BØLGE '+n,boss?'En helt fra de ni verdener træder frem':`${list.length} fjender`,boss?'red':'');
}
function updValhalla(dt){
  if(G.mode!=='valhalla'||!VH.active||P.dead) return;
  if(G.enemies.some(e=>!e.dead)) return;
  VH.active=false; META.n.valhallaBest=Math.max(vhBest(),VH.wave); saveMeta();
  P.hp=Math.min(maxHp(),P.hp+maxHp()*.3); P.flasks=Math.min(maxFlasks(),P.flasks+1); sfx('rune');
  setTimeout(offerBoons,1200);
}
function offerBoons(){
  if(G.mode!=='valhalla'||P.dead) return;
  const pool=[...BOONS].sort(()=>Math.random()-.5); VH.offer=pool.slice(0,3);
  $('boonWave').textContent=`Bølge ${VH.wave} er overstået`;
  const el=$('boonOpts'); el.innerHTML='';
  VH.offer.forEach(b=>{const btn=document.createElement('button');btn.type='button';btn.className='ccard boon';btn.innerHTML=`<span class="cr-rune">ᚷ</span><h3>${b.name}</h3><p>${b.desc}</p>`;
    btn.addEventListener('click',()=>{b.fn();$('boon').hidden=true;G.state='play';toast('Gave: '+b.name);setTimeout(nextWave,1500);});el.appendChild(btn);});
  G.state='boon'; $('boon').hidden=false; setTimeout(()=>el.querySelector('button')?.focus({preventScroll:true}),30);
}
function valhallaOver(){
  G.state='end'; $('deathScr').hidden=true; $('hud').hidden=true; const cleared=VH.wave-1;
  META.n.valhallaBest=Math.max(vhBest(),cleared); saveMeta();
  $('vhResult').textContent=`Du faldt i bølge ${VH.wave}.`;
  $('vhStats').innerHTML=`<span>Bølger klaret <b>${cleared}</b></span><span>Rekord <b>${vhBest()}</b></span><span>Klasse <b>${CLASSES[VH.cls].name}</b></span>`;
  $('vhEnd').hidden=false; $('vhAgain').focus({preventScroll:true});
}
$('bValhalla').addEventListener('click',openValhallaMenu);
$('vhBack').addEventListener('click',()=>{$('vhMenu').hidden=true;$('title').hidden=false;});
$('vhAgain').addEventListener('click',()=>startValhalla(VH.cls));
$('vhQuit').addEventListener('click',()=>{$('vhEnd').hidden=true;toTitle();});
