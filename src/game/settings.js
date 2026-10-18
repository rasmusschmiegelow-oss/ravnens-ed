'use strict';
/* =========================================================
   SETTINGS: volume, difficulty, screen shake, hints and key bindings (saved per browser)
   ========================================================= */
const SET_KEY='ravnensEd.settings';
const BIND_DEFAULT={up:'KeyW',down:'KeyS',left:'KeyA',right:'KeyD',roll:'Space',heal:'KeyR',special:'KeyF',art:'KeyQ',horse:'KeyH',map:'KeyG',interact:'KeyE',lock:'Tab',inv:'KeyI',journal:'KeyJ'};
const BIND_NAME={up:'Frem',down:'Tilbage',left:'Venstre',right:'Højre',roll:'Rul',heal:'Drik mjød',special:'Klasse-evne',art:'Våbenkunst',horse:'Fløjt på hesten',map:'Kort',interact:'Interagér',lock:'Lås på fjende',inv:'Udstyr',journal:'Dagbog'};
const DIFF={story:{name:'Fortælling',desc:'Fjender slår blødere og har mindre liv. For dig, der vil opleve historien.',dmg:.55,hp:.75},
  normal:{name:'Normal',desc:'Spillet som det er tænkt: hårdt, men fair.',dmg:1,hp:1},
  hard:{name:'Hård',desc:'Fjender slår hårdere og tåler mere. Ingen nåde.',dmg:1.3,hp:1.2}};
const SET={music:.8,sfx:.8,shake:1,hints:1,diff:'normal',bind:{...BIND_DEFAULT}};
try{const s=JSON.parse(localStorage.getItem(SET_KEY)||'{}');Object.assign(SET,s);SET.bind={...BIND_DEFAULT,...(s.bind||{})};}catch(e){}
function saveSettings(){try{localStorage.setItem(SET_KEY,JSON.stringify(SET));}catch(e){}}
setVolumes(SET.music,SET.sfx);

/** True when the key code is bound to the action (arrow keys always move too). */
function bound(action,code){
  if(SET.bind[action]===code) return true;
  return {up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'}[action]===code;
}
function held(action){return !!(keys[SET.bind[action]]||keys[{up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'}[action]]);}
function keyLabel(code){
  const named={Space:'Mellemrum',Tab:'Tab',Escape:'Esc',ShiftLeft:'Venstre Shift',ShiftRight:'Højre Shift',ControlLeft:'Ctrl',AltLeft:'Alt',Enter:'Enter',Backspace:'Tilbage',CapsLock:'Caps Lock'};
  return named[code]||code.replace(/^Key/,'').replace(/^Digit/,'').replace(/^Arrow/,'Pil ');
}
/** The label of an action for the active input device, used in hints and prompts. */
function actLabel(action){
  if(G.padActive) return {roll:'B',heal:'X',special:'Y',art:'LB',horse:'L3',map:'Ned på D-pad',interact:'A',lock:'R3',inv:'View',journal:'Op på D-pad',attack:'RB',heavy:'RT'}[action]||'';
  if(action==='attack') return 'venstreklik'; if(action==='heavy') return 'højreklik';
  return keyLabel(SET.bind[action]);
}

let rebinding=null;
function renderSettings(){
  const el=$('setBody'); el.innerHTML='';
  const row=(label,ctrl)=>{const d=document.createElement('div');d.className='setrow';const l=document.createElement('span');l.className='nm';l.textContent=label;d.append(l,ctrl);el.appendChild(d);return d;};
  const slider=(key)=>{const i=document.createElement('input');i.type='range';i.min=0;i.max=1;i.step=.05;i.value=SET[key];i.id='set_'+key;
    i.addEventListener('input',()=>{SET[key]=+i.value;setVolumes(SET.music,SET.sfx);saveSettings();});return i;};
  const choice=(opts,cur,on)=>{const w=document.createElement('div');w.className='segs';for(const [k,label] of opts){const b=document.createElement('button');b.type='button';b.className='seg'+(k===cur?' on':'');b.textContent=label;b.setAttribute('aria-pressed',k===cur);b.addEventListener('click',()=>{on(k);renderSettings();});w.appendChild(b);}return w;};
  const head=t=>{const h=document.createElement('div');h.className='eyebrow';h.style.marginTop='6px';h.textContent=t;el.appendChild(h);};
  head('Lyd');
  row('Musik',slider('music')); row('Effekter',slider('sfx'));
  head('Spil');
  row('Sværhedsgrad',choice(Object.entries(DIFF).map(([k,v])=>[k,v.name]),SET.diff,k=>{SET.diff=k;saveSettings();toast('Sværhedsgrad: '+DIFF[k].name+'. '+DIFF[k].desc);}));
  row('Skærmrystelse',choice([[1,'Til'],[.4,'Let'],[0,'Fra']],SET.shake,k=>{SET.shake=+k;saveSettings();}));
  row('Tips undervejs',choice([[1,'Til'],[0,'Fra']],SET.hints,k=>{SET.hints=+k;saveSettings();if(!SET.hints)hideHint();}));
  row('Grafik',choice([['low','Lav'],['high','Høj'],['ultra','Ultra']],GFX,k=>applyGfx(k)));
  head('Taster · klik og tryk en ny tast');
  for(const a of Object.keys(BIND_DEFAULT)){
    const b=document.createElement('button');b.type='button';b.className='seg keyb'+(rebinding===a?' on':'');
    b.textContent=rebinding===a?'Tryk en tast …':keyLabel(SET.bind[a]);
    b.addEventListener('click',()=>{rebinding=a;renderSettings();});
    row(BIND_NAME[a],b);
  }
  const reset=document.createElement('button');reset.type='button';reset.className='btn ghost';reset.textContent='Nulstil taster';
  reset.addEventListener('click',()=>{SET.bind={...BIND_DEFAULT};saveSettings();renderSettings();});
  el.appendChild(reset);
}
/** Captures the next key press while a binding is being changed. Returns true when it used the key. */
function captureRebind(e){
  if(!rebinding) return false;
  e.preventDefault();
  if(e.code!=='Escape'){
    for(const a in SET.bind) if(SET.bind[a]===e.code&&a!==rebinding) SET.bind[a]=SET.bind[rebinding]; // swap if already used
    SET.bind[rebinding]=e.code; saveSettings();
  }
  rebinding=null; renderSettings(); return true;
}
let settingsFrom='pause';
function openSettings(from){settingsFrom=from;G.state='settings';rebinding=null;$(from).hidden=true;renderSettings();$('settings').hidden=false;$('setGo').focus({preventScroll:true});}
function closeSettings(){$('settings').hidden=true;rebinding=null;$(settingsFrom).hidden=false;G.state=settingsFrom==='pause'?'pause':'title';(settingsFrom==='pause'?$('pzGo'):$('bNew')).focus({preventScroll:true});}
