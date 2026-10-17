'use strict';
/* =========================================================
   WEATHER: clear aurora nights, snowfall and blizzards in Midgard; ash rain and ash storms with lightning in Askefjorden.
   A blizzard hides you: foes notice you from shorter range.
   ========================================================= */
const WX={
  klart:{name:'Klar nat',fog:.75,snow:.2,wind:.6,aur:1.7,stealth:1},
  sne:{name:'Snefald',fog:1,snow:1,wind:1,aur:.8,stealth:1},
  storm:{name:'Snestorm',fog:2,snow:1,wind:2.8,aur:0,stealth:.65,big:1,msg:'En snestorm rejser sig. Fjenderne ser dig først tæt på.'},
  aske:{name:'Askeregn',fog:1,snow:1,wind:1,aur:0,stealth:1},
  askestorm:{name:'Askestorm',fog:1.6,snow:1,wind:2.2,aur:0,stealth:.8,big:1,bolt:1,msg:'En askestorm trækker ind. Lynet slår ned, hvor det vil.'},
};
// the weather now (blended values) and where it is heading
const WXK={fog:1,snow:1,wind:1,aur:.8,stealth:1,big:0};
const WEATHER={cur:'sne',t:120,boltT:6};
const _sz=snow.material.size;
function pickWeather(ash){
  const r=Math.random();
  return ash?(r<.6?'aske':'askestorm'):(r<.3?'klart':r<.75?'sne':'storm');
}
function updWeather(dt){
  if(!P||G.sim) return;
  const ash=inAsh(P.x), want=ash?['aske','askestorm']:['klart','sne','storm'];
  WEATHER.t-=dt;
  if(!want.includes(WEATHER.cur)){WEATHER.cur=ash?'aske':'sne';WEATHER.t=90+Math.random()*60;}
  else if(WEATHER.t<=0){const n=pickWeather(ash);WEATHER.t=100+Math.random()*120;if(n!==WEATHER.cur){WEATHER.cur=n;if(WX[n].msg&&G.state==='play'&&!G.flags.inArena)toast(WX[n].msg);}}
  const w=WX[WEATHER.cur], k=Math.min(1,dt*.12);
  for(const key of ['fog','snow','wind','aur','stealth']) WXK[key]+=(w[key]-WXK[key])*k;
  WXK.big+=((w.big||0)-WXK.big)*k;
  snow.material.size=_sz*(1+WXK.big*.6); snowGeo.setDrawRange(0,Math.round(SNOW_N*Math.min(1,WXK.snow)));
  skyUniforms.uAur.value=WXK.aur;
  if(AU.windGain) AU.windGain.gain.value=.07*(.7+WXK.wind*.5);
  $('hWx').textContent=w.name;
  // lightning in the ash storm: a flash, thunder, and now and then a strike near you
  if(w.bolt&&G.state==='play'){WEATHER.boltT-=dt;if(WEATHER.boltT<=0){WEATHER.boltT=4+Math.random()*6;lightning(Math.random()<.35);}}
}
function lightning(strike){
  const fl=$('flash'); fl.classList.remove('on'); void fl.offsetWidth; fl.classList.add('on');
  setTimeout(()=>{sfx('boom');G.shake=Math.max(G.shake,.25);},250+Math.random()*700);
  if(strike&&!P.dead&&!inSafeZone()){const a=Math.random()*TAU,r=60+Math.random()*200,x=P.x+Math.cos(a)*r,y=P.y+Math.sin(a)*r;
    circAtk(x,y,70,1.3,24,{fire:true,unblock:true,onFire:()=>{fireFx(x,y,70);const gy=groundY(x,y);for(let i=0;i<40;i++)FXA.emit(x*S+rand(-.2,.2),gy+i*.35,y*S+rand(-.2,.2),rand(-.5,.5),rand(-.5,.5),rand(-.5,.5),.35,.5,3,3,4,1,0,1,0);burnAt(x,y,50,3,14);}});}
}
/** No lightning strikes in town or by a runestone. */
function inSafeZone(){if(Math.hypot(P.x-4350,P.y-2380)<330)return true;for(const r of RUNESTONES)if(Math.hypot(P.x-r.x,P.y-r.y)<160)return true;return false;}
