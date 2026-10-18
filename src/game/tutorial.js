'use strict';
/* =========================================================
   TUTORIAL: one short hint at a time during the first minutes, each cleared by doing the thing
   ========================================================= */
const TUT=[
  {id:'move',text:()=>G.padActive?'Bevæg dig med <b>venstre pind</b>, og sigt med <b>højre pind</b>.':`Bevæg dig med <b>${actLabel('up')} ${actLabel('left')} ${actLabel('down')} ${actLabel('right')}</b>, og sigt med musen.`,done:()=>(G.tutMoved||0)>160},
  {id:'ulfr',text:()=>`Gå hen til Gamle Ulfr ved runestenen, og tryk <b>${actLabel('interact')}</b> for at tale med ham.`,done:()=>G.flags.metUlfr},
  {id:'roll',text:()=>`Tryk <b>${actLabel('roll')}</b> for at rulle. Mens du ruller, kan intet ramme dig.`,done:()=>(P.rollId||0)>0},
  {id:'fight',when:()=>G.enemies.some(e=>e.aggro&&!e.dead&&Math.hypot(e.x-P.x,e.y-P.y)<360),
    text:()=>`En fjende! Lås fast med <b>${actLabel('lock')}</b>, og slå med <b>${actLabel('attack')}</b>. Røde felter på jorden viser, hvor et angreb lander. Blinker feltet, kan angrebet ikke blokeres, så rul.`,done:()=>(G.kills||0)>0},
  {id:'heal',when:()=>P.hp<maxHp()*.55,text:()=>`Du er såret. Drik mjød med <b>${actLabel('heal')}</b>. Hornene fyldes op igen, når du hviler ved en runesten.`,done:()=>G.tutHealed},
  {id:'rest',when:()=>P.runes>=lvlCost(P.level),text:()=>`Du har runer nok til et nyt niveau. Hvil ved en runesten med <b>${actLabel('interact')}</b>. Dør du først, ligger runerne, hvor du faldt.`,done:()=>G.tutRested},
  {id:'fatal',when:()=>G.enemies.some(e=>e.broken>0&&!e.dead&&Math.hypot(e.x-P.x,e.y-P.y)<300),text:()=>`Fjendens balance er brudt! Gå helt hen til den, og slå med <b>${actLabel('attack')}</b> for et kritisk stød.`,done:()=>(G.fatals||0)>0},
  {id:'art',when:()=>(G.kills||0)>3,text:()=>`Dit våben har en våbenkunst: <b>${ARTS[artKey()].name}</b>. Brug den med <b>${actLabel('art')}</b>. ${ARTS[artKey()].desc}`,done:()=>(P.artUses||0)>0},
  {id:'horse',when:()=>G.flags.horse,text:()=>`Fløjt på din hest Hrimfaxe med <b>${actLabel('horse')}</b>. Han kommer kun, når ingen fjender er tæt på.`,done:()=>G.flags.rode},
  {id:'map',when:()=>(G.kills||0)>1,text:()=>`Åbn kortet med <b>${actLabel('map')}</b>. Det gyldne mærke viser dit næste mål.`,done:()=>G.flags.mapOpened},
  {id:'journal',when:()=>G.flags.metUlfr&&(G.kills||0)>2,text:()=>`Din dagbog (<b>${actLabel('journal')}</b>) holder styr på opgaver og det, folk har fortalt dig.`,done:()=>G.tutJournal},
];
let hintEl=null, hintId=null;
function hideHint(){if(hintEl){hintEl.remove();hintEl=null;hintId=null;}}
function showHint(step){
  if(hintId===step.id&&hintEl){hintEl.innerHTML=step.text();return;}
  hideHint(); hintEl=document.createElement('div'); hintEl.id='hint'; hintEl.innerHTML=step.text(); document.body.appendChild(hintEl); hintId=step.id;
}
let tutLast=null;
function updTutorial(){
  if(!P||G.sim) return;
  if(tutLast) G.tutMoved=(G.tutMoved||0)+Math.hypot(P.x-tutLast.x,P.y-tutLast.y); tutLast={x:P.x,y:P.y};
  if(G.state!=='play'||!SET.hints||P.dead||G.mode==='valhalla'){hideHint();return;}
  const done=G.flags.tut=G.flags.tut||{};
  for(const s of TUT){ if(!done[s.id]&&s.done()){done[s.id]=true;if(hintId===s.id)hideHint();} }
  const next=TUT.find(s=>!done[s.id]&&(!s.when||s.when()));
  if(next) showHint(next); else hideHint();
}
