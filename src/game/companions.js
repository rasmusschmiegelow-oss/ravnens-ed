'use strict';
/* =========================================================
   COMPANION QUESTS
   Astrid: her brother Eyvind went to Skjoldvik before the winter and never came back. He walks among the ash dead now.
   Eir: three frost roses that only grow in the deepest cold, for a salve that can bring back the dying.
   ========================================================= */
const FROSTROSES=[{id:'r1',x:880,y:1920},{id:'r2',x:2620,y:2320},{id:'r3',x:1240,y:1020}];
const ROSE_M={};
{
  for(const r of FROSTROSES){const g=new THREE.Group();g.position.set(r.x*S,hgt(r.x,r.y),r.y*S);scene.add(g);
    const stem=new THREE.Mesh(new THREE.CylinderGeometry(.02,.03,.5,5),sm(0x3a5a4a));stem.position.y=.25;g.add(stem);
    for(let i=0;i<5;i++){const p=new THREE.Mesh(new THREE.OctahedronGeometry(.11,0),MAT.iceGlow);const a=i/5*TAU;p.position.set(Math.cos(a)*.08,.52,Math.sin(a)*.08);p.scale.y=1.6;p.rotation.z=Math.cos(a)*.6;p.rotation.x=Math.sin(a)*.6;g.add(p);}
    ROSE_M[r.id]=g;}
}
function setRoses(){for(const r of FROSTROSES) ROSE_M[r.id].visible=!(G.flags.roses||{})[r.id];}
function pickRose(r){G.flags.roses=G.flags.roses||{};G.flags.roses[r.id]=true;setRoses();sfx('pickup');const n=Object.keys(G.flags.roses).length;
  burst(r.x*S,groundY(r.x,r.y)+.5,r.y*S,30,2,1,.3,.7,1.6,2.4,{grav:-1});banner('FROSTROSE',n<3?`${n} af 3`:'Bring dem til Eir');
  // with Eir at your side she makes the salve on the spot
  if(n>=3&&C&&C.kind==='eir'&&!G.flags.eirDone){G.flags.eirDone=true;giveCons('salve',2,true);setTimeout(()=>toast('Eir knuser frostroserne i sin morter. «Nu kan jeg hele dig oftere og bedre.» (Eirs salve ×2)'),1500);}
  saveGame();}
function eyvindEnt(){return G.enemies.find(e=>e.boss==='eyvind'&&!e.dead);}
function startEyvind(){const e=eyvindEnt();if(e){e.dormant=false;e.aggro=true;G.boss=e;}return null;}
function eyvindPeace(text){const f=G.flags;f.eyvindDone=true;f.eyvindPeace=true;const e=eyvindEnt();if(e){killEnemy(e);}approve(3);
  return{who:'Eyvind',text,opts:[{t:'Lad ham gå.'}]};}
/** Ash and fire in Astrid's arrows once her brother has found peace. */
const astridBonus=()=>G.flags.eyvindDone?1.25:1;
