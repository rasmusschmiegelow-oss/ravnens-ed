'use strict';
/* =========================================================
   ENEMIES
   ========================================================= */
function targets(){const t=[];if(!P.dead)t.push(P);if(C&&!C.down)t.push(C);return t;}
function pickTarget(e){if(e.boss||!C||C.down)return P;return dist(e,C)<dist(e,P)*.7?C:P;}
function addHaz(h){h.t=0;if(h.unblock&&h.owner)warnFx(h.owner);if(h.owner&&h.owner.atkT!==G.time){h.owner.atkT=G.time;h.owner.atkSeq=(h.owner.atkSeq||0)+1;h.owner.atkHaz=h;}const col=SET.tele?(h.unblock?0xd23cff:h.frost?0x3cc8ff:0xffa000):h.unblock?0xff2a0a:h.frost?0x8fd8ff:h.fire?0xff8a1a:0xff5533;
  let geo;if(h.k==='circle'){geo=new THREE.CircleGeometry(1,48);}else{geo=new THREE.CircleGeometry(1,40,-h.arc/2,h.arc);}geo.rotateX(-Math.PI/2);
  const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.15,blending:THREE.AdditiveBlending,depthWrite:false}));
  const rw=SET.tele?.86:.93, rg=h.k==='circle'?new THREE.RingGeometry(rw,1,64):new THREE.RingGeometry(rw,1,48,1,-h.arc/2,h.arc);rg.rotateX(-Math.PI/2);
  const ring=new THREE.Mesh(rg,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false}));
  if(SET.tele) m.material.opacity=.3;
  const inner=new THREE.Mesh(geo,m.material.clone()); inner.material.opacity=.32;
  const g=new THREE.Group();g.add(m,ring,inner);g.renderOrder=3;scene.add(g);h.mesh=g;h.inner=inner;G.hazards.push(h);return h;}
function disposeHaz(h){if(h.mesh){scene.remove(h.mesh);h.mesh.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});}}
function arcAtk(e,ang,arc,range,wind,dmg,extra={}){return addHaz({k:'arc',owner:e,ang,arc,range,wind,dmg,...extra});}
function circAtk(x,y,r,wind,dmg,extra={}){return addHaz({k:'circle',x,y,r,wind,dmg,...extra});}
/** Red flare and a warning roar before an attack that cannot be blocked or parried. */
function warnFx(e){const gy=groundY(e.x,e.y)+(e.boss==='jotun'?6:2);sfxAt('warn',e.x,e.y);for(let i=0;i<30;i++)FXA.emit(e.x*S+rand(-.4,.4),gy+rand(-.3,.6),e.y*S+rand(-.4,.4),rand(-2,2),rand(1,3),rand(-2,2),.5,rand(.3,.6),3,.5,.15,1,2,1,1);}
function cancelAttacks(e){e.sched=[];e.dash=null;e.aim=null;e.air=0;e.airT=0;for(let i=G.hazards.length-1;i>=0;i--){if(G.hazards[i].owner===e){disposeHaz(G.hazards[i]);G.hazards.splice(i,1);}}}
function damageEnemy(e,dmg,o={}){
  if(e.dead||e.dormant) return;
  dmg*=(.9+Math.random()*.2)*(e.vuln||1)*(e.wardT>0?.5:1);
  // a shield-bearer blocks blows from the front: go round it, or break its guard with heavy blows
  if(e.def.shield&&!o.fatal&&!o.back&&!(e.stun>0)&&!e.dormant&&Math.abs(angDiff(Math.atan2(P.y-e.y,P.x-e.x),e.face))<1.05){
    e.poise-=dmg*(o.stagger?2.2:.9)*(o.poiseMult||1);e.poiseT=2.8;e.aggro=true;e.flash=.08;
    if(e.poise<=0){breakPoise(e);num(e.x,e.y,'Garden brudt','crit');return;}
    dmg=Math.round(dmg*.15);e.hp-=dmg;num(e.x,e.y,dmg?'Blokeret':'Blokeret','');sfx('block');
    burst((e.x+Math.cos(e.face)*14)*S,groundY(e.x,e.y)+1,(e.y+Math.sin(e.face)*14)*S,14,4,.3,.12,3,2.4,1.2,{grav:9});
    if(e.hp<=0)killEnemy(e);return;}
  // critical hits: a fatal blow on a broken foe, a stab in the back of one that has not seen you, or any blow on a stunned foe
  let crit=false, label='';
  if(o.fatal){G.fatals=(G.fatals||0)+1;metaInc('fatals');dmg*=(eqHas('askekrone')?1.25:1)*(e.boss?2.6:3.6)+(e.parried>0&&T('s_haevn')?1:0);crit=true;label='Kritisk stød';e.broken=0;e.parried=0;e.stun=Math.min(e.stun,.4);}
  else if(o.back){metaInc('backs');dmg*=2.5;crit=true;label='Rygstød';}
  else if(e.stun>0&&!o.stun){crit=true;dmg*=e.parried>0?(T('s_haevn')?3.5:2.5):1.5;if(e.parried>0){e.parried=0;G.hitStop=.12;sfx('heavy');}}
  dmg=Math.round(dmg);
  e.hp-=dmg;e.flash=.13;e.aggro=true;{const st=splatType(e.t);decal(TEX_SPLAT,e.x+rand(-10,10),e.y+rand(-10,10),Math.random()*TAU,.6+Math.random()*.7*(e.r/16),.6+Math.random()*.7*(e.r/16),SPLAT_COL[st],30,st==='blood'?.75:.55);}sfx(e.t==='jotun'||e.t==='lindorm'||e.t==='frostvaette'?'icehit':e.model&&e.model.skel?'bonehit':'hit');
  num(e.x,e.y,dmg,crit?'crit':''); if(label) num(e.x,e.y,label,'crit');
  // balance: every blow wears it down, heavy blows more. When it breaks the foe reels and is open to a fatal blow.
  if(!o.fatal&&!o.noPoise&&!(e.broken>0)&&e.hp>0){e.poise-=dmg*(o.stagger?1.7:.7)*(o.poiseMult||1)*(eqHas('logisglod')?1.4:1)*(eqHas('askekrone')?1.2:1);e.poiseT=2.8;if(e.poise<=0)breakPoise(e);}
  const gy=groundY(e.x,e.y)+(e.boss==='jotun'?4:1);
  burst(e.x*S,gy,e.y*S,10,3,.45,.2,e.t==='jotun'?.6:.3,e.t==='jotun'?1.6:.06,e.t==='jotun'?2.2:.05,{sys:e.t==='jotun'?FXA:FXN,grav:8,alpha:.9});
  burst(e.x*S,gy,e.y*S,6,4,.25,.12,2.5,2,1.2,{grav:10});
  if(G.vb.leech&&!G.sim) P.hp=Math.min(maxHp(),P.hp+dmg*G.vb.leech);
  if(P.rage>0||T('b_blod')){const h=Math.round(dmg*((P.rage>0?.1:0)+(T('b_blod')?.04:0)));P.hp=Math.min(maxHp(),P.hp+h);}
  if(o.stun){e.stunId=(e.stunId||0)+1;e.stun=Math.max(e.stun,o.stun);cancelAttacks(e);e.busy=0;}
  else if(o.stagger&&!e.boss){cancelAttacks(e);e.busy=.4;e.stunId=(e.stunId||0)+1;}
  if(o.kb&&!e.boss){const a=Math.atan2(e.y-P.y,e.x-P.x);e.x+=Math.cos(a)*o.kb;e.y+=Math.sin(a)*o.kb;collide(e);}
  if(e.hp<=0) killEnemy(e);
}
function breakPoise(e){
  e.broken=e.boss?2:2;e.stun=Math.max(e.stun,e.broken);e.stunId=(e.stunId||0)+1;cancelAttacks(e);e.busy=0;e.poise=e.maxPoise;e.poiseT=e.boss?6:3;G.flags.sawBreak=true;
  num(e.x,e.y,'Balancen brudt','crit');sfx('heavy');sfx('parry');G.hitStop=Math.max(G.hitStop,.1);if(e.boss)G.slowmo=Math.max(G.slowmo,.35);
  const gy=groundY(e.x,e.y)+(FLOAT[e.t]||0)+1.4;burst(e.x*S,gy,e.y*S,34,4,.6,.25,2.6,2.1,.8,{grav:5});
}
/** Second phase: a roar, a brighter glow, faster attacks and new moves. The music changes with it. */
function enterPhase2(e,title,sub,cls,glow){
  e.phase2=true;cancelAttacks(e);e.busy=1.4;e.stun=0;e.broken=0;e.pose={n:'roar',t:1.3,key:'p2'};
  banner(title,sub,cls);sfx('warn');sfx('boom');G.shake=Math.max(G.shake,.8);G.slowmo=Math.max(G.slowmo,.5);
  if(glow&&e.model)for(const m of e.model.mats){const b=m.userData.baseEmissive;if(!b)continue;m.userData.glow0=m.userData.glow0||b.clone();b.add(new THREE.Color(...glow));}
  const gy=groundY(e.x,e.y), c=glow?glow.map(v=>.5+v*5):[2,1,.4];
  for(let i=0;i<120;i++){const a=Math.random()*TAU,s=rand(3,9);FXA.emit(e.x*S,gy+rand(.3,3),e.y*S,Math.cos(a)*s,rand(1,4),Math.sin(a)*s,rand(.6,1.2),rand(.25,.5),c[0],c[1],c[2],1,2,1.5,1);}
}
/** New Game+ brings the second phase on earlier. */
const p2At=()=>G.ng?.62:.5;
function resetPhase(e){e.phase2=false;if(e.model)for(const m of e.model.mats)if(m.userData.glow0)m.userData.baseEmissive.copy(m.userData.glow0);}
/** Burning ground that hurts whoever stands in it. */
function burnAt(x,y,r,life,dps,friendly){
  const g=new THREE.Group(), geo=new THREE.CircleGeometry(1,40).rotateX(-Math.PI/2);
  const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:new THREE.Color(1.6,.45,.08),transparent:true,opacity:.0,blending:THREE.AdditiveBlending,depthWrite:false}));
  g.add(m);g.position.set(x*S,groundY(x,y)+.1,y*S);g.scale.set(r*S,1,r*S);g.renderOrder=3;scene.add(g);
  G.hazards.push({k:'burn',x,y,r,life,dps,t:0,tick:.25,mesh:g,disc:m,friendly});
}
function fireFx(x,y,n=24){const gy=groundY(x,y);for(let i=0;i<n;i++)FXA.emit(x*S+rand(-.6,.6),gy+rand(0,.6),y*S+rand(-.6,.6),rand(-1.5,1.5),rand(2,6),rand(-1.5,1.5),rand(.4,.9),rand(.25,.55),3,1.1,.25,1,-1,1.2,1);G.shake=Math.max(G.shake,.12);}
function killEnemy(e){
  e.dead=true;cancelAttacks(e);maybeDrop(e);if(!G.sim)META.kills[e.t]=(META.kills[e.t]||0)+1;P.runes+=Math.round(e.def.runes*(1+.5*(G.ng||0))*(nightMult(e)>1?1.2:1));sfx('coins');G.kills=(G.kills||0)+1;
  if(e.t==='rimtrold'&&G.flags.q_astrid&&!G.flags.astridRevenge){G.flags.astridRevenge=true;
    if(C&&C.kind==='astrid'&&!C.down&&dist(C,e)<700){G.flags.astridWitnessed=true;approve(2);toast('Astrid: «Far… den er død.» Hun sænker buen længe.');}else{approve(-1);toast('Ny note: Astrid vil gerne høre, at rimtrolden er død.');}}
  const gy=groundY(e.x,e.y);
  for(let i=0;i<(e.boss?160:30);i++)FXA.emit(e.x*S+rand(-.5,.5),gy+rand(.2,e.boss?6:1.6),e.y*S+rand(-.5,.5),rand(-.6,.6),rand(.5,2.5),rand(-.6,.6),rand(1,2.2),rand(.15,.35),2.2,1.6,.6,1,-.4,.6,0);
  burst(e.x*S,gy+.5,e.y*S,24,1.8,1.5,.9,.25,.3,.35,{sys:FXN,up:.4,grav:-.3,drag:2,alpha:.45,grow:2.5});
  if(e.hpEl){e.hpEl.remove();e.hpEl=null;}
  if(e.boss==='eyvind'&&G.mode!=='valhalla'){G.boss=null;if(!G.flags.eyvindPeace){G.flags.eyvindDone=true;G.flags.eyvindSword=true;approve(1);setTimeout(()=>toast(C&&C.kind==='astrid'?'Astrid: «Tak. Han var fanget i den krop.» Hun samler en håndfuld aske i et klæde.':'Eyvind falder sammen til aske. Astrid vil gerne vide det.'),1200);}saveGame();}
  if(e.boss==='isdronning'&&G.mode!=='valhalla'){G.flags.isdronningDead=true;G.boss=null;banner('ISDRONNINGEN ER FÆLDET','Sigrun kan hvile');sfx('boom');G.slowmo=1.1;setTimeout(()=>toast('Isen om Sigruns sarkofag smelter. Kisten er åben.'),1600);saveGame();}
  const FB={ulvekonge:'ulvehjerte',ketil:'jarnring',troldmor:'troldblod',askebrud:'askekrone'};
  if(FB[e.boss]&&G.mode!=='valhalla'){G.flags['fb_'+e.boss]=true;G.boss=null;banner('FELTBOSS FÆLDET',e.def.name);sfx('boom');G.slowmo=1.1;const it=FB[e.boss];setTimeout(()=>giveItem(it),1500);saveGame();}
  if(G.mode==='valhalla'){if(e.boss){G.boss=null;banner('FJENDE FÆLDET',e.def.name);sfx('boom');G.slowmo=1;}}
  else{
  if(e.boss==='jarl'){G.flags.jarlDead=true;G.flags.horn=true;G.flags.ring=true;setTimeout(()=>toast('Du fandt en sølvring på jarlens hånd: Hrafnkels ring'),3200);G.boss=null;banner('FJENDE FÆLDET','Hrafnkel, Draugr-jarlen');setTimeout(()=>toast('Du fik: Jarlens Horn'),1600);sfx('boom');G.slowmo=1.4;saveGame();}
  if(e.boss==='lindorm'){G.flags.lindormDead=true;G.boss=null;banner('FJENDE FÆLDET','Lindormen fra Isfjorden');setTimeout(()=>toast(G.flags.lindormQuest?'Bring nyheden til Jarl Thorgrim i Ravnsholm':'Jarl Thorgrim i Ravnsholm vil gerne høre om dette'),1600);sfx('boom');G.slowmo=1.3;saveGame();}
  if(e.boss==='vogter'){G.flags.vogterDead=true;G.boss=null;banner('FJENDE FÆLDET','Gravvogteren');setTimeout(()=>toast('Vogterens nøgle passer til guldkisten'),1600);sfx('boom');G.slowmo=1.2;saveGame();}
  if(e.boss==='garm'){G.flags.garmDead=true;G.boss=null;banner('FJENDE FÆLDET','Garm, Helhunden');sfx('boom');G.slowmo=1.4;setTimeout(()=>giveItem('garmtand'),1800);setTimeout(()=>toast('Med Helhunden død slukker runerne på Flammeporten mod nord'),4200);saveGame();}
  if(e.boss==='glodkaempe'){G.flags.glodDead=true;G.flags.muspelsten=true;G.boss=null;banner('FJENDE FÆLDET','Glødkæmpen');sfx('boom');G.slowmo=1.2;setTimeout(()=>toast('Du fandt Muspelstenen. Sindri i Skjoldvik vil gerne se den.'),1800);saveGame();}
  if(e.boss==='surt'){G.flags.surtDone=true;G.boss=null;banner('SURT ER FÆLDET','Muspelheims ild slukker');sfx('boom');G.slowmo=2.4;G.endT=6;}
  if(e.boss==='jotun'){G.flags.jotunDone=true;G.boss=null;banner('RIMTURSEN ER FÆLDET','Hrimgrimr, Ymirs æt');sfx('boom');G.slowmo=2.2;G.endT=5.5;G.ending='sword';}
  }
  setTimeout(()=>{scene.remove(e.model.root);},e.boss?4200:2400);
  e.deathT=0;
}
function updEnemy(e,dt){
  if(e.dead){e.deathT+=dt;return;}
  updBurn(e,dt); if(e.dead) return;
  e.flash=Math.max(0,e.flash-dt);e.slow=Math.max(0,e.slow-dt);e.t0+=dt;e.parried=Math.max(0,(e.parried||0)-dt);e.broken=Math.max(0,(e.broken||0)-dt);e.wardT=Math.max(0,(e.wardT||0)-dt);
  if(e.poiseT>0)e.poiseT-=dt;else if(e.poise<e.maxPoise)e.poise=Math.min(e.maxPoise,e.poise+e.maxPoise*.22*dt);
  if(e.stun>0){e.stun-=dt;e.move=lerp(e.move,0,dt*8);return;}
  for(let i=e.sched.length-1;i>=0;i--){const s=e.sched[i];s.t-=dt;if(s.t<=0){e.sched.splice(i,1);s.fn();if(e.dead)return;}}
  if(e.dash){e.x+=e.dash.dx*e.dash.sp*dt;e.y+=e.dash.dy*e.dash.sp*dt;e.dash.t-=dt;
    if(!e.dash.done)for(const tg of targets())if(dist(e,tg)<e.r+tg.r+6){hurt(tg,e.dash.dmg,e.x,e.y,e,!!e.dash.unblock);e.dash.done=true;}
    if(e.dash.t<=0)e.dash=null;collide(e);}
  if(e.aim){e.aim.t-=dt;if(e.aim.track){const tg=pickTarget(e);e.face=Math.atan2(tg.y-e.y,tg.x-e.x);}if(e.aim.t<=0)e.aim=null;}
  if(e.busy>0){e.busy-=dt;e.move=lerp(e.move,0,dt*8);return;}
  if(e.dormant) return;
  const dP=dist(e,P);
  if(!e.aggro){
    if(!P.dead&&dP<(e.def.aggro||(e.boss?340:280))*(e.boss||G.sim?1:WXK.stealth)){e.aggro=true;e.returning=false;if(e.t==='wolf'||e.t==='glodulv')sfxAt('howl',e.x,e.y);if(e.model.skel&&!e.awoke&&!e.boss){e.awoke=true;e.busy=1.1;e.cd=Math.max(e.cd,.3);}}
    else{
      if(e.returning){const a=Math.atan2(e.home.y-e.y,e.home.x-e.x);e.x+=Math.cos(a)*e.def.spd*dt;e.y+=Math.sin(a)*e.def.spd*dt;e.face=a;e.move=1;e.phase+=dt*e.def.spd*.055;e.hp=Math.min(e.maxHp,e.hp+e.maxHp*.2*dt);if(dist(e,e.home)<12)e.returning=false;collide(e);}
      else{e.move=lerp(e.move,0,dt*4);}
      return;
    }
  }
  const leash=850; // bosses follow as far as normal foes, so ranged players are not reset mid-fight
  if(P.dead||dist(P,e.home)>leash){
    e.aggro=false;cancelAttacks(e);
    if(e.boss){e.x=e.home.x;e.y=e.home.y;e.hp=e.maxHp;e.poise=e.maxPoise;resetPhase(e);if(G.boss===e)G.boss=null;}
    else e.returning=true;
    return;
  }
  if(e.boss&&G.boss!==e){G.boss=e;}
  const tg=pickTarget(e), d=dist(e,tg), a=Math.atan2(tg.y-e.y,tg.x-e.x);
  if(e.def.shield){e.face+=clamp(angDiff(a,e.face),-1.6*dt,1.6*dt);}else e.face=a;
  const sp=e.def.spd*(e.slow>0?.5:1)*(e.phase2?1.3:1);
  e.cd-=dt;
  let moving=0;
  const step=(dir,mult=1)=>{e.x+=Math.cos(dir)*sp*mult*dt;e.y+=Math.sin(dir)*sp*mult*dt;moving=mult;};
  const dm=e.dmgMult||1;
  const K=KIND[e.t];
  if(K==='melee'){
    if(d>e.def.reach*.8+tg.r) step(a);
    else if(e.cd<=0){
      // three patterns: a plain swing, a combo that re-aims each blow, or a slow wind-up that baits an early roll
      const heavy=['bjergtrold','ildvaette','frostvaette','stenvaette2'].includes(e.t), r=Math.random(), R=e.def.reach+10, D=e.def.dmg*dm;
      if(e.t==='lavavaette'&&r<.25){circAtk(e.x,e.y,115,.95,D*.9,{owner:e,fire:true,onFire:()=>{fireFx(e.x,e.y,50);sfx('boom');if(Math.random()<.5)burnAt(e.x+rand(-40,40),e.y+rand(-40,40),55,4,18);}});e.busy=.95+.7;}
      else if(r<.28){const n=heavy?3:2;arcAtk(e,a,1.9,R,.5,D);
        for(let i=1;i<n;i++) e.sched.push({t:.72*i,fn:()=>{const a2=Math.atan2(P.y-e.y,P.x-e.x);e.face=a2;arcAtk(e,a2,1.9,R,.38,D*.85);}});
        e.busy=.72*(n-1)+.38+.6;}
      else if(r<.48){arcAtk(e,a,1.9,R,.95,D*1.15);e.busy=.95+.55;}
      else{arcAtk(e,a,1.9,R,.5,D);e.busy=.5+.5;}
      e.cd=.65+Math.random()*.7;}
  } else if(K==='ranged'){
    if(d>330) step(a); else if(d<170) step(a+Math.PI,.8); else step(a+Math.PI/2*(Math.sin(e.t0*.7)>0?1:-1),.4);
    if(e.cd<=0&&d<430){e.aim={t:.8,track:true,len:d};e.busy=1.15;e.cd=1.8+Math.random()*.8;
      e.sched.push({t:.8,fn:()=>{e.shotId=(e.shotId||0)+1;const t2=pickTarget(e);const aa=Math.atan2(t2.y-e.y,t2.x-e.x);const mage=e.t!=='archer'&&e.t!=='askeskytte';const vol=!mage&&Math.random()<.3?[-.17,0,.17]:[0];for(const o of vol)spawnProj({x:e.x,y:e.y,vx:Math.cos(aa+o)*(mage?250:400),vy:Math.sin(aa+o)*(mage?250:400),dmg:e.def.dmg*(vol.length>1?.7:1),friendly:false,kind:mage?'boltE':e.t==='askeskytte'?'arrowF':'arrowE',life:mage?2.4:1.4,r:mage?8:5,homingP:mage});if(mage)sfx('bolt');}});}
  } else if(K==='lunge'){
    if(d>140) step(a+Math.sin(e.t0*1.4)*.5); else if(e.cd>0) step(a+Math.PI/2,.5);
    if(e.cd<=0&&d<170){const la=a;e.aim={t:.45,len:150,lunge:true};e.busy=.45+.3+.45;e.cd=1.3+Math.random()*.8;
      e.dashSeq=(e.dashSeq||0)+1;e.sched.push({t:.45,fn:()=>{e.dash={dx:Math.cos(la),dy:Math.sin(la),sp:440,t:.3,dmg:e.def.dmg};}});
      if(Math.random()<.3){e.busy+=.95;e.sched.push({t:1.05,fn:()=>{const a2=Math.atan2(P.y-e.y,P.x-e.x);e.face=a2;e.aim={t:.35,len:150,lunge:true};e.dashSeq++;
        e.sched.push({t:.35,fn:()=>{e.dash={dx:Math.cos(a2),dy:Math.sin(a2),sp:460,t:.3,dmg:e.def.dmg};}});}});}}
  } else if(K==='mortar'){
    // fire casters keep their distance and drop fire where you stand
    if(d>360) step(a); else if(d<200) step(e.boss?a+Math.PI/2*(Math.sin(e.t0*.6)>0?1:-1):a+Math.PI,e.boss?.45:.8); else step(a+Math.PI/2*(Math.sin(e.t0*.6)>0?1:-1),.35);
    if(e.boss&&!e.phase2&&e.hp<e.maxHp*p2At()){enterPhase2(e,'Askebruden kalder sit følge','Asken rejser sig','red',[.5,.15,.02]);
      for(const sg of [-1,1]){const x=e.x+Math.cos(a+sg*1.4)*100,y=e.y+Math.sin(a+sg*1.4)*100;const m=spawnEnemy('askedraugr',x,y,{aggro:true});m.home={x:e.home.x,y:e.home.y};fireFx(x,y,40);}}
    else if(e.boss&&e.cd<=0&&d<150&&!(e.novaT>G.time)){e.novaT=G.time+3.5;e.pose={n:'roar',t:.9,key:'nv'+(e.castN=(e.castN||0)+1)};e.busy=1.3;e.cd=1.6;
      circAtk(e.x,e.y,160,.9,e.def.dmg*dm*1.1,{owner:e,fire:true,unblock:true,onFire:()=>{fireFx(e.x,e.y,80);sfx('boom');G.shake=.5;burnAt(e.x,e.y,90,3,16);}});}
    else if(e.cd<=0&&d<470){e.pose={n:'cast',t:.9,key:'m'+(e.castN=(e.castN||0)+1)};e.busy=1.1;e.cd=2.7+Math.random()*.9;const n=e.boss?(e.hp<e.maxHp*.5?5:3):Math.random()<.3?3:1;sfx('bolt');
      for(let i=0;i<n;i++){const tx=tg.x+(i?rand(-95,95):0), ty=tg.y+(i?rand(-95,95):0);
        circAtk(tx,ty,58,1.05+i*.2,e.def.dmg*dm*(n>1?.75:1),{owner:e,fire:true,onFire:()=>{fireFx(tx,ty,30);sfx('spike');if(Math.random()<.3)burnAt(tx,ty,42,3.5,16);}});}}
  } else if(K==='healer'){
    // the grave witch keeps behind her allies, mends the most wounded and wards the one in front
    const allies=G.enemies.filter(q=>q!==e&&!q.dead&&!q.dormant&&Math.hypot(q.x-e.x,q.y-e.y)<420);
    const front=allies.length?allies.reduce((m,q)=>Math.hypot(q.x-tg.x,q.y-tg.y)<Math.hypot(m.x-tg.x,m.y-tg.y)?q:m):null;
    if(front){const bx=front.x+(front.x-tg.x)/(Math.hypot(front.x-tg.x,front.y-tg.y)||1)*120, by=front.y+(front.y-tg.y)/(Math.hypot(front.x-tg.x,front.y-tg.y)||1)*120;
      const ba=Math.atan2(by-e.y,bx-e.x);if(Math.hypot(bx-e.x,by-e.y)>30)step(ba,.8);e.face=Math.atan2(tg.y-e.y,tg.x-e.x);}
    else if(d<260) step(a+Math.PI,.9); else if(d>380) step(a);
    if(e.cd<=0){
      const hurtA=allies.filter(q=>q.hp<q.maxHp*.8).sort((p,q)=>p.hp/p.maxHp-q.hp/q.maxHp)[0];
      if(hurtA){e.pose={n:'cast',t:.9,key:'h'+(e.castN=(e.castN||0)+1)};e.busy=1;e.cd=3.6+Math.random();const tgt=hurtA;
        e.sched.push({t:.7,fn:()=>{if(tgt.dead)return;const h=Math.round(tgt.maxHp*.2);tgt.hp=Math.min(tgt.maxHp,tgt.hp+h);num(tgt.x,tgt.y,'+'+h,'heal');sfx('rune');
          for(let i=0;i<24;i++){const k=i/24;FXA.emit(lerp(e.x,tgt.x,k)*S,groundY(e.x,e.y)+1.4,lerp(e.y,tgt.y,k)*S,rand(-.3,.3),rand(.2,.8),rand(-.3,.3),.6,.3,.6,2.4,.9,1,-.2,1,0);}}});}
      else if(front&&!(front.wardT>0)){e.pose={n:'cast',t:.8,key:'w'+(e.castN=(e.castN||0)+1)};e.busy=.9;e.cd=4;front.wardT=6;sfx('nova');}
      else if(d<400){e.shotId=(e.shotId||0)+1;e.busy=.7;e.cd=2.4;const aa=a;spawnProj({x:e.x,y:e.y,vx:Math.cos(aa)*240,vy:Math.sin(aa)*240,dmg:e.def.dmg*dm,friendly:false,kind:'boltE',life:2,r:8,homingP:true});sfx('bolt');}}
  } else if(K==='garm') garmAI(e,tg,d,a,step,dm);
  else if(K==='surt') surtAI(e,tg,d,a,step,dm);
  else if(K==='brute') jarlAI(e,tg,d,a,step,dm);
  else if(K==='lindorm') lindormAI(e,tg,d,a,step,dm);
  else if(K==='jotun') jotunAI(e,tg,d,a,step,dm);
  e.move=lerp(e.move,moving,dt*8); e.phase+=dt*sp*moving*.055;
  collide(e);
  // separation
  for(const o of G.enemies){if(o===e||o.dead)continue;const dx=e.x-o.x,dy=e.y-o.y,m=e.r+o.r;const d2=dx*dx+dy*dy;if(d2<m*m&&d2>.01){const dd=Math.sqrt(d2),push=(m-dd)*.5;e.x+=dx/dd*push;e.y+=dy/dd*push;}}
}
function lindormAI(e,tg,d,a,step,dm){
  const iq=e.t==='isdronning';
  if(!e.phase2&&e.hp<e.maxHp*p2At()){if(iq)enterPhase2(e,'Isdronningen hyler','De døde i isen vågner','frost',[.1,.3,.5]);else enterPhase2(e,'Lindormen skriger','Ynglen vågner i isen','frost',[.04,.18,.32]);sfx('howl');
    for(const sg of [-1,1]){const x=e.x+Math.cos(a+sg*1.4)*120,y=e.y+Math.sin(a+sg*1.4)*120;spawnEnemy(iq?'gjenganger':'lindyngel',x,y,{aggro:true});burst(x*S,groundY(x,y)+1,y*S,40,3,1,.4,.6,1.6,2.4,{grav:1});}
    return;}
  if(e.cd>0){if(d>150)step(a);else step(a+Math.PI/2,.6);return;}
  const r=Math.random(), D=e.def.dmg*dm;
  if(d<160&&r<.5){arcAtk(e,a,2.4,e.def.reach+20,.7,D);e.busy=1.2;}
  else if(d<440&&r<.8){const la=a;e.aim={t:.65,len:Math.min(d+80,440),lunge:true};e.busy=.65+.45+.5;e.dashSeq=(e.dashSeq||0)+1;sfx('howl');
    warnFx(e);e.sched.push({t:.65,fn:()=>{e.dash={dx:Math.cos(la),dy:Math.sin(la),sp:640,t:.45,dmg:D*1.1,unblock:true};}});}
  else if(e.phase2&&r<.93){
    e.pose={n:'breath',t:1.6,key:'br'+G.time};sfx('nova');
    for(let i=0;i<5;i++){const aa=a+(i-2)*.3;e.sched.push({t:i*.2,fn:()=>arcAtk(e,aa,.5,330,.6,D*.75,{frost:true,onFire:()=>breathFx(e,aa,330,true)})});}
    e.busy=.2*4+.6+.6;}
  else{for(let i=1;i<=6;i++){const sp=(i%2?1:-1)*(i>3?.2:.08);const x=e.x+Math.cos(a+sp)*(50+i*62),y=e.y+Math.sin(a+sp)*(50+i*62);circAtk(x,y,46+i*3,.7+i*.08,D*.7,{owner:e,frost:true,onFire:()=>spikeFx(x,y)});}e.busy=1.35;}
  e.cd=.5+Math.random()*.6;
}
// Brutes: the barrow jarl, the crypt guardian and the ember giant. Sweeps close in, a leaping slam at range,
// and in the second phase a whirling double spin plus a move of their own.
function jarlAI(e,tg,d,a,step,dm){
  if(!e.phase2&&e.hp<e.maxHp*p2At()){
    if(e.t==='jarl'){enterPhase2(e,'Hrafnkel kalder på sine huskarle','Gravens kulde omslutter ham','frost',[.04,.22,.36]);sfx('horn');
      for(const s of [-1,1]){const x=e.x+Math.cos(a+s*1.6)*90,y=e.y+Math.sin(a+s*1.6)*90;const m=spawnEnemy('minion',x,y,{aggro:true});m.home={x:e.home.x,y:e.home.y};burst(x*S,groundY(x,y)+.5,y*S,40,3,1,.4,.4,1.6,2.4,{grav:1});}}
    else if(e.t==='vogter') enterPhase2(e,'Gravvogteren vågner helt','Sjælene i krypten svarer hans kald','red',[.3,.06,.02]);
    else if(e.t==='ketil') enterPhase2(e,'Ketil blæser i sit horn','Hærføreren kæmper, som var det hans sidste slag','red',[.3,.15,.02]);
    else if(e.t==='troldmor') enterPhase2(e,'Troldemoderen raser','Skoven ryster','',[.1,.2,.04]);
    else enterPhase2(e,'Glødkæmpen flammer op','Muspels ild brænder i dens årer','red',[.5,.16,.02]);
    return;}
  if(e.cd>0){if(d>95)step(a);return;}
  const r=Math.random(), D=e.def.dmg*dm, R=Math.max(108,e.def.reach+12);
  if(e.phase2&&d<R+60&&r<(e.t==='jarl'?.16:.26)){const sd=e.t==='jarl'?.7:.85;
    circAtk(e.x,e.y,R+28,.85,D*sd,{owner:e,spin:true});
    e.sched.push({t:1.1,fn:()=>circAtk(e.x,e.y,R+28,.6,D*sd,{owner:e,spin:true})});
    e.busy=1.05+.55+.6;e.cd=.6+Math.random()*.5;return;
  }
  if(e.phase2&&e.t==='vogter'&&d>=150&&d<480&&r<.5){
    e.pose={n:'cast',t:.9,key:'orb'+G.time};e.busy=1.2;e.cd=.9+Math.random()*.6;
    e.sched.push({t:.55,fn:()=>{const a2=Math.atan2(P.y-e.y,P.x-e.x);for(const i of [-1,1]){const aa=a2+i*.4;spawnProj({x:e.x,y:e.y,vx:Math.cos(aa)*220,vy:Math.sin(aa)*220,dmg:D*.45,friendly:false,kind:'boltE',life:3,r:9,homingP:true});}sfx('bolt');}});
    return;
  }
  if(e.phase2&&e.t==='glodkaempe'&&r<.22){
    circAtk(e.x,e.y,175,1.1,D*1.1,{owner:e,fire:true,unblock:true,onFire:()=>{fireFx(e.x,e.y,80);G.shake=.7;sfx('boom');for(let i=0;i<5;i++){const aa=i/5*TAU+Math.random(),rr=rand(90,170);burnAt(e.x+Math.cos(aa)*rr,e.y+Math.sin(aa)*rr,46,5,22);}}});
    e.busy=1.1+.8;e.cd=.8+Math.random()*.5;return;
  }
  if(d<135){
    const wu=e.t==='jarl'?.12:0;
    if(r<.5){arcAtk(e,a,2.6,R,.62+wu,D,{fire:e.t==='glodkaempe'});e.busy=.62+wu+.5;}
    else{arcAtk(e,a,2.6,R,.58,D,{fire:e.t==='glodkaempe'});e.sched.push({t:.78,fn:()=>{const a2=Math.atan2(P.y-e.y,P.x-e.x);e.face=a2;arcAtk(e,a2,2.8,R+4,.45+wu,D*1.1,{fire:e.t==='glodkaempe'});}});e.busy=.78+.45+.6;}
    e.cd=.5+Math.random()*.6;
  } else if(d<420){
    const tx=tg.x,ty=tg.y;e.air=1;e.airT=0;
    circAtk(tx,ty,95,1.0,D*1.25,{owner:e,unblock:true,onFire:()=>{e.x=tx;e.y=ty;collide(e);e.air=0;G.shake=.5;sfx('boom');const gy=groundY(tx,ty);burst(tx*S,gy+.2,ty*S,60,6,.9,.6,.85,.9,1,{sys:FXN,up:.6,grav:3,drag:2,alpha:.6,grow:2});}});
    e.busy=1.0+.75;e.cd=.6+Math.random()*.5;
  } else step(a);
}
function jotunAI(e,tg,d,a,step,dm){
  if(!e.phase2&&e.hp<e.maxHp*p2At()){enterPhase2(e,'Rimtursen raser','Isen selv vender sig mod dig','frost',[.06,.22,.4]);frostRain(e,dm);return;}
  if(e.cd>0){if(d>150)step(a);return;}
  const r=Math.random(), D=e.def.dmg*dm;
  if(d<210){
    if(r<.45){circAtk(e.x,e.y,180,1.15,D*1.05,{owner:e,frost:true,unblock:true,onFire:()=>{G.shake=.7;sfx('boom');const gy=groundY(e.x,e.y);for(let i=0;i<90;i++){const aa=Math.random()*TAU,s=rand(6,12);FXA.emit(e.x*S,gy+.3,e.y*S,Math.cos(aa)*s,rand(.5,3),Math.sin(aa)*s,rand(.5,1),rand(.3,.6),.6,1.5,2.2,1,4,2.5,1);}}});e.busy=1.15+.85;}
    else{arcAtk(e,a,2.9,190,.85,D*.9);e.busy=.85+.6;if(e.phase2){e.sched.push({t:1.0,fn:()=>{const a2=Math.atan2(P.y-e.y,P.x-e.x);e.face=a2;arcAtk(e,a2,2.9,190,.55,D*.9);}});e.busy+=.6;}}
    e.cd=.5+Math.random()*.6;
  } else if(d<640){
    if(e.phase2&&r<.3) iceLances(e,a,dm); else if(e.phase2&&r<.6) frostRain(e,dm); else iceLine(e,a,dm);
    e.cd=.6+Math.random()*.7;
  } else step(a);
}
/* Garm: a hound the size of a house. Snapping combos, a charging lunge, a tail sweep, and hellfire in phase two. */
function garmAI(e,tg,d,a,step,dm){
  const wk=e.t==='ulvekonge';
  if(!e.phase2&&e.hp<e.maxHp*p2At()){if(wk)enterPhase2(e,'Fenrisætlingen hyler','Flokken svarer','frost',[.1,.25,.4]);else enterPhase2(e,'Garm hyler mod himlen','Helilden vågner i hans strube','red',[.5,.08,.02]);sfx('howl');
    {const x=e.x+Math.cos(a+1.5)*110,y=e.y+Math.sin(a+1.5)*110;const w=spawnEnemy(wk?'wolf':'glodulv',x,y,{aggro:true});w.home={x:e.home.x,y:e.home.y};burst(x*S,groundY(x,y)+1,y*S,40,3,1,.4,.8,.9,1,{grav:1});}
    return;}
  if(e.cd>0){if(d>210)step(a);else step(a+Math.PI/2*(e.side||1),.7);return;}
  const r=Math.random(), D=e.def.dmg*dm;
  if(d<160&&r<.45){const n=e.phase2?3:2;arcAtk(e,a,1.6,145,.55,D*.7);
    for(let i=1;i<n;i++) e.sched.push({t:.6*i,fn:()=>{const a2=Math.atan2(P.y-e.y,P.x-e.x);e.face=a2;arcAtk(e,a2,1.6,145,.42,D*.65);}});
    e.busy=.55*(n-1)+.38+.5;}
  else if(d<540&&r<.75){const la=a;e.aim={t:.7,len:Math.min(d+120,540),lunge:true};warnFx(e);sfx('howl');e.busy=.7+.5+.45;e.dashSeq=(e.dashSeq||0)+1;
    e.sched.push({t:.7,fn:()=>{e.dash={dx:Math.cos(la),dy:Math.sin(la),sp:680,t:.5,dmg:D*.95,unblock:true};}});}
  else if(d<230&&r<.9){circAtk(e.x,e.y,155,.75,D*.85,{owner:e});e.busy=.75+.6;}
  else if(e.phase2){e.pose={n:'breath',t:1.3,key:'gb'+(e.brN=(e.brN||0)+1)};sfx('warn');
    for(let i=0;i<4;i++){const aa=a+(i-1.5)*.28;e.sched.push({t:i*.16,fn:()=>arcAtk(e,aa,.55,300,.7,D*.7,{fire:!wk,frost:wk,onFire:()=>{breathFx(e,aa,300,wk);if(i%2&&!wk)burnAt(e.x+Math.cos(aa)*190,e.y+Math.sin(aa)*190,50,4,20);}})});}
    e.busy=.16*3+.7+.6;}
  else {step(a);return;}
  e.cd=.65+Math.random()*.55; e.side=Math.random()<.5?1:-1;
}
/* Surt: the fire giant. A burning sword, a slam that sets the ground alight, lines of fire, a leap, and falling fire in phase two. */
function surtAI(e,tg,d,a,step,dm){
  if(!e.phase2&&e.hp<e.maxHp*p2At()){enterPhase2(e,'Surt løfter Ragnaroks flamme','Hele Muspelheim brænder i hans sværd','red',[.55,.18,.02]);
    for(let i=0;i<10;i++){const aa=i/10*TAU;burnAt(e.home.x+Math.cos(aa)*290,e.home.y+Math.sin(aa)*230,60,14,18);}
    return;}
  if(e.cd>0){if(d>170)step(a);return;}
  const r=Math.random(), D=e.def.dmg*dm;
  if(d<240){
    if(r<.4){arcAtk(e,a,2.6,215,.85,D,{fire:true});e.busy=.85+.6;
      if(e.phase2||r<.15){e.sched.push({t:1.05,fn:()=>{const a2=Math.atan2(P.y-e.y,P.x-e.x);e.face=a2;arcAtk(e,a2,2.6,215,.55,D*.95,{fire:true});}});e.busy+=.7;}}
    else if(r<.7){const tx=e.x+Math.cos(a)*115,ty=e.y+Math.sin(a)*115;
      circAtk(tx,ty,120,1.15,D*1.25,{owner:e,fire:true,unblock:true,onFire:()=>{fireFx(tx,ty,70);G.shake=.8;sfx('boom');burnAt(tx,ty,90,4,22);}});e.busy=1.15+.8;}
    else fireLine(e,a,dm);
  } else if(d<720){
    if(e.phase2&&r<.45) meteorRain(e,dm);
    else if(r<.75) fireLine(e,a,dm);
    else {const tx=tg.x,ty=tg.y;e.air=1;e.airT=0;circAtk(tx,ty,140,1.1,D*1.2,{owner:e,fire:true,unblock:true,onFire:()=>{e.x=tx;e.y=ty;collide(e);e.air=0;G.shake=.9;sfx('boom');fireFx(tx,ty,80);burnAt(tx,ty,100,4,20);}});e.busy=1.1+.8;}
  } else step(a);
  e.cd=.55+Math.random()*.6;
}
function fireLine(e,a,dm){e.pose={n:'stomp',t:.9,key:'fl'+(e.flN=(e.flN||0)+1)};sfx('nova');
  for(let i=1;i<=8;i++){const x=e.x+Math.cos(a)*(70+i*72),y=e.y+Math.sin(a)*(70+i*72);circAtk(x,y,56,.6+i*.1,e.def.dmg*.7*dm,{owner:e,fire:true,onFire:()=>{fireFx(x,y,24);if(Math.random()<.25)burnAt(x,y,45,3,16);}});}
  e.busy=1.1;}
function meteorRain(e,dm){e.pose={n:'rain',t:1,key:'mr'+(e.mrN=(e.mrN||0)+1)};
  for(let i=0;i<9;i++){const a=Math.random()*TAU,r=Math.random()*230;const x=P.x+Math.cos(a)*r,y=P.y+Math.sin(a)*r;
    circAtk(x,y,70,1.1+Math.random()*.8,e.def.dmg*.75*dm,{owner:e,fire:true,onFire:()=>{fireFx(x,y,40);sfx('spike');if(Math.random()<.3)burnAt(x,y,50,3,16);}});}
  e.busy=1.2;}
function iceLances(e,a,dm){e.pose={n:'cast',t:.9,key:'il'+G.time};e.busy=1.2;
  e.sched.push({t:.5,fn:()=>{const a2=Math.atan2(P.y-e.y,P.x-e.x);for(let i=-2;i<=2;i++){const aa=a2+i*.22;spawnProj({x:e.x+Math.cos(aa)*60,y:e.y+Math.sin(aa)*60,vx:Math.cos(aa)*400,vy:Math.sin(aa)*400,dmg:e.def.dmg*.6*dm,friendly:false,kind:'iceE',life:2,r:11});}sfx('spike');}});}
/** Particles along a breath or beam. */
function breathFx(e,a,len,frost){const gy=groundY(e.x,e.y)+(FLOAT[e.t]||0)+1.2;for(let i=0;i<40;i++){const t=Math.random()*len;const x=e.x+Math.cos(a)*t,y=e.y+Math.sin(a)*t;FXA.emit(x*S,gy*(1-t/len)+groundY(x,y)*(t/len)+.6,y*S,rand(-1,1),rand(.5,2),rand(-1,1),rand(.4,.8),rand(.4,.8),frost?.7:3,frost?1.6:1,frost?2.4:.25,1,-.3,1,2);}}
function iceLine(e,a,dm){for(let i=1;i<=7;i++){const x=e.x+Math.cos(a)*(60+i*70),y=e.y+Math.sin(a)*(60+i*70);circAtk(x,y,50,.55+i*.11,e.def.dmg*.75*dm,{owner:e,frost:true,onFire:()=>spikeFx(x,y)});}e.busy=1.0;sfx('nova');}
function frostRain(e,dm){for(let i=0;i<8;i++){const a=Math.random()*TAU,r=Math.random()*210;const x=P.x+Math.cos(a)*r,y=P.y+Math.sin(a)*r;circAtk(x,y,62,1.0+Math.random()*.7,e.def.dmg*.7*dm,{owner:e,frost:true,onFire:()=>spikeFx(x,y)});}e.busy=1.1;}
function spikeFx(x,y){const gy=groundY(x,y);const c=new THREE.Mesh(new THREE.ConeGeometry(.9,3.4,5),MAT.iceGlow);c.position.set(x*S,gy-1,y*S);c.rotation.set(rand(-.2,.2),rand(0,3),rand(-.2,.2));scene.add(c);G.fx.push({mesh:c,t:0,life:1.1,spike:true,gy});
  for(let i=0;i<20;i++)FXA.emit(x*S,gy+.5,y*S,rand(-2,2),rand(2,6),rand(-2,2),rand(.4,.8),rand(.15,.3),.7,1.6,2.4,1,9,1);G.shake=Math.max(G.shake,.15);sfxAt('spike',x,y);}
function updHazards(dt){
  for(let i=G.hazards.length-1;i>=0;i--){const h=G.hazards[i];
    if(h.k==='burn'){h.t+=dt;h.tick-=dt;const k=Math.min(1,h.t*4)*Math.min(1,(h.life-h.t)*2);h.disc.material.opacity=k*(.32+.08*Math.sin(G.time*9+h.x));
      if(Math.random()<.5)FXA.emit((h.x+rand(-h.r,h.r)*.7)*S,groundY(h.x,h.y)+.1,(h.y+rand(-h.r,h.r)*.7)*S,0,rand(1,2.5),0,rand(.3,.6),rand(.2,.4),3,1,.2,.9,-.5,.5,1);
      if(h.tick<=0&&h.friendly){h.tick=.5;for(const e of G.enemies)if(!e.dead&&!e.dormant&&Math.hypot(e.x-h.x,e.y-h.y)<h.r+e.r*.5)damageEnemy(e,h.friendly*.5,{poiseMult:.3});}
      else if(h.tick<=0){h.tick=.5;for(const tg of targets())if(Math.hypot(tg.x-h.x,tg.y-h.y)<h.r+tg.r*.3)hurt(tg,h.dps*.5,h.x,h.y,null,true,true);}
      if(h.t>=h.life){disposeHaz(h);G.hazards.splice(i,1);}continue;}
    if(h.owner&&h.owner.dead){disposeHaz(h);G.hazards.splice(i,1);continue;}
    h.t+=dt;const k=clamp(h.t/h.wind,0,1);
    const ox=h.k==='arc'?h.owner.x:h.x, oy=h.k==='arc'?h.owner.y:h.y, R=(h.k==='arc'?h.range:h.r)*S;
    h.mesh.position.set(ox*S,groundY(ox,oy)+.12,oy*S); h.mesh.scale.set(R,1,R); if(h.k==='arc')h.mesh.rotation.y=-h.ang;
    h.inner.scale.set(k,1,k); h.inner.material.opacity=.18+.3*k; if(h.unblock) h.mesh.children[1].material.opacity=.55+.45*Math.abs(Math.sin(G.time*14));
    if(h.t>=h.wind){
      for(const tg of targets()){
        if(h.k==='circle'){if(Math.hypot(tg.x-h.x,tg.y-h.y)<h.r+tg.r*.5)hurt(tg,h.dmg,h.x,h.y,h.owner,!!h.unblock);}
        else{const d=Math.hypot(tg.x-ox,tg.y-oy);if(d<h.range+tg.r&&Math.abs(angDiff(Math.atan2(tg.y-oy,tg.x-ox),h.ang))<h.arc/2+.12)hurt(tg,h.dmg,ox,oy,h.owner,!!h.unblock);}
      }
      if(h.k==='arc'){swipe(ox,oy,h.ang,h.arc,h.range,h.frost?0x9fdcff:0xff8a6a,.22,1);sfxAt('swing',ox,oy);}
      h.onFire&&h.onFire();
      disposeHaz(h);G.hazards.splice(i,1);
    }
  }
}

/* --- Projectiles */
const PROJ_GEO={arrow:new THREE.CylinderGeometry(.02,.02,.9,4).rotateZ(Math.PI/2),bolt:new THREE.IcosahedronGeometry(.2,1),raven:new THREE.ConeGeometry(.12,.5,5).rotateZ(-Math.PI/2),lance:new THREE.ConeGeometry(.16,1.3,5).rotateZ(-Math.PI/2)};
const PROJ_MAT={boltE:glowMat(new THREE.Color(2.2,.7,3.4)),arrow:sm(0x8a6a44),arrowE:glowMat(new THREE.Color(.6,2.4,3.4)),arrowF:glowMat(new THREE.Color(3.4,1.2,.25)),fireE:glowMat(new THREE.Color(3.6,1.3,.2)),iceE:MAT.iceGlow,bolt:glowMat(new THREE.Color(1,2.4,4)),raven:sm(0x0b0c10,.4)};
function spawnProj(o){const g=o.kind==='bolt'||o.kind==='boltE'||o.kind==='fireE'?PROJ_GEO.bolt:o.kind==='raven'?PROJ_GEO.raven:o.kind==='iceE'?PROJ_GEO.lance:PROJ_GEO.arrow;const m=new THREE.Mesh(g,PROJ_MAT[o.kind]);scene.add(m);o.mesh=m;o.h=1.25;G.projs.push(o);}
function updProjs(dt){
  for(let i=G.projs.length-1;i>=0;i--){const p=G.projs[i];p.life-=dt;
    if(p.homing){let best=null,bd=420;for(const e of G.enemies){if(e.dead||e.dormant)continue;const d=Math.hypot(e.x-p.x,e.y-p.y);if(d<bd){bd=d;best=e;}}
      if(best){const a=Math.atan2(best.y-p.y,best.x-p.x),c=Math.atan2(p.vy,p.vx),na=c+clamp(angDiff(a,c),-4*dt,4*dt),s=Math.hypot(p.vx,p.vy)*1.01;p.vx=Math.cos(na)*Math.min(s,520);p.vy=Math.sin(na)*Math.min(s,520);}}
    if(p.homingP&&!P.dead){const a=Math.atan2(P.y-p.y,P.x-p.x),c=Math.atan2(p.vy,p.vx),na=c+clamp(angDiff(a,c),-1.3*dt,1.3*dt),sp=Math.hypot(p.vx,p.vy);p.vx=Math.cos(na)*sp;p.vy=Math.sin(na)*sp;}
    p.x+=p.vx*dt;p.y+=p.vy*dt;
    let dead=p.life<=0||blockedPt(p.x,p.y);
    if(!dead){
      if(p.friendly){for(const e of G.enemies){if(e.dead||e.dormant||(p.hitSet&&p.hitSet.includes(e)))continue;if(Math.hypot(e.x-p.x,e.y-p.y)<e.r+p.r){damageEnemy(e,p.dmg,{});if(p.kind==='bolt'||p.kind==='raven')runeHit(e,p.dmg);if(p.pierce>0){p.pierce--;(p.hitSet=p.hitSet||[]).push(e);}else dead=true;break;}}}
      else{for(const tg of targets()){if(Math.hypot(tg.x-p.x,tg.y-p.y)<tg.r+p.r){hurt(tg,p.dmg,p.x-p.vx*.1,p.y-p.vy*.1);dead=true;break;}}}
    }
    const gy=groundY(p.x,p.y)+p.h;
    p.mesh.position.set(p.x*S,gy,p.y*S);p.mesh.rotation.y=-Math.atan2(p.vy,p.vx);
    if(p.kind==='bolt'){FXA.emit(p.x*S,gy,p.y*S,rand(-.3,.3),rand(-.3,.3),rand(-.3,.3),.35,.45,.6,1.4,2.6,1,0,2,1);}
    if(p.kind==='raven'){FXA.emit(p.x*S,gy,p.y*S,0,0,0,.4,.35,1.2,.5,2.2,.8,0,0,0);}
    if(p.kind==='boltE'){FXA.emit(p.x*S,gy,p.y*S,rand(-.3,.3),rand(-.3,.3),rand(-.3,.3),.4,.5,2,.6,2.6,1,0,2,1);}
    if(p.kind==='arrowE'){FXA.emit(p.x*S,gy,p.y*S,0,0,0,.25,.25,.5,1.6,2.2,.8,0,0,0);}
    if(p.kind==='arrowF'||p.kind==='fireE'){FXA.emit(p.x*S,gy,p.y*S,rand(-.3,.3),rand(.2,.8),rand(-.3,.3),.35,p.kind==='fireE'?.6:.3,3,1.1,.25,1,-.5,1,1);}
    if(p.kind==='iceE'){FXA.emit(p.x*S,gy,p.y*S,0,0,0,.3,.35,.7,1.6,2.4,.8,0,0,0);}
    if(dead){if(p.kind!=='arrow')burst(p.x*S,gy,p.y*S,14,3,.4,.25,.8,1.6,2.6,{grav:2});scene.remove(p.mesh);G.projs.splice(i,1);}
  }
}
