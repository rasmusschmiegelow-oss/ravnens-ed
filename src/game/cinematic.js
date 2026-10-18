'use strict';
/* =========================================================
   BOSS INTROS: the first time a boss joins the fight, the camera cuts to it, it roars,
   and its name is carved across the screen. Any key skips.
   ========================================================= */
const INTRO={
  jarl:{name:'Hrafnkel',sub:'Draugr-jarlen af Gravhøjen',quote:'«Endnu en, som den gamle sender i døden. Kom da. Højen er sulten.»',h:3.3,cls:'frost',sfx:'horn'},
  vogter:{name:'Gravvogteren',sub:'Den sidste af jarlens huskarle',quote:'«Ingen tager guldet. Ingen går op igen.»',h:2.7,cls:'',sfx:'warn'},
  lindorm:{name:'Lindormen',sub:'Fra Isfjorden',quote:'Isen synger under dine fødder, da den store orm løfter hovedet.',h:6.5,lift:2.2,cls:'frost',sfx:'howl'},
  jotun:{name:'Hrimgrimr',sub:'Rimtursen · Ymirs æt',quote:'«Så kom da, lille menneske. Vinteren har ventet på dig.»',h:8.2,cls:'frost',sfx:'boom'},
  glodkaempe:{name:'Glødkæmpen',sub:'Vogter af Muspelstenen',quote:'Lavaen bobler, og stenen rejser sig på ben af ild.',h:3.4,cls:'fire',sfx:'boom'},
  garm:{name:'Garm',sub:'Helhunden fra Gnipahellir',quote:'Lænken om dens hals er sprængt. Den har ventet på netop dig.',h:3.4,cls:'fire',sfx:'howl'},
  ulvekonge:{name:'Fenrisætlingen',sub:'Ulvenes konge',quote:'En hvid ulv, større end en hest. Flokken tier, da den træder frem.',h:2,cls:'frost',sfx:'howl'},
  ketil:{name:'Ketil',sub:'Hærfører af Hrafnkels hird',quote:'«Jarlen er faldet, men hirden marcherer stadig.»',h:2.5,cls:'',sfx:'horn'},
  troldmor:{name:'Troldemoderen',sub:'Skovens gamle',quote:'Hun lugter af mos og blod, og hendes børn ligger døde i sneen.',h:3.3,cls:'',sfx:'boom'},
  askebrud:{name:'Askebruden',sub:'Surts udvalgte',quote:'«Han lovede mig ild til evig tid. Vil du se den?»',h:2.3,cls:'fire',sfx:'warn'},
  surt:{name:'Surt',sub:'Herre over Muspelheim',quote:'«Isen er brudt, og nu brænder verden, som det var spået.»',h:7.6,cls:'fire',sfx:'boom'},
};
let CINE=null;
/** Starts the intro for a boss the first time it is fought. Returns false when it has been seen already. */
function startIntro(e){
  const I=INTRO[e.boss]; if(!I||G.sim||G.flags['intro_'+e.boss]||!P||P.dead) return false;
  G.flags['intro_'+e.boss]=true;
  CINE={e,I,t:0,dur:5.4,card:false,cut:false};
  G.state='cine'; P.act=null; P.roll=0; P.dash=null; buf=null; mouse.l=mouse.r=false; G.lock=null;
  cancelAttacks(e); e.face=Math.atan2(P.y-e.y,P.x-e.x); e.pose={n:'roar',t:3,key:'intro'}; e.aggro=true; e.busy=0; G.boss=e;
  $('letterbox').classList.add('on'); $('hud').style.opacity=0; $('prompt').hidden=true; if(typeof hideHint==='function') hideHint();
  music(e.t==='jotun'||e.t==='surt'?'jotun':'jarl');
  return true;
}
function updCine(dt){
  const c=CINE; if(!c) return; c.t+=dt;
  if(c.t>1.15&&!c.card){c.card=true;const bc=$('bossCard');$('bcName').textContent=c.I.name;$('bcSub').textContent=c.I.sub;$('bcQuote').textContent=c.I.quote;
    bc.className=c.I.cls||'';bc.hidden=true;void bc.offsetWidth;bc.hidden=false;sfx(c.I.sfx);G.shake=Math.max(G.shake,.5);}
  if(c.t>.7&&$('cineSkip').hidden){$('cineSkip').textContent=`Tryk ${G.padActive?'A':actLabel('interact')} for at springe over`;$('cineSkip').hidden=false;}
  if(c.t>=c.dur) endIntro();
}
function endIntro(){
  const c=CINE; if(!c) return; CINE=null;
  $('bossCard').hidden=true; $('cineSkip').hidden=true; $('letterbox').classList.remove('on'); $('hud').style.opacity=1;
  c.e.pose=null; c.e.busy=Math.max(c.e.busy,.5); c.e.cd=Math.max(c.e.cd,.6);
  if(G.state==='cine') G.state='play';
}
const _cp=new THREE.Vector3(), _cl=new THREE.Vector3();
/** Two shots: over the hero's shoulder toward the boss, then a hard cut to a low angle circling it as it roars. */
function cineCam(dt){
  const c=CINE,e=c.e,I=c.I,H=I.h;
  const ex=e.x*S, ez=e.y*S, ey=groundY(e.x,e.y)+(I.lift||0);
  if(c.t<1.45){
    const px=P.x*S, pz=P.y*S, py=groundY(P.x,P.y), dx=ex-px, dz=ez-pz, l=Math.hypot(dx,dz)||1, ux=dx/l, uz=dz/l;
    const push=c.t*.9;
    _cp.set(px-ux*(5-push)-uz*2.3, py+2.4+H*.12, pz-uz*(5-push)+ux*2.3); _cl.set(ex,ey+H*.55,ez);
    G.camPos.lerp(_cp,Math.min(1,dt*3)); G.camLook.lerp(_cl,Math.min(1,dt*3));
  } else {
    const s=c.t-1.45, r=H*1.45+3.2+s*.45, a=e.face+.6-s*.1;
    _cp.set(ex+Math.cos(a)*r, ey+H*.3+.4+s*.15, ez+Math.sin(a)*r); _cl.set(ex,ey+H*.72,ez);
    if(!c.cut){c.cut=true;G.camPos.copy(_cp);G.camLook.copy(_cl);}
    G.camPos.lerp(_cp,Math.min(1,dt*4)); G.camLook.lerp(_cl,Math.min(1,dt*4));
  }
}
/** A boss that has just joined the fight gets its intro (once per playthrough). */
function checkIntros(){
  if(G.sim||G.state!=='play'||!P||P.dead||G.mode==='valhalla') return;
  for(const e of G.enemies){ if(!e.boss||e.dead||e.dormant||!e.aggro||!INTRO[e.boss]||G.flags['intro_'+e.boss]) continue;
    if(Math.hypot(e.x-P.x,e.y-P.y)<760){startIntro(e);return;} }
}
