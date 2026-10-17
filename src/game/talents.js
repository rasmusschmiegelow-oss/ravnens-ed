'use strict';
/* =========================================================
   TALENTS: one point at level 3 and every second level after; six talents per class in two paths
   ========================================================= */
const TALENTS={
  berserker:[
    {id:'b_hud',path:'Bjørnens vej',name:'Bjørnehud',desc:'+15 % liv.'},
    {id:'b_blod',path:'Bjørnens vej',name:'Blodtørst',desc:'Du heler 4 % af den skade, du giver, også uden Berserkergang.'},
    {id:'b_doeds',path:'Bjørnens vej',name:'Dødsforagt',desc:'Under 35 % liv giver du 30 % mere skade.'},
    {id:'b_hvirvel',path:'Stormens vej',name:'Hvirvelstorm',desc:'Det tunge snurreangreb rækker 25 % længere og rammer 25 % hårdere.'},
    {id:'b_rasende',path:'Stormens vej',name:'Ubændig',desc:'Berserkergang varer 12 sekunder og lader 25 % hurtigere op.'},
    {id:'b_storm',path:'Stormens vej',name:'Stormløb',desc:'Rul koster 30 % mindre, og dit første slag efter et rul giver 25 % mere skade.'},
  ],
  skjoldmo:[
    {id:'s_vindue',path:'Skjoldets vej',name:'Valkyriens øje',desc:'Paradevinduet er 50 % længere.'},
    {id:'s_haevn',path:'Skjoldets vej',name:'Hævnstød',desc:'Kritiske modstød efter en parade giver 3,5× skade i stedet for 2,5×.'},
    {id:'s_sang',path:'Skjoldets vej',name:'Skjoldsang',desc:'Hver parade heler 6 % liv.'},
    {id:'s_jern',path:'Sværdets vej',name:'Jernmur',desc:'Blokering koster 40 % mindre udholdenhed.'},
    {id:'s_boelge',path:'Sværdets vej',name:'Skjoldbølge',desc:'Skjoldstødet rammer bredere og lammer et sekund længere.'},
    {id:'s_fart',path:'Sværdets vej',name:'Valkyriens fart',desc:'Du bevæger dig 10 % hurtigere, og dine hug er 10 % hurtigere.'},
  ],
  volve:[
    {id:'v_galdr',path:'Galdrens vej',name:'Galdr',desc:'Runebolte giver 20 % mere skade.'},
    {id:'v_bolt',path:'Galdrens vej',name:'Splintrune',desc:'Runebolte går gennem den første fjende og rammer den næste.'},
    {id:'v_ravn',path:'Galdrens vej',name:'Ravnekonge',desc:'Ravneflokken tæller otte ravne i stedet for fem.'},
    {id:'v_is',path:'Seiðrens vej',name:'Isgreb',desc:'Frostnovaen er 30 % større og fryser fjender to sekunder længere.'},
    {id:'v_skjold',path:'Seiðrens vej',name:'Seiðskjold',desc:'Hvert 12. sekund opsluges det første slag, der rammer dig, helt.'},
    {id:'v_spind',path:'Seiðrens vej',name:'Tankespind',desc:'Udholdenhed vender 30 % hurtigere tilbage.'},
  ],
};
/** True when the player has taken the talent. */
const T=id=>!!(P&&P.talents&&P.talents.includes(id));
const talentPoints=()=>Math.max(0,Math.floor((P.level-1)/2))-(P.talents||[]).length;

function renderTalents(el){
  el.innerHTML='';
  const pts=talentPoints();
  const head=document.createElement('div');head.className='eyebrow';head.style.marginBottom='6px';
  head.textContent=`Evner · ${pts} ${pts===1?'point':'point'} at fordele · du får et nyt point ved niveau 3 og hvert andet niveau derefter`;
  el.appendChild(head);
  const grid=document.createElement('div');grid.className='tgrid';
  const list=TALENTS[P.cls];
  for(const path of [...new Set(list.map(t=>t.path))]){
    const col=document.createElement('div');col.className='tcol';col.innerHTML=`<div class="tpath">${path}</div>`;
    for(const t of list.filter(x=>x.path===path)){
      const has=T(t.id), b=document.createElement('button');b.type='button';b.className='tcard'+(has?' on':'');b.disabled=!has&&pts<=0;
      b.innerHTML=`<b>${t.name}</b><small>${t.desc}</small><span class="tag">${has?'Lært':pts>0?'Lær':'Kræver et point'}</span>`;
      if(!has) b.addEventListener('click',()=>{if(talentPoints()<=0)return;P.talents=[...(P.talents||[]),t.id];P.hp=Math.min(maxHp(),P.hp);sfx('rune');toast('Ny evne: '+t.name);renderRest();});
      col.appendChild(b);
    }
    grid.appendChild(col);
  }
  el.appendChild(grid);
}
