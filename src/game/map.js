'use strict';
/* =========================================================
   WORLD MAP: the whole world with what you have explored, your goal, side quests and the runestones.
   Travel from the map to a lit runestone when no foes are near.
   ========================================================= */
const FOG={cw:100,nx:Math.ceil(WORLD.w/100),ny:Math.ceil(WORLD.h/100),t:0};
function seenArr(){let s=G.flags.seen;if(!s||s.length!==FOG.nx*FOG.ny){s='0'.repeat(FOG.nx*FOG.ny);G.flags.seen=s;}return s;}
/** Marks the land around you as explored. */
function updFog(dt){
  if(!P||G.sim||G.mode) return; FOG.t-=dt; if(FOG.t>0) return; FOG.t=.5;
  const s=seenArr().split(''), r=450; let ch=false;
  for(let cy=Math.max(0,Math.floor((P.y-r)/FOG.cw));cy<=Math.min(FOG.ny-1,Math.floor((P.y+r)/FOG.cw));cy++)
    for(let cx=Math.max(0,Math.floor((P.x-r)/FOG.cw));cx<=Math.min(FOG.nx-1,Math.floor((P.x+r)/FOG.cw));cx++){
      const i=cy*FOG.nx+cx; if(s[i]==='1') continue; if(Math.hypot((cx+.5)*FOG.cw-P.x,(cy+.5)*FOG.cw-P.y)<r){s[i]='1';ch=true;}}
  if(ch) G.flags.seen=s.join('');
}
/** Where the main quest points now (null when there is no place to show). */
function objTarget(){
  const f=G.flags, alive=b=>G.enemies.find(e=>e.boss===b&&!e.dead);
  if(G.mode) return null;
  if(!f.metUlfr) return {x:1748,y:2272};
  if(!f.horn&&!f.gateOpen){const j=alive('jarl');return j?{x:j.x,y:j.y}:{x:600,y:1200};}
  if(!f.gateOpen) return {x:1800,y:880};
  if(!f.jotunDone) return {x:1800,y:500};
  if(!f.act2) return null;
  if(!f.metRagna) return {x:4270,y:2430};
  if(!f.garmDead&&!f.fgateOpen) return {x:4300,y:1150};
  if(!f.fgateOpen) return {x:5000,y:900};
  return {x:5000,y:560};
}
/** Optional goals from side quests. */
function sideTargets(){
  const f=G.flags, out=[];
  if(f.lindormQuest&&!f.lindormDead) out.push({x:3120,y:1180,t:'Lindormen'});
  if(f.q_bjorn&&!f.bjornFound) out.push({x:2425,y:2125,t:'Bjørn'});
  if(f.q_varder) for(const b of ASH.beacons) if(!(f.beacons||{})[b.id]) out.push({x:b.x,y:b.y,t:'Varde'});
  if(f.q_sindri&&!f.muspelsten) out.push({x:5060,y:2110,t:'Glødkæmpen'});
  return out;
}
const mapCv=$('mapCv'), mapCtx=mapCv.getContext('2d');
function drawMap(){
  const W=mapCv.width,H=mapCv.height,k=W/WORLD.w,g=mapCtx, s=seenArr();
  g.clearRect(0,0,W,H); g.drawImage(miniBg,0,0,900,900*WORLD.h/WORLD.w,0,0,W,H);
  g.fillStyle='rgba(6,8,12,.94)';
  for(let cy=0;cy<FOG.ny;cy++)for(let cx=0;cx<FOG.nx;cx++)if(s[cy*FOG.nx+cx]!=='1')g.fillRect(Math.floor(cx*FOG.cw*k),Math.floor(cy*FOG.cw*k),Math.ceil(FOG.cw*k)+1,Math.ceil(FOG.cw*k)+1);
  const mark=(x,y,col,r=6)=>{g.fillStyle=col;g.beginPath();g.moveTo(x*k,y*k-r*1.4);g.lineTo(x*k+r,y*k);g.lineTo(x*k,y*k+r*1.4);g.lineTo(x*k-r,y*k);g.closePath();g.fill();};
  g.font='14px "IM Fell English SC", Georgia'; g.textAlign='center';
  for(const r of RUNESTONES){const seen=s[Math.floor(r.y/FOG.cw)*FOG.nx+Math.floor(r.x/FOG.cw)]==='1';if(!seen&&!r.lit)continue;mark(r.x,r.y,r.lit?'#f3d68a':'#6a7078',8);g.fillStyle=r.lit?'#f3d68a':'#9aa3aa';g.fillText(r.name,r.x*k,r.y*k-14);}
  for(const t of sideTargets()){g.strokeStyle='#cfd6dc';g.lineWidth=2;g.beginPath();g.arc(t.x*k,t.y*k,8,0,TAU);g.stroke();g.fillStyle='#cfd6dc';g.fillText(t.t,t.x*k,t.y*k+22);}
  const o=objTarget(); if(o){const pul=1+Math.sin(G.time*4)*.2;g.strokeStyle='#ffcf6a';g.lineWidth=3;g.beginPath();g.arc(o.x*k,o.y*k,12*pul,0,TAU);g.stroke();mark(o.x,o.y,'#ffcf6a',6);}
  if(G.stain){g.fillStyle='#f3d68a';g.font='20px "Noto Sans Runic"';g.fillText('ᚱ',G.stain.x*k,G.stain.y*k+6);}
  g.save();g.translate(P.x*k,P.y*k);g.rotate(P.face+Math.PI/2);g.fillStyle='#fff';g.beginPath();g.moveTo(0,-11);g.lineTo(7,8);g.lineTo(0,4);g.lineTo(-7,8);g.closePath();g.fill();g.restore();
}
function openMap(){
  if(!P||G.state!=='play'||G.mode) return; if(P.mount===undefined) P.mount=false;
  G.state='map'; G.flags.mapOpened=true; sfx('page'); drawMap();
  const tr=$('mapTravel'); tr.innerHTML=''; const busy=foesNear(600)||inCrypt(P.x,P.y);
  for(const r of RUNESTONES){ if(!r.lit) continue; const b=document.createElement('button'); b.type='button'; b.className='btn ghost'; b.textContent=r.name; b.disabled=busy;
    b.addEventListener('click',()=>{closeMap();G.lastRS=r.id;travel(r.x,r.y+46,r.name,'');}); tr.appendChild(b);}
  $('mapNote').textContent=busy?'Du kan ikke rejse, mens fjender er tæt på.':'Rejs til en tændt runesten.';
  $('map').hidden=false; $('mapGo').focus({preventScroll:true});
}
function closeMap(){$('map').hidden=true;if(G.state==='map')G.state='play';}
$('mapGo').addEventListener('click',closeMap);
/** The goal on the minimap: a marker, or an arrow on the rim when it is out of view. */
function drawMiniGoal(tp,W){
  const o=objTarget(); if(!o) return; let [x,y]=tp(o.x,o.y); const cx=W/2,cy=W/2,dx=x-cx,dy=y-cy,d=Math.hypot(dx,dy),R=W/2-16;
  mctx.fillStyle='#ffcf6a';
  if(d<R){mctx.beginPath();mctx.moveTo(x,y-10);mctx.lineTo(x+7,y);mctx.lineTo(x,y+10);mctx.lineTo(x-7,y);mctx.closePath();mctx.fill();return;}
  const a=Math.atan2(dy,dx);mctx.save();mctx.translate(cx+Math.cos(a)*R,cy+Math.sin(a)*R);mctx.rotate(a);mctx.beginPath();mctx.moveTo(10,0);mctx.lineTo(-6,-8);mctx.lineTo(-6,8);mctx.closePath();mctx.fill();mctx.restore();
}
