'use strict';
/* =========================================================
   MAIN LOOP
   ========================================================= */
let last=performance.now();
function frame(now,manual){
  if(!manual) requestAnimationFrame(frame); // tests can step the game by hand
  let rdt=Math.max(0,Math.min(.05,(now-last)/1000)); last=Math.max(last,now);
  let dt=rdt;
  if(G.slowmo>0){G.slowmo-=rdt;dt*=.3;}
  if(G.hitStop>0){G.hitStop-=rdt;dt*=.05;}
  G.time+=rdt; skyUniforms.uTime.value=G.time; WIND.uTime.value=G.time; WIND.uWind.value=1+Math.max(0,wind)*.25;
  pollPad(rdt); updTouch(); updDayNight(rdt);
  if(G.state==='play'&&P){
    G.play+=rdt;
    updPlayer(dt); updComp(dt);
    for(const e of [...G.enemies]) updEnemy(e,dt);
    updHazards(dt); updProjs(dt); updPots(dt); checkIntros();
    if(P.dead){G.deadT+=rdt;if(G.mode==='valhalla'){if(G.deadT>3)valhallaOver();}else if(G.deadT>4.2)respawn();}
    updValhalla(rdt);
    // boss triggers
    if(!P.dead&&G.flags.gateOpen&&!G.flags.jotunTalked&&Math.hypot(P.x-1800,P.y-500)<210&&jotunEnt()) talk('jotun');
    if(!P.dead&&G.flags.act2&&!G.flags.eyvindTalked&&Math.hypot(P.x-4700,P.y-2020)<190&&eyvindEnt()) talk('eyvind');
    if(!P.dead&&G.flags.fgateOpen&&!G.flags.surtTalked&&Math.hypot(P.x-5000,P.y-560)<300&&surtEnt()) talk('surt');
    if(G.endT>0){G.endT-=rdt;if(G.endT<=0){if(G.flags.surtDone)showEnd();else startAct2();}}
    updMusic(rdt); updLock(); updTutorial(); updAchievements(rdt); updWeather(rdt); updFog(rdt);
    if(!G.perfChecked){G.perfN=(G.perfN||0)+1;G.perfT=(G.perfT||0)+rdt;
      if(G.perfT>5){G.perfChecked=true;const avg=G.perfT/G.perfN;let saved=null;try{saved=localStorage.getItem('ravnensEd.gfx');}catch(e){}
        if(!saved&&avg>1/38&&GFX!=='low'){applyGfx(GFX==='ultra'?'high':'low');toast('Grafikken er sat ned for et jævnere billede. Du kan ændre den i pausemenuen (Esc).');}}}
  } else if(G.state==='cine') updCine(rdt);
  if(G.state!=='play'&&hintEl) hideHint();
  if(G.state==='dialog'&&G.endT>0) G.endT=Math.max(.6,G.endT-rdt);
  const sdt=G.state==='photo'?0:rdt; // photo mode stops time
  if(P&&G.state!=='title') syncPlayer(sdt);
  syncEnemies(sdt); syncNPCs(sdt); if(CRITTERS.length) updCritters(G.state==='play'||G.state==='title'?rdt:0);
  ambientFX(sdt); updDecals(sdt); updTrail(sdt); FXA.update(sdt); FXN.update(sdt); updFX(sdt);
  updateCamera(rdt);
  updateSnow(sdt,G.camLook,G.time);
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
  G.state='title';music('title');$('title').hidden=false;refreshTitle();
  if(matchMedia('(pointer:coarse)').matches&&!matchMedia('(pointer:fine)').matches) $('touchNote').hidden=false;
  if(data&&data.save){beginGame(data.save);if(data.pos&&P){P.x=data.pos.x;P.y=data.pos.y;snapCam();}}
}
