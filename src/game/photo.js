'use strict';
/* =========================================================
   PHOTO MODE (P): time stands still, the camera flies free around the hero.
   Drag or arrow keys to turn, wheel to zoom, W A S D to move, filters and depth of field, save as PNG.
   ========================================================= */
const PHOTO={yaw:0,pitch:.45,dist:9,tx:0,ty:0,tz:0,filter:0,dof:true,drag:null};
const FILTERS=['Ingen','Sort-hvid','Sepia','Frost','Glød','Drama'];
function openPhoto(){
  if(!P||G.state!=='play') return;
  G.state='photo'; $('hud').style.opacity=0; $('labels').style.visibility='hidden'; $('prompt').hidden=true; if(typeof hideHint==='function')hideHint();
  const dx=camera.position.x-P.x*S, dz=camera.position.z-P.y*S;
  PHOTO.yaw=Math.atan2(dx,dz); PHOTO.dist=Math.min(14,Math.hypot(dx,dz,camera.position.y-groundY(P.x,P.y))); PHOTO.pitch=.4;
  PHOTO.tx=P.x*S; PHOTO.ty=groundY(P.x,P.y)+1.2; PHOTO.tz=P.y*S;
  $('photoUI').hidden=false; renderPhotoUI(); sfx('page');
}
function closePhoto(){
  $('photoUI').hidden=true; $('hud').style.opacity=1; $('labels').style.visibility='visible';
  grade.uniforms.uFilter.value=0; dof.enabled=false; if(G.state==='photo') G.state='play';
}
function renderPhotoUI(){$('phFilter').textContent='Filter: '+FILTERS[PHOTO.filter];$('phDof').textContent='Dybdeskarphed: '+(PHOTO.dof?'til':'fra');}
function photoCam(dt){
  const sp=dt*6;
  if(held('up')){PHOTO.tx-=Math.sin(PHOTO.yaw)*sp;PHOTO.tz-=Math.cos(PHOTO.yaw)*sp;}
  if(held('down')){PHOTO.tx+=Math.sin(PHOTO.yaw)*sp;PHOTO.tz+=Math.cos(PHOTO.yaw)*sp;}
  if(held('left')){PHOTO.tx-=Math.cos(PHOTO.yaw)*sp;PHOTO.tz+=Math.sin(PHOTO.yaw)*sp;}
  if(held('right')){PHOTO.tx+=Math.cos(PHOTO.yaw)*sp;PHOTO.tz-=Math.sin(PHOTO.yaw)*sp;}
  if(keys.ArrowLeft) PHOTO.yaw+=dt*1.2; if(keys.ArrowRight) PHOTO.yaw-=dt*1.2;
  const pad=navigator.getGamepads?[...navigator.getGamepads()].find(g=>g&&g.connected):null;
  if(pad){const [lx=0,ly=0,rx=0,ry=0]=pad.axes;if(Math.abs(rx)>.2)PHOTO.yaw-=rx*dt*1.6;if(Math.abs(ry)>.2)PHOTO.pitch=clamp(PHOTO.pitch+ry*dt,.05,1.3);
    if(Math.abs(lx)>.2||Math.abs(ly)>.2){PHOTO.tx+=(Math.cos(PHOTO.yaw)*lx+Math.sin(PHOTO.yaw)*ly)*sp;PHOTO.tz+=(-Math.sin(PHOTO.yaw)*lx+Math.cos(PHOTO.yaw)*ly)*sp;}}
  // stay near the hero so the world around stays loaded
  const ox=PHOTO.tx-P.x*S, oz=PHOTO.tz-P.y*S, o=Math.hypot(ox,oz); if(o>30){PHOTO.tx=P.x*S+ox/o*30;PHOTO.tz=P.y*S+oz/o*30;}
  PHOTO.ty=lerp(PHOTO.ty,groundY(PHOTO.tx/S,PHOTO.tz/S)+1.2,Math.min(1,dt*4));
  const cp=Math.cos(PHOTO.pitch);
  G.camPos.set(PHOTO.tx+Math.sin(PHOTO.yaw)*cp*PHOTO.dist,PHOTO.ty+Math.sin(PHOTO.pitch)*PHOTO.dist,PHOTO.tz+Math.cos(PHOTO.yaw)*cp*PHOTO.dist);
  G.camLook.set(PHOTO.tx,PHOTO.ty,PHOTO.tz);
  grade.uniforms.uFilter.value=PHOTO.filter; dof.enabled=PHOTO.dof; dof.uniforms.focus.value=PHOTO.dist;
}
function takePhoto(){
  composer.render();
  const url=renderer.domElement.toDataURL('image/png'), a=document.createElement('a');
  const d=new Date(), pad=n=>String(n).padStart(2,'0');
  a.download=`ravnens-ed-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.png`; a.href=url; a.click();
  const f=$('flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); sfx('tick'); metaInc('photos');
}
$('phFilter').addEventListener('click',()=>{PHOTO.filter=(PHOTO.filter+1)%FILTERS.length;renderPhotoUI();});
$('phDof').addEventListener('click',()=>{PHOTO.dof=!PHOTO.dof;renderPhotoUI();});
$('phShot').addEventListener('click',()=>{$('photoUI').hidden=true;requestAnimationFrame(()=>{takePhoto();$('photoUI').hidden=false;});});
$('phHide').addEventListener('click',()=>{$('photoUI').classList.toggle('min');});
$('phBack').addEventListener('click',closePhoto);
cv.addEventListener('pointerdown',e=>{if(G.state!=='photo')return;PHOTO.drag={x:e.clientX,y:e.clientY};});
addEventListener('pointermove',e=>{if(G.state!=='photo'||!PHOTO.drag)return;PHOTO.yaw-=(e.clientX-PHOTO.drag.x)*.006;PHOTO.pitch=clamp(PHOTO.pitch+(e.clientY-PHOTO.drag.y)*.004,.05,1.35);PHOTO.drag={x:e.clientX,y:e.clientY};});
addEventListener('pointerup',()=>{PHOTO.drag=null;});
cv.addEventListener('wheel',e=>{if(G.state!=='photo')return;PHOTO.dist=clamp(PHOTO.dist+e.deltaY*.01,2.5,30);e.preventDefault();},{passive:false});
