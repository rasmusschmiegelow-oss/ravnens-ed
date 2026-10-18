'use strict';
/* =========================================================
   INPUT
   ========================================================= */
addEventListener('keydown',e=>{
  if(e.target&&e.target.tagName==='INPUT'&&e.target.type!=='range') return;
  if(G.state==='settings'&&captureRebind(e)) return;
  if(G.state==='photo'){if(e.code==='Escape'||e.code==='KeyP')closePhoto();else if(e.code==='Enter'||e.code==='Space')takePhoto();else if(e.code==='KeyF'){PHOTO.filter=(PHOTO.filter+1)%FILTERS.length;renderPhotoUI();}else keys[e.code]=true;e.preventDefault();return;}
  if(G.state==='cine'){if(CINE&&CINE.t>.6&&(bound('interact',e.code)||['Escape','Space','Enter'].includes(e.code)))endIntro();e.preventDefault();return;}
  keys[e.code]=true; G.padActive=false;
  if(e.code==='KeyM'){setMuted(AU.on);toast(AU.on?'Lyd til':'Lyd fra');}
  if(G.state==='play'){
    if(bound('roll',e.code)){buf={k:'roll',t:G.time};e.preventDefault();}
    if(bound('heal',e.code)) buf={k:'heal',t:G.time};
    if(bound('special',e.code)) buf={k:'special',t:G.time};
    if(bound('art',e.code)) buf={k:'art',t:G.time};
    if(bound('horse',e.code)) toggleHorse();
    if(e.code==='KeyP') openPhoto();
    if(bound('map',e.code)) openMap();
    {const i=['Digit1','Digit2','Digit3','Digit4'].indexOf(e.code);if(i>=0)useCons(CONS_IDS[i]);}
    if(bound('interact',e.code)){const it=interactTarget();if(it)it.fn();}
    if(e.code==='Escape') openPause();
    if(bound('inv',e.code)) openInv();
    if(bound('journal',e.code)) openJournal();
    if(bound('lock',e.code)){e.preventDefault();toggleLock();}
  } else if(G.state==='dialog'&&dlgCur&&!diceAnim){
    const n=parseInt(e.key,10);if(n>=1&&n<=9){const b=dlgOpts.querySelectorAll('button')[n-1];if(b){b.click();e.preventDefault();}}
  } else if(G.state==='pause'&&e.code==='Escape'){$('pause').hidden=true;G.state='play';}
  else if(G.state==='inv'&&(e.code==='Escape'||bound('inv',e.code))){$('inv').hidden=true;G.state='play';}
  else if(G.state==='journal'&&(e.code==='Escape'||bound('journal',e.code))){closeJournal();}
  else if(G.state==='map'&&(e.code==='Escape'||bound('map',e.code))){closeMap();}
  else if(G.state==='settings'&&e.code==='Escape'){closeSettings();}
  else if(G.state==='rest'&&e.code==='Escape'){$('rest').hidden=true;G.state='play';}
  if(e.code==='Space'&&G.state!=='play'&&document.activeElement===document.body) e.preventDefault();
});
addEventListener('keyup',e=>{keys[e.code]=false;});
addEventListener('pointerdown',()=>audioInit(),{once:true});
addEventListener('keydown',()=>audioInit(),{once:true});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;mouse.l=mouse.r=false;});
addEventListener('mousemove',e=>{mouse.x=e.clientX;mouse.y=e.clientY;});
cv.addEventListener('mousedown',e=>{if(G.state==='cine'&&CINE&&CINE.t>.6){endIntro();return;}if(G.state!=='play')return;if(e.button===0){mouse.l=true;buf={k:'lmb',t:G.time};}if(e.button===2){mouse.r=true;buf={k:'rmb',t:G.time};if(P)P.blockStart=G.time;}if(e.button===1){e.preventDefault();toggleLock();}});
addEventListener('mouseup',e=>{if(e.button===0)mouse.l=false;if(e.button===2)mouse.r=false;});
cv.addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('wheel',e=>{if(G.state==='play'){G.zoom=clamp(G.zoom+e.deltaY*.0009,0,1);e.preventDefault();}},{passive:false});

/* =========================================================
   CAMERA
   ========================================================= */
const ray=new THREE.Raycaster(), plane=new THREE.Plane(new THREE.Vector3(0,1,0),0), hitV=new THREE.Vector3(), ndc=new THREE.Vector2();
function camGoal(){
  let tx=P.x*S, tz=P.y*S; const ty=groundY(P.x,P.y);
  const B=G.boss&&!G.boss.dead?G.boss:(G.lock&&!G.lock.dead?G.lock:null), big=B&&(B.t==='jotun'||B.t==='lindorm'||B.t==='surt'||B.t==='garm');
  G.zEff=lerp(G.zEff??G.zoom,big?Math.max(G.zoom,.82):B?Math.max(G.zoom,.55):P.mount?Math.max(G.zoom,.5):G.zoom,.03);
  if(B){const k=big?.3:.2;tx=lerp(tx,B.x*S,k);tz=lerp(tz,B.y*S,k);}
  const z=Math.max(0,G.zEff-(G.fatalT>0?Math.sin(G.fatalT/.9*Math.PI)*.22:0)), d=lerp(11,27,z), pitch=lerp(.5,.98,z);
  return {pos:new THREE.Vector3(tx,ty+1+Math.sin(pitch)*d,tz+Math.cos(pitch)*d),look:new THREE.Vector3(tx,ty+1.2,tz-lerp(1.6,0,z))};
}
function snapCam(){const g=camGoal();G.camPos.copy(g.pos);G.camLook.copy(g.look);}
let titleT=0;
function updateCamera(dt){
  let goal;
  if(G.state==='title'||G.state==='loading'){
    titleT+=dt*.035;const cx=1800*S,cz=2300*S;
    const tr=15;goal={pos:new THREE.Vector3(cx+Math.cos(titleT)*tr,hgt(1800,2300)+4.2+Math.sin(titleT*.7)*.8,cz+Math.sin(titleT)*tr),look:new THREE.Vector3(cx,hgt(1800,2300)+6.5,cz-30)};
    G.camPos.lerp(goal.pos,G.state==='loading'?1:Math.min(1,dt*.8));G.camLook.lerp(goal.look,Math.min(1,dt*1.2));
  } else if(G.state==='dialog'&&dlgNPC&&P){
    const n=dlgNPC, tall=n.boss==='jotun'?8:n.boss==='surt'?7.2:n.gate?4:n.head?1.4:n.tall?2.6:1.5;
    const nx=n.x*S, nz=n.y*S, ny=(n.head?ICE_Y+.4:groundY(n.x,n.y))+tall;
    const px=P.x*S, pz=P.y*S, py=groundY(P.x,P.y);
    const dx=nx-px, dz=nz-pz, l=Math.hypot(dx,dz)||1, ux=dx/l, uz=dz/l;
    const J=n.boss==='jotun'||n.boss==='surt', back=J?6:n.gate?6:3.1, side=J?8:2.5;
    goal={pos:new THREE.Vector3(px-ux*back+(-uz)*side,py+(J?2.4:1.75),pz-uz*back+ux*side),look:new THREE.Vector3(nx-ux*.4,ny-(J?4:1.05),nz-uz*.4)};
    G.camPos.lerp(goal.pos,Math.min(1,dt*2.6));G.camLook.lerp(goal.look,Math.min(1,dt*3));
  } else if(G.state==='cine'&&CINE){
    cineCam(dt);
  } else if(G.state==='photo'&&P){
    photoCam(dt);
  } else if(P){
    goal=camGoal();G.camPos.lerp(goal.pos,Math.min(1,dt*5));G.camLook.lerp(goal.look,Math.min(1,dt*6));
  }
  camera.position.copy(G.camPos);
  if(G.shake>0){const s=G.shake*.35*SET.shake;camera.position.x+=rand(-s,s);camera.position.y+=rand(-s,s);camera.position.z+=rand(-s,s);G.shake=Math.max(0,G.shake-dt*1.8);}
  camera.lookAt(G.camLook);
  SEE.uFade.value=P&&G.state!=='title'&&G.state!=='dialog'?1:0; if(P){SEE.uPlayer.value.set(P.x*S,groundY(P.x,P.y),P.y*S);} SEE.uCam.value.copy(camera.position);
  sky.position.copy(camera.position);
  // depth of field frames the speaker during dialogue
  const talking=G.state==='dialog'&&dlgNPC; if(G.state!=='photo') dof.enabled=!!talking;
  if(talking){const nx=dlgNPC.x*S,nz=dlgNPC.y*S;dof.uniforms.focus.value=Math.hypot(camera.position.x-nx,camera.position.z-nz);}
  grade.uniforms.uDark.value=G.cryptK||0;
  const fc=P?{x:P.x*S,y:groundY(P.x,P.y),z:P.y*S}:{x:G.camLook.x,y:G.camLook.y,z:G.camLook.z};
  moon.position.set(fc.x+MOON_OFF.x,fc.y+MOON_OFF.y,fc.z+MOON_OFF.z);moon.target.position.set(fc.x,fc.y,fc.z);
  if(P){ndc.set(mouse.x/innerWidth*2-1,-(mouse.y/innerHeight)*2+1);ray.setFromCamera(ndc,camera);plane.constant=-(groundY(P.x,P.y)+1);if(ray.ray.intersectPlane(plane,hitV)){mouseW.x=hitV.x/S;mouseW.y=hitV.z/S;}}
}
