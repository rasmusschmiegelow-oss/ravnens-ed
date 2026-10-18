'use strict';
/* =========================================================
   RUNE SOCKETS: runes ground into the weapon. One socket, two from weapon +4.
   Fire sets foes alight, frost slows them, blood heals you, and thunder jumps to the next foe.
   ========================================================= */
const SRUNES={
  ild:{name:'Ildrune',glyph:'ᚲ',col:0xff8a3a,desc:'Hvert femte slag sætter fjenden i brand.'},
  is:{name:'Isrune',glyph:'ᛁ',col:0x9fdcff,desc:'Dine slag bremser fjenden i halvandet sekund.'},
  blod:{name:'Blodrune',glyph:'ᛒ',col:0xd83a3a,desc:'Du heler 3 % af den skade, du giver.'},
  torden:{name:'Tordenrune',glyph:'ᚦ',col:0xfff0a0,desc:'Hvert fjerde slag springer lynet til to fjender i nærheden.'},
};
G.sock={owned:[],slots:[null,null]};
const sockN=()=>G.weaponLvl>=4?2:1;
const hasRune=id=>{const s=G.sock&&G.sock.slots;return !!s&&(s[0]===id||(sockN()>1&&s[1]===id));};
function giveRune(id,quiet){G.sock=G.sock||{owned:[],slots:[null,null]};if(G.sock.owned.includes(id))return false;G.sock.owned.push(id);
  if(!quiet){banner('RUNE FUNDET',SRUNES[id].name);toast(SRUNES[id].desc+' Slib den ind i dit våben under Udstyr (I).');sfx('rune');}
  const free=G.sock.slots.slice(0,sockN()).indexOf(null); if(free>=0&&!G.sock.slots.includes(id)) G.sock.slots[free]=id; return true;}
/** Called when one of the hero's own blows lands. */
function runeHit(e,dmg){
  if(!G.sock||e.dead) return;
  G.sock.n=(G.sock.n||0)+1;
  if(hasRune('blod')&&!G.sim){P.hp=Math.min(maxHp(),P.hp+dmg*.03);}
  if(hasRune('is')) e.slow=Math.max(e.slow,1.5);
  if(hasRune('ild')&&G.sock.n%5===0) e.burnT=3;
  if(hasRune('torden')&&G.sock.n%4===0){
    const near=G.enemies.filter(q=>q!==e&&!q.dead&&!q.dormant&&Math.hypot(q.x-e.x,q.y-e.y)<170).sort((p,q)=>Math.hypot(p.x-e.x,p.y-e.y)-Math.hypot(q.x-e.x,q.y-e.y)).slice(0,2);
    let from=e; for(const q of near){const gy=groundY(q.x,q.y)+1.2;for(let i=0;i<16;i++){const k=i/16;FXA.emit(lerp(from.x,q.x,k)*S+rand(-.15,.15),gy+rand(-.3,.3),lerp(from.y,q.y,k)*S+rand(-.15,.15),0,0,0,.25,.35,3,3,2,1,0,0,0);}
      damageEnemy(q,dmg*.6,{noRune:true,poiseMult:.5});from=q;}
    if(near.length) sfx('spike');
  }
}
/** Burning foes take damage over time. */
function updBurn(e,dt){
  if(!(e.burnT>0)||e.dead) return; e.burnT-=dt; e.burnTick=(e.burnTick||0)-dt;
  if(e.burnTick<=0){e.burnTick=.5;damageEnemy(e,(5+P.level*.8),{noRune:true,noPoise:true});}
  if(Math.random()<.5) FXA.emit(e.x*S+rand(-.3,.3),groundY(e.x,e.y)+rand(.3,1.6),e.y*S+rand(-.3,.3),0,rand(1,2),0,.5,.3,3,1,.2,1,-.5,1,1);
}
/** The socket section of the equipment window. */
function renderSockets(){
  const el=$('invSockets'); if(!el) return; el.innerHTML='';
  const n=sockN();
  for(let i=0;i<2;i++){const id=G.sock.slots[i], open=i<n, d=document.createElement('div');d.className='slotrow';
    d.innerHTML=`<span class="ab">Rune ${i+1}</span><span class="nm">${!open?'<small>Åbnes, når dit våben er forstærket til +4</small>':id?SRUNES[id].name+'<small>'+SRUNES[id].desc+'</small>':'<small>Tom. Vælg en rune nedenfor.</small>'}</span>`;
    if(open&&id){const b=document.createElement('button');b.type='button';b.className='seg';b.textContent='Tag ud';b.addEventListener('click',()=>{G.sock.slots[i]=null;sfx('pickup');renderSockets();});d.appendChild(b);}
    el.appendChild(d);}
  const list=document.createElement('div');list.className='invlist';
  for(const id of G.sock.owned){if(G.sock.slots.slice(0,n).includes(id))continue;const b=document.createElement('button');b.type='button';b.className='invbtn';
    b.innerHTML=`<span><b>${SRUNES[id].glyph} ${SRUNES[id].name}</b><small>${SRUNES[id].desc}</small></span><span class="tag">Slib ind</span>`;
    b.addEventListener('click',()=>{const free=G.sock.slots.slice(0,n).indexOf(null);G.sock.slots[free>=0?free:0]=id;sfx('block');renderSockets();});list.appendChild(b);}
  if(!G.sock.owned.length) list.innerHTML='<p class="mute small">Du har ingen runer endnu. Dvalin og Sindri sælger dem, og nogle fjender bærer dem.</p>';
  el.appendChild(list);
}
