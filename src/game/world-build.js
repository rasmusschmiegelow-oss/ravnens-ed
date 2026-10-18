'use strict';
/* =========================================================
   VEGETATION & PROPS (instanced)
   ========================================================= */
const dummy=new THREE.Object3D();
{
  // pine: stacked jittered cones with snow patches
  const parts=[];
  const lr=rng(4);
  [[2.3,3.2,2.2],[1.85,2.8,3.7],[1.35,2.4,5.0],[.8,2,6.2]].forEach(([r,h,y])=>{
    let c=new THREE.ConeGeometry(r,h,8,2).toNonIndexed(); c.translate(0,y,0);
    const p=c.attributes.position; for(let i=0;i<p.count;i++){const yy=p.getY(i);if(yy<y+h/2-.05){p.setX(i,p.getX(i)*(1+(lr()-.5)*.18));p.setZ(i,p.getZ(i)*(1+(lr()-.5)*.18));p.setY(i,yy+(lr()-.5)*.15);}}
    c.computeVertexNormals();
    const col=new Float32Array(p.count*3);
    for(let i=0;i<p.count;i+=3){ // per face
      const ny=(c.attributes.normal.getY(i)+c.attributes.normal.getY(i+1)+c.attributes.normal.getY(i+2))/3;
      const snow=ny>.55||lr()<.28; const k=snow?[.84,.9,.97]:[.07+lr()*.03,.16+lr()*.05,.12];
      for(let j=0;j<3;j++){col[(i+j)*3]=k[0];col[(i+j)*3+1]=k[1];col[(i+j)*3+2]=k[2];}
    }
    c.setAttribute('color',new THREE.BufferAttribute(col,3)); c.deleteAttribute('uv'); parts.push(c);
  });
  const fol=mergeGeometries(parts);
  const trunk=new THREE.CylinderGeometry(.18,.32,2.6,7); trunk.translate(0,1.2,0);
  const nT=TREES.length;
  seeThrough(MAT.pine,.0022); seeThrough(MAT.bark,.0012);
  const imF=new THREE.InstancedMesh(fol,MAT.pine,nT), imT=new THREE.InstancedMesh(trunk,MAT.bark,nT);
  imF.castShadow=imT.castShadow=true; imF.receiveShadow=true;
  TREES.forEach((t,i)=>{dummy.position.set(t.x*S,hgt(t.x,t.y)-.1,t.y*S);dummy.rotation.set((Math.random()-.5)*.06,t.rot,(Math.random()-.5)*.06);dummy.scale.setScalar(t.s);dummy.updateMatrix();imF.setMatrixAt(i,dummy.matrix);imT.setMatrixAt(i,dummy.matrix);});
  scene.add(imF,imT);
  // rocks
  const rg=new THREE.IcosahedronGeometry(1,1).toNonIndexed(); const rp=rg.attributes.position; const rr=rng(8);
  const seen=new Map(); for(let i=0;i<rp.count;i++){const k=rp.getX(i).toFixed(3)+rp.getY(i).toFixed(3)+rp.getZ(i).toFixed(3);let s=seen.get(k);if(!s){s=.8+rr()*.4;seen.set(k,s);}rp.setXYZ(i,rp.getX(i)*s,rp.getY(i)*s,rp.getZ(i)*s);}
  rg.computeVertexNormals();
  const rc=new Float32Array(rp.count*3); for(let i=0;i<rp.count;i+=3){const ny=(rg.attributes.normal.getY(i)+rg.attributes.normal.getY(i+1)+rg.attributes.normal.getY(i+2))/3;const k=ny>.62?[.9,.94,1]:[.42,.45,.5];for(let j=0;j<3;j++){rc[(i+j)*3]=k[0];rc[(i+j)*3+1]=k[1];rc[(i+j)*3+2]=k[2];}}
  rg.setAttribute('color',new THREE.BufferAttribute(rc,3));
  const allRocks=[...ROCKS,...RINGROCKS];
  const imR=new THREE.InstancedMesh(rg,MAT.rock,allRocks.length); imR.castShadow=imR.receiveShadow=true;
  allRocks.forEach((o,i)=>{const big=RINGROCKS.includes(o);dummy.position.set(o.x*S,hgt(o.x,o.y)+(big?.4:0),o.y*S);dummy.rotation.set(Math.random(),Math.random()*TAU,Math.random()*.4);dummy.scale.set(o.r*S*1.25,o.r*S*(big?1.8:.85),o.r*S*1.1);dummy.updateMatrix();imR.setMatrixAt(i,dummy.matrix);});
  scene.add(imR);
  // ground detail: frost-bitten grass, pebbles, shrubs and fallen logs scattered through the snow
  {
    const dr=rng(99), pts=(n,ok)=>{const out=[];let tries=0;while(out.length<n&&tries++<n*6){const x=PAD+dr()*(WORLD.w-2*PAD),y=PAD+dr()*(WORLD.h-2*PAD);if(ok(x,y))out.push([x,y]);}return out;};
    const open=(x,y,pad)=>x<RIDGE.x-180&&lakeE(x,y)>1.15&&!inCrypt(x,y)&&pathDist(x,y)>pad&&Math.hypot(x-1800,y-2380)>250&&!(y>WALL_Y-30&&y<WALL_Y+WALL_H+30);
    // grass: three crossed blades per tuft, straw to dark green, swaying in the wind
    const blades=[]; for(let b=0;b<3;b++){const g=new THREE.PlaneGeometry(.09,.55,1,3).translate(0,.27,0);const pa=g.attributes.position;for(let i=0;i<pa.count;i++){const yy=pa.getY(i);pa.setX(i,pa.getX(i)*(1-yy/.6));pa.setZ(i,yy*yy*.25);}g.rotateY(b*Math.PI/3+dr()*.3);blades.push(g);}
    const gg=mergeGeometries(blades); const gc=new Float32Array(gg.attributes.position.count*3);
    for(let i=0;i<gg.attributes.position.count;i++){const t=gg.attributes.position.getY(i)/.55;gc[i*3]=lerp(.18,.62,t);gc[i*3+1]=lerp(.2,.52,t);gc[i*3+2]=lerp(.12,.3,t);}
    gg.setAttribute('color',new THREE.BufferAttribute(gc,3));
    const gm=seeThrough(new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide}),.55);
    const gp=pts(9000,(x,y)=>open(x,y,40)); const ig=new THREE.InstancedMesh(gg,gm,gp.length); ig.receiveShadow=true;
    gp.forEach(([x,y],i)=>{const sc=.6+dr()*.9;dummy.position.set(x*S,hgt(x,y)-.04,y*S);dummy.rotation.set(0,dr()*TAU,0);dummy.scale.set(sc,sc*(.7+dr()*.6),sc);dummy.updateMatrix();ig.setMatrixAt(i,dummy.matrix);});
    scene.add(ig); DETAIL.push(ig);
    // pebbles
    const pg=new THREE.DodecahedronGeometry(.12,0); const pp=pts(3200,(x,y)=>open(x,y,10));
    const ip=new THREE.InstancedMesh(pg,MAT.rock,pp.length); ip.castShadow=false; ip.receiveShadow=true;
    pp.forEach(([x,y],i)=>{const sc=.5+dr()*1.6;dummy.position.set(x*S,hgt(x,y),y*S);dummy.rotation.set(dr()*3,dr()*3,dr()*3);dummy.scale.set(sc,sc*.6,sc);dummy.updateMatrix();ip.setMatrixAt(i,dummy.matrix);});
    scene.add(ip); DETAIL.push(ip);
    // frosty shrubs
    const sparts=[];for(let k=0;k<4;k++){const g=new THREE.IcosahedronGeometry(.35+dr()*.15,0).toNonIndexed();g.translate((dr()-.5)*.6,.25+dr()*.15,(dr()-.5)*.6);sparts.push(g);}
    const sg2=mergeGeometries(sparts);const sc2=new Float32Array(sg2.attributes.position.count*3);sg2.computeVertexNormals();
    for(let i=0;i<sg2.attributes.position.count;i+=3){const ny=sg2.attributes.normal.getY(i);const k=ny>.5?[.82,.88,.95]:[.1,.17,.13];for(let j=0;j<3;j++){sc2[(i+j)*3]=k[0];sc2[(i+j)*3+1]=k[1];sc2[(i+j)*3+2]=k[2];}}
    sg2.setAttribute('color',new THREE.BufferAttribute(sc2,3));
    const sm2=seeThrough(new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true}),.25);
    const sp=pts(900,(x,y)=>open(x,y,55)&&clearZone(x,y,-40)); const is2=new THREE.InstancedMesh(sg2,sm2,sp.length); is2.castShadow=true; is2.receiveShadow=true;
    sp.forEach(([x,y],i)=>{const sc=.7+dr()*.8;dummy.position.set(x*S,hgt(x,y)-.05,y*S);dummy.rotation.set(0,dr()*TAU,0);dummy.scale.set(sc,sc*(.7+dr()*.5),sc);dummy.updateMatrix();is2.setMatrixAt(i,dummy.matrix);});
    scene.add(is2);
    // fallen logs with snow on top
    const lp=pts(70,(x,y)=>open(x,y,70)&&clearZone(x,y,-30));
    const lg=new THREE.CylinderGeometry(.22,.26,1,7).rotateZ(Math.PI/2); const lsnow=new THREE.CylinderGeometry(.2,.24,1,7,1,false,-Math.PI*.35,Math.PI*.7).rotateZ(Math.PI/2).translate(0,.06,0);
    const il=new THREE.InstancedMesh(lg,MAT.bark,lp.length), ils=new THREE.InstancedMesh(lsnow,new THREE.MeshStandardMaterial({color:0xe6eef6,roughness:.9}),lp.length);
    il.castShadow=il.receiveShadow=ils.receiveShadow=true;
    lp.forEach(([x,y],i)=>{const len=2.5+dr()*3;dummy.position.set(x*S,hgt(x,y)+.15,y*S);dummy.rotation.set(0,dr()*TAU,(dr()-.5)*.08);dummy.scale.set(len,1,1);dummy.updateMatrix();il.setMatrixAt(i,dummy.matrix);ils.setMatrixAt(i,dummy.matrix);});
    scene.add(il,ils);
  }
  // barrow standing stones
  const sg=new THREE.BoxGeometry(.9,1,.5,1,3,1); {const p=sg.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i);const k=1-(y+.5)*.35;p.setX(i,p.getX(i)*k);p.setZ(i,p.getZ(i)*k);}sg.computeVertexNormals();}
  const imS=new THREE.InstancedMesh(sg,MAT.stone,STONES.length); imS.castShadow=true;
  STONES.forEach((s,i)=>{dummy.position.set(s.x*S,hgt(s.x,s.y)+s.h/2-.2,s.y*S);dummy.rotation.set((Math.random()-.5)*.12,-s.rot+Math.PI/2,(Math.random()-.5)*.12);dummy.scale.set(1,s.h,1);dummy.updateMatrix();imS.setMatrixAt(i,dummy.matrix);});
  scene.add(imS);
}

/* --- Buildings */
const SMOKERS=[]; const FIRE_FX=[]; const BANNERS=[];
/** Places a loaded prop on the terrain. fit scales its widest side to that many metres. */
function placeProp(key,x,y,{rot=0,scale=1,fit=0,collide=0,lift=0,ground}={}){
  const p=makeProp(key); const s=fit?fit/Math.max(p.size.x,p.size.z):scale;
  p.obj.scale.setScalar(s); p.obj.rotation.y=rot; p.obj.position.set(x*S,(ground??hgt(x,y))-p.minY*s+lift,y*S);
  scene.add(p.obj); if(collide) OBS.push({x,y,r:collide}); p.s=s; return p;
}
const CHEST_M={}, CRYPT_LIGHTS=[];
function buildWorldProps(){
  // village: longhouse, sawmill, granary and watchtower on the old house plots, all facing the fire
  ['building_barracks_red','building_lumbermill_red','building_grain','building_tower_A_red'].forEach((k,i)=>{
    const h=HOUSES[i], cx=h.x+h.w/2, cy=h.y+h.h/2, rot=Math.atan2(1800-cx,2400-cy);
    const p=placeProp(k,cx,cy,{rot,fit:Math.max(h.w,h.h)*S*1.25,lift:-.05});
    SMOKERS.push(new THREE.Vector3(cx*S,hgt(cx,cy)+p.size.y*p.s*.85,cy*S));
    const wl=new THREE.PointLight(0xff9a50,5,8,2); wl.position.set((cx+Math.sin(rot)*h.h*.7)*S,hgt(cx,cy)+1.4,(cy+Math.cos(rot)*h.h*.7)*S); scene.add(wl);
  });
  placeProp('building_well_red',WELL.x,WELL.y,{fit:2.6,rot:.4});
  placeProp('bucket_water',WELL.x+30,WELL.y+12,{fit:.5});
  [['barrel',1588,2486,0],['barrel',1606,2500,1],['crate_A_big',1722,2482,.3],['sack',1702,2490,0],['weaponrack',1612,2366,Math.PI],['resource_lumber',2032,2470,1.2],
   ['wheelbarrow',1868,2522,2.4],['crate_B_small',1842,2534,.2],['target',2060,2250,-.6],['barrel',2028,2350,0],['sack',1990,2532,1]].forEach(([k,x,y,r])=>placeProp(k,x,y,{rot:r,fit:k==='resource_lumber'?2.4:k==='weaponrack'?1.8:k==='target'?1.6:k==='wheelbarrow'?1.6:1.1,collide:10}));
  for(let x=1560;x<=2040;x+=44) if(Math.abs(x-1800)>40) placeProp('fence_wood_straight',x,2660,{fit:2.3,rot:0});
  for(let y=2300;y<=2640;y+=44) {placeProp('fence_wood_straight',1540,y,{fit:2.3,rot:Math.PI/2});placeProp('fence_wood_straight',2080,y,{fit:2.3,rot:Math.PI/2});}
  // Astrid's camp and the ruined hall on the barrow road
  placeProp('tent',1400,1815,{fit:3.4,rot:.6,collide:30}); placeProp('crate_A_big',1505,1830,{fit:1,collide:10}); placeProp('sack',1490,1812,{fit:.9});
  placeProp('building_destroyed',1180,1380,{fit:6.5,rot:.8});
  placeProp('flag_red',1700,895,{fit:1.2}); placeProp('flag_red',1900,895,{fit:1.2});
  // chests across the world and in the crypt
  for(const c of CHESTS){
    const g=c.crypt?hgt(2900,520):c.grot?hgt(700,540):undefined;
    const p=placeProp(c.gold||c.grot?'chest_gold':'chest',c.x,c.y,{fit:1.15,rot:c.crypt||c.grot?0:Math.atan2(1800-c.x,2400-c.y),ground:g});
    CHEST_M[c.id]={obj:p.obj,lid:p.obj.getObjectByName(c.gold||c.grot?'chest_gold_lid':'chest_lid'),open:0};
  }
  buildCrypt();
  buildAct2Props();
  buildGrotto();
}
let CRYPT_FLOOR=0, CRYPT_VOID=null;
function buildCrypt(){
  CRYPT_FLOOR=hgt(2900,520); const g=CRYPT_FLOOR;
  for(let x=CRYPT.x0+40;x<CRYPT.x1;x+=80) for(let y=CRYPT.y0+40;y<CRYPT.y1;y+=80) placeProp((x+y)%240?'floor_tile_large':'floor_dirt_large',x,y,{ground:g,lift:-.04});
  for(let x=CRYPT.x0+40;x<CRYPT.x1;x+=80) placeProp(x===2920?'wall_arched':'wall',x,CRYPT.y0-10,{ground:g});
  for(let y=CRYPT.y0+40;y<CRYPT.y1;y+=80){placeProp('wall',CRYPT.x0-10,y,{rot:Math.PI/2,ground:g});placeProp('wall',CRYPT.x1+10,y,{rot:Math.PI/2,ground:g});}
  for(const [x,y] of [[2740,450],[3060,450],[2740,600],[3060,600]]) placeProp('pillar_decorated',x,y,{ground:g,fit:2});
  const torch=(x,y,rot,lx,ly)=>{placeProp('torch_lit',x,y,{ground:g,lift:2.2,fit:.6,rot});
    const L=new THREE.PointLight(0xff8a3a,0,20,1.4); L.position.set(lx*S,g+2.8,ly*S); scene.add(L); CRYPT_LIGHTS.push(L);
    FIRE_FX.push({x:x*S,y:g+2.9,z:y*S,light:L,base:34,small:1,crypt:1});};
  for(const x of [2700,2900,3100]) torch(x,CRYPT.y0+12,0,x,CRYPT.y0+40);
  torch(CRYPT.x0+12,560,Math.PI/2,CRYPT.x0+40,560); torch(CRYPT.x1-12,560,-Math.PI/2,CRYPT.x1-40,560);
  // darkness around the hall so the snow outside never shows through
  const vm=new THREE.MeshBasicMaterial({color:0x020304});
  const vg=new THREE.PlaneGeometry(90,60).rotateX(-Math.PI/2); CRYPT_VOID=new THREE.Group();
  for(const [x,z,w,h] of [[2900,1020,1600,560],[2900,100,1600,420],[2300,520,520,1400],[3500,520,520,1400]]){const m=new THREE.Mesh(new THREE.PlaneGeometry(w*S,h*S).rotateX(-Math.PI/2),vm);m.position.set(x*S,g+.25,z*S);CRYPT_VOID.add(m);}
  CRYPT_VOID.visible=false; scene.add(CRYPT_VOID);
  for(const x of [2800,3000]) placeProp('banner_patternA_red',x,CRYPT.y0+6,{ground:g,lift:1.2,fit:1.2});
  [['barrel_large',2590,690],['barrel_large',3210,690],['candle_triple',2860,350],['candle_triple',2940,350],['coin_stack_large',2955,375],['sword_shield_broken',2660,470],['keyring_hanging',3150,330],['column',2600,350],['column',3200,350]]
    .forEach(([k,x,y])=>placeProp(k,x,y,{ground:g,fit:k==='column'?1.4:k.startsWith('barrel')?1.2:.9}));
  // exit rune circle
  const ring=new THREE.Mesh(new THREE.RingGeometry(.7,.95,40).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:new THREE.Color(.4,1.6,2.6),transparent:true,opacity:.8}));
  ring.position.set(CRYPT.exitX*S,g+.06,CRYPT.exitY*S); scene.add(ring);
  const exitL=new THREE.PointLight(0x7fd6ff,0,8,1.6); exitL.position.set(CRYPT.exitX*S,g+1,CRYPT.exitY*S); scene.add(exitL); CRYPT_LIGHTS.push(exitL);
}
function buildFire(f){
  const g=new THREE.Group(); g.position.set(f.x*S,hgt(f.x,f.y),f.y*S);
  for(let i=0;i<9;i++){const a=i/9*TAU;const s=new THREE.Mesh(new THREE.DodecahedronGeometry(.22,0),MAT.stone);s.position.set(Math.cos(a)*.6,.08,Math.sin(a)*.6);s.castShadow=true;g.add(s);}
  for(let i=0;i<4;i++){const l=new THREE.Mesh(new THREE.CylinderGeometry(.07,.08,1,6),MAT.bark);l.rotation.z=Math.PI/2-.35;l.rotation.y=i*Math.PI/2;l.position.y=.25;g.add(l);}
  const core=new THREE.Mesh(new THREE.SphereGeometry(.22,8,6),MAT.ember);core.position.y=.2;g.add(core);
  const L=new THREE.PointLight(0xff8a3a,f.big?26:18,f.big?22:16,1.7);L.position.y=1.2;L.castShadow=false;g.add(L);
  scene.add(g); FIRE_FX.push({x:f.x*S,y:hgt(f.x,f.y),z:f.y*S,light:L,base:f.big?26:18});
}
FIRES.forEach(buildFire);
// camp tent + logs
// village banners & carved raven pillar
function addBanner(x,y){const g=new THREE.Group();g.position.set(x*S,hgt(x,y),y*S);const p=new THREE.Mesh(new THREE.CylinderGeometry(.06,.07,4.2,6),MAT.wood);p.position.y=2.1;p.castShadow=true;g.add(p);
  const bg=new THREE.PlaneGeometry(1,1.8,6,6);bg.translate(.5,0,0);const b=new THREE.Mesh(bg,MAT.banner);b.position.y=3.1;b.castShadow=true;g.add(b);scene.add(g);BANNERS.push({mesh:b,geo:bg,base:bg.attributes.position.array.slice()});}
addBanner(1740,2190);addBanner(1860,2190);addBanner(1690,2300);
{const g=new THREE.Group();g.position.set(1935*S,hgt(1935,2215),2215*S);const p=new THREE.Mesh(new THREE.CylinderGeometry(.25,.32,3.2,8),MAT.wood);p.position.y=1.6;p.castShadow=true;g.add(p);
  const bird=new THREE.Mesh(new THREE.ConeGeometry(.25,.9,5),new THREE.MeshStandardMaterial({color:0x111216,roughness:.5}));bird.rotation.z=-Math.PI/2;bird.position.set(.2,3.4,0);g.add(bird);
  for(const s of [-1,1]){const w=new THREE.Mesh(new THREE.BoxGeometry(.5,.05,.8),bird.material);w.position.set(0,3.45,s*.4);w.rotation.x=s*.5;g.add(w);}scene.add(g);}
// wall, gate, braziers
let gateDoors=[], gateTop=[];
{
  const wallMat=MAT.stone;
  const n=Math.ceil(WORLD.w/40)+30; const g=new THREE.BoxGeometry(1,1,1);
  const im=new THREE.InstancedMesh(g,wallMat,n*2); im.castShadow=im.receiveShadow=true; let k=0; const r=rng(31);
  for(let x=-600;x<RIDGE.x+180;x+=40){ if(x>1700&&x<1880) continue;
    for(let row=0;row<2;row++){ if(k>=n*2) break; const hh=row?1.3+r()*.6:2+r()*.6;
      dummy.position.set((x+20)*S,hgt(x+20,WALL_Y+20)+(row?2.3+hh/2:hh/2),(WALL_Y+20)*S); dummy.rotation.set((r()-.5)*.05,(r()-.5)*.06,(r()-.5)*.05); dummy.scale.set(2+r()*.3,hh,2+r()*.2); dummy.updateMatrix(); im.setMatrixAt(k++,dummy.matrix);} }
  im.count=k; scene.add(im);
  const gy=hgt(1800,WALL_Y+20);
  const gg=new THREE.Group(); gg.position.set(1800*S,gy,(WALL_Y+20)*S); scene.add(gg);
  for(const s of [-1,1]){const p=new THREE.Mesh(new THREE.BoxGeometry(1.6,7,2.6),MAT.stone);p.position.set(s*4.8,3.5,0);p.castShadow=true;gg.add(p);
    const strip=new THREE.Mesh(new THREE.PlaneGeometry(.7,5.6),new THREE.MeshStandardMaterial({color:0x000000,emissiveMap:runeTex('ᚦᛁᚢᛉᛊ','#7fd6ff'),emissive:0xffffff,emissiveIntensity:2.2,transparent:false}));strip.position.set(s*4.8,3.6,1.31);gg.add(strip);
    const br=new THREE.Group();br.position.set(s*6.4,0,1.6);gg.add(br);const pole=new THREE.Mesh(new THREE.CylinderGeometry(.08,.1,2.4,6),MAT.iron);pole.position.y=1.2;br.add(pole);
    const bowl=new THREE.Mesh(new THREE.CylinderGeometry(.45,.25,.4,10),MAT.iron);bowl.position.y=2.5;br.add(bowl);const em=new THREE.Mesh(new THREE.SphereGeometry(.28,8,6),MAT.ember);em.position.y=2.65;br.add(em);
    const L=new THREE.PointLight(0xff8a3a,18,16,1.7);L.position.y=3.2;br.add(L);
    FIRE_FX.push({x:1800*S+s*6.4,y:gy+2.7,z:(WALL_Y+20)*S+1.6,light:L,base:18,small:1});}
  const lint=new THREE.Mesh(new THREE.BoxGeometry(11.4,1.4,2.8),MAT.stone);lint.position.y=7.4;lint.castShadow=true;gg.add(lint);gateTop.push(lint);
  for(const s of [-1,1]){const hinge=new THREE.Group();hinge.position.set(s*4,0,0);gg.add(hinge);
    const d=new THREE.Mesh(new THREE.BoxGeometry(4,6.6,.4),new THREE.MeshStandardMaterial({color:0x1d2228,roughness:.5,metalness:.7}));d.position.set(-s*2,3.3,0);d.castShadow=true;hinge.add(d);
    for(let i=0;i<3;i++){const band=new THREE.Mesh(new THREE.BoxGeometry(4.05,.2,.5),MAT.iron);band.position.set(-s*2,1+i*2.2,0);hinge.add(band);}
    const ice=new THREE.Mesh(new THREE.OctahedronGeometry(.45,0),MAT.iceGlow);ice.position.set(-s*.4,3.4,.3);ice.scale.y=1.6;hinge.add(ice);
    gateDoors.push({hinge,s});}
}
// runestones
const RS_MESH=[];
RUNESTONES.forEach(rs=>{
  const g=new THREE.Group(); g.position.set(rs.x*S,hgt(rs.x,rs.y),rs.y*S);
  const geo=new THREE.BoxGeometry(1.1,3,.45,1,4,1); {const p=geo.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i);const k=1-(y+1.5)*.12;p.setX(i,p.getX(i)*k*(y>1.2?.85:1));}geo.computeVertexNormals();}
  const tex=runeTex('ᚱᚨᚢᚾ','#ffcf6a');
  const m=new THREE.MeshStandardMaterial({color:0x7d848b,map:stoneTex,roughness:.85,emissiveMap:tex,emissive:0xffffff,emissiveIntensity:rs.lit?2.6:0});
  const st=new THREE.Mesh(geo,m); st.position.y=1.45; st.castShadow=true; st.rotation.y=.25; g.add(st);
  for(let i=0;i<7;i++){const a=i/7*TAU;const s=new THREE.Mesh(new THREE.DodecahedronGeometry(.2+Math.random()*.15,0),MAT.stone);s.position.set(Math.cos(a)*1.3,.05,Math.sin(a)*1.3);g.add(s);}
  const L=new THREE.PointLight(0xffc062,rs.lit?22:0,14,1.6); L.position.set(0,2,.8); g.add(L);
  scene.add(g); RS_MESH.push({mat:m,light:L,pos:g.position.clone()});
});
// barrow mound with glowing doorway
{
  const mg=new THREE.SphereGeometry(1,32,16,0,TAU,0,Math.PI/2); const m=new THREE.Mesh(mg,new THREE.MeshStandardMaterial({color:0xb7c0c4,map:snowTex,roughness:.95}));
  m.scale.set(115*S,4.2,115*S); m.position.set(380*S,hgt(380,1200)-.4,1200*S); m.castShadow=m.receiveShadow=true; scene.add(m);
  const dg=new THREE.Group(); dg.position.set((380+108)*S,hgt(488,1200),1200*S); dg.rotation.y=-Math.PI/2; scene.add(dg);
  for(const s of [-1,1]){const p=new THREE.Mesh(new THREE.BoxGeometry(.5,2.4,.5),MAT.stone);p.position.set(s*.9,1.2,0);p.castShadow=true;dg.add(p);}
  const l=new THREE.Mesh(new THREE.BoxGeometry(2.6,.5,.6),MAT.stone);l.position.y=2.5;dg.add(l);
  const d=new THREE.Mesh(new THREE.PlaneGeometry(1.3,2.2),new THREE.MeshBasicMaterial({color:new THREE.Color(.25,.9,1.4)}));d.position.set(0,1.1,-.05);dg.add(d);
  const L=new THREE.PointLight(0x6fd0ff,18,14,1.6);L.position.set(0,1.4,1.2);dg.add(L);
}
// Jötun throne and ice crystals
const CRYSTALS=[];
{
  const throne=new THREE.Group(); throne.position.set(1800*S,hgt(1800,260),260*S); scene.add(throne);
  const seat=new THREE.Mesh(new THREE.BoxGeometry(7,2.4,4),MAT.iceGlow); seat.position.y=1.2; throne.add(seat);
  const back=new THREE.Mesh(new THREE.BoxGeometry(7,9,1.4),MAT.iceGlow); back.position.set(0,5,-1.6); throne.add(back);
  for(let i=0;i<5;i++){const c=new THREE.Mesh(new THREE.ConeGeometry(.7,4+Math.random()*3,5),MAT.iceGlow);c.position.set(-3+i*1.5,9.5+Math.random(),-1.6);throne.add(c);}
  const r=rng(51);
  for(let i=0;i<30;i++){const a=r()*TAU, d=290+r()*120; const x=1800+Math.cos(a)*d, y=500+Math.sin(a)*d*.9; if(Math.abs(angDiff(a,Math.PI/2))<.45) continue;
    const c=new THREE.Mesh(new THREE.OctahedronGeometry(1,0),MAT.iceGlow); const s=.5+r()*1.4; c.scale.set(s*.6,s*2.2,s*.6); c.position.set(x*S,hgt(x,y)+s,y*S); c.rotation.set((r()-.5)*.6,r()*3,(r()-.5)*.6); scene.add(c); CRYSTALS.push(c);}
  const L=new THREE.PointLight(0x7fd6ff,22,36,1.5); L.position.set(1800*S,6,330*S); scene.add(L);
}
// Mimir altar
let mimirGlow;
{
  const g=new THREE.Group(); g.position.set(2850*S,ICE_Y,1400*S); scene.add(g);
  const a=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.4,1,8),MAT.stone); a.position.y=.5; a.castShadow=true; g.add(a);
  const w=new THREE.Mesh(new THREE.CylinderGeometry(.9,.9,.08,24),new THREE.MeshBasicMaterial({color:new THREE.Color(.3,1.1,1.6)})); w.position.y=1.02; g.add(w);
  mimirGlow=new THREE.PointLight(0x7fd6ff,26,16,1.5); mimirGlow.position.y=2.2; g.add(mimirGlow);
}
