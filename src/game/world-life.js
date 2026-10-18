'use strict';
/* =========================================================
   INTERACTION
   ========================================================= */
function interactTarget(){
  if(P.dead) return null;
  if(C&&C.down&&dist(P,C)<60) return {label:'Hjælp '+compName()+' op',fn:()=>{C.down=false;C.hp=C.maxHp*.4;toast(compName()+' er på benene igen');}};
  for(const n of NPCS){ if(C&&C.kind===n.id) continue; if(n.showIf&&!n.showIf()) continue; const r=n.head?95:70; if(dist(P,n)<r) return {label:(n.head?'Tal med ':'Tal med ')+n.name,fn:()=>talk(n.id)}; }
  for(const rs of RUNESTONES){ if(dist(P,rs)<64) return {label:'Hvil ved runestenen',fn:()=>openRest(rs.id)}; }
  if(!G.flags.hammer&&Math.hypot(P.x-2660,P.y-470)<62) return {label:'Undersøg dværgens rester',fn:()=>{G.flags.hammer=true;sfx('pickup');questStart('q_durin','Dvalins bror');
    banner('DURINS HAMMER','Et skelet i dværgerustning, med en hammer i knoglehånden');note('durin','Under Hrafnkels høj lå en dværg i rustning. Hans hammer bar et mærke: Durin, søn af Dain.');}};
  for(const c of CHESTS){ if(G.flags.chests?.[c.id]) continue; if(Math.hypot(P.x-c.x,P.y-c.y)<62) return {label:c.gold&&!G.flags.vogterDead?'Guldkisten er låst':'Åbn kisten',fn:()=>openChest(c)}; }
  if(Math.hypot(P.x-CRYPT.doorX,P.y-CRYPT.doorY)<70) return {label:G.flags.jarlDead?'Gå ned i gravkrypten':'Døren i højen er forseglet',fn:()=>{if(!G.flags.jarlDead){toast('En kold kraft holder døren lukket. Hrafnkel vogter stadig højen.');return;}travel(CRYPT.inX,CRYPT.inY,'GRAVKRYPTEN','Under Hrafnkels høj');}};
  if(Math.hypot(P.x-CRYPT.exitX,P.y-CRYPT.exitY)<55) return {label:'Forlad krypten',fn:()=>travel(CRYPT.doorX+45,CRYPT.doorY,'','')};
  if(!GATE.gone&&Math.abs(P.x-1800)<110&&P.y>WALL_Y+WALL_H&&P.y<WALL_Y+WALL_H+90) return {label:'Undersøg Jötunporten',fn:()=>talk('gate')};
  if(!FIREGATE.gone&&Math.abs(P.x-5000)<110&&P.y>FWALL_Y+40&&P.y<FWALL_Y+150) return {label:'Undersøg Flammeporten',fn:()=>talk('fgate')};
  if(!ICEWALL.gone&&Math.abs(P.x-(RIDGE.x-70))<90&&Math.abs(P.y-RIDGE.passY)<RIDGE.passW+20) return {label:'Undersøg isvæggen',fn:()=>toast('En mur af evig is spærrer passet mod øst. Den smelter ikke, så længe Fimbulvinteren varer.')};
  if(G.flags.act2) for(const b of ASH.beacons){ if(G.flags.beacons?.[b.id]) continue; if(Math.hypot(P.x-b.x,P.y-b.y)<70) return {label:'Tænd varden',fn:()=>{
    G.flags.beacons=G.flags.beacons||{};G.flags.beacons[b.id]=true;lightBeacon(b.id);const n=Object.keys(G.flags.beacons).length;
    banner('VARDEN BRÆNDER',n<3?`${n} af 3`:'Alle tre varder brænder');if(n>=3&&G.flags.q_varder)setTimeout(()=>toast('Vend tilbage til Ragna i Skjoldvik'),2400);saveGame();}}; }
  return null;
}

/* --- Wildlife, farm animals and villagers going about their day */
const CANIM={animal:{idle:'Idle',walk:'Walk',run:'Gallop',eat:'Eating'},person:{idle:'Idle',walk:'Walk',run:'Run',eat:'Interact'},guard:{idle:'Idle_Sword',walk:'Walk',run:'Run',eat:'Idle_Sword'}};
const CRITTER_SPAWNS=[
  ['deer',1250,2050,1],['deer',1290,2090,1],['stag',1180,2010,1],['fox',2250,2150,1],['fox',950,1750,1],['deer',2400,2250,1],['stag',2500,2280,1],['fox',1600,1500,1],['deer',700,2000,1],['stag',3000,1900,1],
  ['husky',1622,2326,0],['husky',1662,2316,0],['horse',1575,2440,0],['horse',1570,2478,0],['cow',1760,2632,0],['cow',1830,2640,0],['donkey',2050,2420,0],
  ['farmer',1750,2470,0],['worker',1980,2400,0],['guard',1768,2178,0],['hguard',1832,2178,0],
  ['farmer',4390,2510,0],['worker',4220,2360,0],['guard',4300,2190,0],['hguard',4560,2340,0],
];
const CRITTERS=[];
function initCritters(){
  for(const [kind,x,y,wild] of CRITTER_SPAWNS){
    const m=makeChar(kind); scene.add(m.root);
    const person=['farmer','worker','guard','hguard'].includes(kind), guard=kind==='guard'||kind==='hguard';
    CRITTERS.push({kind,x,y,home:{x,y},r:person?11:kind==='horse'||kind==='cow'?18:12,wild,m,state:'idle',t:Math.random()*3,tx:x,ty:y,face:Math.random()*TAU,
      range:guard?0:person?160:wild?140:40,walk:person?42:kind==='fox'?55:38,run:kind==='fox'?260:220,A:CANIM[guard?'guard':person?'person':'animal']});
  }
}
function updCritters(dt){
  const cx=G.camLook.x/S, cz=G.camLook.z/S;
  for(const c of CRITTERS){
    const far=Math.hypot(c.x-cx,c.y-cz)>1400; c.m.root.visible=!far; if(far) continue;
    c.t-=dt; let sp=0;
    const dP=P&&!P.dead?Math.hypot(P.x-c.x,P.y-c.y):1e9;
    if(c.wild&&dP<230&&c.state!=='flee'){const a=Math.atan2(c.y-P.y,c.x-P.x);c.state='flee';c.t=2.6;c.tx=c.x+Math.cos(a)*340;c.ty=c.y+Math.sin(a)*340;}
    if(c.t<=0){
      if(c.range>0&&Math.random()<.55){const a=Math.random()*TAU,r=Math.random()*c.range;c.state='walk';c.tx=c.home.x+Math.cos(a)*r;c.ty=c.home.y+Math.sin(a)*r;c.t=7;}
      else{c.state=Math.random()<.45?'eat':'idle';c.t=3+Math.random()*4;}
      if(c.wild&&Math.hypot(c.x-c.home.x,c.y-c.home.y)>500){c.state='walk';c.tx=c.home.x;c.ty=c.home.y;c.t=9;}
    }
    if(c.state==='walk'||c.state==='flee'){const dx=c.tx-c.x,dy=c.ty-c.y,dd=Math.hypot(dx,dy);
      if(dd<8){c.state='idle';c.t=2+Math.random()*3;}else{sp=c.state==='flee'?c.run:c.walk;c.face=Math.atan2(dy,dx);const ox=c.x,oy=c.y;c.x+=dx/dd*sp*dt;c.y+=dy/dd*sp*dt;collide(c);if(Math.hypot(c.x-ox,c.y-oy)<sp*dt*.3){c.state='idle';c.t=1;}}}
    if(!c.wild&&!c.range&&P&&dP<160) c.face=Math.atan2(P.y-c.y,P.x-c.x);
    const gy=groundY(c.x,c.y); c.m.root.position.set(c.x*S,gy,c.y*S); c.m.root.rotation.y=lerpAng(c.m.root.rotation.y,-c.face,Math.min(1,dt*6));
    drive(c.m,{n:sp>0?(c.state==='flee'?c.A.run:c.A.walk):(c.state==='eat'?c.A.eat:c.A.idle)}); c.m.anim.update(dt);
  }
}

/* --- Lock-on: Tab or middle mouse fixes facing and camera on one enemy */
function lockCandidates(){const sc=e=>Math.hypot(e.x-P.x,e.y-P.y)+Math.abs(angDiff(Math.atan2(e.y-P.y,e.x-P.x),P.face))*160;
  return G.enemies.filter(e=>!e.dead&&!e.dormant&&!e.leaving&&Math.hypot(e.x-P.x,e.y-P.y)<650).sort((a,b)=>sc(a)-sc(b));}
function toggleLock(){
  if(!P||P.dead) return; const c=lockCandidates();
  if(!c.length){G.lock=null;return;}
  if(!G.lock){G.lock=c[0];sfx('tick');return;}
  const i=c.indexOf(G.lock); G.lock=i<0?c[0]:i===c.length-1?null:c[i+1]; sfx('tick');
}
const lockRing=new THREE.Mesh(new THREE.RingGeometry(.85,1,48).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:new THREE.Color(2.2,1.6,.5),transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false}));
lockRing.visible=false; scene.add(lockRing);
function updLock(){
  const L=G.lock; if(L&&(L.dead||L.dormant||!P||P.dead||Math.hypot(L.x-P.x,L.y-P.y)>820)) G.lock=null;
  lockRing.visible=!!G.lock&&G.state==='play';
  if(G.lock){const e=G.lock,r=e.r*S*1.7*(1+Math.sin(G.time*6)*.05);lockRing.position.set(e.x*S,groundY(e.x,e.y)+.08,e.y*S);lockRing.scale.set(r,1,r);lockRing.rotation.y=G.time*.8;}
}

/* --- Chests, equipment and travelling through doors */
function openChest(c){
  if(c.gold&&!G.flags.vogterDead){toast('Låst. Gravvogteren bærer nøglen.');sfx('block');return;}
  G.flags.chests=G.flags.chests||{}; G.flags.chests[c.id]=true; sfx('chest');
  const m=CHEST_M[c.id]; if(m) m.opening=true;
  const gy=groundY(c.x,c.y); burst(c.x*S,gy+.8,c.y*S,40,2.2,1.4,.25,2.4,1.8,.6,{grav:-.4,drag:1});
  setTimeout(()=>{P.runes+=c.runes;num(c.x,c.y,'+'+c.runes+' runer','crit');giveItem(c.item);if(c.also)setTimeout(()=>giveItem(c.also),1400);saveGame();},500);
}
function giveItem(id){
  G.inv=G.inv||[]; if(G.inv.includes(id)) return; G.inv.push(id); const it=ITEMS[id];
  const slot=it.cls&&it.cls!==P.cls?null:it.slot==='talisman'?(!G.eq.t1?'t1':!G.eq.t2?'t2':null):(!G.eq[it.slot]?it.slot:null);
  if(slot){G.eq[slot]=id; if(id==='idunn')P.flasks++; applyWeaponLook();}
  banner('FUNDET',it.name); toast(it.desc+(slot?' (taget på)':' Tryk I for at tage det på.')); sfx('pickup');
}
function equip(id){
  const it=ITEMS[id]; if(it.cls&&it.cls!==P.cls){toast('Det våben passer ikke til din klasse.');return;} for(const k in G.eq) if(G.eq[k]===id){G.eq[k]=null;if(id==='idunn')P.flasks=Math.min(P.flasks,maxFlasks());P.hp=Math.min(P.hp,maxHp());renderInv();return;}
  let slot=it.slot==='talisman'?(!G.eq.t1?'t1':!G.eq.t2?'t2':'t2'):it.slot;
  if(G.eq[slot]==='idunn') P.flasks=Math.max(0,P.flasks-1);
  G.eq[slot]=id; if(id==='idunn')P.flasks++; P.hp=Math.min(P.hp,maxHp()); sfx('pickup'); applyWeaponLook(); renderInv();
}
function renderInv(){
  const el=$('invSlots'); el.innerHTML='';
  for(const k of ['arm','weapon','armor','t1','t2']){const id=G.eq[k];const d=document.createElement('div');d.className='slotrow';
    d.innerHTML=`<span class="ab">${SLOTN[k]}</span><span class="nm">${id?ITEMS[id].name+'<small>'+ITEMS[id].desc+'</small>':'<small>'+(k==='arm'?'Klassens standardvåben':'Tom')+'</small>'}</span>`;el.appendChild(d);}
  const list=$('invItems'); list.innerHTML='';
  if(!(G.inv||[]).length){list.innerHTML='<p class="mute small">Du har intet udstyr endnu. Kig efter kister i verden og i gravkrypten under højen.</p>';return;}
  for(const id of G.inv){const it=ITEMS[id], on=eqHas(id);const b=document.createElement('button');b.type='button';b.className='invbtn'+(on?' on':'');
    b.innerHTML=`<span><b>${it.name}</b><small>${it.desc}</small></span><span class="tag">${on?'Tag af':'Tag på'}</span>`;b.addEventListener('click',()=>equip(id));list.appendChild(b);}
}
function openInv(){G.state='inv';renderInv();$('inv').hidden=false;$('invGo').focus({preventScroll:true});}
$('invGo').addEventListener('click',()=>{$('inv').hidden=true;G.state='play';});
function travel(x,y,title,sub){
  if(P.mount) dismount(false);
  const f=$('fade'); f.classList.add('on'); G.state='travel'; sfx('gate');
  setTimeout(()=>{P.x=x;P.y=y;P.act=null;P.roll=0;if(C){C.x=x-20;C.y=y+15;}G.boss=null;snapCam();if(title)banner(title,sub);
    setTimeout(()=>{f.classList.remove('on');G.state='play';},250);},550);
}

/** Shows the meshes of the equipped weapon style on the player model. */
function applyWeaponLook(){
  if(!PM||!P) return; const w=G.eq&&G.eq.arm;
  if(P.cls==='berserker'){PM.show('2H_Axe',w!=='tvilling');PM.show('1H_Axe',w==='tvilling');PM.show('1H_Axe_Offhand',w==='tvilling');}
  if(P.cls==='skjoldmo'){PM.show('1H_Sword',w!=='langsvaerd');PM.show('Round_Shield',w!=='langsvaerd');PM.show('2H_Sword',w==='langsvaerd');}
  if(P.cls==='volve'){PM.show('2H_Staff',w!=='galdrestav');PM.show('1H_Wand',w==='galdrestav');}
}
