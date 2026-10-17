'use strict';
/* =========================================================
   MAIN LOOP
   ========================================================= */
let last=performance.now();
function frame(now){
  requestAnimationFrame(frame);
  let rdt=Math.min(.05,(now-last)/1000); last=now;
  let dt=rdt;
  if(G.slowmo>0){G.slowmo-=rdt;dt*=.3;}
  if(G.hitStop>0){G.hitStop-=rdt;dt*=.05;}
  G.time+=rdt; skyUniforms.uTime.value=G.time; WIND.uTime.value=G.time; WIND.uWind.value=1+Math.max(0,wind)*.25;
  if(G.state==='play'&&P){
    G.play+=rdt;
    updPlayer(dt); updComp(dt);
    for(const e of [...G.enemies]) updEnemy(e,dt);
    updHazards(dt); updProjs(dt);
    if(P.dead){G.deadT+=rdt;if(G.deadT>4.2)respawn();}
    // boss triggers
    if(!P.dead&&G.flags.gateOpen&&!G.flags.jotunTalked&&Math.hypot(P.x-1800,P.y-500)<210&&jotunEnt()) talk('jotun');
    if(G.endT>0){G.endT-=rdt;if(G.endT<=0)showEnd();}
    updMusic(rdt); updLock();
    if(!G.perfChecked){G.perfN=(G.perfN||0)+1;G.perfT=(G.perfT||0)+rdt;
      if(G.perfT>5){G.perfChecked=true;const avg=G.perfT/G.perfN;let saved=null;try{saved=localStorage.getItem('ravnensEd.gfx');}catch(e){}
        if(!saved&&avg>1/38&&GFX!=='low'){applyGfx(GFX==='ultra'?'high':'low');toast('Grafikken er sat ned for et jævnere billede. Du kan ændre den i pausemenuen (Esc).');}}}
  } else if(G.state==='dialog'){ for(const e of G.enemies) if(e.leaving) {} }
  if(G.state==='dialog'||G.state==='end'){ if(G.endT>0&&G.state!=='end'){G.endT-=rdt;} }
  if(P&&G.state!=='title') syncPlayer(rdt);
  syncEnemies(rdt); syncNPCs(rdt); if(CRITTERS.length) updCritters(G.state==='play'||G.state==='title'?rdt:0);
  ambientFX(rdt); updDecals(rdt); updTrail(rdt); FXA.update(rdt); FXN.update(rdt); updFX(rdt);
  updateCamera(rdt);
  updateSnow(rdt,G.camLook,G.time);
  if(G.state!=='title'&&G.state!=='loading'&&P) updHUD(rdt);
  updDice(rdt);
  composer.render();
}

/* =========================================================
   BOOT
   ========================================================= */
function start(data){
  window.__gameReady=true;
  $('loading').hidden=true;
  G.state='title';music('title');$('title').hidden=false;$('bCont').hidden=!loadSave();
  if(matchMedia('(pointer:coarse)').matches&&!matchMedia('(pointer:fine)').matches) $('touchNote').hidden=false;
  if(data&&data.save){beginGame(data.save);if(data.pos&&P){P.x=data.pos.x;P.y=data.pos.y;snapCam();}}
}
