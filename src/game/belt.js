'use strict';
/* =========================================================
   BELT: throwing pots and draughts on the number keys (1–4), or D-pad left/right on a controller.
   Foes sometimes drop them; the smiths sell them.
   ========================================================= */
const CONS={
  ild:{name:'Ildkrukke',key:'1',ico:'ᚲ',max:5,desc:'Kastes, hvor du sigter. Brænder fjender og jorden.'},
  frost:{name:'Frostkrukke',key:'2',ico:'ᛁ',max:5,desc:'Kastes, hvor du sigter. Fryser fjender fast i et par sekunder.'},
  bjorn:{name:'Bjørnemjød',key:'3',ico:'ᛒ',max:3,desc:'25 % mere skade og 15 % mindre skade i 25 sekunder.'},
  salve:{name:'Eirs salve',key:'4',ico:'ᛖ',max:3,desc:'Heler 35 % liv over fem sekunder.'},
};
const CONS_IDS=Object.keys(CONS);
const POTS=[];
G.cons={ild:2,frost:0,bjorn:0,salve:1};
function giveCons(id,n=1,quiet){G.cons=G.cons||{};const c=CONS[id];const before=G.cons[id]||0;G.cons[id]=Math.min(c.max,before+n);if(!quiet&&G.cons[id]>before)toast(`Du fandt: ${c.name}${n>1?' ×'+n:''}`);}
function useCons(id){
  const p=P; if(!p||p.dead||G.state!=='play'||p.mount) return false;
  const n=(G.cons&&G.cons[id])||0; if(n<=0){toast(CONS[id].name+': du har ingen.');return false;}
  if(p.act||p.roll>0||p.stagger>0) return false;
  G.cons[id]=n-1; metaInc('items');
  if(id==='ild'||id==='frost'){
    let tx=G.lock&&!G.lock.dead?G.lock.x:mouseW.x, ty=G.lock&&!G.lock.dead?G.lock.y:mouseW.y; const d=Math.hypot(tx-p.x,ty-p.y);
    if(d>340){tx=p.x+(tx-p.x)/d*340;ty=p.y+(ty-p.y)/d*340;}
    p.act={kind:'art',anim:'Throw',t:0,dur:.5,hit:.22,move:.3,fit:.6,fn:()=>throwPot(id,tx,ty)};
  } else if(id==='bjorn'){p.act={kind:'heal',t:0,dur:.8,hit:.5,move:.35,fn:()=>{p.buffT=25;sfx('drink');toast('Bjørnemjød: du føler dig uovervindelig');burst(p.x*S,groundY(p.x,p.y)+1,p.y*S,30,3,.8,.3,2.6,.9,.3,{grav:-1});}};}
  else if(id==='salve'){p.act={kind:'heal',t:0,dur:.8,hit:.5,move:.35,fn:()=>{p.regenT=5;p.regenA=maxHp()*.35/5;sfx('rune');}};}
  return true;
}
function throwPot(id,tx,ty){
  const m=new THREE.Mesh(new THREE.SphereGeometry(.22,10,8),id==='ild'?glowMat(new THREE.Color(3,1.1,.2)):MAT.iceGlow); scene.add(m);
  POTS.push({id,x:P.x,y:P.y,sx:P.x,sy:P.y,tx,ty,t:0,dur:.55,mesh:m}); sfx('swing');
}
function updPots(dt){
  for(let i=POTS.length-1;i>=0;i--){const q=POTS[i];q.t+=dt;const k=Math.min(1,q.t/q.dur);
    q.x=lerp(q.sx,q.tx,k);q.y=lerp(q.sy,q.ty,k);const h=Math.sin(k*Math.PI)*3.5+1.2*(1-k);
    q.mesh.position.set(q.x*S,groundY(q.x,q.y)+h,q.y*S);
    FXA.emit(q.x*S,groundY(q.x,q.y)+h,q.y*S,0,0,0,.3,.3,...(q.id==='ild'?[3,1,.2]:[.7,1.6,2.4]),1,0,0,0);
    if(k>=1){scene.remove(q.mesh);q.mesh.geometry.dispose();POTS.splice(i,1);potBurst(q.id,q.x,q.y);}}
}
function potBurst(id,x,y){
  const scale=1+P.level*.06, R=id==='ild'?85:95;
  for(const e of G.enemies){if(e.dead||e.dormant)continue;if(Math.hypot(e.x-x,e.y-y)>R+e.r)continue;
    if(id==='ild') damageEnemy(e,40*scale,{poiseMult:1.2});
    else {damageEnemy(e,18*scale,{poiseMult:1.5});if(!e.dead){if(e.boss){e.slow=Math.max(e.slow,4);}else{e.stun=Math.max(e.stun,2.4);e.stunId=(e.stunId||0)+1;cancelAttacks(e);e.slow=4;}}}}
  if(id==='ild'){fireFx(x,y,70);burnAt(x,y,70,4,0,16*scale);sfx('boom');}
  else{const gy=groundY(x,y);for(let i=0;i<70;i++){const a=Math.random()*TAU,s=rand(3,8);FXA.emit(x*S,gy+.3,y*S,Math.cos(a)*s,rand(.5,3),Math.sin(a)*s,rand(.5,.9),rand(.25,.45),.7,1.6,2.4,1,3,2,1);}spikeFx(x,y);sfx('nova');}
  G.shake=Math.max(G.shake,.3);
}
/** Foes now and then drop a pot or a draught. */
function maybeDrop(e){
  if(G.sim||G.mode==='valhalla'&&Math.random()<.5) return;
  const ch=e.boss?1:.12; if(Math.random()>ch) return;
  const id=e.boss?pickOne(['bjorn','salve']):pickOne(['ild','ild','frost','salve']); giveCons(id,e.boss?2:1);
}
function updBeltHUD(){
  const el=$('belt'); if(!el) return;
  if(!el.children.length){for(const id of CONS_IDS){const d=document.createElement('div');d.className='bslot';d.dataset.id=id;d.innerHTML=`<span class="bico">${CONS[id].ico}</span><b></b><kbd>${CONS[id].key}</kbd>`;d.title=CONS[id].name+': '+CONS[id].desc;el.appendChild(d);}}
  for(const d of el.children){const n=(G.cons&&G.cons[d.dataset.id])||0;d.querySelector('b').textContent=n;d.classList.toggle('empty',n<=0);d.classList.toggle('sel',G.padActive&&CONS_IDS[G.beltSel||0]===d.dataset.id);}
}
