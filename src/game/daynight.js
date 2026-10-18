'use strict';
/* =========================================================
   DAY AND NIGHT: a full day takes about sixteen minutes. Dawn and dusk colour the sky;
   at night the dead grow stronger, and give more runes.
   ========================================================= */
const DN={day:0,dusk:0,night:true,len:960,last:null};
const DAYC={hemi:new THREE.Color(0xc4d6ee),hemiG:new THREE.Color(0x5a5a54),sun:new THREE.Color(0xfff2de),duskSun:new THREE.Color(0xffa060),fog:new THREE.Color(0xa9bccf),duskFog:new THREE.Color(0x8a6a70)};
/** Time of day 0..1: 0 is midnight, .25 sunrise, .5 noon, .75 sunset. */
const tod=()=>G.flags.tod??.9;
function updDayNight(dt){
  if(!G.sim&&G.state==='play'&&P&&!G.mode) G.flags.tod=(tod()+dt/DN.len)%1;
  const sunH=-Math.cos(tod()*TAU);
  DN.day=sstep(-.12,.3,sunH); DN.dusk=Math.max(0,1-Math.abs(sunH)/.28)*(1-DN.day*.4);
  const night=DN.day<.35;
  if(DN.last!==null&&night!==DN.last&&G.state==='play'&&!G.sim) toast(night?'Natten falder på. De døde bliver stærkere, og deres runer flere.':'Solen står op. De døde svækkes i lyset.');
  DN.last=night; DN.night=night;
  skyUniforms.uDay.value=DN.day; skyUniforms.uDusk.value=DN.dusk;
}
/** Undead hit harder at night (not in the test fights). */
const nightMult=src=>!G.sim&&DN.night&&src&&src.model&&src.model.skel?1.15:1;
/** Rests until the next morning or evening. */
function restUntil(morning){G.flags.tod=morning?.3:.78;DN.last=null;sfx('rune');toast(morning?'Du sover til solopgang.':'Du hviler, til mørket falder på.');}
