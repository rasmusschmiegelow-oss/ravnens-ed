'use strict';
/* =========================================================
   RENDER SYNC
   ========================================================= */
/* --- Weapon trail: a fading ribbon from hand to blade tip while swinging */
const TRAIL_N=16, trailPts=[];
const trailGeo=new THREE.BufferGeometry(); trailGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(TRAIL_N*2*3),3)); trailGeo.setAttribute('color',new THREE.BufferAttribute(new Float32Array(TRAIL_N*2*3),3));
{const idx=[];for(let i=0;i<TRAIL_N-1;i++){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}trailGeo.setIndex(idx);}
const trail=new THREE.Mesh(trailGeo,new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
trail.frustumCulled=false; scene.add(trail);
const _h=new THREE.Vector3(), _c=new THREE.Vector3();
function updTrail(dt){
  for(const q of trailPts) q.age+=dt;
  while(trailPts.length&&trailPts[0].age>.2) trailPts.shift();
  const A=P&&P.act, swinging=A&&(A.kind==='atk'||A.kind==='heavy'||A.kind==='bash'||A.kind==='crit'||(A.kind==='art'&&!A.beam&&A.anim!=='Spellcasting'))&&(P.cls!=='volve'||A.kind==='crit')&&PM;
  if(swinging){const hand=PM.bone('handslot.r');if(hand){hand.getWorldPosition(_h);_c.set(P.x*S,groundY(P.x,P.y)+1.15,P.y*S);const dir=_h.clone().sub(_c).setY(0).normalize();
      const len=P.cls==='berserker'?1.15:.95;trailPts.push({a:_h.clone(),b:_h.clone().addScaledVector(dir,len).add(new THREE.Vector3(0,.15,0)),age:0});if(trailPts.length>TRAIL_N)trailPts.shift();}}
  const pa=trailGeo.attributes.position.array, ca=trailGeo.attributes.color.array, n=trailPts.length;
  const rc=P&&G.sock&&G.sock.slots[0]?new THREE.Color(SRUNES[G.sock.slots[0]].col):null;
  const col=P&&P.rage>0?[2.4,.5,.25]:rc?[rc.r*2,rc.g*2,rc.b*2]:[1.5,1.35,1.05];
  for(let i=0;i<TRAIL_N;i++){const q=trailPts[Math.min(n-1,Math.max(0,i-(TRAIL_N-n)))];if(!q){pa.fill(0);break;}
    const k=n<2?0:Math.max(0,1-q.age/.2)*Math.max(0,(i-(TRAIL_N-n))/Math.max(1,n-1));
    pa.set([q.a.x,q.a.y,q.a.z],i*6);pa.set([q.b.x,q.b.y,q.b.z],i*6+3);
    ca.set([col[0]*k*.15,col[1]*k*.15,col[2]*k*.15],i*6);ca.set([col[0]*k,col[1]*k,col[2]*k],i*6+3);}
  trailGeo.attributes.position.needsUpdate=true; trailGeo.attributes.color.needsUpdate=true; trail.visible=n>1;
}
function syncPlayer(dt){
  if(!P||!PM) return; const p=P, an=PANIM_ALT[G.eq&&G.eq.arm]||PANIM[p.cls];
  const gy=groundY(p.x,p.y);
  PM.root.position.set(p.x*S,gy+(p.mount?1.0:0),p.y*S); syncHorse(dt);
  PM.root.rotation.y=lerpAng(PM.root.rotation.y,-p.face,Math.min(1,dt*18));
  const A=p.act; let w;
  if(p.dead) w={n:'Death_A',key:'dead',fade:.2};
  else if(p.mount) w={n:'Sit_Chair_Idle'};
  else if(p.roll>0) w={n:'Dodge_Forward',key:'roll'+p.rollId,fit:.42};
  else if(A){
    const k=A.kind;
    if(k==='atk') w={n:an.atk[p.combo],key:A,fit:A.dur*1.25};
    else if(k==='heavy') w={n:an.heavy,key:A,fit:A.dur};
    else if(k==='cast') w={n:p.cls==='volve'&&A.dur>.4?an.special:an.cast,key:A,fit:A.dur*1.3};
    else if(k==='nova') w={n:an.nova,key:A,fit:A.dur*1.4};
    else if(k==='bash') w={n:an.bash,key:A,fit:A.dur*1.1};
    else if(k==='roar') w={n:an.roar,key:A,fit:.9};
    else if(k==='heal') w={n:an.heal,key:A,fit:A.dur};
    else if(k==='crit'||k==='art') w={n:A.anim,key:A,fit:A.fit||A.dur};
  }
  else if(p.stagger>.08) w={n:'Hit_A',key:'hit'+p.hitId,fit:.35};
  else if(p.blocking) w={n:'Blocking'};
  else if(p.move>.12) w={n:an.run,speed:lerp(.75,1.15,clamp(p.move,0,1))};
  else w={n:an.idle};
  drive(PM,w); PM.anim.update(dt);
  if(p.cls==='berserker') PM.show('Mug',!!(A&&A.kind==='heal'));
  lantern.position.set(p.x*S-.6,gy+3.6,p.y*S+.8);
  PM.tintEmissive(p.rage>0?.22:0,0,0);
}
const QA={idle:'Idle',calm:'Idle',move:'Run',walk:'Walk',death:'Death',hit:'HitReact'}, QF={idle:'Flying_Idle',calm:'Flying_Idle',move:'Fast_Flying',walk:'Flying_Idle',aim:'Flying_Idle',dash:'Headbutt',arc:'Punch',death:'Death',hit:'HitReact'};
const EANIM={
  wolf:{idle:'Idle',calm:'Idle_2',move:'Gallop',walk:'Walk',aim:'Idle_2_HeadLow',dash:'Attack',death:'Death',hit:'Idle_HitReact_Left'},
  trold:{...QA,move:'Walk',arc:'Bite_Front',hit:'HitRecieve'}, bjergtrold:{...QA,arc:'Weapon'}, rimtrold:{...QA,arc:'Punch',leap:'Jump'},
  ildvaette:{...QA,arc:'Weapon'}, frostvaette:{...QA,arc:'Weapon'},
  gjenganger:QF, gjenganger2:QF, stenvaette:QF, stenvaette2:QF, vaette:{...QF,shoot:'Punch'}, lindorm:{...QF,breath:'Yes',roar:'No'},
  lindyngel:{idle:'Dragon_Flying',calm:'Dragon_Flying',move:'Dragon_Flying',walk:'Dragon_Flying',aim:'Dragon_Flying',dash:'Dragon_Attack',death:'Dragon_Death',hit:'Dragon_Hit'},
  minion:{idle:'Idle_Combat',calm:'Skeleton_Inactive_Standing_Pose',move:'Running_C',arc:'1H_Melee_Attack_Chop',death:'Death_C_Skeletons'},
  seidr:{idle:'Idle_Combat',calm:'Skeleton_Inactive_Standing_Pose',move:'Running_C',aim:'Spellcasting',shoot:'Spellcast_Shoot',death:'Death_C_Skeletons'},
  vogter:{idle:'Idle_Combat',calm:'Idle_B',move:'Running_A',arc:'2H_Melee_Attack_Slice',leap:'1H_Melee_Attack_Jump_Chop',spin:'2H_Melee_Attack_Spinning',summon:'Spellcast_Summon',roar:'Taunt_Longer',cast:'Spellcast_Shoot',death:'Death_C_Skeletons'},
  skjoldraugr:{idle:'Blocking',calm:'Skeleton_Inactive_Standing_Pose',move:'Walking_A',arc:'Block_Attack',death:'Death_C_Skeletons',hit:'Block_Hit'},
  seidkona:{idle:'Idle_Combat',calm:'Skeleton_Inactive_Standing_Pose',move:'Running_C',cast:'Spellcast_Long',shoot:'Spellcast_Shoot',death:'Death_C_Skeletons'},
  draugr:{idle:'Idle_Combat',calm:'Skeleton_Inactive_Standing_Pose',move:'Running_C',arc:'1H_Melee_Attack_Slice_Diagonal',death:'Death_C_Skeletons'},
  archer:{idle:'Idle_Combat',calm:'Skeleton_Inactive_Standing_Pose',move:'Running_C',aim:'1H_Ranged_Aiming',shoot:'1H_Ranged_Shoot',death:'Death_C_Skeletons'},
  jarl:{idle:'Idle_Combat',calm:'Idle_B',move:'Running_A',arc:'1H_Melee_Attack_Slice_Horizontal',leap:'1H_Melee_Attack_Jump_Chop',spin:'2H_Melee_Attack_Spinning',summon:'Spellcast_Summon',roar:'Taunt',cast:'Spellcast_Shoot',death:'Death_C_Skeletons'},
  askedraugr:{idle:'Idle_Combat',calm:'Skeleton_Inactive_Standing_Pose',move:'Running_C',arc:'1H_Melee_Attack_Chop',death:'Death_C_Skeletons'},
  askeskytte:{idle:'Idle_Combat',calm:'Skeleton_Inactive_Standing_Pose',move:'Running_C',aim:'1H_Ranged_Aiming',shoot:'1H_Ranged_Shoot',death:'Death_C_Skeletons'},
  eldseidr:{idle:'Idle_Combat',calm:'Skeleton_Inactive_Standing_Pose',move:'Running_C',cast:'Spellcast_Long',death:'Death_C_Skeletons'},
  glodulv:{idle:'Idle',calm:'Idle_2',move:'Gallop',walk:'Walk',aim:'Idle_2_HeadLow',dash:'Attack',death:'Death',hit:'Idle_HitReact_Left'},
  lavavaette:{...QF,arc:'Punch'}, glodkaempe:{...QF,arc:'Punch',leap:'Headbutt',spin:'Punch',roar:'Yes'},
  garm:{idle:'Idle',calm:'Idle_2',move:'Gallop',walk:'Walk',aim:'Idle_2_HeadLow',dash:'Attack',arc:'Attack',breath:'Attack',roar:'Idle_2_HeadLow',death:'Death',hit:'Idle_HitReact_Left'},
  eyvind:{idle:'Idle_Combat',calm:'Skeleton_Inactive_Standing_Pose',move:'Running_C',arc:'1H_Melee_Attack_Slice_Diagonal',death:'Death_C_Skeletons'},
  isdronning:{...QF,breath:'Yes',roar:'No'},
  ulvekonge:{idle:'Idle',calm:'Idle_2',move:'Gallop',walk:'Walk',aim:'Idle_2_HeadLow',dash:'Attack',arc:'Attack',breath:'Attack',roar:'Idle_2_HeadLow',death:'Death',hit:'Idle_HitReact_Left'},
  ketil:{idle:'Idle_Combat',calm:'Idle_B',move:'Running_A',arc:'1H_Melee_Attack_Slice_Horizontal',leap:'1H_Melee_Attack_Jump_Chop',spin:'2H_Melee_Attack_Spinning',roar:'Taunt',cast:'Spellcast_Shoot',death:'Death_C_Skeletons'},
  troldmor:{...QA,arc:'Weapon',leap:'Jump',spin:'Punch',roar:'Yes'},
  askebrud:{idle:'Idle_Combat',calm:'Skeleton_Inactive_Standing_Pose',move:'Running_C',cast:'Spellcast_Long',roar:'Spellcast_Summon',death:'Death_C_Skeletons'},
  surt:{idle:'Idle',calm:'Idle',move:'Walk',walk:'Walk',arc:'Weapon',stomp:'Punch',leap:'Jump',cast:'Yes',rain:'Wave',roar:'No',death:'Death',hit:'HitReact'},
  jotun:{idle:'2H_Melee_Idle',calm:'Idle',move:'Walking_A',arc:'2H_Melee_Attack_Slice',stomp:'2H_Melee_Attack_Chop',cast:'Spellcast_Shoot',rain:'Spellcast_Long',roar:'Cheer',death:'Death_B'},
};
function animEnemy(e,m,dt,gy){
  const an=EANIM[e.t]; let w;
  if(e.dead){
    w={n:an.death,key:'dead',fade:.1};
    const k=clamp((e.deathT-(e.boss?2.2:1.3))/(e.boss?1.6:.8),0,1); if(k>0){m.opacity(1-k);m.root.position.y=gy-k*(e.boss?1.5:.3);} if(k>=1)m.root.visible=false;
  }
  else if(e.pose&&e.pose.t>0&&an[e.pose.n]){e.pose.t-=dt;w={n:an[e.pose.n],key:e.pose.key,fit:e.pose.fit||e.pose.t+.2};}
  else if(e.stun>0) w={n:an.hit||'Hit_B',key:'st'+e.stunId,fit:e.broken>0?Math.max(.5,e.broken):.5};
  else if(e.atkHaz&&G.hazards.includes(e.atkHaz)){
    const h=e.atkHaz, own=h.k==='circle'&&Math.hypot(h.x-e.x,h.y-e.y)<20;
    let n=an.arc, fit=h.wind+.35;
    if(KIND[e.t]==='brute'&&h.k==='circle'){n=h.spin&&an.spin?an.spin:an.leap;fit=h.wind+.5;}
    if(e.t==='lindorm'&&h.k==='circle'){n=an.breath;fit=h.wind+.3;}
    if(e.t==='jotun'&&h.k==='circle'){n=own?an.stomp:(G.hazards.filter(x=>x.owner===e).length>7?an.rain:an.cast);fit=own?h.wind+.4:h.wind+.3;}
    w={n,key:'a'+e.atkSeq,fit};
  }
  else if(e.dash&&an.dash) w={n:an.dash,key:'d'+e.dashSeq,fit:.5};
  else if(e.aim&&an.aim) w={n:an.aim};
  else if(e.shotId&&e.busy>0&&an.shoot) w={n:an.shoot,key:'s'+e.shotId,fit:.45};
  else if(e.awoke&&e.busy>.05&&!e.awakeDone) w={n:'Skeletons_Awaken_Standing',key:'awake',fit:1.1};
  else if(e.leaving||e.move>.15) w={n:e.aggro||e.leaving?an.move:(an.walk||'Walking_D_Skeletons'),speed:e.t==='jotun'?.75:1};
  else w={n:e.aggro?an.idle:(e.dormant&&e.t==='jotun'?'Sit_Chair_Idle':an.calm)};
  if(e.awoke&&e.busy<=.05) e.awakeDone=true;
  if(!m.anim.has(w.n)) w={...w,n:m.anim.has('Idle')?'Idle':w.n};
  drive(m,w); m.anim.update(dt);
  const fl=e.flash>0?1:0; m.flash(fl);
}
const P2COL={isdronning:[.7,1.6,2.4],ulvekonge:[.7,1.6,2.4],ketil:[2.6,1.4,.4],troldmor:[1.4,2,.6],jarl:[.6,1.6,2.4],vogter:[2.6,.6,.2],lindorm:[.7,1.6,2.4],jotun:[.7,1.6,2.4],glodkaempe:[3,1,.2],garm:[2.8,.4,.15],surt:[3.2,1.2,.2]};
const easeOut=t=>1-Math.pow(1-t,3), easeInOut=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
function lerpAng(a,b,t){return a+angDiff(b,a)*t;}
function syncEnemies(dt){
  const cx=G.camLook.x/S, cz=G.camLook.z/S;
  for(const e of G.enemies){
    const m=e.model; if(!m) continue;
    // far-away enemies are not drawn or animated (their logic still runs)
    const far=Math.hypot(e.x-cx,e.y-cz)>(e.boss==='jotun'||e.boss==='surt'?2200:1300); if(far){m.root.visible=false;if(e.hpEl)e.hpEl.style.display='none';continue;} if(!e.leaving&&!(e.dead&&e.deathT>3))m.root.visible=true;
    const gy=groundY(e.x,e.y);
    let lift=0;
    if(e.air){e.airT=(e.airT||0)+dt;lift=Math.sin(clamp(e.airT/1,0,1)*Math.PI)*5;}
    if(FLOAT[e.t]&&!e.dead) lift+=FLOAT[e.t]+Math.sin(e.t0*2.2)*.15;
    m.root.position.set(e.x*S,gy+lift,e.y*S);
    if(e.leaving){e.y-=dt*40;e.face=-Math.PI/2;e.move=1;e.fade=Math.max(0,(e.fade??1)-dt*.16);m.opacity(e.fade);if(e.fade<=0)m.root.visible=false;}
    m.root.rotation.y=lerpAng(m.root.rotation.y,-e.face,Math.min(1,dt*(e.boss?6:12)));
    if(m.kk) animEnemy(e,m,dt,gy);
    else {
      const a={phase:e.phase,move:e.move,t:e.t0};
      if(e.aim) a.crouch=1; if(e.dash) a.crouch=-.6;
      if(e.dead){const k=clamp(e.deathT/.8,0,1);m.body.rotation.z=k*1.4;m.root.position.y=gy-k*.6;m.mats.forEach(mt=>{mt.transparent=true;mt.opacity=1-k;});if(k>=1)m.root.visible=false;}
      else poseHum(m,a);
      const fl=e.flash>0?1.6:0; m.mats.forEach(mt=>{if(mt.emissive)mt.emissive.setScalar(fl*.5);});
    }
    if(e.boss&&e.phase2&&!e.dead&&Math.random()<.6){const c=P2COL[e.t]||[2,1,.4],h=(INTRO[e.boss]&&INTRO[e.boss].h)||3;FXA.emit(e.x*S+rand(-1,1)*h*.25,gy+lift+rand(.2,h),e.y*S+rand(-1,1)*h*.25,rand(-.3,.3),rand(.6,1.6),rand(-.3,.3),rand(.5,1),rand(.15,.32),c[0],c[1],c[2],1,-.4,.5,0);}
    if(e.wardT>0&&!e.dead&&Math.random()<.5){const a=Math.random()*TAU;FXA.emit(e.x*S+Math.cos(a)*e.r*S*1.4,gy+rand(.2,1.8),e.y*S+Math.sin(a)*e.r*S*1.4,0,.4,0,.6,.25,.6,2.2,1,.8,-.1,0,0);}
    if(e.stun>0&&Math.random()<.4)FXA.emit(e.x*S+rand(-.3,.3),gy+(e.boss?4:2),e.y*S+rand(-.3,.3),0,.4,0,.5,.25,2.4,2.2,.8,1,0,0);
    if(e.t==='jotun'&&!e.dead&&!e.leaving){if(Math.random()<.35)FXN.emit(e.x*S+rand(-2.2,2.2),gy+rand(.2,1.5),e.y*S+rand(-2.2,2.2),rand(-.3,.3),rand(.1,.4),rand(-.3,.3),2.5,.6,.85,.92,1,.12,-.03,.3,2.5);if(Math.random()<.3)FXA.emit(e.x*S+rand(-.3,.3)+Math.cos(e.face)*.8,gy+7.6,e.y*S+rand(-.3,.3)+Math.sin(e.face)*.8,Math.cos(e.face)*1.2,-.2,Math.sin(e.face)*1.2,1.2,.35,.4,.7,.9,.6,-.1,.5,2);}
    if(e.t==='draugr'||e.t==='archer'||e.t==='jarl'){if(Math.random()<.04)FXA.emit(e.x*S,gy+(e.t==='jarl'?2.6:1.4),e.y*S,rand(-.2,.2),rand(.3,.7),rand(-.2,.2),1,.15,.4,1.4,2,1,-.1,0,0);}
    // aim line telegraph
    if(e.aim&&!e.dead){const L=(e.aim.lunge?150:Math.min(e.aim.len||300,420));for(let i=0;i<3;i++){const t=Math.random()*L;FXA.emit((e.x+Math.cos(e.face)*t)*S,gy+(e.aim.lunge?.3:1.3),(e.y+Math.sin(e.face)*t)*S,0,0,0,.12,.22,e.aim.lunge?2.4:.6,e.aim.lunge?.5:1.4,e.aim.lunge?.2:2.4,1,0,0,0);}}
    // hp bars
    if(!e.boss&&!e.dead&&e.hp<e.maxHp){
      if(!e.hpEl){e.hpEl=document.createElement('div');e.hpEl.className='ehp';e.hpEl.innerHTML='<i></i>';labels.appendChild(e.hpEl);}
      const s=toScreen(e.x*S,gy+(FLOAT[e.t]||0)+1.2+e.r*.06,e.y*S);e.hpEl.style.display=s.vis?'block':'none';e.hpEl.style.left=s.x+'px';e.hpEl.style.top=s.y+'px';e.hpEl.firstChild.style.width=(e.hp/e.maxHp*100)+'%';
    }
  }
  // clean dead
  G.enemies=G.enemies.filter(e=>!(e.dead&&e.deathT>(e.boss?4:2.2)));
}
function syncNPCs(dt){
  for(const n of NPCS){const m=NPCM[n.id];if(!m)continue;if(C&&C.kind===n.id){m.root.visible=false;continue;}m.root.visible=Math.hypot(n.x-G.camLook.x/S,n.y-G.camLook.z/S)<1500&&(!n.showIf||!!n.showIf());if(!m.root.visible){npcLbl[n.id].hidden=true;continue;}n.anim.t+=dt;
    if(!n.head){
      if(P&&dist(P,n)<170){const a=Math.atan2(P.y-n.y,P.x-n.x);m.root.rotation.y=lerpAng(m.root.rotation.y,-a,dt*3);}
    } else {m.root.position.y=ICE_Y+.55+Math.sin(n.anim.t*1.2)*.04;if(P){const a=Math.atan2(P.y-n.y,P.x-n.x);m.root.rotation.y=lerpAng(m.root.rotation.y,-a,dt*2);}}
    const lbl=npcLbl[n.id]; const near=P&&dist(P,n)<240&&G.state==='play';
    if(near){const s=toScreen(n.x*S,(n.head?ICE_Y+.5:groundY(n.x,n.y))+(n.id==='dvalin'?1.6:2.3),n.y*S);lbl.hidden=!s.vis;lbl.style.left=s.x+'px';lbl.style.top=s.y+'px';}else lbl.hidden=true;
  }
  if(C&&CM){
    const gy=groundY(C.x,C.y);CM.root.position.set(C.x*S,gy,C.y*S);CM.root.rotation.y=lerpAng(CM.root.rotation.y,-C.face,Math.min(1,dt*10));
    let w; if(C.down) w={n:'Death_B',key:'down'+C.downId}; else if(C.healT>1.3) w={n:'Spellcast_Long',key:'hl'+C.healId,fit:1}; else if(C.cd>.75) w={n:C.kind==='eir'?'Spellcast_Shoot':'2H_Ranged_Shoot',key:'sh'+C.shotId,fit:.5}; else if(C.move>.15) w={n:'Running_A',speed:lerp(.8,1.1,C.move)}; else w={n:'Idle'};
    drive(CM,w);
  }
  for(const id in NPCM){const m=NPCM[id]; if(m.anim&&m.root.visible) m.anim.update(dt);} if(CM) CM.anim.update(dt);
}
let smokeT=0;
const NIGHT_FOG=new THREE.Color(0x1b2738), CRYPT_FOG=new THREE.Color(0x040507);
// Askefjorden's air: red-brown smoke, warm light from below, falling ash
const ASHC={fog:new THREE.Color(0x2b1712),hemi:new THREE.Color(0xc07a58),hemiG:new THREE.Color(0x2a1208),moon:new THREE.Color(0xffa070),snow:new THREE.Color(0x8e8682),mist:new THREE.Color(0x5a4440),
  hemi0:hemi.color.clone(),hemiG0:hemi.groundColor.clone(),moon0:moon.color.clone(),snow0:snow.material.color.clone(),mist0:new THREE.Color(0xb9cbe0)};
scene.background=scene.fog.color;
function ambientFX(dt){
  const inC=!!P&&inDungeon(P.x,P.y); G.inGrot=!!P&&inGrot(P.x,P.y); if(GROT_VOID)GROT_VOID.visible=G.inGrot; GROT_LIGHTS.forEach(L=>L.intensity=G.inGrot?(G.cryptK||0)*L.userData.base:0); updGrotto(dt); G.cryptK=lerp(G.cryptK||0,inC?1:0,Math.min(1,dt*(inC?6:2))); const ck=G.cryptK;
  const ak=ashK(P?P.x:G.camLook.x/S); G.ashK=lerp(G.ashK??ak,ak,Math.min(1,dt*1.5)); const aK=G.ashK; skyUniforms.uAsh.value=aK;
  const dK=DN.day, uK=DN.dusk;
  hemi.intensity=lerp(lerp(lerp(.62,1.05,dK),.6+.25*dK,aK),.2,ck); moon.intensity=lerp(lerp(lerp(1.45,2.3,dK),1.1+.5*dK,aK),.03,ck); scene.fog.density=lerp(lerp(lerp(.0135,.0095,dK),.017,aK)*WXK.fog,.045,ck); if(CRYPT_VOID)CRYPT_VOID.visible=ck>.02&&!G.inGrot;
  hemi.color.copy(ASHC.hemi0).lerp(DAYC.hemi,dK).lerp(ASHC.hemi,aK); hemi.groundColor.copy(ASHC.hemiG0).lerp(DAYC.hemiG,dK).lerp(ASHC.hemiG,aK); moon.color.copy(ASHC.moon0).lerp(DAYC.sun,dK).lerp(DAYC.duskSun,uK*.7).lerp(ASHC.moon,aK);
  renderer.toneMappingExposure=.82+.08*dK*(1-ck); lantern.intensity=lerp(10,3,dK*(1-ck));
  snow.material.color.copy(ASHC.snow0).lerp(ASHC.snow,aK); snow.material.opacity=.85-aK*.3;
  scene.fog.color.copy(NIGHT_FOG).lerp(DAYC.fog,dK).lerp(DAYC.duskFog,uK*.5).lerp(ASHC.fog,aK).lerp(CRYPT_FOG,ck); snow.visible=ck<.5; MIST.forEach(m=>{m.m.visible=ck<.5;m.m.material.color.copy(ASHC.mist0).lerp(ASHC.mist,aK);});
  updAct2(dt);
  lantern.intensity=lerp(lantern.intensity,16,ck); CRYPT_LIGHTS.forEach(L=>{if(L.distance===8)L.intensity=ck*8;});
  for(const id in CHEST_M){const m=CHEST_M[id];if(m.opening&&m.open<1){m.open=Math.min(1,m.open+dt*2.2);if(m.lid)m.lid.rotation.x=-1.9*easeOut(m.open);}}
  smokeT-=dt;
  if(smokeT<=0){smokeT=.12;for(const s of SMOKERS){if(P&&Math.abs(s.x-P.x*S)>45)continue;FXN.emit(s.x+rand(-.2,.2),s.y,s.z+rand(-.2,.2),wind*.15+rand(-.1,.1),rand(.6,1),rand(-.1,.1),rand(4,6),rand(1,1.6),.32,.33,.36,.35,-.05,.1,3);}}
  {let best=0;if(P)for(const f of FIRE_FX){if(f.crypt&&!(G.cryptK>.5))continue;const d=Math.hypot(f.x-P.x*S,f.z-P.y*S);best=Math.max(best,1-d/(f.small?9:16));}setFire(Math.max(0,best));}
  for(const f of FIRE_FX){
    if(f.light){if(f.crypt&&G.cryptK<.05&&f.light.intensity===0) continue;
      f.light.intensity=(f.crypt?G.cryptK:1)*f.base*(.82+Math.sin(G.time*13+f.x)*.08+Math.sin(G.time*23.7+f.z)*.06+Math.random()*.06);}
    if(P&&Math.abs(f.x-P.x*S)>50) continue;
    const n=f.small?1:3;
    for(let i=0;i<n;i++){FXA.emit(f.x+rand(-.22,.22),f.y+.15,f.z+rand(-.22,.22),rand(-.15,.15)+wind*.05,rand(1,2),rand(-.15,.15),rand(.35,.65),rand(.25,.45),1.3,.45,.1,.8,-.4,.2,-.5);}
    if(Math.random()<.3)FXA.emit(f.x,f.y+.5,f.z,rand(-.6,.6)+wind*.2,rand(2,4),rand(-.6,.6),rand(1.2,2.2),rand(.08,.14),3,1.6,.4,1,.4,.3,0);
    if(!f.small&&Math.random()<.35)FXN.emit(f.x,f.y+1.6,f.z,wind*.1,rand(.6,1),0,rand(3,4.5),rand(1,1.8),.25,.25,.28,.25,-.05,.1,2.5);
  }
  RUNESTONES.forEach((rs,i)=>{if(!rs.lit)return;const m=RS_MESH[i];m.mat.emissiveIntensity=2.3+Math.sin(G.time*1.7+i)*.4;
    if(Math.random()<.25)FXA.emit(m.pos.x+rand(-1.4,1.4),m.pos.y+rand(.2,.8),m.pos.z+rand(-1.4,1.4),rand(-.1,.1),rand(.3,.8),rand(-.1,.1),rand(2,3.4),rand(.12,.22),2.2,1.5,.5,1,-.05,.2,0);});
  if(mimirGlow){mimirGlow.intensity=22+Math.sin(G.time*1.4)*6;if(Math.random()<.2)FXA.emit(2850*S+rand(-1,1),ICE_Y+1.2,1400*S+rand(-1,1),0,rand(.2,.5),0,2.5,.18,.6,1.6,2.4,1,-.05,0,0);}
  CRYSTALS.forEach((c,i)=>{c.rotation.y+=dt*.1*(i%2?1:-1);});
  if(G.stain){const gy=groundY(G.stain.x,G.stain.y);for(let i=0;i<2;i++)FXA.emit(G.stain.x*S+rand(-.3,.3),gy+.1,G.stain.y*S+rand(-.3,.3),0,rand(.4,1.2),0,1.2,.3,2.2,1.6,.5,1,-.1,0,0);}
  BANNERS.forEach((b,i)=>{const p=b.geo.attributes.position;for(let j=0;j<p.count;j++){const x=b.base[j*3],y=b.base[j*3+1];p.setZ(j,Math.sin(x*3-G.time*3+i+y)*.12*x+Math.sin(G.time*1.3)*.05*x);}p.needsUpdate=true;});
  RAVENS.forEach(r=>{r.ph+=dt*r.sp;const x=r.cx+Math.cos(r.ph)*r.r,z=r.cz+Math.sin(r.ph)*r.r;r.g.position.set(x,r.h+Math.sin(r.ph*3)*.5,z);r.g.rotation.y=-(r.ph+Math.PI/2*Math.sign(r.sp));const f=Math.sin(G.time*9+r.ph*5)*.6;r.wl.rotation.x=-Math.PI/2+f;r.wr.rotation.x=-Math.PI/2-f;});
  // mist follows the camera region
  const c=G.camLook;MIST.forEach(m=>{m.ox+=dt*(wind*.2+m.sp*.4);if(m.ox>34)m.ox-=68;if(m.ox<-34)m.ox+=68;const x=c.x+m.ox,z=c.z+m.oz;m.m.position.set(x,(P?groundY(x/S,z/S):hgt(x/S,z/S))+m.h,z);m.m.rotation.z+=m.rot*dt;});
  // hide the gate lintel when the player stands north of it so it never blocks the view
  {const north=P&&P.y<WALL_Y+10&&G.state!=='title';gateTop.forEach(m=>m.visible=!north);}
  // gate opening
  if(G.gateAnim!=null&&G.gateAnim<1){G.gateAnim=Math.min(1,G.gateAnim+dt*.35);gateDoors.forEach(d=>d.hinge.rotation.y=d.s*1.6*easeInOut(G.gateAnim));}
}
function updFX(dt){
  for(let i=G.fx.length-1;i>=0;i--){const f=G.fx[i];f.t+=dt;const k=f.t/f.life;
    if(f.spike){const up=Math.min(1,f.t*9);f.mesh.position.y=f.gy-1+up*1.5-(k>.7?(k-.7)*6:0);}
    else{f.mesh.material.opacity=.38*(1-k);f.mesh.scale.setScalar(1+k*.15);}
    if(k>=1){scene.remove(f.mesh);if(!f.spike){f.mesh.geometry.dispose();f.mesh.material.dispose();}G.fx.splice(i,1);}}
  for(let i=NUMS.length-1;i>=0;i--){const n=NUMS[i];n.t+=dt;const s=toScreen(n.x+n.dx*n.t,n.y+n.t*1.1,n.z);n.el.style.left=s.x+'px';n.el.style.top=s.y+'px';n.el.style.opacity=String(1-Math.max(0,n.t-.5)/.5);n.el.style.display=s.vis?'block':'none';if(n.t>1){n.el.remove();NUMS.splice(i,1);}}
}

/* =========================================================
   HUD
   ========================================================= */
const miniCv=$('mini'), mctx=miniCv.getContext('2d');
const miniBg=document.createElement('canvas');miniBg.width=miniBg.height=900;
{const g=miniBg.getContext('2d'),k=900/WORLD.w;g.fillStyle='#1d2631';g.fillRect(0,0,900,900);
  g.fillStyle='#2a3542';g.fillRect(PAD*k,PAD*k,(WORLD.w-2*PAD)*k,(WORLD.h-2*PAD)*k);
  g.fillStyle='rgba(20,40,30,.85)';for(const t of TREES){if(!t.col)continue;g.beginPath();g.arc(t.x*k,t.y*k,2.2,0,TAU);g.fill();}
  g.strokeStyle='rgba(190,180,160,.55)';g.lineWidth=4;g.lineCap='round';for(const p of PATHS){g.beginPath();p.forEach(([x,y],i)=>i?g.lineTo(x*k,y*k):g.moveTo(x*k,y*k));g.stroke();}
  g.fillStyle='rgba(150,200,225,.55)';g.beginPath();g.ellipse(LAKE.x*k,LAKE.y*k,LAKE.rx*k,LAKE.ry*k,0,0,TAU);g.fill();
  g.fillStyle='#5a6068';g.fillRect(0,WALL_Y*k,WORLD.w*k,WALL_H*k);
  g.fillStyle='rgba(150,220,255,.25)';g.beginPath();g.arc(1800*k,500*k,330*k,0,TAU);g.fill();
  g.strokeStyle='rgba(200,200,200,.5)';g.lineWidth=2;g.beginPath();g.arc(560*k,1200*k,265*k,0,TAU);g.stroke();
  g.fillStyle='#6a4a30';for(const h of HOUSES)g.fillRect(h.x*k,h.y*k,h.w*k,h.h*k);
  g.fillStyle='#231c1c';g.fillRect(RIDGE.x*k,PAD*k,(WORLD.w-PAD-RIDGE.x)*k,(WORLD.h-2*PAD)*k);
  g.strokeStyle='rgba(190,160,140,.5)';g.lineWidth=4;for(const p of PATHS.slice(3)){g.beginPath();p.forEach(([x,y],i)=>i?g.lineTo(x*k,y*k):g.moveTo(x*k,y*k));g.stroke();}
  g.fillStyle='rgba(20,14,12,.85)';for(const t of ASH.trees){if(!t.col)continue;g.beginPath();g.arc(t.x*k,t.y*k,1.8,0,TAU);g.fill();}
  g.fillStyle='#e0661c';for(const p of LAVA){g.beginPath();g.ellipse(p.x*k,p.y*k,p.rx*k,p.ry*k,0,0,TAU);g.fill();}
  g.fillStyle='#3a1a12';g.fillRect((RIDGE.x-130)*k,0,260*k,(RIDGE.passY-RIDGE.passW)*k);g.fillRect((RIDGE.x-130)*k,(RIDGE.passY+RIDGE.passW)*k,260*k,WORLD.h*k);
  g.fillStyle='#4a2418';g.fillRect(3640*k,FWALL_Y*k,(WORLD.w-3640)*k,40*k);
  g.fillStyle='#000';g.beginPath();g.arc(GNIPA.x*k,GNIPA.y*k,26*k,0,TAU);g.fill();}
function drawMini(){
  const W=340,k=900/WORLD.w,zoomMap=1.25;mctx.clearRect(0,0,W,W);mctx.save();mctx.beginPath();mctx.arc(W/2,W/2,W/2,0,TAU);mctx.clip();
  const view=W/zoomMap; const cx=P.x*k, cy=P.y*k;
  mctx.drawImage(miniBg,cx-view/2,cy-view/2,view,view,0,0,W,W);
  const tp=(x,y)=>[(x*k-cx)*zoomMap+W/2,(y*k-cy)*zoomMap+W/2];
  if(!GATE.gone){const [x,y]=tp(1800,WALL_Y+20);mctx.fillStyle='#9bd3ea';mctx.fillRect(x-10,y-4,20,8);}
  if(!ICEWALL.gone){const [x,y]=tp(RIDGE.x,RIDGE.passY);mctx.fillStyle='#9bd3ea';mctx.fillRect(x-4,y-14,8,28);}
  if(!FIREGATE.gone){const [x,y]=tp(5000,FWALL_Y+20);mctx.fillStyle='#ff8a3a';mctx.fillRect(x-10,y-4,20,8);}
  for(const b of ASH.beacons){const [x,y]=tp(b.x,b.y);mctx.fillStyle=G.flags.beacons?.[b.id]?'#ffb04a':'#6a5a50';mctx.beginPath();mctx.arc(x,y,4,0,TAU);mctx.fill();}
  RUNESTONES.forEach(r=>{const [x,y]=tp(r.x,r.y);mctx.fillStyle=r.lit?'#f3d68a':'#5f646a';mctx.beginPath();mctx.moveTo(x,y-9);mctx.lineTo(x+6,y);mctx.lineTo(x,y+9);mctx.lineTo(x-6,y);mctx.closePath();mctx.fill();if(r.lit){mctx.shadowColor='#f3d68a';}});
  NPCS.forEach(n=>{if(n.id==='astrid'&&C)return;if(n.showIf&&!n.showIf())return;const [x,y]=tp(n.x,n.y);mctx.fillStyle='#e7e0cf';mctx.beginPath();mctx.arc(x,y,4.5,0,TAU);mctx.fill();});
  for(const e of G.enemies){if(e.dead||e.dormant)continue;const [x,y]=tp(e.x,e.y);if(x<0||x>W||y<0||y>W)continue;mctx.fillStyle=e.boss?'#ff6a4a':'rgba(220,80,60,.85)';mctx.beginPath();mctx.arc(x,y,e.boss?7:3,0,TAU);mctx.fill();}
  if(G.stain){const [x,y]=tp(G.stain.x,G.stain.y);mctx.fillStyle='#f3d68a';mctx.font='18px "Noto Sans Runic"';mctx.textAlign='center';mctx.fillText('ᚱ',x,y+6);}
  if(C){const [x,y]=tp(C.x,C.y);mctx.fillStyle='#a9e08a';mctx.beginPath();mctx.arc(x,y,4.5,0,TAU);mctx.fill();}
  drawMiniGoal(tp,W);
  mctx.save();mctx.translate(W/2,W/2);mctx.rotate(P.face+Math.PI/2);mctx.fillStyle='#f3d68a';mctx.beginPath();mctx.moveTo(0,-11);mctx.lineTo(7,8);mctx.lineTo(0,4);mctx.lineTo(-7,8);mctx.closePath();mctx.fill();mctx.restore();
  mctx.restore();
  mctx.fillStyle='#d4ae55';mctx.font='22px "IM Fell English SC", Georgia';mctx.textAlign='center';mctx.fillText('N',W/2,24);
}
function objective(){const f=G.flags;
  if(G.mode==='valhalla') return ['Valhalla · bølge '+VH.wave,VH.active?'Fjender tilbage: '+G.enemies.filter(e=>!e.dead).length:'Vælg en gave fra guderne'];
  if(f.jotunDone&&!f.act2) return ['Fimbulvinteren er brudt',''];
  if(f.act2){
    const n=Object.keys(f.beacons||{}).length, opt=f.q_varder&&!f.vardeDone?(n<3?`Valgfrit: Tænd varderne (${n} af 3)`:'Valgfrit: Fortæl Ragna, at varderne brænder'):f.q_sindri&&!f.sindriDone?(f.muspelsten?'Valgfrit: Bring Muspelstenen til Sindri':'Valgfrit: Find Muspelstenen ved lavasøen mod sydøst'):'';
    if(!f.metRagna) return ['Følg røgen mod øst gennem Askepasset til Skjoldvik','Valgfrit: Gamle Ulfr i Ravnsholm'];
    if(!f.garmDead&&!f.fgateOpen) return ['Fæld Garm, Helhunden, ved Gnipahellir mod nord',opt];
    if(!f.fgateOpen) return ['Åbn Flammeporten mod nord',opt];
    return ['Fæld Surt ved Muspelrevnen bag Flammeporten',opt];
  }
  if(!f.metUlfr) return ['Tal med Gamle Ulfr ved runestenen i Ravnsholm',''];
  if(!f.horn&&!f.gateOpen) return ['Find Draugr-jarlen i gravhøjen mod vest','Valgfrit: Astrid ved lejren · Mimirs Hoved på den frosne sø mod øst'];
  if(!f.gateOpen) return ['Blæs i Jarlens Horn ved Jötunporten mod nord',!f.vogterDead?'Valgfrit: Gravkrypten under højen er åben nu':'Valgfrit: Mimirs Hoved kender Rimtursens hemmelighed'];
  return ['Konfrontér Rimtursen bag Jötunporten',G.flags.lindormQuest&&!G.flags.lindormDead?'Valgfrit: Dræb Lindormen på den frosne sø':G.flags.jarlDead&&!G.flags.vogterDead?'Valgfrit: Gravkrypten under højen er åben':''];}
let lastRunes=-1, shownRunes=0;
function updHUD(dt){
  if(!P) return;
  G.hurtFx=Math.max(0,(G.hurtFx||0)-dt*1.8);
  const low=!P.dead&&P.hp<maxHp()*.25, pulse=low?.35+.25*Math.sin(G.time*6.5):0;
  $('hurtFx').style.opacity=String(Math.max(G.hurtFx,pulse));
  if(low&&G.state==='play'){G.heartT=(G.heartT||0)-dt;if(G.heartT<=0){G.heartT=.95;sfx('heart');}}
  const mh=maxHp(), ms=maxSt();
  const hpW=Math.min(440,mh*1.55), stW=Math.min(360,ms*1.45);
  $('hpBar').style.width=hpW+'px';$('stBar').style.width=stW+'px';
  $('hpFill').style.width=(P.hp/mh*100)+'%';$('hpLag').style.width=(P.hpLag/mh*100)+'%';$('stFill').style.width=(P.st/ms*100)+'%';
  $('hLvl').textContent='· niveau '+P.level;$('hFlask').textContent=P.flasks;
  const cd=specialCd(), pr=P.specialT/cd;$('specCd').style.setProperty('--p',(pr*100)+'%');$('slSpec').classList.toggle('ready',P.specialT<=0);
  $('artCd').style.setProperty('--p',((P.artT||0)/artCd()*100)+'%');$('slArt').classList.toggle('ready',!(P.artT>0));
  G.kbdT=(G.kbdT||0)-dt; if(G.kbdT<=0){G.kbdT=.5;$('artName').textContent=ARTS[artKey()].name;$('kHeal').textContent=actLabel('heal');$('kSpec').textContent=actLabel('special');$('kArt').textContent=actLabel('art');}
  shownRunes+= (P.runes-shownRunes)*Math.min(1,dt*8); if(Math.abs(P.runes-shownRunes)<1)shownRunes=P.runes;
  const rr=Math.round(shownRunes); if(rr!==lastRunes){$('hRunes').textContent=rr.toLocaleString('da-DK');lastRunes=rr;}
  const [o1,o2]=objective();$('hObj').textContent=o1;$('hOpt').textContent=o2;
  $('hComp').hidden=!C; if(C){$('cFill').style.width=(C.hp/C.maxHp*100)+'%';$('hCompName').textContent=compName();}
  const b=G.boss; $('hBoss').hidden=!b||b.dead;
  if(b&&!b.dead){$('bossName').textContent=b.def.name;b.lag=b.lag==null?b.hp:b.lag+(b.hp-b.lag)*Math.min(1,dt*(b.lag>b.hp?1.2:10));$('bossFill').style.width=(b.hp/b.maxHp*100)+'%';$('bossLag').style.width=(b.lag/b.maxHp*100)+'%';
    $('bossPoise').style.width=(b.broken>0?100:Math.max(0,b.poise/b.maxPoise*100))+'%';$('bossPoiseBar').classList.toggle('broken',b.broken>0);}
  const it=G.state==='play'?interactTarget():null; const pe=$('prompt');
  if(it){pe.hidden=false;pe.innerHTML='<kbd>E</kbd>'+escapeHtml(it.label);}else pe.hidden=true;
  updBeltHUD(); drawMini();
}

/* --- Music follows the place and the fight */
let musicT=0;
function updMusic(dt){
  musicT-=dt; if(musicT>0) return; musicT=.5;
  if(!P||P.dead) return;
  const b=G.boss&&!G.boss.dead?G.boss:null;
  if(b) return music(b.phase2?'boss2':b.t==='jotun'||b.t==='surt'?'jotun':'jarl');
  if(G.mode==='valhalla') return music(VH.wave>=10?'boss2':'jarl');
  if(inAsh(P.x)) return music(Math.hypot(P.x-4350,P.y-2380)<330?'village':'ash');
  const home=Math.hypot(P.x-1800,P.y-2380)<620||Math.hypot(P.x-1450,P.y-1850)<260;
  music(home?'village':'wild');
}
