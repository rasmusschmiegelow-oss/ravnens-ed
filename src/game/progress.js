'use strict';
/* =========================================================
   REST / LEVEL UP / SAVE
   ========================================================= */
function openRest(id){
  G.tutRested=true; if(P.mount) dismount(false);
  const rs=RUNESTONES[id]; G.lastRS=id; G.state='rest';
  P.hp=maxHp();P.hpLag=P.hp;P.st=maxSt();P.flasks=maxFlasks();P.rage=0;
  resetWorld(); saveGame(); sfx('rune');
  burst(rs.x*S,hgt(rs.x,rs.y)+1.5,rs.y*S,60,1.5,2,.3,2.2,1.6,.6,{grav:-.6,drag:.5});
  renderRest(); $('rest').hidden=false; $('restLeave').focus({preventScroll:true});
}
function statRows(el,editable){
  el.innerHTML='';
  for(const k of Object.keys(STATN)){
    const v=P.stats[k];const row=document.createElement('div');row.className='srow';
    row.innerHTML=`<span class="ab">${STATN[k][0]}</span><span class="nm">${STATN[k][1]}<small>${STATN[k][2]}</small></span><span class="v">${v}</span><span class="m">${fmtMod(mod(v))}</span>`;
    const bx=document.createElement('div');bx.className='sbtns';
    if(editable){const b=document.createElement('button');b.className='sbtn up';b.type='button';b.textContent='Styrk';const cost=lvlCost(P.level);b.disabled=P.runes<cost||v>=30;
      b.addEventListener('click',()=>{if(P.runes<lvlCost(P.level))return;P.runes-=lvlCost(P.level);P.stats[k]++;P.level++;P.hp=maxHp();P.st=maxSt();sfx('rune');renderRest();});bx.appendChild(b);}
    row.appendChild(bx);el.appendChild(row);
  }
}
function derived(){const dm=Math.round(atkMult()*100);return`<span>Liv <b>${maxHp()}</b></span><span>Udholdenhed <b>${maxSt()}</b></span><span>Skade <b>${dm} %</b></span><span>Mjødhorn <b>${maxFlasks()}</b></span><span>Våben <b>+${G.weaponLvl}</b></span><span>Udstyr <b>${Object.values(G.eq||{}).filter(Boolean).map(i=>ITEMS[i].name).join(', ')||'intet'}</b></span>`;}
function renderRest(){
  const rs=RUNESTONES[G.lastRS];$('restName').textContent=rs.name;$('rLvl').textContent=P.level;$('rRunes').textContent=P.runes;$('rCost').textContent=lvlCost(P.level);
  statRows($('rStats'),true); renderTalents($('rTalents'));$('rDerived').innerHTML=derived();
  const tr=$('rTravel');tr.innerHTML='';
  RUNESTONES.forEach(r=>{if(!r.lit||r.id===G.lastRS)return;const b=document.createElement('button');b.className='btn ghost';b.type='button';b.textContent=r.name;b.addEventListener('click',()=>{G.lastRS=r.id;P.x=r.x;P.y=r.y+46;if(C){C.x=P.x-30;C.y=P.y+30;}resetWorld();snapCam();saveGame();renderRest();});tr.appendChild(b);});
  if(!tr.children.length) tr.innerHTML='<span class="mute small">Tænd flere runesten ude i verden for at kunne rejse mellem dem.</span>';
}
$('restLeave').addEventListener('click',()=>{$('rest').hidden=true;G.state='play';});
const SAVE_KEY='ravnensEd.v1';
// Three save slots. Slot 1 keeps the original key so older saves still load.
const slotKey=i=>i>1?SAVE_KEY+'.s'+i:SAVE_KEY;
G.slot=1;
function makeSave(){return{ts:Date.now(),cons:G.cons,ng:G.ng||0,name:P.name,cls:P.cls,stats:P.stats,level:P.level,runes:P.runes,flags:G.flags,weaponLvl:G.weaponLvl,extraFlasks:G.extraFlasks,discount:G.discount,lastRS:G.lastRS,lit:RUNESTONES.map(r=>r.lit),stain:G.stain,deaths:G.deaths,play:G.play,inv:G.inv,eq:G.eq,talents:P.talents||[]};}
function saveGame(){if(G.sim)return;saveMeta();if(G.mode==='valhalla')return;if(!P||G.flags.surtDone)return;try{localStorage.setItem(slotKey(G.slot||1),JSON.stringify(makeSave()));}catch(e){}}
function loadSave(i){try{const s=localStorage.getItem(slotKey(i||G.slot||1));return s?JSON.parse(s):null;}catch(e){return null;}}
function clearSave(i){try{localStorage.removeItem(slotKey(i||G.slot||1));}catch(e){}}
/** The slot played most recently, or 0 when there are no saves. */
function latestSlot(){let best=0,bt=-1;for(let i=1;i<=3;i++){const s=loadSave(i);if(s&&(s.ts||0)>bt){bt=s.ts||0;best=i;}}return best;}
function slotSummary(s){if(!s)return'Tom';const act=s.flags&&s.flags.act2?'Akt II':'Akt I';const m=Math.floor((s.play||0)/60);
  return `${s.name} · ${CLASSES[s.cls].name} · niveau ${s.level} · ${act}${s.ng?' · Ny runde+':''} · ${m} min`;}
function renderSlots(el,mode){
  el.innerHTML='';
  for(let i=1;i<=3;i++){const s=loadSave(i), row=document.createElement('div');row.className='slotpick'+(mode==='new'&&G.newSlot===i?' on':'');
    row.innerHTML=`<span class="ab">Plads ${i}</span><span class="nm">${slotSummary(s)}</span>`;
    const btns=document.createElement('div');btns.className='sbtns';
    if(mode==='new'){const b=document.createElement('button');b.type='button';b.className='seg'+(G.newSlot===i?' on':'');b.textContent=G.newSlot===i?'Valgt':s?'Overskriv':'Vælg';
      b.addEventListener('click',()=>{G.newSlot=i;renderSlots(el,mode);});btns.appendChild(b);}
    else if(s){const p=document.createElement('button');p.type='button';p.className='seg';p.textContent='Spil';p.addEventListener('click',()=>{G.slot=i;$('slots').hidden=true;audioInit();beginGame(loadSave(i));});
      const d=document.createElement('button');d.type='button';d.className='seg';d.textContent=row.dataset.del?'Bekræft':'Slet';
      d.addEventListener('click',()=>{if(d.textContent==='Slet'){d.textContent='Slet for altid?';return;}clearSave(i);renderSlots(el,mode);$('bCont').hidden=!latestSlot();});btns.append(p,d);}
    row.appendChild(btns);el.appendChild(row);}
}

/* =========================================================
   GAME FLOW
   ========================================================= */
function resetRun(){
  G.flags={};G.inv=[];G.eq={weapon:null,armor:null,t1:null,t2:null};G.weaponLvl=0;G.extraFlasks=0;G.discount=1;G.lastRS=0;G.stain=null;G.deaths=0;G.play=0;G.ending=null;G.endT=0;G.boss=null;
  for(const id in CHEST_M){const m=CHEST_M[id];m.opening=false;m.open=0;if(m.lid)m.lid.rotation.x=0;}
  RUNESTONES.forEach(r=>{r.lit=r.id===0;RS_MESH[r.id].mat.emissiveIntensity=r.lit?2.6:0;RS_MESH[r.id].light.intensity=r.lit?22:0;});
  GATE.gone=false;G.gateAnim=null;gateDoors.forEach(d=>d.hinge.rotation.y=0);
  setIceWall(false,true); setFireGate(false,true); resetBeacons(); G.cons={ild:2,frost:0,bjorn:0,salve:1}; G.vb={dmg:1,hp:1,st:1,flask:0,cd:1,def:1,roll:1,leech:0};
  if(C){scene.remove(CM.root);C=null;CM=null;} NPCM.astrid.root.visible=true;
}
function beginGame(fromSave){
  resetRun(); G.ng=fromSave&&fromSave.ng||0; G.mode=null;
  if(fromSave){const s=fromSave;newPlayer(s.cls,s.stats,s.name);P.level=s.level;P.runes=s.runes;Object.assign(G.flags,s.flags||{});G.weaponLvl=s.weaponLvl||0;G.extraFlasks=s.extraFlasks||0;G.discount=s.discount||1;G.lastRS=s.lastRS||0;G.stain=s.stain||null;G.deaths=s.deaths||0;G.play=s.play||0;G.inv=s.inv||[];G.eq=s.eq||{weapon:null,armor:null,t1:null,t2:null};
    (s.lit||[]).forEach((l,i)=>{RUNESTONES[i].lit=l;RS_MESH[i].mat.emissiveIntensity=l?2.6:0;RS_MESH[i].light.intensity=l?22:0;});
    for(const id in (G.flags.chests||{})){const m=CHEST_M[id];if(m){m.open=1;if(m.lid)m.lid.rotation.x=-1.9;}}
    if(G.flags.gateOpen){GATE.gone=true;gateDoors.forEach(d=>d.hinge.rotation.y=d.s*1.6);}
    if(G.flags.act2) setIceWall(true,true); if(G.flags.fgateOpen) setFireGate(true,true); for(const id in (G.flags.beacons||{})) lightBeacon(id,true);
    const rs=RUNESTONES[G.lastRS];P.x=rs.x;P.y=rs.y+46;P.hp=maxHp();P.hpLag=P.hp;P.st=maxSt();P.flasks=maxFlasks();
    P.talents=s.talents||[]; G.cons=s.cons||{ild:2,frost:0,bjorn:0,salve:1};
    {const ck=G.flags.comp||(G.flags.astrid&&!G.flags.astridLeft?'astrid':null);if(ck)makeCompanion(ck);}
  }
  if(!fromSave){P.hp=maxHp();P.hpLag=P.hp;P.st=maxSt();P.flasks=maxFlasks();}
  resetWorld();
  $('title').hidden=true;$('create').hidden=true;$('hud').hidden=false;
  $('hName').textContent=P.name+(G.ng?` · Ny runde+${G.ng>1?' '+G.ng:''}`:'');$('specName').textContent=CLASSES[P.cls].special;$('specIco').innerHTML=CLASSES[P.cls].ico;
  G.state='play';snapCam();audioInit();
  if(!fromSave){banner('RAVNSHOLM','Midgard · det tredje år af Fimbulvinteren');setTimeout(()=>toast('Tal med Gamle Ulfr ved runestenen (E)'),3600);}
  else if(fromSave.ngStart){banner('NY RUNDE+'+(G.ng>1?' '+G.ng:''),'Fjenderne er stærkere. Det er du også.');setTimeout(()=>toast('Tal med Gamle Ulfr ved runestenen (E)'),3600);}
  else toast('Velkommen tilbage, '+P.name);
  applyWeaponLook();
}
function toTitle(){
  $('pause').hidden=true;$('end').hidden=true;$('hud').hidden=true;$('rest').hidden=true;$('deathScr').hidden=true;$('prompt').hidden=true;dlgEl.hidden=true;$('letterbox').classList.remove('on');
  G.mode=null; G.ng=0; ['boon','vhMenu','vhEnd'].forEach(id=>$(id).hidden=true);
  clearEnemies(); if(PM){scene.remove(PM.root);PM=null;} if(C){scene.remove(CM.root);C=null;CM=null;} NPCM.astrid.root.visible=true; P=null;
  G.state='title';music('title');$('title').hidden=false;$('bCont').hidden=!latestSlot();
  for(const n of NUMS)n.el.remove();NUMS.length=0;
}
/** The first act ends with Rimtursen: the ice in the pass melts, and Askefjorden opens. */
function startAct2(){
  if(G.flags.act2) return;
  G.flags.act2=true; G.flags.act1End=G.ending||'sword'; G.ending=null;
  setIceWall(true,false); spawnAct2(); sfx('boom'); G.shake=.6;
  if(!G.sim){const bc=$('bossCard');$('bcName').textContent='Akt II';$('bcSub').textContent='Askefjorden';
    $('bcQuote').textContent=(G.flags.act1End==='word'?'Rimtursen gik mod nord, og isen begyndte at smelte.':'Rimtursens hjerte splintrede, og isen begyndte at smelte.')+' Men mod øst bliver himlen rød.';
    bc.className='fire';bc.hidden=true;void bc.offsetWidth;bc.hidden=false;setTimeout(()=>{bc.hidden=true;},7500);
    setTimeout(()=>toast('Isvæggen i Askepasset mod øst er smeltet. Følg røgen, eller tal med Gamle Ulfr.'),3500);}
  saveGame();
}
function showEnd(){
  G.state='end';music('victory');$('hud').hidden=true;$('prompt').hidden=true;clearSave();
  const f=G.flags, peace=f.act1End==='word';
  $('endEy').textContent=peace?'Ordets vej':'Sværdets vej';
  $('endT').textContent='Ragnarok må vente';
  const bits=[peace?'Hrimgrimr gik mod nord med Sigruns navn på læben, og vinteren gik med ham.':'Rimtursens hjerte af is splintrede mod sneen, og vinteren gik med ham.',
    `Da Surt rejste sig fra Muspelrevnen, stod ${P.name} i vejen. Hans flamme sank tilbage i jorden, og asken over fjorden blev til regn.`];
  if(f.vardeDone) bits.push('Varderne brændte hele vinteren, og de overlevende fandt hjem til Skjoldvik.');
  if(f.ulfrChoice==='give') bits.push('Gamle Ulfr bar sin søns ring til sin død.'); else if(f.ulfrChoice==='kept') bits.push(f.logiRing?'Hrafnkels ring smeltede i Muspelheims ild.':'Hrafnkels ring sidder stadig kold på din finger.');
  if(f.durinDone) bits.push(f.durinChoice==='truth'?'Dvalin og Sindri smeder sammen nu, og Durins navn står på deres ambolt.':'Dvalin fortæller stadig om sin bror, der tog tre draugr med sig.');
  if(f.astrid&&!f.astridLeft) bits.push((f.appr||0)>=5?'Astrid Jarnsdóttir fulgte dig til verdens ende, og skjaldene nævner jer altid sammen.':'Astrid tog sin bue og gik sin egen vej, da det var forbi.');
  bits.push(`Ved næste midvinterblot rejste Ravnsholm en runesten med dit navn: ${P.name}, ${G.deaths?'den der rejste sig igen':'den der aldrig faldt'}.`);
  $('endP').textContent=bits.join(' ');
  const m=Math.floor(G.play/60);
  $('endStats').innerHTML=`<span>Klasse <b>${CLASSES[P.cls].name}</b></span><span>Niveau <b>${P.level}</b></span><span>Dødsfald <b>${G.deaths}</b></span><span>Tid <b>${m} min</b></span>`;
  $('end').hidden=false;$('endGo').focus({preventScroll:true});
}
$('endGo').addEventListener('click',toTitle);
/** New Game+: the same hero, level, talents and gear, a fresh world with stronger foes. */
function startNGPlus(){
  const intros={}; for(const k in G.flags) if(k.startsWith('intro_')) intros[k]=true;
  const s={ngStart:true,ng:(G.ng||0)+1,name:P.name,cls:P.cls,stats:{...P.stats},level:P.level,runes:0,flags:intros,weaponLvl:G.weaponLvl,extraFlasks:G.extraFlasks,discount:1,lastRS:0,
    lit:RUNESTONES.map(r=>r.id===0),stain:null,deaths:0,play:0,inv:[...(G.inv||[])],eq:{...G.eq},talents:[...(P.talents||[])]};
  $('end').hidden=true; metaInc('ngStarts'); beginGame(s); saveGame();
}
$('endNG').addEventListener('click',startNGPlus);

/* --- Character creation */
let crCls='berserker', crPts=3, crStats={};
function renderCreate(){
  const cards=$('cards');cards.innerHTML='';
  for(const [k,c] of Object.entries(CLASSES)){
    const b=document.createElement('button');b.type='button';b.className='ccard';b.setAttribute('aria-pressed',k===crCls);
    b.innerHTML=`<span class="cr-rune">${c.rune}</span><h3>${c.name}</h3><p>${c.desc}</p><span class="base">STY ${c.base.sty} · SMI ${c.base.smi} · VIL ${c.base.vil} · KAR ${c.base.kar}</span>`;
    b.addEventListener('click',()=>{crCls=k;crStats={...c.base};crPts=3;renderCreate();});cards.appendChild(b);
  }
  $('ptsLeft').textContent=crPts;
  const el=$('crStats');el.innerHTML='';
  for(const k of Object.keys(STATN)){
    const base=CLASSES[crCls].base[k],v=crStats[k];
    const row=document.createElement('div');row.className='srow';
    row.innerHTML=`<span class="ab">${STATN[k][0]}</span><span class="nm">${STATN[k][1]}<small>${STATN[k][2]}</small></span><span class="v">${v}</span><span class="m">${fmtMod(mod(v))}</span>`;
    const bx=document.createElement('div');bx.className='sbtns';
    const minus=document.createElement('button');minus.className='sbtn';minus.type='button';minus.textContent='−';minus.setAttribute('aria-label','Sænk '+STATN[k][1]);minus.disabled=v<=base;
    minus.addEventListener('click',()=>{crStats[k]--;crPts++;renderCreate();});
    const plus=document.createElement('button');plus.className='sbtn';plus.type='button';plus.textContent='+';plus.setAttribute('aria-label','Hæv '+STATN[k][1]);plus.disabled=crPts<=0||v>=18;
    plus.addEventListener('click',()=>{crStats[k]++;crPts--;renderCreate();});
    bx.append(minus,plus);row.appendChild(bx);el.appendChild(row);
  }
}
$('bNew').addEventListener('click',()=>{audioInit();crCls='berserker';crStats={...CLASSES.berserker.base};crPts=3;
  // a new hero goes in the first empty slot, or the one played longest ago
  G.newSlot=0;let old=1,ot=Infinity;for(let i=1;i<=3;i++){const s=loadSave(i);if(!s){G.newSlot=i;break;}if((s.ts||0)<ot){ot=s.ts||0;old=i;}}if(!G.newSlot)G.newSlot=old;
  renderCreate();renderSlots($('crSlots'),'new');$('title').hidden=true;$('create').hidden=false;});
$('bLoad').addEventListener('click',()=>{audioInit();renderSlots($('slotList'),'load');$('title').hidden=true;$('slots').hidden=false;});
$('slotsBack').addEventListener('click',()=>{$('slots').hidden=true;$('title').hidden=false;$('bCont').hidden=!latestSlot();});
$('bBack').addEventListener('click',()=>{$('create').hidden=true;$('title').hidden=false;});
$('bStart').addEventListener('click',()=>{G.slot=G.newSlot||1;clearSave();const name=($('inName').value||'').trim()||'Ravnebåren';newPlayer(crCls,crStats,name);beginGame(null);});
$('bCont').addEventListener('click',()=>{const i=latestSlot();if(i){G.slot=i;audioInit();beginGame(loadSave(i));}});
function openPause(){G.state='pause';$('pzName').textContent=P.name;$('pzClass').textContent=`${CLASSES[P.cls].name} · niveau ${P.level} · ${P.runes} runer`;statRows($('pzStats'),false);$('pzDerived').innerHTML=derived();$('pause').hidden=false;$('pzGo').focus({preventScroll:true});}
$('pzGo').addEventListener('click',()=>{$('pause').hidden=true;G.state='play';});
$('pzQuit').addEventListener('click',()=>{saveGame();toTitle();});
$('pzGfx').addEventListener('click',()=>openSettings('pause'));
$('setGo').addEventListener('click',closeSettings);
$('bSet').addEventListener('click',()=>openSettings('title'));
applyGfx.boot=true; applyGfx(GFX); applyGfx.boot=false;
