'use strict';
/* =========================================================
   CHARACTER MODELS
   ========================================================= */
const G3={cap:(r,l)=>new THREE.CapsuleGeometry(r,l,4,10),sph:(r,a=14,b=10)=>new THREE.SphereGeometry(r,a,b),box:(x,y,z)=>new THREE.BoxGeometry(x,y,z),cyl:(a,b,h,s=10)=>new THREE.CylinderGeometry(a,b,h,s),cone:(r,h,s=8)=>new THREE.ConeGeometry(r,h,s)};
const sm=(c,r=.8,m=0,o={})=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m,...o});
function addM(par,geo,mat,x=0,y=0,z=0){const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.castShadow=true;par.add(o);return o;}
const glowMat=c=>new THREE.MeshBasicMaterial({color:c});

function makeWolf(){
  const mats=[];const M=(c,r)=>{const m=sm(c,r??.95);mats.push(m);return m;};
  const fur=M(0x6e6d6b),dark=M(0x3e3c3a);
  const root=new THREE.Group(),body=new THREE.Group();body.position.y=.65;root.add(body);
  const tor=addM(body,G3.cap(.26,.75),fur,0,0,0);tor.rotation.z=Math.PI/2;
  addM(body,G3.sph(.3,10,8),fur,.32,.06,0).scale.set(1,1.05,1.1);
  const neck=new THREE.Group();neck.position.set(.55,.15,0);body.add(neck);
  addM(neck,G3.sph(.2,10,8),fur,.08,0,0);const sn=addM(neck,G3.cone(.11,.32,7),dark,.32,-.04,0);sn.rotation.z=-Math.PI/2;
  for(const s of [-1,1]){addM(neck,G3.cone(.06,.16,4),dark,.0,.2,s*.1);addM(neck,G3.sph(.03,6,6),glowMat(new THREE.Color(3,2,.4)),.2,.06,s*.08);}
  const tail=addM(body,G3.cone(.09,.6,6),fur,-.7,.05,0);tail.rotation.z=Math.PI/2+.5;
  const legs=[];[[.38,-1],[.38,1],[-.38,-1],[-.38,1]].forEach(([x,s])=>{const l=new THREE.Group();l.position.set(x,-.1,s*.15);body.add(l);addM(l,G3.cap(.06,.45),dark,0,-.3,0);legs.push(l);});
  return {root,body,neck,legs,mats,wolf:true,scale:1};
}
function addIceSpikes(m){
  const ch=m.bone('chest'); if(!ch) return;
  for(let i=0;i<10;i++){const c=new THREE.Mesh(new THREE.OctahedronGeometry(.07,0),MAT.iceGlow);c.position.set((Math.random()-.5)*.5,.25+Math.random()*.25,-.12-Math.random()*.15);c.scale.y=2.6;c.rotation.set(-.5+Math.random()*.4,0,(Math.random()-.5)*1.4);ch.add(c);}
}
function buildPlayerModel(cls){const m=makeChar(cls);scene.add(m.root);return m;}
function buildEnemyModel(t){
  let m;
  m=makeChar(t,{iceMaterial:MAT.iceGlow}); if(t==='jotun') addIceSpikes(m); m.skel=['draugr','archer','minion','seidr','vogter','jarl','askedraugr','askeskytte','eldseidr'].includes(t);
  scene.add(m.root); return m;
}
function buildNPC(id){
  let r;
  if(id==='mimir'){r={root:new THREE.Group(),mats:[]};addM(r.root,G3.sph(.4,18,14),sm(0x9fb2b0,.6),0,1.45,0);addM(r.root,G3.cone(.32,.8,9),sm(0xe8f0f0,.9),.1,1.0,0).rotation.z=Math.PI;
    for(const s of [-1,1])addM(r.root,G3.sph(.05,8,6),glowMat(new THREE.Color(1.2,3,4)),.34,1.55,s*.13);addM(r.root,new THREE.TorusGeometry(.42,.03,6,20),MAT.gold,0,1.62,0).rotation.x=Math.PI/2;}
  else { r=makeChar(id); r.anim.play(id==='astrid'?'Sit_Floor_Idle':'Idle'); }
  scene.add(r.root); return r;
}
// Plays a looping clip, or restarts a one-shot whenever its key changes.
function drive(m,w){
  if(!w) return;
  if(w.key!==undefined){ if(w.key!==m.lastKey){m.lastKey=w.key;m.anim.play(w.n,{loop:false,fit:w.fit||0,speed:w.speed||1,restart:true,fade:w.fade??.1});} return; }
  m.lastKey=undefined; m.anim.play(w.n,{speed:w.speed||1,fade:w.fade??.2});
}
const PANIM_ALT={
  tvilling:{idle:'Idle',run:'Running_A',atk:['Dualwield_Melee_Attack_Slice','Dualwield_Melee_Attack_Chop'],heavy:'2H_Melee_Attack_Spin',roar:'Cheer',heal:'Use_Item'},
  langsvaerd:{idle:'2H_Melee_Idle',run:'Running_A',atk:['2H_Melee_Attack_Slice','2H_Melee_Attack_Chop'],heavy:'2H_Melee_Attack_Chop',bash:'Block_Attack',heal:'Use_Item'},
  galdrestav:{idle:'Idle',run:'Running_B',cast:'1H_Ranged_Shoot',nova:'Spellcast_Long',special:'Spellcast_Raise',heal:'Use_Item'},
};
const PANIM={
  berserker:{idle:'2H_Melee_Idle',run:'Running_A',atk:['2H_Melee_Attack_Slice','2H_Melee_Attack_Chop'],heavy:'2H_Melee_Attack_Spin',roar:'Cheer',heal:'Use_Item'},
  skjoldmo:{idle:'Idle',run:'Running_A',atk:['1H_Melee_Attack_Slice_Horizontal','1H_Melee_Attack_Slice_Diagonal'],bash:'Block_Attack',heal:'Use_Item'},
  volve:{idle:'Idle',run:'Running_B',cast:'Spellcast_Shoot',nova:'Spellcast_Long',special:'Spellcast_Raise',heal:'Use_Item'},
};
function poseHum(r,a){
  if(r.wolf){const w=Math.sin(a.phase*1.3)*a.move;r.legs[0].rotation.z=w*.8;r.legs[3].rotation.z=w*.8;r.legs[1].rotation.z=-w*.8;r.legs[2].rotation.z=-w*.8;
    r.body.position.y=.65+Math.abs(Math.sin(a.phase*1.3))*.05*a.move-(a.crouch||0)*.18;r.body.rotation.z=(a.crouch||0)*.15;r.neck.rotation.z=-(a.crouch||0)*.3+Math.sin(a.t*2)*.03;}
}
