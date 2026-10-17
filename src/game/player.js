'use strict';
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
  if(k==='roll'){ if(p.st<=0) return false; spend(eqHas('ravnefjer')?12:20); let dx=ix,dy=iy; if(!dx&&!dy){dx=Math.cos(p.face);dy=Math.sin(p.face);} p.rdx=dx;p.rdy=dy;p.roll=.36;p.rollStart=G.time;p.rollId=(p.rollId||0)+1;p.iframes=Math.max(p.iframes,.32);p.act=null;sfx('roll');
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
    if(p.cls==='berserker'){spend(15);p.combo^=1;p.act={kind:'atk',t:0,dur:.46,hit:.18,move:.25,arc:2.3,fn:()=>{swipe(p.x,p.y,p.face,2.3,64);meleeHit(64,2.3,17);}};sfx('swing');return true;}
    if(p.cls==='skjoldmo'){spend(11);p.combo^=1;p.act={kind:'atk',t:0,dur:.32,hit:.11,move:.35,arc:1.6,fn:()=>{swipe(p.x,p.y,p.face,1.6,60);meleeHit(60,1.6,17);}};sfx('swing');return true;}
    if(p.cls==='volve'){spend(12);p.act={kind:'cast',t:0,dur:.34,hit:.12,move:.4,fn:()=>{spawnProj({x:p.x+Math.cos(p.face)*16,y:p.y+Math.sin(p.face)*16,vx:Math.cos(p.face)*580,vy:Math.sin(p.face)*580,dmg:14*atkMult(),friendly:true,kind:'bolt',life:1.1,r:7});sfx('bolt');}};return true;}
  }
  if(k==='rmb'){
    if(p.cls==='skjoldmo') return true;
    if(p.st<=0) return false;
    if(p.cls==='berserker'){spend(34);p.act={kind:'heavy',t:0,dur:.8,hit:.44,move:.15,fn:()=>{swipe(p.x,p.y,0,TAU,82,0xffd9a0,.28);meleeHit(82,TAU,29,{stagger:true,kb:30});G.shake=.3;}};sfx('heavy');return true;}
    if(p.cls==='volve'){spend(32);p.act={kind:'nova',t:0,dur:.64,hit:.34,move:.1,fn:()=>{const gy=groundY(p.x,p.y);
        for(let i=0;i<70;i++){const a=Math.random()*TAU,s=rand(5,9);FXA.emit(p.x*S,gy+.3,p.y*S,Math.cos(a)*s,rand(.2,1.2),Math.sin(a)*s,rand(.4,.7),rand(.25,.5),.7,1.6,2.4,1,0,3);}
        swipe(p.x,p.y,0,TAU,128,0x9fdcff,.35,.3);
        for(const e of G.enemies){if(e.dead)continue;if(dist(p,e)<128+e.r){damageEnemy(e,24*atkMult(),{stagger:true});e.slow=3;}}sfx('nova');G.shake=.2;}};return true;}
  }
  return false;
}
function updPlayer(dt){
  const p=P;
  p.iframes=Math.max(0,p.iframes-dt);p.perfectT=Math.max(0,(p.perfectT||0)-dt);p.stagger=Math.max(0,p.stagger-dt);p.specialT=Math.max(0,p.specialT-dt);p.rage=Math.max(0,p.rage-dt);p.stDelay=Math.max(0,(p.stDelay||0)-dt);
  if(p.dead) return;
  if(p.roll<=0&&!p.dash&&!(p.act&&p.act.done&&p.act.kind==='heavy')) p.face=G.lock?Math.atan2(G.lock.y-p.y,G.lock.x-p.x):Math.atan2(mouseW.y-p.y,mouseW.x-p.x);
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
function hurt(tg,dmg,fx,fy,src=null,unblock=false){ if(tg===P) hurtPlayer(dmg,fx,fy,src,unblock); else if(tg===C) hurtComp(dmg); }
function hurtPlayer(dmg,fx,fy,src=null,unblock=false){
  const p=P; if(p.dead||G.state!=='play') return;
  // perfect dodge: the blow lands in the first moments of a roll
  if(p.iframes>0){ if(p.roll>0&&G.time-(p.rollStart||0)<.2&&!p.perfectT){p.perfectT=.6;G.slowmo=.45;p.st=Math.min(maxSt(),p.st+25);num(p.x,p.y,'Undveget','heal');sfx('dodge');burst(p.x*S,groundY(p.x,p.y)+1,p.y*S,26,3,.6,.25,.8,1.4,2.4,{grav:-1});} return; }
  const facing=Math.abs(angDiff(Math.atan2(fy-p.y,fx-p.x),p.face))<1.35;
  // parry: block pressed just before the hit
  if(p.cls==='skjoldmo'&&p.blocking&&facing&&!unblock&&G.time-(p.blockStart||-9)<.22){
    sfx('parry');G.slowmo=.35;G.shake=.25;num(p.x,p.y,'Parade!','crit');
    burst((p.x+Math.cos(p.face)*16)*S,groundY(p.x,p.y)+1.1,(p.y+Math.sin(p.face)*16)*S,40,6,.5,.2,3,2.4,1.2,{grav:6});
    if(src&&!src.dead&&!src.boss){cancelAttacks(src);src.stun=1.6;src.parried=1.6;src.stunId=(src.stunId||0)+1;}
    else if(src&&!src.dead){src.parried=.9;src.stun=Math.max(src.stun,.35);}
    p.blockStart=-9; return;
  }
  if(unblock&&p.blocking) toast('Det angreb kan ikke blokeres. Rul!');
  if(p.blocking&&!unblock){if(facing){
      p.st-=dmg*1.15;sfx('block');burst((p.x+Math.cos(p.face)*14)*S,groundY(p.x,p.y)+1,(p.y+Math.sin(p.face)*14)*S,18,4,.35,.15,3,2.4,1.2,{grav:9});
      if(p.st<=0){p.st=0;p.stagger=.7;dmg*=.5;toast('Din garde er brudt');}else{dmg*=.12;}
      p.stDelay=.6;}}
  if(eqHas('brynje')) dmg*=.85;
  if(eqHas('lindskael')) dmg*=.8;
  dmg=Math.round(dmg); if(dmg<=0) return;
  p.hp-=dmg; p.iframes=.22; p.hitId=(p.hitId||0)+1; num(p.x,p.y,dmg,'hurt');
  if(dmg>6){p.stagger=Math.max(p.stagger,.2);if(p.act&&p.act.kind!=='heavy')p.act=null;}
  G.shake=Math.min(.6,G.shake+dmg/60); sfx('hurt'); G.hurtFx=Math.min(1,.35+dmg/35);
  burst(p.x*S,groundY(p.x,p.y)+1,p.y*S,12,2.5,.5,.18,.5,.04,.03,{sys:FXN,grav:7,alpha:.9});
  if(p.hp<=0) die();
}
function die(){
  if(G.sim){P.dead=true;P.hp=0;return;}
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
