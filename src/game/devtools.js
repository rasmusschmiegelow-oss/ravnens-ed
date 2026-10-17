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
  mouseW.x=e.x; mouseW.y=e.y; for(const k of ['KeyW','KeyA','KeyS','KeyD']) keys[k]=false; mouse.r=false;
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
    keys[Math.cos(away)>.3?'KeyD':Math.cos(away)<-.3?'KeyA':'_']=true; keys[Math.sin(away)>.3?'KeyS':Math.sin(away)<-.3?'KeyW':'_']=true;
    if(p.st>5) buf={k:'roll',t:G.time}; return;
  }
  if(p.hp<maxHp()*.38&&p.flasks>0&&!p.act&&d>90){buf={k:'heal',t:G.time};return;}
  const reach=p.cls==='volve'?320:(p.cls==='berserker'?58:52)+e.r;
  const want=p.cls==='volve'?240:reach*.8;
  const mv=(dir)=>{keys[Math.cos(dir)>.38?'KeyD':Math.cos(dir)<-.38?'KeyA':'_']=true;keys[Math.sin(dir)>.38?'KeyS':Math.sin(dir)<-.38?'KeyW':'_']=true;};
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
  G.sim=true; const prevState=G.state; G.state='play'; const muted=!AU.on; setMuted(true);
  const out=[];
  try{
    for(const cls of ['berserker','skjoldmo','volve']) for(const [k,st] of Object.entries(SIM_STAGES)) for(const foe of st.foes){
      const runs=[]; for(let i=0;i<n;i++) runs.push(simFight(cls,k,foe,{...opts,label:foe}));
      const w=runs.filter(r=>r.won);
      out.push({cls,stage:k,foe,win:Math.round(w.length/n*100),time:w.length?+(w.reduce((a,r)=>a+r.time,0)/w.length).toFixed(1):null,hp:w.length?Math.round(w.reduce((a,r)=>a+r.hp,0)/w.length):0,flasks:+(runs.reduce((a,r)=>a+r.flasks,0)/n).toFixed(1),foeHp:Math.round(runs.reduce((a,r)=>a+r.foeHp,0)/n)});
    }
  } finally { G.sim=false; G.state=prevState; setMuted(muted); $('deathScr').hidden=true; }
  return out;
}

// Developer handle, only with ?dev in the address.
if(new URLSearchParams(location.search).has('dev')) window.__rv={G,quick:c=>{newPlayer(c,CLASSES[c].base,'Test');beginGame(null);},get P(){return P},get C(){return C},talk,openRest,killEnemy,makeCompanion,mouse,giveItem,travel,AU,CHESTS,openChest,simAll,simFight,ED,SIM_STAGES,bench:(n=30)=>{const gl=renderer.getContext();composer.render();gl.finish();const t=performance.now();for(let i=0;i<n;i++)composer.render();gl.finish();return +((performance.now()-t)/n).toFixed(1);},applyGfx,renderer,scene,camera,composer,moon};
