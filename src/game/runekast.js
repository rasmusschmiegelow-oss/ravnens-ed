'use strict';
/* =========================================================
   RUNEKAST: a dice game for runes (the Farkle family). Six rune dice; ᛟ (1) and ᚠ (5) score alone,
   three alike score their face ×100 (three ᛟ: 1000), all six different: 1500. Keep scoring dice and throw the rest,
   or bank your points. A throw with nothing to keep loses the turn. First to 1500 wins the stake.
   ========================================================= */
const RFACE=['','ᛟ','ᚢ','ᚦ','ᚨ','ᚠ','ᚱ'];
const RK={goal:1500};
/** Points for a set of dice, or -1 if some die in it scores nothing. */
function rkScore(d){
  if(!d.length) return 0;
  const c=[0,0,0,0,0,0,0]; for(const v of d) c[v]++;
  if(d.length===6&&c.slice(1).every(n=>n===1)) return 1500;
  let pts=0;
  for(let f=1;f<=6;f++){const n=c[f];if(!n)continue;
    if(n>=3) pts+=(f===1?1000:f*100)*(n-2);
    else if(f===1) pts+=n*100; else if(f===5) pts+=n*50; else return -1;}
  return pts;
}
/** The best set of dice to keep from a throw. */
function rkBest(d){let best={pts:0,idx:[]};for(let m=1;m<(1<<d.length);m++){const idx=[];for(let i=0;i<d.length;i++)if(m&(1<<i))idx.push(i);const p=rkScore(idx.map(i=>d[i]));if(p>best.pts||(p===best.pts&&p>0&&idx.length<best.idx.length))best={pts:p,idx};}return best;}
function openRunekast(who,opp){
  RK.who=who; RK.opp=opp; RK.stake=0; RK.score=[0,0]; RK.turn=0; G.state='runekast';
  $('rkWho').textContent=opp; $('rkStakes').hidden=false; $('rkPlay').hidden=true;
  $('rkMsg').textContent=`${opp} ryster et læderbæger. «Runekast? Først til ${RK.goal}. Hvad sætter du?»`;
  const st=$('rkStakeBtns'); st.innerHTML='';
  for(const s of [100,250,500]){const b=document.createElement('button');b.type='button';b.className='btn ghost';b.textContent=s+' runer';b.disabled=P.runes<s;b.addEventListener('click',()=>rkStart(s));st.appendChild(b);}
  $('runekast').hidden=false; setTimeout(()=>st.querySelector('button:not(:disabled)')?.focus({preventScroll:true})||$('rkQuit').focus({preventScroll:true}),30);
}
function rkStart(stake){RK.stake=stake;$('rkStakes').hidden=true;$('rkPlay').hidden=false;rkNewTurn(0);}
function rkNewTurn(who){RK.turn=who;RK.pts=0;RK.left=6;RK.dice=[];RK.sel=[];RK.kept=[];rkRoll();}
function rkRoll(){
  RK.dice=Array.from({length:RK.left},()=>1+Math.floor(Math.random()*6)); RK.sel=[]; sfx('tick'); setTimeout(()=>sfx('tick'),90);
  const best=rkBest(RK.dice);
  if(best.pts===0){RK.msg=(RK.turn===0?'Ingen runer at beholde. Du mister turens point.':`${RK.opp} slår intet, der tæller.`);RK.bust=true;rkRender();setTimeout(()=>{RK.bust=false;rkNext();},1500);return;}
  RK.msg=RK.turn===0?'Vælg de runer, du vil beholde, og kast igen eller gem dine point.':`${RK.opp} tænker …`; rkRender();
  if(RK.turn===1) setTimeout(rkAI,1100);
}
function rkKeep(){const kept=RK.sel.map(i=>RK.dice[i]);const p=rkScore(kept);if(p<=0)return false;RK.pts+=p;RK.left-=kept.length;RK.kept.push(...kept);if(RK.left===0){RK.left=6;RK.kept=[];RK.msg='Alle seks runer tæller! Du kaster dem alle igen.';}return true;}
function rkThrow(){if(RK.turn!==0)return;if(!rkKeep()){RK.msg='Vælg mindst én rune, der giver point.';rkRender();return;}rkRoll();}
function rkBank(){if(RK.turn!==0)return;if(RK.sel.length&&!rkKeep()){RK.msg='De valgte runer giver ikke point.';rkRender();return;}if(!RK.pts){RK.msg='Du har ingen point at gemme endnu.';rkRender();return;}RK.score[0]+=RK.pts;sfx('coins');rkNext();}
function rkAI(){
  if(G.state!=='runekast') return;
  const best=rkBest(RK.dice); RK.sel=best.idx; rkRender();
  setTimeout(()=>{rkKeep();const total=RK.score[1]+RK.pts;
    if(total>=RK.goal||RK.pts>=400||(RK.left<=2&&RK.pts>=250)){RK.score[1]+=RK.pts;RK.msg=`${RK.opp} gemmer ${RK.pts} point.`;sfx('coins');rkRender();setTimeout(rkNext,1100);}
    else rkRoll();},900);
}
function rkNext(){
  if(RK.score[0]>=RK.goal||RK.score[1]>=RK.goal){rkEnd(RK.score[0]>=RK.goal);return;}
  rkNewTurn(1-RK.turn);
}
function rkEnd(won){
  P.runes+=won?RK.stake:-RK.stake; if(won){metaInc('diceWins');sfx('ok');}else sfx('no');
  RK.msg=won?`Du vinder ${RK.stake} runer! ${RK.opp} skubber dem over bordet.`:`${RK.opp} vinder. Du taber ${RK.stake} runer.`;
  RK.turn=-1; rkRender(); $('rkStakes').hidden=false; $('rkPlay').hidden=true;
  const st=$('rkStakeBtns'); st.innerHTML=''; const again=document.createElement('button');again.type='button';again.className='btn';again.textContent='Et spil til';again.addEventListener('click',()=>openRunekast(RK.who,RK.opp));st.appendChild(again);
  $('rkMsg').textContent=RK.msg; again.focus({preventScroll:true});
}
function rkRender(){
  $('rkMsg').textContent=RK.msg||'';
  $('rkScore').innerHTML=`<span>Dig <b>${RK.score[0]}</b></span><span>${RK.opp} <b>${RK.score[1]}</b></span><span>Indsats <b>${RK.stake}</b></span><span>Denne tur <b>${RK.pts}${RK.sel.length&&RK.turn===0?' + '+Math.max(0,rkScore(RK.sel.map(i=>RK.dice[i]))):''}</b></span>`;
  const el=$('rkDice'); el.innerHTML='';
  RK.dice.forEach((v,i)=>{const b=document.createElement('button');b.type='button';b.className='rkdie'+(RK.sel.includes(i)?' sel':'')+(RK.bust?' bust':'');
    b.innerHTML=`<span>${RFACE[v]}</span><small>${v}</small>`;b.setAttribute('aria-label',`Terning ${v}`);b.disabled=RK.turn!==0;
    b.addEventListener('click',()=>{const k=RK.sel.indexOf(i);if(k>=0)RK.sel.splice(k,1);else RK.sel.push(i);sfx('tick');rkRender();});el.appendChild(b);});
  for(const v of RK.kept){const s=document.createElement('span');s.className='rkdie kept';s.innerHTML=`<span>${RFACE[v]}</span><small>${v}</small>`;el.appendChild(s);}
  $('rkThrow').disabled=$('rkBank').disabled=RK.turn!==0;
}
function closeRunekast(){$('runekast').hidden=true;if(G.state==='runekast')G.state='play';}
$('rkThrow').addEventListener('click',rkThrow);
$('rkBank').addEventListener('click',rkBank);
$('rkQuit').addEventListener('click',()=>{if(RK.turn>=0&&RK.stake&&$('rkStakes').hidden){P.runes-=RK.stake;toast(`Du rejser dig fra bordet og taber indsatsen (${RK.stake} runer).`);}closeRunekast();});
