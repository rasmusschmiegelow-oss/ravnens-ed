'use strict';
/* =========================================================
   HRIMFAXE: Jarl Thorgrim's horse. Whistle (H / L3) to ride; a blow throws you off.
   No fighting from the saddle, and no riding in the crypt or with foes close by.
   ========================================================= */
const HORSE={m:null,step:0};
function foesNear(r){return G.enemies.some(e=>e.aggro&&!e.dead&&!e.dormant&&Math.hypot(e.x-P.x,e.y-P.y)<r);}
function toggleHorse(){
  if(!P||P.dead||G.state!=='play') return;
  if(P.mount){dismount(false);return;}
  if(!G.flags.horse){toast('Du har ingen hest endnu. Jarl Thorgrim i Ravnsholm har heste i sin stald.');return;}
  if(G.mode==='valhalla'||inCrypt(P.x,P.y)){toast('Din hest kan ikke komme herind.');return;}
  if(foesNear(450)){toast('Hrimfaxe kommer ikke, mens fjender er så tæt på.');return;}
  mount();
}
function mount(){
  if(!HORSE.m){HORSE.m=makeChar('horse');scene.add(HORSE.m.root);}
  HORSE.m.root.visible=true; P.mount=true; P.act=null; P.roll=0; buf=null; G.lock=null; G.flags.rode=true;
  sfx('horn'); burst(P.x*S,groundY(P.x,P.y)+.5,P.y*S,40,3,.9,.5,.85,.9,1,{sys:FXN,up:.4,grav:1,drag:3,alpha:.5,grow:2});
}
function dismount(thrown){
  if(!P||!P.mount) return; P.mount=false; if(HORSE.m) HORSE.m.root.visible=false;
  if(thrown){P.stagger=.7;toast('Du blev kastet af hesten!');}
  burst(P.x*S,groundY(P.x,P.y)+.5,P.y*S,30,3,.8,.5,.85,.9,1,{sys:FXN,up:.4,grav:1,drag:3,alpha:.5,grow:2});
}
/** Called from syncPlayer: the horse under the rider, galloping with the speed. */
function syncHorse(dt){
  if(!HORSE.m||!P) return;
  if(!P.mount){HORSE.m.root.visible=false;return;}
  const gy=groundY(P.x,P.y); HORSE.m.root.position.set(P.x*S,gy,P.y*S);
  HORSE.m.root.rotation.y=lerpAng(HORSE.m.root.rotation.y,-P.face,Math.min(1,dt*10));
  drive(HORSE.m,{n:P.move>.6?'Gallop':P.move>.12?'Walk':'Idle',speed:P.move>.6?lerp(.8,1.2,clamp(P.move/2.3,0,1)):1}); HORSE.m.anim.update(dt);
  if(P.move>.6){HORSE.step-=dt;if(HORSE.step<=0){HORSE.step=.18;sfx('step');FXN.emit(P.x*S+rand(-.5,.5),gy+.1,P.y*S+rand(-.5,.5),rand(-.5,.5),.5,rand(-.5,.5),.7,.5,.85,.88,.95,.4,0,2,2);}}
}
