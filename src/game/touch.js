'use strict';
/* =========================================================
   TOUCH: a stick on the left, action buttons on the right. Aim follows the locked foe,
   the nearest foe close by, or the way you walk.
   ========================================================= */
const TOUCH={on:false,move:null,id:null,cx:0,cy:0};
function initTouch(){
  if(!(matchMedia('(pointer:coarse)').matches||new URLSearchParams(location.search).has('touch'))) return;
  TOUCH.on=true; G.zoom=.62; document.body.classList.add('touch');
  const stick=$('tStick'), knob=$('tKnob'), R=58;
  const setKnob=(dx,dy)=>{knob.style.transform=`translate(${dx}px,${dy}px)`;};
  stick.addEventListener('pointerdown',e=>{e.preventDefault();TOUCH.id=e.pointerId;stick.setPointerCapture(e.pointerId);const r=stick.getBoundingClientRect();TOUCH.cx=r.left+r.width/2;TOUCH.cy=r.top+r.height/2;move(e);});
  const move=e=>{if(e.pointerId!==TOUCH.id)return;let dx=e.clientX-TOUCH.cx,dy=e.clientY-TOUCH.cy;const l=Math.hypot(dx,dy);if(l>R){dx*=R/l;dy*=R/l;}setKnob(dx,dy);
    TOUCH.move=l>8?{x:dx/R,y:dy/R}:null;G.tutMoved=(G.tutMoved||0)+1;};
  stick.addEventListener('pointermove',move);
  const end=e=>{if(e.pointerId!==TOUCH.id)return;TOUCH.id=null;TOUCH.move=null;setKnob(0,0);};
  stick.addEventListener('pointerup',end); stick.addEventListener('pointercancel',end);
  for(const b of document.querySelectorAll('#touchUI .tb')){
    const a=b.dataset.a;
    b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();audioInit();b.classList.add('on');
      if(G.state==='cine'){if(CINE&&CINE.t>.6)endIntro();return;}
      if(a==='pause'){if(G.state==='play')openPause();return;}
      if(G.state!=='play'||!P) return;
      if(a==='interact'){const it=interactTarget();if(it)it.fn();return;}
      if(a==='lock'){toggleLock();return;}
      if(a==='journal'){openJournal();return;}
      buf={k:a,t:G.time}; if(a==='rmb'){mouse.r=true;P.blockStart=G.time;}});
    const up=()=>{b.classList.remove('on');if(a==='rmb')mouse.r=false;};
    b.addEventListener('pointerup',up); b.addEventListener('pointercancel',up); b.addEventListener('pointerleave',up);
  }
  // no mouse attacks from taps on the game itself
  cv.addEventListener('touchstart',e=>e.preventDefault(),{passive:false});
  $('touchNote').textContent='Touch-styring er slået til: pind til venstre, knapper til højre. Et tastatur eller en controller giver mere kontrol.';
}
/** Runs every frame before the player moves: stick to movement, and a sensible aim. */
function updTouch(){
  if(!TOUCH.on) return;
  $('touchUI').hidden=!(P&&G.state==='play');
  if(!P||G.state!=='play') return;
  if(TOUCH.move) G.padMove=TOUCH.move;
  if(G.lock) return;
  let best=null,bd=280; for(const e of G.enemies){if(e.dead||e.dormant||!e.aggro)continue;const d=Math.hypot(e.x-P.x,e.y-P.y);if(d<bd){bd=d;best=e;}}
  if(best){mouseW.x=best.x;mouseW.y=best.y;} else if(TOUCH.move){mouseW.x=P.x+TOUCH.move.x*220;mouseW.y=P.y+TOUCH.move.y*220;}
  else{mouseW.x=P.x+Math.cos(P.face)*220;mouseW.y=P.y+Math.sin(P.face)*220;}
}
initTouch();
