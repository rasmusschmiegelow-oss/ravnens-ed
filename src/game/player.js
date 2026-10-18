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
    // a foe that has not noticed you and has its back turned takes a stab in the back
    const back=!e.aggro&&!e.boss&&!e.dormant&&Math.abs(angDiff(Math.atan2(P.y-e.y,P.x-e.x),e.face))>2.1;
    damageEnemy(e,dmg*atkMult(),back?{...opts,back:true}:opts); hit=true; if(!opts.noRune) runeHit(e,dmg*atkMult());
  }
  if(hit){G.hitStop=opts.stagger?.09:.055;}
}
/* --- Weapon arts: one per weapon, on its own key and cooldown */
const ARTS={
  berserker:{name:'Jordkløver',cd:9,st:30,anim:'2H_Melee_Attack_Chop',desc:'Spring frem og knus jorden. Bryder fjendens balance.'},
  tvilling:{name:'Ulvestorm',cd:8,st:28,anim:'2H_Melee_Attack_Spinning',desc:'Fem lynhurtige hug, mens du går frem.'},
  skjoldmo:{name:'Valkyriestød',cd:7,st:24,anim:'1H_Melee_Attack_Stab',desc:'Et lynstød gennem fjenderne. Intet rammer dig under stødet, og lige efter pareres alt, du blokerer.'},
  langsvaerd:{name:'Tyrs dom',cd:10,st:34,anim:'2H_Melee_Attack_Slice',desc:'Et langsomt, knusende hug. Intet kan lamme dig, mens du slår.'},
  volve:{name:'Runebrand',cd:9,st:26,anim:'Spellcasting',desc:'Brænd en rune i jorden, hvor du sigter. Den eksploderer og bremser fjender.'},
  galdrestav:{name:'Seiðstråle',cd:10,st:30,anim:'1H_Ranged_Shooting',desc:'En stråle af seiðr, der brænder alt på en lige linje.'},
};
const artKey=()=>G.eq&&G.eq.arm&&ARTS[G.eq.arm]?G.eq.arm:P.cls;
const artCd=()=>ARTS[artKey()].cd*(eqHas('garmtand')?.7:1)*G.vb.cd;
const FATAL={berserker:['2H_Melee_Attack_Stab',30],tvilling:['Dualwield_Melee_Attack_Stab',24],skjoldmo:['1H_Melee_Attack_Stab',27],langsvaerd:['2H_Melee_Attack_Stab',34],volve:['2H_Melee_Attack_Stab',24],galdrestav:['1H_Melee_Attack_Stab',22]};
const RUNEB=[];
const BEAM=new THREE.Mesh(new THREE.BoxGeometry(1,.14,.14),glowMat(new THREE.Color(1.2,2.6,4.2))); BEAM.visible=false; scene.add(BEAM);
/** A broken foe close enough for a fatal blow. */
function fatalTarget(){let best=null,bd=1e9;for(const e of G.enemies){if(e.dead||!(e.broken>0))continue;const d=dist(P,e);if(d<74+e.r&&d<bd){bd=d;best=e;}}return best;}
function fatalBlow(e){
  const p=P,[anim,base]=FATAL[artKey()],a=Math.atan2(e.y-p.y,e.x-p.x); p.face=a;
  const gap=Math.max(0,dist(p,e)-e.r-p.r-6); p.dash=gap>4?{dx:Math.cos(a),dy:Math.sin(a),sp:gap/.16,t:.16}:null;
  p.iframes=Math.max(p.iframes,.8); G.fatalT=.9;
  p.act={kind:'crit',anim,t:0,dur:.8,hit:.34,move:0,fit:.8,lockFace:true,fn:()=>{if(e.dead)return;damageEnemy(e,base*atkMult(),{fatal:true});
    G.hitStop=.18;G.slowmo=Math.max(G.slowmo,.4);G.shake=.5;sfx('heavy');sfx('parry');const gy=groundY(e.x,e.y)+1.3;
    burst(e.x*S,gy,e.y*S,50,5,.6,.25,2.8,.6,.3,{grav:6});burst(e.x*S,gy,e.y*S,24,3,.5,.12,.5,.04,.03,{sys:FXN,grav:8,alpha:.9});}};
  sfx('swing'); return true;
}
function weaponArt(){
  const p=P,k=artKey(),A0=ARTS[k],fx=Math.cos(p.face),fy=Math.sin(p.face);
  if(p.artT>0){toast(A0.name+' er ikke klar endnu.');return true;}
  if(p.st<A0.st*.5) return false;
  spend(A0.st); p.artT=artCd(); p.artUses=(p.artUses||0)+1; metaInc('arts');
  const act={kind:'art',anim:A0.anim,t:0,move:0};
  if(k==='berserker'){p.dash={dx:fx,dy:fy,sp:300,t:.36};p.iframes=Math.max(p.iframes,.3);
    Object.assign(act,{dur:.8,hit:.42,fit:.8,fn:()=>{const cx=p.x+fx*28,cy=p.y+fy*28;swipe(cx,cy,0,TAU,96,0xffc080,.3,.3);
      for(const e of G.enemies){if(e.dead)continue;if(Math.hypot(e.x-cx,e.y-cy)<96+e.r)damageEnemy(e,40*atkMult(),{stagger:true,poiseMult:2.2,kb:40});}
      const gy=groundY(cx,cy);burst(cx*S,gy+.2,cy*S,70,7,.9,.5,.8,.75,.7,{sys:FXN,up:.8,grav:9,drag:1.5,alpha:.8,grow:1.5});G.shake=.6;sfx('boom');}});}
  else if(k==='tvilling'){Object.assign(act,{dur:1.05,hit:.12,fit:1.05,move:.45,fn:()=>{},
    hits:[.12,.3,.48,.66,.84].map(t=>({t,fn:()=>{swipe(p.x,p.y,p.face,1.9,64);meleeHit(64,1.9,9,{poiseMult:1.3});sfx('swing');}}))});}
  else if(k==='skjoldmo'){p.dash={dx:fx,dy:fy,sp:620,t:.22};p.iframes=Math.max(p.iframes,.3);
    Object.assign(act,{dur:.5,hit:.08,fit:.55,fn:()=>{swipe(p.x,p.y,p.face,1.2,74,0xbfe2ff);meleeHit(74,1.2,15,{poiseMult:1.5});},
      hits:[{t:.2,fn:()=>{swipe(p.x,p.y,p.face,1.2,74,0xbfe2ff);meleeHit(74,1.2,15,{poiseMult:1.5});p.parryOpenT=.8;}}]});}
  else if(k==='langsvaerd'){Object.assign(act,{dur:1.15,hit:.72,fit:1.15,armor:true,fn:()=>{swipe(p.x,p.y,p.face,2.4,108,0xffd9a0,.32);meleeHit(108,2.4,62,{stagger:true,poiseMult:2.5,kb:30});G.shake=.5;sfx('boom');}});}
  else if(k==='volve'){let tx=G.lock&&!G.lock.dead?G.lock.x:mouseW.x, ty=G.lock&&!G.lock.dead?G.lock.y:mouseW.y; const d=Math.hypot(tx-p.x,ty-p.y);
    if(d>300){tx=p.x+(tx-p.x)/d*300;ty=p.y+(ty-p.y)/d*300;}
    Object.assign(act,{dur:.6,hit:.3,fit:.8,move:.2,fn:()=>runeBrand(tx,ty)});}
  else if(k==='galdrestav'){Object.assign(act,{dur:1.3,hit:.15,fit:1.3,move:.15,beam:true,fn:()=>sfx('nova'),
    hits:Array.from({length:8},(_,i)=>({t:.2+i*.14,fn:beamTick}))});}
  p.act=act; sfx(k==='volve'||k==='galdrestav'?'rune':'heavy'); return true;
}
function runeBrand(x,y){
  const g=new THREE.Mesh(new THREE.RingGeometry(.75,1,40).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:new THREE.Color(2.6,1.4,.4),transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false}));
  g.position.set(x*S,groundY(x,y)+.08,y*S); g.scale.setScalar(95*S); scene.add(g); RUNEB.push({x,y,t:0,mesh:g}); sfx('rune');
}
function updRuneBrands(dt){
  for(let i=RUNEB.length-1;i>=0;i--){const r=RUNEB[i];r.t+=dt;r.mesh.rotation.y+=dt*2;r.mesh.material.opacity=.5+.4*Math.abs(Math.sin(r.t*12));
    if(r.t>=.8){scene.remove(r.mesh);r.mesh.geometry.dispose();r.mesh.material.dispose();RUNEB.splice(i,1);
      for(const e of G.enemies){if(e.dead)continue;if(Math.hypot(e.x-r.x,e.y-r.y)<95+e.r){damageEnemy(e,40*atkMult()*(T('v_galdr')?1.2:1),{stagger:true,poiseMult:1.8});e.slow=4;}}
      const gy=groundY(r.x,r.y);for(let k=0;k<80;k++){const a=Math.random()*TAU,s=rand(3,8);FXA.emit(r.x*S,gy+.3,r.y*S,Math.cos(a)*s,rand(1,5),Math.sin(a)*s,rand(.4,.8),rand(.25,.5),2.8,1.4,.4,1,3,2,1);}
      G.shake=Math.max(G.shake,.35);sfx('boom');}}
}
function beamTick(){
  const p=P,L=380,ex=p.x+Math.cos(p.face)*L,ey=p.y+Math.sin(p.face)*L;
  for(const e of G.enemies){if(e.dead||e.dormant)continue;if(segDist(e.x,e.y,p.x,p.y,ex,ey)<e.r+16&&Math.hypot(e.x-p.x,e.y-p.y)<L+e.r)damageEnemy(e,6*atkMult()*(T('v_galdr')?1.2:1),{poiseMult:.9});}
  const gy=groundY(p.x,p.y)+1.25;for(let i=0;i<14;i++){const t=Math.random()*L;FXA.emit((p.x+Math.cos(p.face)*t)*S,gy,(p.y+Math.sin(p.face)*t)*S,rand(-.5,.5),rand(-.2,.6),rand(-.5,.5),.3,rand(.3,.5),1,2.2,3.6,1,0,1,1);}
}
function tryAction(k,ix,iy){
  const p=P;
  if(k==='art') return weaponArt();
  if(k==='roll'){ if(p.st<=0) return false; spend((eqHas('ravnefjer')?12:20)*(T('b_storm')?.7:1)*G.vb.roll*(eqHas('ulvehjerte')?.8:1)); if(T('b_storm'))p.stormT=1.2; let dx=ix,dy=iy; if(!dx&&!dy){dx=Math.cos(p.face);dy=Math.sin(p.face);} p.rdx=dx;p.rdy=dy;p.roll=.36;p.rollStart=G.time;p.rollId=(p.rollId||0)+1;p.iframes=Math.max(p.iframes,.32);p.act=null;sfx('roll');
    const gy=groundY(p.x,p.y); burst(p.x*S,gy+.1,p.y*S,14,2.2,.7,.5,.85,.9,1,{sys:FXN,up:.5,grav:1,drag:3,alpha:.5,grow:2}); return true;}
  if(k==='heal'){ if(p.flasks<=0){toast('Mjødhornet er tomt. Hvil ved en runesten.');return true;}
    p.act={kind:'heal',t:0,dur:1,hit:.6,move:.35,fn:()=>{p.flasks--;G.tutHealed=true;const h=Math.round(maxHp()*(eqHas('vardeflamme')?.55:.45));p.hp=Math.min(maxHp(),p.hp+h);num(p.x,p.y,'+'+h,'heal');sfx('drink');
      for(let i=0;i<26;i++)FXA.emit(p.x*S+rand(-.4,.4),groundY(p.x,p.y)+rand(.2,1.6),p.y*S+rand(-.4,.4),0,rand(.5,1.6),0,rand(.6,1.2),rand(.2,.4),1.4,1.1,.4,1,0,.5);}}; return true;}
  if(k==='special'){
    if(p.specialT>0) return true;
    if(p.cls==='berserker'){p.rage=T('b_rasende')?12:8;p.specialT=specialCd();G.shake=.4;sfx('heavy');toast('Berserkergang: mere skade, og du heler når du rammer');
      p.act={kind:'roar',t:0,dur:.5,hit:.2,move:0,fn:()=>burst(p.x*S,groundY(p.x,p.y)+1,p.y*S,50,5,.8,.4,2.2,.4,.2,{grav:2})};return true;}
    if(p.cls==='skjoldmo'){ if(p.st<=0) return false; spend(15);p.specialT=specialCd();p.dash={dx:Math.cos(p.face),dy:Math.sin(p.face),sp:540,t:.2};
      p.act={kind:'bash',t:0,dur:.45,hit:.16,move:0,fn:()=>{swipe(p.x,p.y,p.face,1.8,66,0xbfe2ff);const R=T('s_boelge')?84:66,W=T('s_boelge')?1.6:1.1;for(const e of G.enemies){if(e.dead)continue;const d=dist(p,e);if(d<R+e.r&&Math.abs(angDiff(Math.atan2(e.y-p.y,e.x-p.x),p.face))<W){damageEnemy(e,14*atkMult(),{stun:e.boss?.3:T('s_boelge')?2.7:1.7,kb:60});}}G.shake=.25;sfx('block');}};return true;}
    if(p.cls==='volve'){p.specialT=specialCd();sfx('raven');
      p.act={kind:'cast',t:0,dur:.55,hit:.22,move:.2,fn:()=>{const nr=T('v_ravn')?8:5;for(let i=0;i<nr;i++){const a=p.face+(i-(nr-1)/2)*(T('v_ravn')?.24:.35);spawnProj({x:p.x,y:p.y,vx:Math.cos(a)*300,vy:Math.sin(a)*300,dmg:12*atkMult(),friendly:true,kind:'raven',life:3,homing:true,r:8});}}};return true;}
  }
  if(k==='lmb'){
    if(p.st<=0) return false;
    {const fb=fatalTarget(); if(fb) return fatalBlow(fb);}
    const sp=T('s_fart')?.9:1, W=G.eq&&G.eq.arm;
    if(p.cls==='berserker'&&W==='tvilling'){spend(9);p.combo^=1;p.act={kind:'atk',t:0,dur:.3,hit:.1,move:.35,arc:2,fn:()=>{swipe(p.x,p.y,p.face,2,58);meleeHit(58,2,11);}};sfx('swing');return true;}
    if(p.cls==='berserker'){spend(15);p.combo^=1;p.act={kind:'atk',t:0,dur:.46,hit:.18,move:.25,arc:2.3,fn:()=>{swipe(p.x,p.y,p.face,2.3,64);meleeHit(64,2.3,17);}};sfx('swing');return true;}
    if(p.cls==='skjoldmo'&&W==='langsvaerd'){spend(18);p.combo^=1;p.act={kind:'atk',t:0,dur:.55*sp,hit:.24*sp,move:.25,arc:2.4,fn:()=>{swipe(p.x,p.y,p.face,2.4,74);meleeHit(74,2.4,26);}};sfx('swing');return true;}
    if(p.cls==='skjoldmo'){spend(11);p.combo^=1;p.act={kind:'atk',t:0,dur:.32*sp,hit:.11*sp,move:.35,arc:1.6,fn:()=>{swipe(p.x,p.y,p.face,1.6,60);meleeHit(60,1.6,18.5);}};sfx('swing');return true;}
    if(p.cls==='volve'&&W==='galdrestav'){spend(6);p.act={kind:'cast',t:0,dur:.22,hit:.08,move:.5,fn:()=>{spawnProj({x:p.x+Math.cos(p.face)*16,y:p.y+Math.sin(p.face)*16,vx:Math.cos(p.face)*520,vy:Math.sin(p.face)*520,dmg:8*atkMult()*(T('v_galdr')?1.2:1),friendly:true,kind:'bolt',life:1.2,r:6,homing:true,pierce:T('v_bolt')?1:0});sfx('bolt');}};return true;}
    if(p.cls==='volve'){spend(12);p.act={kind:'cast',t:0,dur:.34,hit:.12,move:.4,fn:()=>{spawnProj({x:p.x+Math.cos(p.face)*16,y:p.y+Math.sin(p.face)*16,vx:Math.cos(p.face)*580,vy:Math.sin(p.face)*580,dmg:14*atkMult()*(T('v_galdr')?1.2:1),friendly:true,kind:'bolt',life:1.1,r:7,pierce:T('v_bolt')?1:0});sfx('bolt');}};return true;}
  }
  if(k==='rmb'){
    if(p.cls==='skjoldmo'&&G.eq&&G.eq.arm==='langsvaerd'){if(p.st<=0)return false;spend(32);p.act={kind:'heavy',t:0,dur:.85,hit:.45,move:.15,fn:()=>{swipe(p.x,p.y,p.face,1.4,84,0xffd9a0,.28);meleeHit(84,1.4,44,{stagger:true,kb:20});G.shake=.3;}};sfx('heavy');return true;}
    if(p.cls==='skjoldmo') return true;
    if(p.st<=0) return false;
    if(p.cls==='berserker'){spend(34);p.act={kind:'heavy',t:0,dur:.8,hit:.44,move:.15,fn:()=>{const R=T('b_hvirvel')?102:82;swipe(p.x,p.y,0,TAU,R,0xffd9a0,.28);meleeHit(R,TAU,29*(T('b_hvirvel')?1.25:1),{stagger:true,kb:30});G.shake=.3;}};sfx('heavy');return true;}
    if(p.cls==='volve'){spend(32);p.act={kind:'nova',t:0,dur:.64,hit:.34,move:.1,fn:()=>{const gy=groundY(p.x,p.y);
        for(let i=0;i<70;i++){const a=Math.random()*TAU,s=rand(5,9);FXA.emit(p.x*S,gy+.3,p.y*S,Math.cos(a)*s,rand(.2,1.2),Math.sin(a)*s,rand(.4,.7),rand(.25,.5),.7,1.6,2.4,1,0,3);}
        const NR=T('v_is')?166:128;swipe(p.x,p.y,0,TAU,NR,0x9fdcff,.35,.3);
        for(const e of G.enemies){if(e.dead)continue;if(dist(p,e)<NR+e.r){damageEnemy(e,24*atkMult(),{stagger:true});e.slow=T('v_is')?5:3;}}sfx('nova');G.shake=.2;}};return true;}
  }
  return false;
}
function updPlayer(dt){
  const p=P;
  p.artT=Math.max(0,(p.artT||0)-dt);p.buffT=Math.max(0,(p.buffT||0)-dt);
  if(p.regenT>0&&!p.dead){p.regenT-=dt;p.hp=Math.min(maxHp(),p.hp+p.regenA*dt);if(Math.random()<.3)FXA.emit(p.x*S+rand(-.4,.4),groundY(p.x,p.y)+rand(.2,1.6),p.y*S+rand(-.4,.4),0,rand(.4,1),0,.8,.25,.6,1.8,.8,1,-.2,.5,0);}
  if(eqHas('troldblod')&&p.hp<maxHp()&&!G.sim){G.tbT=(G.tbT||0)-dt;if(G.tbT<=0){G.tbT=.5;G.tbOk=!foesNear(500);}if(G.tbOk)p.hp=Math.min(maxHp(),p.hp+maxHp()*.015*dt);}
  if(p.buffT>0&&Math.random()<.3)FXA.emit(p.x*S+rand(-.3,.3),groundY(p.x,p.y)+rand(.3,1.6),p.y*S+rand(-.3,.3),0,1,0,.5,.25,2.4,.9,.3,1,0,1,0);p.parryOpenT=Math.max(0,(p.parryOpenT||0)-dt);G.fatalT=Math.max(0,(G.fatalT||0)-dt);
  updRuneBrands(dt); BEAM.visible=false;
  p.iframes=Math.max(0,p.iframes-dt);p.perfectT=Math.max(0,(p.perfectT||0)-dt);p.stagger=Math.max(0,p.stagger-dt);p.specialT=Math.max(0,p.specialT-dt);p.rage=Math.max(0,p.rage-dt);p.stormT=Math.max(0,(p.stormT||0)-dt);p.wardT=Math.max(0,(p.wardT||0)-dt);p.stDelay=Math.max(0,(p.stDelay||0)-dt);
  if(p.dead) return;
  // aim assist: the mouse aim snaps to the foe nearest its line
  if(SET.assist&&!G.lock&&!G.padActive&&!TOUCH.on&&!G.sim){const ma=Math.atan2(mouseW.y-p.y,mouseW.x-p.x);let best=null,bs=.45;for(const e of G.enemies){if(e.dead||e.dormant||!e.aggro)continue;const d=dist(p,e);if(d>320)continue;const da=Math.abs(angDiff(Math.atan2(e.y-p.y,e.x-p.x),ma));if(da<bs){bs=da;best=e;}}if(best){mouseW.x=best.x;mouseW.y=best.y;}}
  if(p.roll<=0&&!p.dash&&!(p.act&&p.act.done&&p.act.kind==='heavy')&&!(p.act&&p.act.lockFace)) p.face=G.lock?Math.atan2(G.lock.y-p.y,G.lock.x-p.x):Math.atan2(mouseW.y-p.y,mouseW.x-p.x);
  let ix=(held('right')?1:0)-(held('left')?1:0), iy=(held('down')?1:0)-(held('up')?1:0);
  if(G.padMove&&Math.hypot(G.padMove.x,G.padMove.y)>.2){ix=G.padMove.x;iy=G.padMove.y;}
  const il=Math.hypot(ix,iy); if(il){ix/=il;iy/=il;}
  if(p.act){const A=p.act;A.t+=dt;if(!A.done&&A.t>=A.hit){A.done=true;A.fn&&A.fn();}
    if(A.hits)for(const h of A.hits)if(!h.done&&A.t>=h.t&&p.act===A){h.done=true;h.fn();}
    if(A.beam&&A.t>.15){const L=380,gy=groundY(p.x,p.y)+1.25;BEAM.visible=true;BEAM.position.set((p.x+Math.cos(p.face)*L/2)*S,gy,(p.y+Math.sin(p.face)*L/2)*S);BEAM.rotation.set(0,-p.face,0);BEAM.scale.set(L*S,1+Math.sin(G.time*40)*.25,1);}
    if(p.act===A&&A.t>=A.dur)p.act=null;}
  p.blocking=p.cls==='skjoldmo'&&mouse.r&&!p.act&&p.roll<=0&&p.stagger<=0&&p.st>0;
  if(buf&&G.time-buf.t>.4) buf=null;
  if(p.mount) buf=null; // no fighting from the saddle
  if(buf){const A=p.act;const can=p.stagger<=0&&p.roll<=0&&!p.dash&&(!A||(buf.k==='roll'&&A.kind!=='heal'&&A.done&&A.t>A.hit+.05)||(buf.k==='lmb'&&A.kind==='atk'&&A.t>A.dur*.72));
    if(can){if(A)p.act=null;if(tryAction(buf.k,ix,iy))buf=null;}}
  let vx=0,vy=0;
  if(p.roll>0){p.roll-=dt;const k=p.roll/.36;vx=p.rdx*(260+260*k);vy=p.rdy*(260+260*k);}
  else if(p.dash){p.dash.t-=dt;vx=p.dash.dx*p.dash.sp;vy=p.dash.dy*p.dash.sp;if(p.dash.t<=0)p.dash=null;}
  else if(p.stagger<=0){let sp=p.mount?390:158*(1+(p.stats.smi-10)*.012)*(T('s_fart')?1.1:1)*(eqHas('ulvehjerte')?1.1:1);if(p.act)sp*=p.act.move??.3;if(p.blocking)sp*=.45;vx=ix*sp;vy=iy*sp;}
  p.x+=vx*dt;p.y+=vy*dt;
  const spd=Math.hypot(vx,vy); if(p.mount&&spd>10) p.face=lerpAng(p.face,Math.atan2(vy,vx),Math.min(1,dt*8));p.move=lerp(p.move,clamp(spd/158,0,1.2),Math.min(1,dt*10));p.phase+=dt*spd*.055;
  if(spd>20&&p.roll<=0&&!p.mount){p.stepT-=dt;if(p.stepT<=0){p.stepT=.33;sfx(inDungeon(p.x,p.y)?'stepStone':inAsh(p.x)?'stepAsh':Math.hypot(p.x-1800,p.y-2380)<300||Math.hypot(p.x-4350,p.y-2380)<260?'stepWood':'step');p.foot=-(p.foot||1);{const ma=Math.atan2(vy,vx);if(!inDungeon(p.x,p.y))decal(TEX_FOOT,p.x+Math.cos(ma+Math.PI/2)*2.6*p.foot,p.y+Math.sin(ma+Math.PI/2)*2.6*p.foot,Math.PI/2-ma,.24,.42,[.32,.4,.55],22,.55);}FXN.emit(p.x*S,groundY(p.x,p.y)+.05,p.y*S,rand(-.3,.3),.3,rand(-.3,.3),.6,.35,.9,.93,1,.35,0,2,1.5);}}
  collide(p);
  if(!p.act&&p.roll<=0&&p.stDelay<=0) p.st=Math.min(maxSt(),p.st+(p.blocking?12:52)*(eqHas('ulvepels')?1.3:1)*(T('v_spind')?1.3:1)*dt);
  p.hpLag+= (p.hp-p.hpLag)*Math.min(1,dt*(p.hpLag>p.hp?1.4:12));
  if(p.rage>0&&Math.random()<.5)FXA.emit(p.x*S+rand(-.3,.3),groundY(p.x,p.y)+rand(.3,1.6),p.y*S+rand(-.3,.3),0,1.2,0,.5,.3,2,.35,.15,1,0,1);
  // rune stain pickup
  if(G.stain&&dist(p,G.stain)<34){p.runes+=G.stain.amount;toast('Du genvandt '+G.stain.amount+' runer');sfx('rune');G.stain=null;}
  // light runestones
  for(const rs of RUNESTONES){if(!rs.lit&&dist(p,rs)<130){rs.lit=true;RS_MESH[rs.id].mat.emissiveIntensity=2.6;RS_MESH[rs.id].light.intensity=22;banner('RUNESTEN TÆNDT',rs.name);sfx('rune');}}
}
function hurt(tg,dmg,fx,fy,src=null,unblock=false,soft=false){ if(tg===P) hurtPlayer(dmg,fx,fy,src,unblock,soft); else if(tg===C) hurtComp(dmg); }
function hurtPlayer(dmg,fx,fy,src=null,unblock=false,soft=false){
  const p=P; if(p.dead||G.state!=='play') return;
  if(p.mount&&!(p.iframes>0)) dismount(true);
  // perfect dodge: the blow lands in the first moments of a roll
  if(p.iframes>0){ if(p.roll>0&&G.time-(p.rollStart||0)<.2&&!p.perfectT){p.perfectT=.6;G.slowmo=.45;metaInc('dodges');p.st=Math.min(maxSt(),p.st+25);num(p.x,p.y,'Undveget','heal');sfx('dodge');burst(p.x*S,groundY(p.x,p.y)+1,p.y*S,26,3,.6,.25,.8,1.4,2.4,{grav:-1});} return; }
  const facing=Math.abs(angDiff(Math.atan2(fy-p.y,fx-p.x),p.face))<1.35;
  // parry: block pressed just before the hit
  if(p.cls==='skjoldmo'&&p.blocking&&facing&&!unblock&&!soft&&(G.time-(p.blockStart||-9)<(T('s_vindue')?.33:.22)||p.parryOpenT>0)){
    if(T('s_sang')){const h=Math.round(maxHp()*.06);p.hp=Math.min(maxHp(),p.hp+h);}
    sfx('parry');G.slowmo=.35;G.shake=.25;num(p.x,p.y,'Parade!','crit');metaInc('parries');
    burst((p.x+Math.cos(p.face)*16)*S,groundY(p.x,p.y)+1.1,(p.y+Math.sin(p.face)*16)*S,40,6,.5,.2,3,2.4,1.2,{grav:6});
    if(src&&!src.dead&&!src.boss){cancelAttacks(src);src.stun=1.6;src.parried=1.6;src.broken=1.6;src.stunId=(src.stunId||0)+1;}
    else if(src&&!src.dead){src.parried=.9;src.stun=Math.max(src.stun,.35);}
    p.blockStart=-9; return;
  }
  if(T('v_skjold')&&!p.wardT){p.wardT=12;num(p.x,p.y,'Opslugt','heal');sfx('parry');burst(p.x*S,groundY(p.x,p.y)+1,p.y*S,30,3,.5,.25,1,1.6,2.6,{grav:-1});return;}
  if(unblock&&p.blocking) toast('Det angreb kan ikke blokeres. Rul!');
  if(p.blocking&&!unblock&&!soft){if(facing){
      p.st-=dmg*.95*(T('s_jern')?.6:1);sfx('block');burst((p.x+Math.cos(p.face)*14)*S,groundY(p.x,p.y)+1,(p.y+Math.sin(p.face)*14)*S,18,4,.35,.15,3,2.4,1.2,{grav:9});
      if(p.st<=0){p.st=0;p.stagger=.7;dmg*=.5;toast('Din garde er brudt');}else{dmg*=.12;}
      p.stDelay=.6;}}
  dmg*=nightMult(src)*DIFF[SET.diff].dmg*(1+.35*(G.ng||0))*(G.mode==='valhalla'?G.vScaleD||1:1);
  if(eqHas('brynje')) dmg*=.85;
  if(eqHas('lindskael')) dmg*=.8;
  if(eqHas('askebrynje')) dmg*=.75;
  dmg*=G.vb.def*(p.buffT>0?.85:1)*(eqHas('jarnring')?.9:1);
  dmg=Math.round(dmg); if(dmg<=0) return;
  p.hp-=dmg; p.iframes=.22; p.hitId=(p.hitId||0)+1; num(p.x,p.y,dmg,'hurt');
  if(dmg>6&&!soft&&!(p.act&&p.act.armor)){p.stagger=Math.max(p.stagger,.2);if(p.act&&p.act.kind!=='heavy'&&p.act.kind!=='crit')p.act=null;}
  G.shake=Math.min(.6,G.shake+dmg/60); sfx('hurt'); G.hurtFx=Math.min(1,.35+dmg/35);
  burst(p.x*S,groundY(p.x,p.y)+1,p.y*S,12,2.5,.5,.18,.5,.04,.03,{sys:FXN,grav:7,alpha:.9});
  if(p.hp<=0) die();
}
function die(){
  if(P.mount) dismount(false);
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
const compName=()=>C&&C.kind==='eir'?'Eir':'Astrid';
function dismissCompanion(){if(!C)return;scene.remove(CM.root);C=null;CM=null;G.flags.comp=null;}
function makeCompanion(kind='astrid'){
  if(C) dismissCompanion();
  C={kind,x:P.x-30,y:P.y+30,r:13,hp:kind==='eir'?130:150,maxHp:kind==='eir'?130:150,down:false,cd:0,healT:0,face:0,phase:0,move:0,t:0,sayT:0};
  CM=buildNPC(kind);CM.root.position.set(C.x*S,groundY(C.x,C.y),C.y*S);G.flags.comp=kind;
}
function hurtComp(dmg){if(!C||C.down)return;C.hp-=dmg;num(C.x,C.y,Math.round(dmg),'hurt');if(C.hp<=0){C.hp=0;C.down=true;C.downId=(C.downId||0)+1;toast(compName()+' er faldet. Gå hen til hende og tryk '+actLabel('interact')+' for at hjælpe hende op.');}}
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
  C.cd-=dt; C.healT=Math.max(0,C.healT-dt);
  // Eir: heals you when you are hurt, otherwise throws frost shards
  if(C.kind==='eir'){
    if(!P.dead&&P.hp<maxHp()*.5&&C.healT<=0&&dist(C,P)<420){C.healT=G.flags.eirDone?9:14;C.healId=(C.healId||0)+1;const h=Math.round(maxHp()*(G.flags.eirDone?.35:.25));P.hp=Math.min(maxHp(),P.hp+h);num(P.x,P.y,'+'+h,'heal');sfx('rune');
      for(let i=0;i<30;i++)FXA.emit(P.x*S+rand(-.5,.5),groundY(P.x,P.y)+rand(.1,1.8),P.y*S+rand(-.5,.5),0,rand(.4,1.4),0,rand(.7,1.3),rand(.2,.4),.6,1.8,.8,1,-.2,.5);}
    else if(tgt&&C.cd<=0){C.face=Math.atan2(tgt.y-C.y,tgt.x-C.x);C.cd=1.8;C.shotId=(C.shotId||0)+1;spawnProj({x:C.x,y:C.y,vx:Math.cos(C.face)*480,vy:Math.sin(C.face)*480,dmg:7+P.level*1.1,friendly:true,kind:'bolt',life:1,r:6});}
    return;
  }
  if(tgt){C.face=Math.atan2(tgt.y-C.y,tgt.x-C.x);if(C.cd<=0){C.cd=1.15;C.shotId=(C.shotId||0)+1;spawnProj({x:C.x,y:C.y,vx:Math.cos(C.face)*620,vy:Math.sin(C.face)*620,dmg:(9+P.level*1.4)*((G.flags.appr||0)>=5?1.25:1)*(G.flags.astridWitnessed?1.2:1)*astridBonus(),friendly:true,kind:G.flags.eyvindDone?'arrowF':'arrow',life:1,r:5});}}
}
