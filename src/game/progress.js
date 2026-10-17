'use strict';
/* =========================================================
   REST / LEVEL UP / SAVE
   ========================================================= */
function openRest(id){
  G.tutRested=true;
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
function makeSave(){return{name:P.name,cls:P.cls,stats:P.stats,level:P.level,runes:P.runes,flags:G.flags,weaponLvl:G.weaponLvl,extraFlasks:G.extraFlasks,discount:G.discount,lastRS:G.lastRS,lit:RUNESTONES.map(r=>r.lit),stain:G.stain,deaths:G.deaths,play:G.play,inv:G.inv,eq:G.eq,talents:P.talents||[]};}
function saveGame(){if(!P||G.flags.jotunDone)return;try{localStorage.setItem(SAVE_KEY,JSON.stringify(makeSave()));}catch(e){}}
function loadSave(){try{const s=localStorage.getItem(SAVE_KEY);return s?JSON.parse(s):null;}catch(e){return null;}}
function clearSave(){try{localStorage.removeItem(SAVE_KEY);}catch(e){}}

/* =========================================================
   GAME FLOW
   ========================================================= */
function resetRun(){
  G.flags={};G.inv=[];G.eq={weapon:null,armor:null,t1:null,t2:null};G.weaponLvl=0;G.extraFlasks=0;G.discount=1;G.lastRS=0;G.stain=null;G.deaths=0;G.play=0;G.ending=null;G.endT=0;G.boss=null;
  for(const id in CHEST_M){const m=CHEST_M[id];m.opening=false;m.open=0;if(m.lid)m.lid.rotation.x=0;}
  RUNESTONES.forEach(r=>{r.lit=r.id===0;RS_MESH[r.id].mat.emissiveIntensity=r.lit?2.6:0;RS_MESH[r.id].light.intensity=r.lit?22:0;});
  GATE.gone=false;G.gateAnim=null;gateDoors.forEach(d=>d.hinge.rotation.y=0);
  if(C){scene.remove(CM.root);C=null;CM=null;} NPCM.astrid.root.visible=true;
}
function beginGame(fromSave){
  resetRun();
  if(fromSave){const s=fromSave;newPlayer(s.cls,s.stats,s.name);P.level=s.level;P.runes=s.runes;Object.assign(G.flags,s.flags||{});G.weaponLvl=s.weaponLvl||0;G.extraFlasks=s.extraFlasks||0;G.discount=s.discount||1;G.lastRS=s.lastRS||0;G.stain=s.stain||null;G.deaths=s.deaths||0;G.play=s.play||0;G.inv=s.inv||[];G.eq=s.eq||{weapon:null,armor:null,t1:null,t2:null};
    (s.lit||[]).forEach((l,i)=>{RUNESTONES[i].lit=l;RS_MESH[i].mat.emissiveIntensity=l?2.6:0;RS_MESH[i].light.intensity=l?22:0;});
    for(const id in (G.flags.chests||{})){const m=CHEST_M[id];if(m){m.open=1;if(m.lid)m.lid.rotation.x=-1.9;}}
    if(G.flags.gateOpen){GATE.gone=true;gateDoors.forEach(d=>d.hinge.rotation.y=d.s*1.6);}
    const rs=RUNESTONES[G.lastRS];P.x=rs.x;P.y=rs.y+46;P.hp=maxHp();P.hpLag=P.hp;P.st=maxSt();P.flasks=maxFlasks();
    P.talents=s.talents||[];
    {const ck=G.flags.comp||(G.flags.astrid&&!G.flags.astridLeft?'astrid':null);if(ck)makeCompanion(ck);}
  }
  resetWorld();
  $('title').hidden=true;$('create').hidden=true;$('hud').hidden=false;
  $('hName').textContent=P.name;$('specName').textContent=CLASSES[P.cls].special;$('specIco').innerHTML=CLASSES[P.cls].ico;
  G.state='play';snapCam();audioInit();
  if(!fromSave){banner('RAVNSHOLM','Midgard · det tredje år af Fimbulvinteren');setTimeout(()=>toast('Tal med Gamle Ulfr ved runestenen (E)'),3600);}
  else toast('Velkommen tilbage, '+P.name);
  applyWeaponLook();
}
function toTitle(){
  $('pause').hidden=true;$('end').hidden=true;$('hud').hidden=true;$('rest').hidden=true;$('deathScr').hidden=true;$('prompt').hidden=true;dlgEl.hidden=true;$('letterbox').classList.remove('on');
  clearEnemies(); if(PM){scene.remove(PM.root);PM=null;} if(C){scene.remove(CM.root);C=null;CM=null;} NPCM.astrid.root.visible=true; P=null;
  G.state='title';music('title');$('title').hidden=false;$('bCont').hidden=!loadSave();
  for(const n of NUMS)n.el.remove();NUMS.length=0;
}
function showEnd(){
  G.state='end';music('victory');$('hud').hidden=true;$('prompt').hidden=true;clearSave();
  const peace=G.ending==='word';
  $('endEy').textContent=peace?'Ordets vej':'Sværdets vej';
  $('endT').textContent='Fimbulvinteren er brudt';
  $('endP').textContent=peace?`Hrimgrimr gik mod nord med Sigruns navn på læben, og ingen så ham igen. Sneen smeltede fra Ravnsholms tage den forår, og skjaldene kalder dig ${P.name} Ordvise, den der fældede en jötun uden at trække våben.`:`Rimtursens hjerte af is splintrede mod sneen, og kulden gik ud af verden med ham. Ved næste midvinterblot rejste Ravnsholm en runesten med dit navn: ${P.name}, ${G.deaths?'den der rejste sig igen':'den der aldrig faldt'}.`;
  const m=Math.floor(G.play/60);
  $('endStats').innerHTML=`<span>Klasse <b>${CLASSES[P.cls].name}</b></span><span>Niveau <b>${P.level}</b></span><span>Dødsfald <b>${G.deaths}</b></span><span>Tid <b>${m} min</b></span>`;
  $('end').hidden=false;$('endGo').focus({preventScroll:true});
}
$('endGo').addEventListener('click',toTitle);

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
$('bNew').addEventListener('click',()=>{audioInit();crCls='berserker';crStats={...CLASSES.berserker.base};crPts=3;renderCreate();$('title').hidden=true;$('create').hidden=false;});
$('bBack').addEventListener('click',()=>{$('create').hidden=true;$('title').hidden=false;});
$('bStart').addEventListener('click',()=>{clearSave();const name=($('inName').value||'').trim()||'Ravnebåren';newPlayer(crCls,crStats,name);beginGame(null);});
$('bCont').addEventListener('click',()=>{const s=loadSave();if(s){audioInit();beginGame(s);}});
function openPause(){G.state='pause';$('pzName').textContent=P.name;$('pzClass').textContent=`${CLASSES[P.cls].name} · niveau ${P.level} · ${P.runes} runer`;statRows($('pzStats'),false);$('pzDerived').innerHTML=derived();$('pause').hidden=false;$('pzGo').focus({preventScroll:true});}
$('pzGo').addEventListener('click',()=>{$('pause').hidden=true;G.state='play';});
$('pzQuit').addEventListener('click',()=>{saveGame();toTitle();});
$('pzGfx').addEventListener('click',()=>openSettings('pause'));
$('setGo').addEventListener('click',closeSettings);
$('bSet').addEventListener('click',()=>openSettings('title'));
applyGfx.boot=true; applyGfx(GFX); applyGfx.boot=false;
