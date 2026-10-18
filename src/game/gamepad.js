'use strict';
/* =========================================================
   CONTROLLER (standard mapping, souls-style layout)
   RB light · RT heavy · LT block · LB weapon art · B roll · X mead · Y skill · A interact · R3 lock · Start pause · View gear · D-pad up journal · D-pad left/right pick and use a belt item · D-pad down map
   In menus: D-pad or left stick moves focus, A selects, B goes back.
   ========================================================= */
const GPAD={prev:[],dead:.22,navT:0};
addEventListener('gamepadconnected',e=>{G.padActive=true;toast('Controller tilsluttet. '+(G.state==='play'?'RB slår, B ruller, A interagerer.':'Brug D-pad og A i menuerne.'));});
addEventListener('gamepaddisconnected',()=>{G.padMove=null;toast('Controlleren er koblet fra.');});

function navFocus(dir){
  const hosts=[...document.querySelectorAll('section.ov:not([hidden]), #dlg:not([hidden])')];
  const host=hosts[hosts.length-1]; if(!host) return;
  const els=[...host.querySelectorAll('button,input')].filter(x=>x.offsetParent!==null&&!x.disabled);
  if(!els.length) return;
  let i=els.indexOf(document.activeElement); i=i<0?0:(i+dir+els.length)%els.length;
  els[i].focus();
}
function pollPad(dt){
  const list=navigator.getGamepads?navigator.getGamepads():[];
  const gp=[...list].find(g=>g&&g.connected); if(!gp){G.padMove=null;return;}
  const b=gp.buttons.map(x=>x.pressed||x.value>.5), pr=GPAD.prev, down=i=>b[i]&&!pr[i];
  const [lx=0,ly=0,rx=0,ry=0]=gp.axes, lm=Math.hypot(lx,ly), rm=Math.hypot(rx,ry);
  if(b.some(Boolean)||lm>.35||rm>.35) G.padActive=true;
  if(!G.padActive){GPAD.prev=b;return;}
  if(G.state==='play'&&P){
    G.padMove=lm>GPAD.dead?{x:lx,y:ly}:null;
    if(!G.lock){const aim=rm>.3?[rx,ry]:lm>.3?[lx,ly]:null;if(aim){mouseW.x=P.x+aim[0]*220;mouseW.y=P.y+aim[1]*220;}}
    if(down(5)) buf={k:'lmb',t:G.time};
    if(down(6)||down(7)){buf={k:'rmb',t:G.time};P.blockStart=G.time;}
    mouse.r=!!(b[6]||b[7]);
    if(down(1)) buf={k:'roll',t:G.time};
    if(down(2)) buf={k:'heal',t:G.time};
    if(down(3)) buf={k:'special',t:G.time};
    if(down(4)) buf={k:'art',t:G.time};
    if(down(0)){const it=interactTarget();if(it)it.fn();}
    if(down(11)) toggleLock();
    if(down(10)) toggleHorse();
    if(down(13)) openMap();
    if(down(9)) openPause();
    if(down(8)) openInv();
    if(down(12)) openJournal();
    if(down(14)) G.beltSel=((G.beltSel||0)+1)%CONS_IDS.length;
    if(down(15)) useCons(CONS_IDS[G.beltSel||0]);
  } else {
    G.padMove=null; if(G.state!=='play') mouse.r=false;
    GPAD.navT-=dt;
    if(down(12)||(ly<-.6&&GPAD.navT<=0)){GPAD.navT=.22;navFocus(-1);}
    if(down(13)||(ly>.6&&GPAD.navT<=0)){GPAD.navT=.22;navFocus(1);}
    if(down(14)) navFocus(-1); if(down(15)) navFocus(1);
    if(down(0)){const a=document.activeElement;if(a&&a!==document.body&&a.click)a.click();else navFocus(0);}
    if(G.state==='cine'&&(down(0)||down(1)||down(9))){if(CINE&&CINE.t>.6)endIntro();GPAD.prev=b;return;}
    if(down(1)||down(9)) dispatchEvent(new KeyboardEvent('keydown',{code:'Escape',key:'Escape'}));
  }
  GPAD.prev=b;
}
