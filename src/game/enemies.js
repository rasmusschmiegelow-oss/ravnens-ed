'use strict';
/* =========================================================
   ENEMIES
   ========================================================= */
function targets(){const t=[];if(!P.dead)t.push(P);if(C&&!C.down)t.push(C);return t;}
function pickTarget(e){if(e.boss||!C||C.down)return P;return dist(e,C)<dist(e,P)*.7?C:P;}
function addHaz(h){h.t=0;if(h.unblock&&h.owner)warnFx(h.owner);if(h.owner&&h.owner.atkT!==G.time){h.owner.atkT=G.time;h.owner.atkSeq=(h.owner.atkSeq||0)+1;h.owner.atkHaz=h;}const col=h.unblock?0xff2a0a:h.frost?0x8fd8ff:0xff5533;
  let geo;if(h.k==='circle'){geo=new THREE.CircleGeometry(1,48);}else{geo=new THREE.CircleGeometry(1,40,-h.arc/2,h.arc);}geo.rotateX(-Math.PI/2);
  const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.15,blending:THREE.AdditiveBlending,depthWrite:false}));
  const rg=h.k==='circle'?new THREE.RingGeometry(.93,1,64):new THREE.RingGeometry(.93,1,48,1,-h.arc/2,h.arc);rg.rotateX(-Math.PI/2);
  const ring=new THREE.Mesh(rg,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false}));
  const inner=new THREE.Mesh(geo,m.material.clone()); inner.material.opacity=.32;
  const g=new THREE.Group();g.add(m,ring,inner);g.renderOrder=3;scene.add(g);h.mesh=g;h.inner=inner;G.hazards.push(h);return h;}
function disposeHaz(h){if(h.mesh){scene.remove(h.mesh);h.mesh.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});}}
function arcAtk(e,ang,arc,range,wind,dmg,extra={}){return addHaz({k:'arc',owner:e,ang,arc,range,wind,dmg,...extra});}
function circAtk(x,y,r,wind,dmg,extra={}){return addHaz({k:'circle',x,y,r,wind,dmg,...extra});}
/** Red flare and a warning roar before an attack that cannot be blocked or parried. */
function warnFx(e){const gy=groundY(e.x,e.y)+(e.boss==='jotun'?6:2);sfx('warn');for(let i=0;i<30;i++)FXA.emit(e.x*S+rand(-.4,.4),gy+rand(-.3,.6),e.y*S+rand(-.4,.4),rand(-2,2),rand(1,3),rand(-2,2),.5,rand(.3,.6),3,.5,.15,1,2,1,1);}
function cancelAttacks(e){e.sched=[];e.dash=null;e.aim=null;e.air=0;e.airT=0;for(let i=G.hazards.length-1;i>=0;i--){if(G.hazards[i].owner===e){disposeHaz(G.hazards[i]);G.hazards.splice(i,1);}}}
function damageEnemy(e,dmg,o={}){
  if(e.dead) return;
  if(e.dormant) return;
  dmg=Math.round(dmg*(.9+Math.random()*.2)); const crit=e.stun>0&&!o.stun; if(crit)dmg=Math.round(dmg*(e.parried>0?(T('s_haevn')?3.5:2.5):1.5)); if(crit&&e.parried>0){e.parried=0;G.hitStop=.12;sfx('heavy');}
  e.hp-=dmg;e.flash=.13;e.aggro=true;{const st=splatType(e.t);decal(TEX_SPLAT,e.x+rand(-10,10),e.y+rand(-10,10),Math.random()*TAU,.6+Math.random()*.7*(e.r/16),.6+Math.random()*.7*(e.r/16),SPLAT_COL[st],30,st==='blood'?.75:.55);}sfx(e.t==='jotun'||e.t==='lindorm'||e.t==='frostvaette'?'icehit':e.model&&e.model.skel?'bonehit':'hit');
  num(e.x,e.y,dmg,crit?'crit':'');
  const gy=groundY(e.x,e.y)+(e.boss==='jotun'?4:1);
  burst(e.x*S,gy,e.y*S,10,3,.45,.2,e.t==='jotun'?.6:.3,e.t==='jotun'?1.6:.06,e.t==='jotun'?2.2:.05,{sys:e.t==='jotun'?FXA:FXN,grav:8,alpha:.9});
  burst(e.x*S,gy,e.y*S,6,4,.25,.12,2.5,2,1.2,{grav:10});
  if(P.rage>0||T('b_blod')){const h=Math.round(dmg*((P.rage>0?.1:0)+(T('b_blod')?.04:0)));P.hp=Math.min(maxHp(),P.hp+h);}
  if(o.stun){e.stunId=(e.stunId||0)+1;e.stun=Math.max(e.stun,o.stun);cancelAttacks(e);e.busy=0;}
  else if(o.stagger&&!e.boss){cancelAttacks(e);e.busy=.4;e.stunId=(e.stunId||0)+1;}
  if(o.kb&&!e.boss){const a=Math.atan2(e.y-P.y,e.x-P.x);e.x+=Math.cos(a)*o.kb;e.y+=Math.sin(a)*o.kb;collide(e);}
  if(e.hp<=0) killEnemy(e);
}
function killEnemy(e){
  e.dead=true;cancelAttacks(e);P.runes+=e.def.runes;sfx('coins');G.kills=(G.kills||0)+1;
  if(e.t==='rimtrold'&&G.flags.q_astrid&&!G.flags.astridRevenge){G.flags.astridRevenge=true;
    if(C&&C.kind==='astrid'&&!C.down&&dist(C,e)<700){G.flags.astridWitnessed=true;approve(2);toast('Astrid: «Far… den er død.» Hun sænker buen længe.');}else{approve(-1);toast('Ny note: Astrid vil gerne høre, at rimtrolden er død.');}}
  const gy=groundY(e.x,e.y);
  for(let i=0;i<(e.boss?160:30);i++)FXA.emit(e.x*S+rand(-.5,.5),gy+rand(.2,e.boss?6:1.6),e.y*S+rand(-.5,.5),rand(-.6,.6),rand(.5,2.5),rand(-.6,.6),rand(1,2.2),rand(.15,.35),2.2,1.6,.6,1,-.4,.6,0);
  burst(e.x*S,gy+.5,e.y*S,24,1.8,1.5,.9,.25,.3,.35,{sys:FXN,up:.4,grav:-.3,drag:2,alpha:.45,grow:2.5});
  if(e.hpEl){e.hpEl.remove();e.hpEl=null;}
  if(e.boss==='jarl'){G.flags.jarlDead=true;G.flags.horn=true;G.flags.ring=true;setTimeout(()=>toast('Du fandt en sølvring på jarlens hånd: Hrafnkels ring'),3200);G.boss=null;banner('FJENDE FÆLDET','Hrafnkel, Draugr-jarlen');setTimeout(()=>toast('Du fik: Jarlens Horn'),1600);sfx('boom');G.slowmo=1.4;saveGame();}
  if(e.boss==='lindorm'){G.flags.lindormDead=true;G.boss=null;banner('FJENDE FÆLDET','Lindormen fra Isfjorden');setTimeout(()=>toast(G.flags.lindormQuest?'Bring nyheden til Jarl Thorgrim i Ravnsholm':'Jarl Thorgrim i Ravnsholm vil gerne høre om dette'),1600);sfx('boom');G.slowmo=1.3;saveGame();}
  if(e.boss==='vogter'){G.flags.vogterDead=true;G.boss=null;banner('FJENDE FÆLDET','Gravvogteren');setTimeout(()=>toast('Vogterens nøgle passer til guldkisten'),1600);sfx('boom');G.slowmo=1.2;saveGame();}
  if(e.boss==='jotun'){G.flags.jotunDone=true;G.boss=null;banner('RIMTURSEN ER FÆLDET','Hrimgrimr, Ymirs æt');sfx('boom');G.slowmo=2.2;G.endT=5.5;G.ending='sword';}
  setTimeout(()=>{scene.remove(e.model.root);},e.boss?4200:2400);
  e.deathT=0;
}
function updEnemy(e,dt){
  if(e.dead){e.deathT+=dt;return;}
  e.flash=Math.max(0,e.flash-dt);e.slow=Math.max(0,e.slow-dt);e.t0+=dt;e.parried=Math.max(0,(e.parried||0)-dt);
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
    if(!P.dead&&dP<(e.def.aggro||(e.boss?340:280))){e.aggro=true;e.returning=false;if(e.t==='wolf')sfx('howl');if(e.model.skel&&!e.awoke&&!e.boss){e.awoke=true;e.busy=1.1;e.cd=Math.max(e.cd,.3);}}
    else{
      if(e.returning){const a=Math.atan2(e.home.y-e.y,e.home.x-e.x);e.x+=Math.cos(a)*e.def.spd*dt;e.y+=Math.sin(a)*e.def.spd*dt;e.face=a;e.move=1;e.phase+=dt*e.def.spd*.055;e.hp=Math.min(e.maxHp,e.hp+e.maxHp*.2*dt);if(dist(e,e.home)<12)e.returning=false;collide(e);}
      else{e.move=lerp(e.move,0,dt*4);}
      return;
    }
  }
  const leash=850; // bosses follow as far as normal foes, so ranged players are not reset mid-fight
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
    else if(e.cd<=0){
      // three patterns: a plain swing, a combo that re-aims each blow, or a slow wind-up that baits an early roll
      const heavy=['bjergtrold','ildvaette','frostvaette','stenvaette2'].includes(e.t), r=Math.random(), R=e.def.reach+10, D=e.def.dmg*dm;
      if(r<.28){const n=heavy?3:2;arcAtk(e,a,1.9,R,.5,D);
        for(let i=1;i<n;i++) e.sched.push({t:.72*i,fn:()=>{const a2=Math.atan2(P.y-e.y,P.x-e.x);e.face=a2;arcAtk(e,a2,1.9,R,.38,D*.85);}});
        e.busy=.72*(n-1)+.38+.6;}
      else if(r<.48){arcAtk(e,a,1.9,R,.95,D*1.15);e.busy=.95+.55;}
      else{arcAtk(e,a,1.9,R,.5,D);e.busy=.5+.5;}
      e.cd=.65+Math.random()*.7;}
  } else if(K==='ranged'){
    if(d>330) step(a); else if(d<170) step(a+Math.PI,.8); else step(a+Math.PI/2*(Math.sin(e.t0*.7)>0?1:-1),.4);
    if(e.cd<=0&&d<430){e.aim={t:.8,track:true,len:d};e.busy=1.15;e.cd=1.8+Math.random()*.8;
      e.sched.push({t:.8,fn:()=>{e.shotId=(e.shotId||0)+1;const t2=pickTarget(e);const aa=Math.atan2(t2.y-e.y,t2.x-e.x);const mage=e.t!=='archer';const vol=!mage&&Math.random()<.3?[-.17,0,.17]:[0];for(const o of vol)spawnProj({x:e.x,y:e.y,vx:Math.cos(aa+o)*(mage?250:400),vy:Math.sin(aa+o)*(mage?250:400),dmg:e.def.dmg*(vol.length>1?.7:1),friendly:false,kind:mage?'boltE':'arrowE',life:mage?2.4:1.4,r:mage?8:5,homingP:mage});if(mage)sfx('bolt');}});}
  } else if(K==='lunge'){
    if(d>140) step(a+Math.sin(e.t0*1.4)*.5); else if(e.cd>0) step(a+Math.PI/2,.5);
    if(e.cd<=0&&d<170){const la=a;e.aim={t:.45,len:150,lunge:true};e.busy=.45+.3+.45;e.cd=1.3+Math.random()*.8;
      e.dashSeq=(e.dashSeq||0)+1;e.sched.push({t:.45,fn:()=>{e.dash={dx:Math.cos(la),dy:Math.sin(la),sp:440,t:.3,dmg:e.def.dmg};}});
      if(Math.random()<.3){e.busy+=.95;e.sched.push({t:1.05,fn:()=>{const a2=Math.atan2(P.y-e.y,P.x-e.x);e.face=a2;e.aim={t:.35,len:150,lunge:true};e.dashSeq++;
        e.sched.push({t:.35,fn:()=>{e.dash={dx:Math.cos(a2),dy:Math.sin(a2),sp:460,t:.3,dmg:e.def.dmg};}});}});}}
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
    warnFx(e);e.sched.push({t:.65,fn:()=>{e.dash={dx:Math.cos(la),dy:Math.sin(la),sp:640,t:.45,dmg:D*1.1,unblock:true};}});}
  else{for(let i=1;i<=6;i++){const sp=(i%2?1:-1)*(i>3?.2:.08);const x=e.x+Math.cos(a+sp)*(50+i*62),y=e.y+Math.sin(a+sp)*(50+i*62);circAtk(x,y,46+i*3,.7+i*.08,D*.7,{owner:e,frost:true,onFire:()=>spikeFx(x,y)});}e.busy=1.35;}
  e.cd=.5+Math.random()*.6;
}
function jarlAI(e,tg,d,a,step,dm){
  if(!e.summoned&&e.hp<e.maxHp*.5){e.summoned=true;e.busy=1.2;banner('Hrafnkel kalder på sine huskarle','', 'frost');sfx('horn');
    for(const s of [-1,1]){const x=e.x+Math.cos(a+s*1.6)*90,y=e.y+Math.sin(a+s*1.6)*90;const m=spawnEnemy('minion',x,y,{aggro:true});m.home={x:e.home.x,y:e.home.y};burst(x*S,groundY(x,y)+.5,y*S,40,3,1,.4,.4,1.6,2.4,{grav:1});}
    return;}
  if(e.cd>0){if(d>95)step(a);return;}
  const r=Math.random(), D=e.def.dmg*dm;
  if(d<135){
    const wu=e.t==='jarl'?.12:0;
    if(r<.5){arcAtk(e,a,2.6,108,.62+wu,D);e.busy=.62+wu+.5;}
    else{arcAtk(e,a,2.6,108,.58,D);e.sched.push({t:.78,fn:()=>{const a2=Math.atan2(P.y-e.y,P.x-e.x);e.face=a2;arcAtk(e,a2,2.8,112,.45+wu,D*1.1);}});e.busy=.78+.45+.6;}
    e.cd=.5+Math.random()*.6;
  } else if(d<420){
    const tx=tg.x,ty=tg.y;e.air=1;e.airT=0;
    circAtk(tx,ty,95,1.0,D*1.25,{owner:e,unblock:true,onFire:()=>{e.x=tx;e.y=ty;collide(e);e.air=0;G.shake=.5;sfx('boom');const gy=groundY(tx,ty);burst(tx*S,gy+.2,ty*S,60,6,.9,.6,.85,.9,1,{sys:FXN,up:.6,grav:3,drag:2,alpha:.6,grow:2});}});
    e.busy=1.0+.75;e.cd=.6+Math.random()*.5;
  } else step(a);
}
function jotunAI(e,tg,d,a,step,dm){
  if(!e.phase2&&e.hp<e.maxHp*.5){e.phase2=true;e.busy=1.4;banner('Rimtursen raser','Isen selv vender sig mod dig','frost');sfx('boom');G.shake=.8;frostRain(e,dm);return;}
  if(e.cd>0){if(d>150)step(a);return;}
  const r=Math.random(), D=e.def.dmg*dm;
  if(d<210){
    if(r<.45){circAtk(e.x,e.y,180,1.15,D*1.05,{owner:e,frost:true,unblock:true,onFire:()=>{G.shake=.7;sfx('boom');const gy=groundY(e.x,e.y);for(let i=0;i<90;i++){const aa=Math.random()*TAU,s=rand(6,12);FXA.emit(e.x*S,gy+.3,e.y*S,Math.cos(aa)*s,rand(.5,3),Math.sin(aa)*s,rand(.5,1),rand(.3,.6),.6,1.5,2.2,1,4,2.5,1);}}});e.busy=1.15+.85;}
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
    h.inner.scale.set(k,1,k); h.inner.material.opacity=.18+.3*k; if(h.unblock) h.mesh.children[1].material.opacity=.55+.45*Math.abs(Math.sin(G.time*14));
    if(h.t>=h.wind){
      for(const tg of targets()){
        if(h.k==='circle'){if(Math.hypot(tg.x-h.x,tg.y-h.y)<h.r+tg.r*.5)hurt(tg,h.dmg,h.x,h.y,h.owner,!!h.unblock);}
        else{const d=Math.hypot(tg.x-ox,tg.y-oy);if(d<h.range+tg.r&&Math.abs(angDiff(Math.atan2(tg.y-oy,tg.x-ox),h.ang))<h.arc/2+.12)hurt(tg,h.dmg,ox,oy,h.owner,!!h.unblock);}
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
      if(p.friendly){for(const e of G.enemies){if(e.dead||e.dormant||(p.hitSet&&p.hitSet.includes(e)))continue;if(Math.hypot(e.x-p.x,e.y-p.y)<e.r+p.r){damageEnemy(e,p.dmg,{});if(p.pierce>0){p.pierce--;(p.hitSet=p.hitSet||[]).push(e);}else dead=true;break;}}}
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
