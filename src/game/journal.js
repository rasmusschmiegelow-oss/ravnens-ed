'use strict';
/* =========================================================
   JOURNAL, SIDE QUESTS AND COMPANION APPROVAL
   Quest progress lives in G.flags so it is saved with the game.
   ========================================================= */
// Each quest lists its steps; a step is shown once `show` is true and struck through once `done` is true.
const QUESTS=[
  {id:'main',title:'Ravnens Ed',main:true,active:()=>true,steps:[
    {t:'Tal med Gamle Ulfr ved runestenen i Ravnsholm.',done:f=>f.metUlfr},
    {t:'Find Draugr-jarlen i gravhøjen mod vest, og tag Jarlens Horn.',show:f=>f.metUlfr,done:f=>f.horn||f.gateForced},
    {t:'Åbn Jötunporten mod nord.',show:f=>f.horn||f.gateForced,done:f=>f.gateOpen},
    {t:'Konfrontér Rimtursen bag porten.',show:f=>f.gateOpen,done:f=>f.jotunDone},
    {t:'Følg røgen mod øst gennem Askepasset til Skjoldvik.',show:f=>f.act2,done:f=>f.metRagna},
    {t:'Fæld Garm, Helhunden, ved Gnipahellir nord for byen.',show:f=>f.metRagna,done:f=>f.garmDead||f.fgateOpen},
    {t:'Åbn Flammeporten mod nord.',show:f=>f.garmDead||f.fgateOpen,done:f=>f.fgateOpen},
    {t:'Fæld Surt ved Muspelrevnen.',show:f=>f.fgateOpen,done:f=>f.surtDone},
  ]},
  {id:'varder',title:'Vardernes lys',active:f=>f.q_varder,steps:[
    {t:f=>`Tænd de tre varder på højderne omkring Askefjorden (${Object.keys(f.beacons||{}).length} af 3).`,done:f=>Object.keys(f.beacons||{}).length>=3},
    {t:'Fortæl Ragna, at varderne brænder.',show:f=>Object.keys(f.beacons||{}).length>=3,done:f=>f.vardeDone},
  ],end:f=>f.vardeDone&&'Ragna gav dig Vardeflammen. De overlevende finder hjem.'},
  {id:'sindri',title:'Muspelstenen',active:f=>f.q_sindri,steps:[
    {t:'Sindri kan smede en askebrynje af en Muspelsten. Glødkæmpen ved lavasøen sydøst for Skjoldvik bærer én.',done:f=>f.muspelsten},
    {t:'Bring Muspelstenen til Sindri.',show:f=>f.muspelsten,done:f=>f.sindriDone},
  ]},
  {id:'logi',title:'Surts herold',active:f=>f.metLogi,steps:[
    {t:'Logi, Surts herold, spærrer vejen mod Flammeporten. Han vil vide, hvad du bringer hans herre.',done:f=>f.logiGone||f.surtLore},
  ],end:f=>f.logiRing?'Du gav Logi Hrafnkels ring for Surts hemmelighed.':f.surtLore?'Du talte Logi til at afsløre Surts svaghed.':f.logiAngry?'Du truede Logi væk. Surt ved, at du kommer.':''},
  {id:'ulfr',title:'En faders sorg',active:f=>f.q_ulfr,steps:[
    {t:'Ulfr fortalte, at Draugr-jarlen engang var hans søn Hrafnkel. Giv ham fred.',done:f=>f.jarlDead},
    {t:'Du fandt Hrafnkels ring på jarlens lig. Bring den til Ulfr, eller behold den.',show:f=>f.ring,done:f=>f.ulfrDone},
  ],end:f=>f.ulfrDone&&(f.ulfrChoice==='give'?'Du gav Ulfr ringen. Han græd, og takkede dig.':'Du beholdt Hrafnkels ring.')},
  {id:'durin',title:'Dvalins bror',active:f=>f.q_durin,steps:[
    {t:'Dvalins bror Durin gik ned i gravhøjen for mange år siden og kom aldrig op. Find ud af, hvad der skete.',done:f=>f.hammer},
    {t:'Du fandt Durins rester og hans hammer i krypten. Fortæl Dvalin det.',show:f=>f.hammer,done:f=>f.durinDone},
  ],end:f=>f.durinDone&&(f.durinChoice==='truth'?'Du fortalte Dvalin sandheden, og han smedede brorens hammer ind i dit våben.':'Du fortalte Dvalin, at hans bror døde som en helt.')},
  {id:'bjorn',title:'Den forsvundne jæger',active:f=>f.q_bjorn,steps:[
    {t:'Jægeren Bjørn gik mod øst efter rener og kom aldrig hjem. Thorgrim frygter det værste.',done:f=>f.bjornFound},
    {t:'Du fandt Bjørn såret i skoven sydøst for landsbyen.',show:f=>f.bjornFound,done:f=>f.bjornDone},
    {t:'Fortæl Thorgrim, hvad der skete med Bjørn.',show:f=>f.bjornDone,done:f=>f.bjornPaid},
  ],end:f=>f.bjornPaid&&(f.bjornChoice==='saved'?'Bjørn kom hjem til Ravnsholm.':f.bjornChoice==='robbed'?'Du tog Bjørns pung og lod ham ligge.':'Bjørn døde i sneen, trods dine forsøg.')},
  {id:'astrid',title:'Jarnsdóttirs hævn',active:f=>f.q_astrid,steps:[
    {t:'Astrids far blev dræbt af en rimtrold i skoven nordøst for runestenen ved porten. Hun vil se den død.',done:f=>f.astridRevenge},
  ],end:f=>f.astridRevenge&&(f.astridWitnessed?'Astrid så trolden falde. Hun har aldrig skudt bedre.':'Trolden er død, men Astrid var der ikke til at se det.')},
  {id:'lindorm',title:'Lindormen fra Isfjorden',active:f=>f.lindormQuest,steps:[
    {t:'Jarl Thorgrim lover 800 runer for Lindormen, der ligger på den frosne sø mod øst.',done:f=>f.lindormDead},
    {t:'Lindormen er død. Hent din belønning hos Thorgrim.',show:f=>f.lindormDead,done:f=>f.lindormPaid},
  ]},
];
function questState(q){const f=G.flags;const steps=q.steps.filter(s=>!s.show||s.show(f));const done=steps.every(s=>s.done(f))&&steps.length===q.steps.length;return{steps,done};}

/** A lore note: things people told you, kept in the journal. */
function note(id,text){G.flags.notes=G.flags.notes||{};if(G.flags.notes[id])return;G.flags.notes[id]=text;toast('Ny note i dagbogen');}
/** Starts a quest once, with a toast like a quest log update. */
function questStart(flag,title){if(G.flags[flag])return;G.flags[flag]=true;sfx('page');toast('Ny opgave: '+title);}

/* --- Astrid's approval, shown BG3-style when she is with you */
function approve(n,why){
  if(!G.flags.astrid) return;
  G.flags.appr=(G.flags.appr||0)+n;
  if(C&&C.kind==='astrid') toast(n>0?(n>1?'Astrid synes rigtig godt om det.':'Astrid synes godt om det.'):(n<-1?'Astrid bryder sig slet ikke om det.':'Astrid bryder sig ikke om det.'));
  if(G.flags.appr<=-6&&!G.flags.astridLeft){G.flags.astridLeft=true;if(C&&C.kind==='astrid'){toast('Astrid har fået nok. Hun forlader dig.');dismissCompanion();}}
}

function openJournal(){
  if(!P) return; G.tutJournal=true; G.state='journal';
  const f=G.flags, el=$('jrBody'); el.innerHTML='';
  const sec=t=>{const h=document.createElement('div');h.className='eyebrow';h.style.marginTop='4px';h.textContent=t;el.appendChild(h);};
  const card=(q)=>{const st=questState(q);const d=document.createElement('div');d.className='jq'+(st.done?' done':'');
    d.innerHTML=`<h3>${q.title}${st.done?' <span class="mute small">· fuldført</span>':''}</h3>`+st.steps.map(s=>`<p class="${s.done(f)?'sd':''}">${typeof s.t==='function'?s.t(f):s.t}</p>`).join('')+(q.end&&q.end(f)?`<p class="mute small">${q.end(f)}</p>`:'');el.appendChild(d);};
  sec('Hovedopgave'); card(QUESTS[0]);
  const side=QUESTS.slice(1).filter(q=>q.active(f));
  sec('Sideopgaver'); if(side.length) side.sort((a,b)=>questState(a).done-questState(b).done).forEach(card); else el.insertAdjacentHTML('beforeend','<p class="mute small">Ingen endnu. Tal med folk i Ravnsholm, og lyt efter, hvad de har brug for.</p>');
  const notes=Object.values(f.notes||{});
  sec('Noter'); if(notes.length) notes.forEach(t=>el.insertAdjacentHTML('beforeend',`<p class="jn">${t}</p>`)); else el.insertAdjacentHTML('beforeend','<p class="mute small">Intet nedskrevet endnu.</p>');
  if(f.comp==='eir'){sec('Eir');el.insertAdjacentHTML('beforeend','<p class="jn">Eir følger dig. Hun heler dig, når du er hårdt såret, og giver dig fordel på Vilje-slag.</p>');}
  if(f.astrid){sec('Astrid');const a=f.appr||0;el.insertAdjacentHTML('beforeend',`<p class="jn">${f.astridLeft?'Astrid har forladt dig.':a>=5?'Astrid stoler på dig. Hendes pile rammer hårdere, når hun kæmper ved din side.':a>=1?'Astrid kan lide dig.':a<=-3?'Astrid er ved at miste tålmodigheden med dig.':'Astrid er stadig ved at finde ud af, hvad hun synes om dig.'}</p>`);}
  $('journal').hidden=false; $('jrGo').focus({preventScroll:true});
}
function closeJournal(){$('journal').hidden=true;G.state='play';}
$('jrGo').addEventListener('click',closeJournal);
