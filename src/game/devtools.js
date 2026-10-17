'use strict';
/* =========================================================
   PLAYTEST BOT (dev only): fights single enemies in fast simulation and reports the outcome
   ========================================================= */
// Stages model where in the game each enemy is met: player level, Dvalin upgrades and gear found by then.
const SIM_STAGES={
  A:{lvl:1,wpn:0,gear:[],foes:['draugr','archer','wolf','trold','minion','draugr+draugr+archer','wolf+wolf+wolf','trold+trold+trold']},
  B:{lvl:4,wpn:0,gear:['ravnefjer'],foes:['gjenganger+gjenganger2+gjenganger','bjergtrold+trold+trold','frostvaette+frostvaette','bjergtrold','stenvaette','gjenganger','gjenganger2','frostvaette','seidr','ildvaette']},
  C:{lvl:6,wpn:1,gear:['ravnefjer','ulvepels'],foes:['jarl','rimtrold','stenvaette2','lindyngel','vaette']},
  D:{lvl:8,wpn:2,gear:['ravnefjer','ulvepels','mjolnir'],foes:['vogter','lindorm']},
  E:{lvl:11,wpn:3,gear:['ravnefjer','brynje','mjolnir','ulfberht'],foes:['jotun']},
};
function simSetup(cls,st){
  newPlayer(cls,{...CLASSES[cls].base},'Bot'); P.level=st.lvl;
  const main=cls==='berserker'?'sty':cls==='volve'?'vil':'smi';
  for(let i=1;i<st.lvl;i++){ if(i%3===0) P.stats.smi++; else if(cls==='skjoldmo'&&i%2) P.stats.sty++; else P.stats[main]++; }
  G.weaponLvl=st.wpn; G.inv=[...st.gear]; G.eq={weapon:null,armor:null,t1:null,t2:null};
  for(const id of st.gear){const it=ITEMS[id];const sl=it.slot==='talisman'?(!G.eq.t1?'t1':'t2'):it.slot;G.eq[sl]=id;}
  G.flags={ulfrGift:true}; G.lock=null; P.hp=maxHp(); P.st=maxSt(); P.flasks=maxFlasks(); P.x=2650; P.y=1330;
}
function botThink(b){
  const p=P, foes=G.enemies.filter(e=>!e.dead&&!e.dormant); if(!foes.length) return;
  const e=foes.reduce((a,c)=>Math.hypot(c.x-p.x,c.y-p.y)<Math.hypot(a.x-p.x,a.y-p.y)?c:a);
  const d=Math.hypot(e.x-p.x,e.y-p.y), a=Math.atan2(e.y-p.y,e.x-p.x);
  mouseW.x=e.x; mouseW.y=e.y; for(const k of ['up','down','left','right']) keys[SET.bind[k]]=false; mouse.r=false;
  // threats: telegraphed attacks about to land, lunges and incoming projectiles
  let threat=null;
  for(const h of G.hazards){const left=h.wind-h.t; if(left>.3||left<.02) continue;
    const ox=h.k==='arc'?h.owner.x:h.x, oy=h.k==='arc'?h.owner.y:h.y, dd=Math.hypot(p.x-ox,p.y-oy);
    const inside=h.k==='circle'?dd<h.r+p.r+6:dd<h.range+p.r+10&&Math.abs(angDiff(Math.atan2(p.y-oy,p.x-ox),h.ang))<h.arc/2+.3;
    if(inside){threat={x:ox,y:oy,h,left};break;}}
  for(const q of foes){if(q.aim&&q.aim.lunge&&q.aim.t<.25&&Math.hypot(q.x-p.x,q.y-p.y)<200)threat=threat||{x:q.x,y:q.y,left:q.aim.t,lunge:1};}
  for(const pr of G.projs){if(pr.friendly)continue;const dd=Math.hypot(pr.x-p.x,pr.y-p.y);if(dd<70)threat=threat||{x:pr.x,y:pr.y,left:.1,proj:1};}
  if(threat&&b.react<=0){
    b.react=b.reaction;
    if(Math.random()<b.miss) return; // an average player misreads some attacks
    if(p.cls==='skjoldmo'&&threat.h&&!threat.h.unblock&&threat.left<.2&&p.st>15){mouse.r=true;if(Math.random()<b.parry)p.blockStart=G.time;return;}
    const away=Math.atan2(p.y-threat.y,p.x-threat.x)+(threat.h&&threat.h.k==='arc'||threat.lunge?(Math.random()<.5?1.3:-1.3):0);
    keys[Math.cos(away)>.3?SET.bind.right:Math.cos(away)<-.3?SET.bind.left:'_']=true; keys[Math.sin(away)>.3?SET.bind.down:Math.sin(away)<-.3?SET.bind.up:'_']=true;
    if(p.st>5) buf={k:'roll',t:G.time}; return;
  }
  if(p.hp<maxHp()*.38&&p.flasks>0&&!p.act&&d>90){buf={k:'heal',t:G.time};return;}
  const reach=p.cls==='volve'?320:(p.cls==='berserker'?58:52)+e.r;
  const want=p.cls==='volve'?240:reach*.8;
  const mv=(dir)=>{keys[Math.cos(dir)>.38?SET.bind.right:Math.cos(dir)<-.38?SET.bind.left:'_']=true;keys[Math.sin(dir)>.38?SET.bind.down:Math.sin(dir)<-.38?SET.bind.up:'_']=true;};
  const fromHome=Math.hypot(p.x-b.hx,p.y-b.hy), homeDir=Math.atan2(b.hy-p.y,b.hx-p.x);
  if(fromHome>320) mv(homeDir);                    // stay in the arena like a real player would
  else if(p.st<18) mv(a+Math.PI+(Math.sin(G.time)>0?.9:-.9)); // back off sideways to recover stamina
  else if(d>want+10) mv(a); else if(p.cls==='volve'&&d<want-60) mv(a+Math.PI);
  if(p.specialT<=0&&d<reach+40&&p.st>30&&Math.random()<.04) buf={k:'special',t:G.time};
  else if(d<reach&&p.st>22){
    if(p.cls==='berserker'&&p.st>60&&Math.random()<.18) buf={k:'rmb',t:G.time};
    else if(p.cls==='volve'&&d<120&&p.st>40) buf={k:'rmb',t:G.time};
    else if(Math.random()<.35) buf={k:'lmb',t:G.time};
  }
}
function simFight(cls,stageKey,foe,opts={}){
  const st=SIM_STAGES[stageKey]; simSetup(cls,st); clearEnemies();
  if(foe.includes('+')){const group=foe.split('+');group.slice(1).forEach((g,i)=>{const q=spawnEnemy(g,P.x+230,P.y+(i%2?1:-1)*(60+i*30),{aggro:true});q.home={x:q.x,y:q.y};});foe=group[0];}
  const ex=foe==='jotun'?{boss:'jotun'}:foe==='jarl'?{boss:'jarl'}:foe==='vogter'?{boss:'vogter',summoned:true}:foe==='lindorm'?{boss:'lindorm'}:foe==='rimtrold'?{summoned:true}:{};
  const e=spawnEnemy(foe,P.x+(foe==='jotun'?260:200),P.y,{...ex,aggro:true}); e.home={x:e.x,y:e.y};
  const b={react:0,reaction:opts.reaction??.26,miss:opts.miss??.3,parry:opts.parry??.35,hx:P.x+100,hy:P.y};
  const dt=1/60; let t=0; const f0=P.flasks;
  const lim=opts.limit??150;
  while(t<lim){
    G.time+=dt; t+=dt; b.react-=dt; botThink(b);
    updPlayer(dt); for(const q of [...G.enemies]) updEnemy(q,dt); updHazards(dt); updProjs(dt);
    if(P.dead) break;
    if(!G.enemies.some(q=>!q.dead&&KIND[q.t]&&(q===e||q.aggro))) break;
    if(e.dead&&!G.enemies.some(q=>!q.dead&&q.aggro)) break;
  }
  const won=!P.dead&&!G.enemies.some(q=>!q.dead);
  const res={cls,stage:stageKey,foe:opts.label||foe,won,time:+t.toFixed(1),hp:won?Math.round(P.hp/maxHp()*100):0,flasks:f0-P.flasks,foeHp:Math.max(0,Math.round(e.hp/e.maxHp*100))};
  clearEnemies(); return res;
}
function simAll(n=4,opts={}){
  G.sim=true; const prevState=G.state; G.state='play'; const prevDiff=SET.diff; SET.diff=opts.diff||'normal'; const muted=!AU.on; setMuted(true);
  const out=[];
  try{
    for(const cls of ['berserker','skjoldmo','volve']) for(const [k,st] of Object.entries(SIM_STAGES)) for(const foe of st.foes){
      const runs=[]; for(let i=0;i<n;i++) runs.push(simFight(cls,k,foe,{...opts,label:foe}));
      const w=runs.filter(r=>r.won);
      out.push({cls,stage:k,foe,win:Math.round(w.length/n*100),time:w.length?+(w.reduce((a,r)=>a+r.time,0)/w.length).toFixed(1):null,hp:w.length?Math.round(w.reduce((a,r)=>a+r.hp,0)/w.length):0,flasks:+(runs.reduce((a,r)=>a+r.flasks,0)/n).toFixed(1),foeHp:Math.round(runs.reduce((a,r)=>a+r.foeHp,0)/n)});
    }
  } finally { G.sim=false; G.state=prevState; SET.diff=prevDiff; setMuted(muted); $('deathScr').hidden=true; }
  return out;
}

/* =========================================================
   CAMPAIGN BOT (dev only): plays the whole game in order, levelling and dying like a player,
   and checks the game state and a save/load round trip after every step.
   ========================================================= */
// The route a typical player takes: areas to clear (x, y, radius), rests, people and bosses.
const ROUTE=[
  {talk:'ulfr'},
  {clear:[1640,1930,260],rest:0},{clear:[1960,1940,260]},{clear:[2175,1825,200]},{clear:[1350,2175,200],rest:0},
  {recruit:'astrid'},
  {clear:[1250,1580,220]},{clear:[1255,1455,180]},{chest:'ruin'},{clear:[1100,1480,160],rest:1},
  {clear:[1080,1330,140]},{clear:[1080,1010,180]},{clear:[760,1540,160],rest:1},
  {boss:'jarl',at:[820,1200],rest:1},
  {crypt:true},
  {clear:[2530,1245,200]},{clear:[2620,1580,180]},{clear:[2400,1650,180]},{chest:'wild'},{clear:[2570,1890,220],rest:0},
  {clear:[1800,1150,320],rest:2},{clear:[1500,1300,160]},{clear:[2100,1300,160]},{clear:[2290,1005,240],rest:2},
  {optional:'lindorm',at:[2980,1260],rest:2},
  {gate:true},{clear:[1450,700,150,1450,620]},{clear:[2150,700,150,2150,620]},
  {boss:'jotun',at:[1800,700]},
];
function campaign(cls,opts={}){
  const log=[], problems=[], bossLvl={}, attempts=[], t0=performance.now();
  G.sim=true; const prevState=G.state; G.state='play'; const muted=!AU.on; setMuted(true); const prevDiff=SET.diff; SET.diff=opts.diff||'normal';
  let deaths=0, simTime=0;
  const b={react:0,reaction:opts.reaction??.26,miss:opts.miss??.3,parry:opts.parry??.35,hx:0,hy:0};
  const check=(where)=>{
    if(!(P.hp<=maxHp()+.5)||Number.isNaN(P.x)||Number.isNaN(P.y)||Number.isNaN(P.hp)) problems.push(where+': spillertilstand ugyldig');
    for(const e of G.enemies) if(Number.isNaN(e.x)||Number.isNaN(e.hp)) {problems.push(where+': fjende med NaN ('+e.t+')');break;}
    if(G.flags.jarlDead&&!G.flags.horn&&!G.flags.gateForced) problems.push(where+': jarlen er død, men hornet mangler');
    // save/load round trip keeps the important state
    const sv=JSON.parse(JSON.stringify(makeSave()));
    if(sv.level!==P.level||sv.runes!==P.runes||JSON.stringify(sv.flags)!==JSON.stringify(G.flags)||JSON.stringify(sv.eq)!==JSON.stringify(G.eq)) problems.push(where+': gem/indlæs mister data');
  };
  const spend=()=>{ // level up like a player: main stat mostly, some agility; talents in class order
    const main=cls==='berserker'?'sty':cls==='volve'?'vil':(P.level%2?'sty':'smi');
    while(P.runes>=lvlCost(P.level)){P.runes-=lvlCost(P.level);P.stats[P.level%4===0?'smi':main]++;P.level++;}
    while(talentPoints()>0){const t=TALENTS[cls].find(x=>!T(x.id));if(!t)break;P.talents=[...(P.talents||[]),t.id];}
    // Dvalin: buy a weapon upgrade or a mead horn when there is money left over
    const c=x=>Math.round(x*G.discount);
    if(G.weaponLvl<3&&P.runes>=c(450*(G.weaponLvl+1))){P.runes-=c(450*(G.weaponLvl+1));G.weaponLvl++;}
    if(G.extraFlasks<2&&P.runes>=c(500+G.extraFlasks*250)){P.runes-=c(500+G.extraFlasks*250);G.extraFlasks++;}
  };
  const rest=(id)=>{G.lastRS=id;RUNESTONES[id].lit=true;spend();P.hp=maxHp();P.st=maxSt();P.flasks=maxFlasks();resetWorld();P.x=RUNESTONES[id].x;P.y=RUNESTONES[id].y+46;if(C){C.x=P.x-30;C.y=P.y+30;C.down=false;C.hp=C.maxHp;}};
  const died=()=>{deaths++;G.stain=P.runes>0?{x:P.x,y:P.y,amount:P.runes}:null;P.runes=0;P.dead=false;G.boss=null;G.lock=null;rest(G.lastRS);};
  const step=(dt)=>{G.time+=dt;simTime+=dt;b.react-=dt;botThink(b);updPlayer(dt);updComp(dt);for(const q of [...G.enemies])updEnemy(q,dt);updHazards(dt);updProjs(dt);};
  const goTo=(x,y)=>{P.x=x;P.y=y;collide(P);if(C){C.x=x-30;C.y=y+30;}b.hx=P.x;b.hy=P.y;
    if(G.stain&&Math.hypot(G.stain.x-x,G.stain.y-y)<450){P.runes+=G.stain.amount;G.stain=null;}};
  // fight everything near a point; returns true when cleared, retries after dying
  const clearArea=(x,y,r,ax,ay,limit=90,tries=4)=>{
    for(let k=0;k<tries;k++){
      goTo(ax??x,ay??(y+Math.min(r,160)));
      const foes=G.enemies.filter(e=>!e.dead&&!e.dormant&&Math.hypot(e.x-x,e.y-y)<r);
      if(!foes.length) return true;
      foes.forEach(e=>{e.aggro=true;});
      let t=0; while(t<limit){step(1/60);t+=1/60;if(P.dead)break;if(foes.every(e=>e.dead))break;}
      if(P.dead){died();continue;}
      if(foes.every(e=>e.dead)) return true;
    }
    return false;
  };
  const fightBoss=(kind,x,y,tries=6)=>{
    for(let k=0;k<tries;k++){
      // after a death the road respawns: clear what stands near the arena first, like a player walking back
      for(const q of G.enemies) if(!q.dead&&!q.boss&&!q.dormant&&Math.hypot(q.x-x,q.y-y)<420) clearArea(q.x,q.y,120,undefined,undefined,60,1);
      goTo(x,y); const e=G.enemies.find(q=>q.boss===kind&&!q.dead); if(!e) return true;
      if(kind==='jotun'){e.dormant=false;G.flags.jotunTalked=true;} e.aggro=true;
      bossLvl[kind]=P.level;
      let t=0; while(t<200){step(1/60);t+=1/60;if(P.dead||e.dead)break;}
      attempts.push({boss:kind,try:k+1,result:e.dead?'win':P.dead?'died':'timeout',bossHp:Math.round(Math.max(0,e.hp)/e.maxHp*100),t:Math.round(t),dist:Math.round(Math.hypot(P.x-e.x,P.y-e.y)),aggro:e.aggro});
      if(e.dead) return true;
      if(P.dead) died();
    }
    return false;
  };
  try{
    newPlayer(cls,{...CLASSES[cls].base},'Bot'); resetRun(); P.x=1800;P.y=2330; resetWorld(); G.lock=null;
    for(const s of ROUTE){
      const where=JSON.stringify(s);
      if(s.talk){D[s.talk]();
        // most players try Ulfr's Willpower check (DC 10): roll it like the game does
        if(s.talk==='ulfr'&&1+Math.floor(Math.random()*20)+mod(P.stats.vil)+2>=10){G.flags.ulfrCheck=true;G.flags.ulfrGift=true;G.flags.q_ulfr=true;}}
      if(s.recruit==='astrid'){if(P.runes>=150)P.runes-=150;makeCompanion('astrid');G.flags.astrid=true;}
      if(s.clear&&!clearArea(...s.clear)) problems.push('Kunne ikke rydde '+where);
      if(s.chest){const c=CHESTS.find(q=>q.id===s.chest);G.flags.chests=G.flags.chests||{};if(!G.flags.chests[c.id]){G.flags.chests[c.id]=true;P.runes+=c.runes;giveItem(c.item);if(c.also)giveItem(c.also);}}
      if(s.boss){if(!fightBoss(s.boss,...s.at)){problems.push('Tabte til '+s.boss);break;}}
      if(s.optional){fightBoss(s.optional,...s.at,3);if(G.flags.lindormDead){P.runes+=G.flags.lindormAdvance?550:800;G.flags.lindormPaid=true;giveItem('lindskael');}}
      if(s.crypt){goTo(CRYPT.inX,CRYPT.inY);
        for(const [x,y,r] of [[2900,600,100],[2690,545,140],[3110,545,140],[2640,420,130],[3160,420,130],[2900,420,150]]) if(!clearArea(x,y,r,2900,650,120,5)){problems.push('Kunne ikke rydde krypten ved '+x+','+y);break;}
        for(const c of CHESTS.filter(q=>q.crypt)){if(c.gold&&!G.flags.vogterDead)continue;G.flags.chests=G.flags.chests||{};if(!G.flags.chests[c.id]){G.flags.chests[c.id]=true;P.runes+=c.runes;giveItem(c.item);if(c.also)giveItem(c.also);}}
        goTo(CRYPT.doorX+45,CRYPT.doorY);}
      if(s.gate){G.flags.gateOpen=true;GATE.gone=true;}
      if(s.rest!==undefined) rest(s.rest);
      check(where);
      log.push({step:Object.keys(s)[0],lvl:P.level,runes:P.runes,deaths,t:Math.round(simTime)});
    }
  } catch(err){ problems.push('Fejl: '+(err&&err.message||err)); }
  finally { G.sim=false; G.state=prevState; setMuted(muted); SET.diff=prevDiff; $('deathScr').hidden=true; }
  return {cls,done:!!G.flags.jotunDone,deaths,levelAtBoss:bossLvl,finalLevel:P.level,gear:Object.values(G.eq).filter(Boolean),
    lindorm:!!G.flags.lindormDead,attempts,simMinutes:+(simTime/60).toFixed(1),ms:Math.round(performance.now()-t0),problems,log};
}

// Developer handle, only with ?dev in the address.
if(new URLSearchParams(location.search).has('dev')) window.__rv={G,quick:c=>{newPlayer(c,CLASSES[c].base,'Test');beginGame(null);},get P(){return P},get C(){return C},talk,openRest,killEnemy,makeCompanion,mouse,giveItem,travel,AU,CHESTS,openChest,simAll,simFight,campaign,ED,SIM_STAGES,bench:(n=30)=>{const gl=renderer.getContext();composer.render();gl.finish();const t=performance.now();for(let i=0;i<n;i++)composer.render();gl.finish();return +((performance.now()-t)/n).toFixed(1);},applyGfx,renderer,scene,camera,composer,moon};
