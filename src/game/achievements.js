'use strict';
/* =========================================================
   ACHIEVEMENTS AND BESTIARY: kept across playthroughs in this browser
   ========================================================= */
const META_KEY='ravnensEd.meta';
const META={ach:{},kills:{},n:{}};
try{const m=JSON.parse(localStorage.getItem(META_KEY)||'{}');META.ach=m.ach||{};META.kills=m.kills||{};META.n=m.n||{};}catch(e){}
function saveMeta(){try{localStorage.setItem(META_KEY,JSON.stringify(META));}catch(e){}}
/** Counts something the player did (fatal blows, parries …). Not counted for the test bots. */
function metaInc(k,n=1){if(G.sim)return;META.n[k]=(META.n[k]||0)+n;}
const mN=k=>META.n[k]||0;
const ACH=[
  {id:'forste',name:'Første blod',desc:'Fæld din første fjende.',test:()=>Object.values(META.kills).some(v=>v>0)},
  {id:'jarl',name:'Højens fred',desc:'Fæld Draugr-jarlen.',test:f=>f.jarlDead},
  {id:'guld',name:'Gravrøver',desc:'Åbn guldkisten i gravkrypten.',test:f=>f.chests&&f.chests.gold},
  {id:'lindorm',name:'Lindormsbane',desc:'Fæld Lindormen fra Isfjorden.',test:f=>f.lindormDead},
  {id:'ord',name:'Ordets vej',desc:'Afslut den første akt uden at fælde Rimtursen.',test:f=>f.peace},
  {id:'svaerd',name:'Sværdets vej',desc:'Fæld Rimtursen.',test:f=>f.jotunDone&&!f.peace},
  {id:'runer',name:'Runebærer',desc:'Tænd alle seks runesten.',test:()=>RUNESTONES.every(r=>r.lit)},
  {id:'garm',name:'Helhundens bane',desc:'Fæld Garm ved Gnipahellir.',test:f=>f.garmDead},
  {id:'varder',name:'Vardebærer',desc:'Tænd de tre varder for Ragna.',test:f=>f.vardeDone},
  {id:'smede',name:'Dværgenes ven',desc:'Hjælp både Dvalin og Sindri.',test:f=>f.durinDone&&f.sindriDone},
  {id:'logi',name:'Ild med ild',desc:'Få Surts hemmelighed ud af Logi.',test:f=>f.surtLore},
  {id:'felt',name:'Feltjæger',desc:'Fæld alle fire navngivne feltbosser.',test:f=>f.fb_ulvekonge&&f.fb_ketil&&f.fb_troldmor&&f.fb_askebrud,prog:()=>[['ulvekonge','ketil','troldmor','askebrud'].filter(b=>G.flags['fb_'+b]).length,4]},
  {id:'hest',name:'Hrimfaxes rytter',desc:'Rid på Jarl Thorgrims hest.',test:f=>f.rode},
  {id:'kort',name:'Kortlægger',desc:'Udforsk det meste af verden.',test:f=>(f.seen||'').split('1').length-1>=900,prog:()=>[Math.min(900,(G.flags.seen||'').split('1').length-1),900]},
  {id:'surt',name:'Ragnarok må vente',desc:'Fæld Surt ved Muspelrevnen.',test:f=>f.surtDone},
  {id:'udod',name:'Den der aldrig faldt',desc:'Fæld Surt uden at dø en eneste gang.',test:f=>f.surtDone&&!G.deaths},
  {id:'kritisk',name:'Kritisk stød',desc:'Udfør 25 kritiske stød på fjender med brudt balance.',test:()=>mN('fatals')>=25,prog:()=>[mN('fatals'),25]},
  {id:'ryg',name:'Skyggen',desc:'Stik 10 intetanende fjender i ryggen.',test:()=>mN('backs')>=10,prog:()=>[mN('backs'),10]},
  {id:'parade',name:'Skjoldborg',desc:'Parér 20 slag.',test:()=>mN('parries')>=20,prog:()=>[mN('parries'),20]},
  {id:'undvig',name:'Vindens søn',desc:'Undvig 25 slag i sidste øjeblik.',test:()=>mN('dodges')>=25,prog:()=>[mN('dodges'),25]},
  {id:'kunst',name:'Våbenmester',desc:'Brug våbenkunst 50 gange.',test:()=>mN('arts')>=50,prog:()=>[mN('arts'),50]},
  {id:'ng',name:'Igen og igen',desc:'Begynd en ny runde+.',test:()=>mN('ngStarts')>0},
  {id:'valhalla',name:'Einherje',desc:'Overlev ti bølger i Valhalla.',test:()=>mN('valhallaBest')>=10,prog:()=>[Math.min(mN('valhallaBest'),10),10]},
];
let achT=0;
/** Checks for new achievements about once a second. */
function updAchievements(dt){
  if(G.sim||!P) return; achT-=dt; if(achT>0) return; achT=1;
  for(const a of ACH){ if(META.ach[a.id]) continue; let ok=false; try{ok=!!a.test(G.flags);}catch(e){} if(ok) unlockAch(a); }
}
function unlockAch(a){
  META.ach[a.id]=Date.now(); saveMeta(); sfx('ok');
  const d=document.createElement('div'); d.className='achtoast'; d.innerHTML=`<span class="ach-rune">ᛟ</span><span><small>Bedrift</small><b>${a.name}</b><i>${a.desc}</i></span>`;
  document.body.appendChild(d); setTimeout(()=>d.remove(),5200);
}
// What the bestiary says about each foe: a line of lore and how to beat it.
const BEST={
  draugr:['De døde fra Hrafnkels tid, der ikke vil ligge stille.','Rul ind under svinget, og slå, mens de trækker armen tilbage.'],
  archer:['Draugr med armbrøst. De sigter længe, før de skyder.','Den lysende linje viser skuddet. Gå til siden, eller luk afstanden.'],
  wolf:['Sultne gråulve, der jager i flok.','De kaster sig frem i en lige linje. Rul til siden, ikke bagud.'],
  minion:['Gravtrælle, jarlens tjenere.','Svage alene, farlige mange. Brug brede hug.'],
  seidr:['Draugr, der kan seiðr.','Deres bolte følger dig. Rul i sidste øjeblik.'],
  trold:['Små skovtrolde, der lever i flokke.','Hold dem foran dig, så de ikke omringer dig.'],
  bjergtrold:['Store trolde fra fjeldet.','Langsomme, men tre slag i træk. Vent på det sidste.'],
  rimtrold:['Rimtrolde med is i pelsen. En dræbte Astrids far.','Deres spring kan ikke blokeres. Rul, når de letter.'],
  ildvaette:['Vætter af ild fra krypten.','Tunge kombinationer. Tæl slagene.'],
  frostvaette:['Vætter af frost.','Tunge kombinationer. Tæl slagene.'],
  gjenganger:['Genfærd, der svæver over sneen.','De kaster sig frem. Rul til siden.'],
  gjenganger2:['Dødningehoveder, hurtigere end genfærdene.','Rul til siden, og slå efter.'],
  stenvaette:['Sten, der har fået liv.','Tunge og seje. Tunge slag bryder deres balance.'],
  stenvaette2:['Klippevætter, de største af stenene.','Tunge slag bryder deres balance. Brug det kritiske stød.'],
  lindyngel:['Lindormens unger.','Hurtige. Lås fast og slå i deres spring.'],
  vaette:['Lysvætter, der kaster lys.','Luk afstanden.'],
  jarl:['Hrafnkel, Ulfrs søn, der nægtede at dø.','Langsom, men hård. Hans spring kan ikke blokeres.'],
  vogter:['Den sidste af jarlens huskarle.','I anden fase sender han sjæle efter dig. Rul gennem dem.'],
  lindorm:['Ormen fra Isfjorden.','Den skriger, før den kaster sig frem. Rul til siden.'],
  jotun:['Hrimgrimr Ymirsson, der elskede en menneskekvinde.','Store, langsomme slag. Bliv tæt på ham.'],
  askedraugr:['Draugr, som Surts ild har brændt sorte.','Som draugr i Midgard, bare hårdere. Brug rygstød.'],
  askeskytte:['Skytter med brændende pile.','Luk afstanden, eller gem dig bag sten.'],
  glodulv:['Ulve med ild i pelsen. Garms flok.','De angriber i flok. Lås fast på én ad gangen.'],
  eldseidr:['Seiðr-folk, der kalder ild ned over dig.','Ilden lander, hvor du står. Bliv i bevægelse.'],
  lavavaette:['Lava, der har fået form.','Dens stamp sætter jorden i brand. Gå ud af ilden.'],
  glodkaempe:['Vogteren af Muspelstenen.','I anden fase eksploderer den. Rul væk, når den gløder.'],
  garm:['Helhunden, der lå i lænker ved Gnipahellir.','Hans spring kan ikke blokeres. I anden fase spyr han ild.'],
  ulvekonge:['En hvid ulvekonge, sagt at være af Fenris\' blod.','Hans spring kan ikke blokeres. I anden fase kalder han flokken.'],
  ketil:['Hrafnkels hærfører, der aldrig fik sin hvile.','Langsom, men tålmodig. Hold dig tæt på, og rul gennem hans spring.'],
  troldmor:['Moder til skovtroldene sydøst for landsbyen.','Hun slår hårdt og ofte. Tunge slag bryder hendes balance.'],
  askebrud:['Surts udvalgte, der kalder ild ned fra himlen.','Ilden lander, hvor du står. Bliv i bevægelse, og luk afstanden.'],
  surt:['Herren over Muspelheim, ilden der var før alt andet.','Hans flamme blafrer, lige efter han har svunget sværdet.'],
};
function bestiaryHTML(){
  const seen=Object.keys(ED).filter(k=>META.kills[k]);
  if(!seen.length) return '<p class="mute small">Fæld fjender, så skriver du om dem her.</p>';
  return seen.map(k=>{const b=BEST[k]||['',''];return `<div class="jq best"><h3>${ED[k].name} <span class="mute small">· fældet ${META.kills[k]}</span></h3><p>${b[0]}</p><p class="mute small">${b[1]}</p></div>`;}).join('');
}
function achHTML(){
  const n=ACH.filter(a=>META.ach[a.id]).length;
  return `<p class="mute small">${n} af ${ACH.length} bedrifter. De gælder for alle dine gennemløb i denne browser.</p>`+ACH.map(a=>{const on=!!META.ach[a.id],p=!on&&a.prog?a.prog():null;
    return `<div class="achrow${on?' on':''}"><span class="ach-rune">${on?'ᛟ':'·'}</span><span><b>${a.name}</b><small>${a.desc}${p?` (${p[0]} af ${p[1]})`:''}</small></span></div>`;}).join('');
}
