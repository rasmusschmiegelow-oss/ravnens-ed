'use strict';
/* =========================================================
   ISGROTTEN: Sigrun's tomb. Three rune pillars must be touched in the order of her name (ᛋ ᛁ ᚷ);
   then the ice door melts, and the Ice Queen guards the sarcophagus.
   ========================================================= */
let GROT_FLOOR=0, GROT_VOID=null;
const GROT_LIGHTS=[], PILLAR_M={}, ICEDOOR_G=new THREE.Group();
function buildGrotto(){
  GROT_FLOOR=hgt(700,540); const g=GROT_FLOOR, R=rng(77);
  const icy=new Map(), tintIce=p=>{p.obj.traverse(o=>{if(!o.isMesh)return;let m=icy.get(o.material);if(!m){m=o.material.clone();m.color.multiply(new THREE.Color(.62,.78,.95));icy.set(o.material,m);}o.material=m;});return p;};
  for(let x=GROT.x0+40;x<GROT.x1;x+=80) for(let y=GROT.y0+40;y<GROT.y1;y+=80) tintIce(placeProp('floor_tile_large',x,y,{ground:g,lift:-.04}));
  for(let x=GROT.x0+40;x<GROT.x1;x+=80){tintIce(placeProp('wall',x,GROT.y0-10,{ground:g}));tintIce(placeProp('wall',x,GROT.y1+10,{ground:g}));}
  for(let y=GROT.y0+40;y<GROT.y1;y+=80){tintIce(placeProp('wall',GROT.x0-10,y,{rot:Math.PI/2,ground:g}));tintIce(placeProp('wall',GROT.x1+10,y,{rot:Math.PI/2,ground:g}));}
  // ice crystals along the walls
  for(let i=0;i<46;i++){const side=i%4,t=R();const x=side<2?GROT.x0+30+t*(GROT.x1-GROT.x0-60):side===2?GROT.x0+25:GROT.x1-25,y=side===0?GROT.y0+25:side===1?GROT.y1-25:GROT.y0+30+t*(GROT.y1-GROT.y0-60);
    const c=new THREE.Mesh(new THREE.OctahedronGeometry(1,0),MAT.iceGlow);const s=.5+R()*1.3;c.scale.set(s*.6,s*2.4,s*.6);c.position.set(x*S,g+s,y*S);c.rotation.set((R()-.5)*.5,R()*3,(R()-.5)*.5);scene.add(c);}
  // the rune pillars
  for(const p of RUNEPILLARS){const grp=new THREE.Group();grp.position.set(p.x*S,g,p.y*S);scene.add(grp);
    const mat=new THREE.MeshStandardMaterial({color:0x8fa8bc,map:stoneTex,roughness:.6,emissiveMap:runeTex(p.r,'#9fdcff'),emissive:0xffffff,emissiveIntensity:.25});
    const m=new THREE.Mesh(new THREE.BoxGeometry(1,3.2,1),mat);m.position.y=1.6;m.castShadow=true;grp.add(m);PILLAR_M[p.id]={mat,grp};}
  // the ice door between the hall and the tomb
  ICEDOOR_G.position.set(700*S,g,GROT.doorY*S); scene.add(ICEDOOR_G);
  for(let i=0;i<18;i++){const c=new THREE.Mesh(new THREE.OctahedronGeometry(1,0),MAT.iceGlow);const s=1.4+R()*1.2;c.position.set(((i/17)-.5)*(GROT.x1-GROT.x0)*S,s*1.3,(R()-.5)*.8);c.scale.set(s*.9,s*2.2,s*.7);c.rotation.set(0,R()*3,(R()-.5)*.3);ICEDOOR_G.add(c);}
  // the inscription on the south wall
  {const pl=new THREE.Mesh(new THREE.PlaneGeometry(1.4,2.2),new THREE.MeshStandardMaterial({color:0x6f8aa0,emissiveMap:runeTex('ᚺᚢᛁᛚ','#9fdcff'),emissive:0xffffff,emissiveIntensity:1.6}));pl.position.set(860*S,g+1.6,(GROT.y1-4)*S);pl.rotation.y=Math.PI;scene.add(pl);}
  // Sigrun's sarcophagus
  const sar=new THREE.Mesh(new THREE.BoxGeometry(3.2,1,1.4),MAT.iceGlow);sar.position.set(700*S,g+.5,410*S);scene.add(sar);OBS.push({x:700,y:410,r:30});
  for(const [x,y] of [[560,620],[840,440]]){const L=new THREE.PointLight(0x8fd8ff,0,22,1.5);L.position.set(x*S,g+3,y*S);L.userData.base=24;scene.add(L);GROT_LIGHTS.push(L);}
  // darkness around the hall
  const vm=new THREE.MeshBasicMaterial({color:0x020304}); GROT_VOID=new THREE.Group();
  for(const [x,z,w,h] of [[700,940,1600,400],[700,140,1600,400],[160,540,400,1000],[1240,540,400,1000]]){const m=new THREE.Mesh(new THREE.PlaneGeometry(w*S,h*S).rotateX(-Math.PI/2),vm);m.position.set(x*S,g+.25,z*S);GROT_VOID.add(m);}
  GROT_VOID.visible=false; scene.add(GROT_VOID);
  // the cave mouth in the western mountains, glowing faintly blue
  const mouth=new THREE.Mesh(new THREE.SphereGeometry(1,20,12,0,TAU,0,Math.PI/2),new THREE.MeshBasicMaterial({color:0x02060a}));
  mouth.scale.set(2.4,3.2,1.6); mouth.rotation.y=Math.PI/2; mouth.position.set((GROT.mouthX-20)*S,hgt(GROT.mouthX,GROT.mouthY)-.2,GROT.mouthY*S); scene.add(mouth);
  for(let i=0;i<9;i++){const a=-1.2+i*.3;const r=new THREE.Mesh(new THREE.IcosahedronGeometry(1,0),MAT.rock);const x=GROT.mouthX-30+Math.cos(a)*55,y=GROT.mouthY+Math.sin(a)*70;r.position.set(x*S,hgt(x,y)+.8,y*S);r.scale.set(1.4,2+R()*1.4,1.4);r.rotation.set(R(),R()*3,R());r.castShadow=true;scene.add(r);OBS.push({x,y,r:24});}
  for(let i=0;i<6;i++){const c=new THREE.Mesh(new THREE.OctahedronGeometry(.5,0),MAT.iceGlow);const y=GROT.mouthY-50+i*20;c.position.set((GROT.mouthX-14)*S,hgt(GROT.mouthX,y)+.5+R(),y*S);c.scale.y=2;scene.add(c);}
}
/** Puts the cave back as the save says (door melted, pillars lit). */
function setGrotto(){
  const open=!!G.flags.grotOpen; ICEDOOR.gone=open; ICEDOOR_G.visible=!open; ICEDOOR_G.scale.y=1;
  const seq=G.flags.grotSeq||[]; for(const p of RUNEPILLARS) PILLAR_M[p.id].mat.emissiveIntensity=open||seq.includes(p.id)?2.4:.25;
}
function touchPillar(p){
  if(G.flags.grotOpen){toast('Runen gløder stille.');return;}
  const seq=G.flags.grotSeq=G.flags.grotSeq||[]; seq.push(p.id); sfx('rune');
  const ok=seq.every((v,i)=>v===i);
  if(!ok){G.flags.grotSeq=[];setGrotto();sfx('no');G.shake=.4;toast('Isen knirker vredt. Runerne slukker.');
    for(const s of [-1,1]){const x=p.x+s*80,y=p.y-30;const e=spawnEnemy('gjenganger',x,y,{aggro:true});e.home={x,y};burst(x*S,GROT_FLOOR+1,y*S,40,3,1,.4,.7,1.6,2.4,{grav:1});}
    return;}
  setGrotto(); burst(p.x*S,GROT_FLOOR+2,p.y*S,40,3,1,.3,.7,1.6,2.4,{grav:-1});
  if(seq.length===3){G.flags.grotOpen=true;G.melt=0;banner('ISDØREN SMELTER','Sigrun, Hrimgrimrs elskede, hviler bag den','frost');sfx('gate');G.shake=.5;saveGame();}
}
function updGrotto(dt){
  if(G.melt!=null&&G.melt<1){G.melt=Math.min(1,G.melt+dt*.35);ICEDOOR_G.scale.y=1-G.melt;if(G.melt>=1){ICEDOOR.gone=true;ICEDOOR_G.visible=false;}}
}
