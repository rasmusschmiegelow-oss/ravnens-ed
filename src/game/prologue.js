'use strict';
/* =========================================================
   TITLE SCREEN DETAILS AND THE PROLOGUE: three still frames before a new adventure (designed in Paper)
   ========================================================= */
const PROLOG=[
  ['ᚦᚱᛁᛟ','Tre vintre','uden sommer. Kornet frøs i jorden, og de døde rejste sig fra højene, fordi selv Hel ikke kunne holde varmen.'],
  ['ᚺᚱᛁᛗ','Rimtursen','Hrimgrimr sidder bag Jötunporten og ånder frost over verden. Ingen ved hvorfor, og ingen er kommet hjem for at fortælle det.'],
  ['ᚺᚢᚷᛁᚾ','Ravnene','Hugin og Munin fløj over sneen og valgte én, der var død, men ikke færdig. Du vågner ved runestenen i Ravnsholm.'],
];
let PRO=null;
function playPrologue(done){
  G.state='prolog'; PRO={i:-1,done,t:null}; $('prolog').hidden=false; prNext();
}
function prNext(){
  if(!PRO) return; PRO.i++; if(PRO.i>=PROLOG.length){skipPrologue();return;}
  const f=$('prFrame'), [r,k,l]=PROLOG[PRO.i]; f.classList.remove('on');
  setTimeout(()=>{if(!PRO)return;$('prRune').textContent=r;$('prKey').textContent=k;$('prLine').textContent=l;f.classList.add('on');sfx('page');},PRO.i?900:150);
  PRO.t=setTimeout(prNext,PRO.i?6600:5900);
}
function skipPrologue(){if(!PRO)return;clearTimeout(PRO.t);const d=PRO.done;PRO=null;$('prolog').hidden=true;$('prFrame').classList.remove('on');d();}
$('prolog').addEventListener('click',skipPrologue);
/** The title screen shows the latest hero, the Valhalla record and which act the story has reached. */
function refreshTitle(){
  const i=latestSlot(), s=i?loadSave(i):null;
  $('bCont').hidden=!s; $('contSub').textContent=s?`${s.name} · ${CLASSES[s.cls].name} · niveau ${s.level}`:'';
  const best=META.n.valhallaBest||0; $('vhSub').textContent=best?`rekord: ${best} ${best===1?'bølge':'bølger'}`:'';
  const act2=s&&s.flags&&s.flags.act2;
  $('tlAct').textContent=act2?'AKT II · ASKEFJORDEN':'AKT I · FIMBULVINTEREN';
  $('tlQuote').textContent=act2?'«Isen holdt ilden nede. Nu er den brudt.»':'«Ravnene har valgt dig.»';
  setTimeout(()=>($('bCont').hidden?$('bNew'):$('bCont')).focus({preventScroll:true}),30);
}
