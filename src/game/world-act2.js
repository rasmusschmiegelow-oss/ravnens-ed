'use strict';
/* =========================================================
   ASKEFJORDEN (act two): burnt forest, black rock, lava, the ice wall in the pass,
   the wall of Muspel fire with its gate, Garm's cave and Surt's arena
   ========================================================= */
const ASH={trees:[],rocks:[],beacons:[{id:'v1',x:3850,y:1350},{id:'v2',x:4900,y:1650},{id:'v3',x:5450,y:2350}]};
ASH.beacons.forEach(b=>OBS.push({x:b.x,y:b.y,r:18}));
const LAVA_MAT=new THREE.ShaderMaterial({uniforms:{uTime:skyUniforms.uTime},
  vertexShader:`varying vec2 vP;varying vec2 vUv;void main(){vUv=uv;vec4 w=modelMatrix*vec4(position,1.);vP=w.xz;gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader:`uniform float uTime;varying vec2 vP;varying vec2 vUv;
  float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
  void main(){vec2 p=vP*.35;float a=n(p+vec2(uTime*.12,uTime*.05))*.6+n(p*2.3-vec2(uTime*.07,0.))*.4;
    float crust=smoothstep(.42,.6,n(p*1.6+vec2(0.,uTime*.03)))*smoothstep(.2,.5,n(p*.7+3.));
    float rim=length(vUv-.5)*2.;crust=max(crust,smoothstep(.72,.98,rim+n(p*3.)*.15));
    vec3 hot=mix(vec3(1.1,.22,.03),vec3(2.2,.85,.14),a*a);hot*=1.+smoothstep(.6,.8,rim)*(1.-smoothstep(.8,.95,rim))*.8;gl_FragColor=vec4(mix(hot,vec3(.05,.025,.02),crust*.94),1.);}`});
const FIRE_CURTAIN=new THREE.ShaderMaterial({uniforms:{uTime:skyUniforms.uTime,uOpen:{value:0}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform float uTime;uniform float uOpen;varying vec2 vUv;
  float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
  void main(){float f=n(vec2(vUv.x*6.,vUv.y*3.-uTime*1.6))*.7+n(vec2(vUv.x*14.,vUv.y*7.-uTime*2.7))*.3;
    float a=smoothstep(1.,.0,vUv.y)*f*1.6-vUv.y*.4;a*=1.-uOpen;
    gl_FragColor=vec4(vec3(3.,1.,.18)*a,1.)*clamp(a,0.,1.);}`});
const ICE_WALL=new THREE.Group(), FGATE_G=new THREE.Group(), BEACON_M={};
{
  const R=rng(2024);
  // charred trees: a bare trunk with a few broken branches
  const parts=[new THREE.CylinderGeometry(.1,.3,4.6,6).translate(0,2.2,0)];
  for(const [y,a,l] of [[2.6,.9,1.6],[3.2,-1,1.3],[3.8,.7,1],[1.9,-.6,1.1]]){const b=new THREE.CylinderGeometry(.04,.09,l,5).translate(0,l/2,0);b.rotateZ(a);b.rotateY(y*2.3);b.translate(0,y,0);parts.push(b);}
  const tg=mergeGeometries(parts.map(g=>g.toNonIndexed()));
  let tries=0;
  while(ASH.trees.length<240&&tries++<6000){
    const x=3700+R()*(WORLD.w-PAD-3700+40), y=PAD-30+R()*(WORLD.h-2*PAD+60);
    if(!clearZone(x,y,0)) continue; let ok=true; for(const t of ASH.trees){if(Math.abs(t.x-x)<55&&Math.abs(t.y-y)<55){ok=false;break;}} if(!ok) continue;
    const s=.8+R()*.6, t={x,y,r:7*s,s,rot:R()*TAU,col:true}; ASH.trees.push(t); OBS.push(t);
  }
  for(let i=0;i<900;i++){ // on the slopes around Askefjorden and along the ridge
    const x=RIDGE.x-260+R()*(WORLD.w+500-RIDGE.x), y=-500+R()*(WORLD.h+1000);
    const e=Math.min(y,WORLD.w-x,WORLD.h-y), onRidge=Math.abs(x-RIDGE.x)<RIDGE.w&&Math.abs(y-RIDGE.passY)>RIDGE.passW+60;
    if(!onRidge&&(e>PAD-30||e<-450)) continue; ASH.trees.push({x,y,r:0,s:.9+R()*.8,rot:R()*TAU,col:false});
  }
  const tm=new THREE.MeshStandardMaterial({color:0x1b1613,roughness:1,flatShading:true}); seeThrough(tm,.0006);
  const im=new THREE.InstancedMesh(tg,tm,ASH.trees.length); im.castShadow=true;
  ASH.trees.forEach((t,i)=>{dummy.position.set(t.x*S,hgt(t.x,t.y)-.1,t.y*S);dummy.rotation.set((R()-.5)*.12,t.rot,(R()-.5)*.12);dummy.scale.setScalar(t.s);dummy.updateMatrix();im.setMatrixAt(i,dummy.matrix);});
  scene.add(im);
  // black basalt, some with glowing cracks
  tries=0;
  while(ASH.rocks.length<130&&tries++<4000){
    const x=3700+R()*(WORLD.w-PAD-3700), y=PAD+R()*(WORLD.h-2*PAD);
    if(!clearZone(x,y,-20)) continue; const r=10+R()*20; let ok=true; for(const o of ASH.rocks){if(Math.hypot(o.x-x,o.y-y)<o.r+r+20){ok=false;break;}} if(!ok) continue;
    const o={x,y,r}; ASH.rocks.push(o); OBS.push(o);
  }
  for(const o of OBS) if(o.cliff) ASH.rocks.push({x:o.x,y:o.y,r:o.r*1.5,big:true});
  const rg=new THREE.IcosahedronGeometry(1,1).toNonIndexed(); const rp=rg.attributes.position, seen=new Map();
  for(let i=0;i<rp.count;i++){const k=rp.getX(i).toFixed(3)+rp.getY(i).toFixed(3)+rp.getZ(i).toFixed(3);let s=seen.get(k);if(!s){s=.75+R()*.5;seen.set(k,s);}rp.setXYZ(i,rp.getX(i)*s,rp.getY(i)*s,rp.getZ(i)*s);}
  rg.computeVertexNormals();
  const rc=new Float32Array(rp.count*3); for(let i=0;i<rp.count;i+=3){const k=R()<.06?[1.6,.5,.12]:[.16+R()*.05,.14+R()*.04,.14];for(let j=0;j<3;j++)rc.set(k,(i+j)*3);}
  rg.setAttribute('color',new THREE.BufferAttribute(rc,3));
  const rm=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9,flatShading:true,map:MAT.rock.map,normalMap:MAT.rock.normalMap});
  const ir=new THREE.InstancedMesh(rg,rm,ASH.rocks.length); ir.castShadow=ir.receiveShadow=true;
  ASH.rocks.forEach((o,i)=>{dummy.position.set(o.x*S,hgt(o.x,o.y)+(o.big?1.2:0),o.y*S);dummy.rotation.set(R(),R()*TAU,R()*.4);dummy.scale.set(o.r*S*1.25,o.r*S*(o.big?2.6:.9),o.r*S*1.1);dummy.updateMatrix();ir.setMatrixAt(i,dummy.matrix);});
  scene.add(ir);
  // lava pools
  for(const p of LAVA){const m=new THREE.Mesh(new THREE.CircleGeometry(1,56).rotateX(-Math.PI/2),LAVA_MAT);m.scale.set(p.rx*S*1.08,1,p.ry*S*1.08);m.position.set(p.x*S,p.lv+.38,p.y*S);scene.add(m);}
  // the ice wall that closes the pass until the winter breaks
  ICE_WALL.position.set(RIDGE.x*S,hgt(RIDGE.x,RIDGE.passY),RIDGE.passY*S); scene.add(ICE_WALL);
  for(let i=0;i<16;i++){const c=new THREE.Mesh(new THREE.OctahedronGeometry(1,0),MAT.iceGlow);const z=(i/15-.5)*RIDGE.passW*2.2*S;const s=1.6+R()*1.6;
    c.position.set((R()-.5)*1.5,s*1.2,z);c.scale.set(s*.9,s*2.4,s*.8);c.rotation.set((R()-.5)*.4,R()*3,(R()-.5)*.4);c.castShadow=true;ICE_WALL.add(c);}
  // the wall of Muspel fire: basalt blocks with glowing seams, and a gate of fire
  const wb=new THREE.BoxGeometry(1,1,1), wm=new THREE.MeshStandardMaterial({color:0x2a2420,roughness:.95,map:MAT.rock.map,emissive:0x3a0c02,emissiveIntensity:.6,flatShading:true});
  const wim=new THREE.InstancedMesh(wb,wm,140); wim.castShadow=wim.receiveShadow=true; let k=0;
  for(let x=3620;x<WORLD.w+300&&k<140;x+=42){ if(x>4900&&x<5100) continue; const h=4+R()*2.5;
    dummy.position.set((x+20)*S,hgt(x+20,FWALL_Y+20)+h/2-.3,(FWALL_Y+20)*S);dummy.rotation.set((R()-.5)*.08,(R()-.5)*.1,(R()-.5)*.08);dummy.scale.set(2.2+R()*.4,h,2.3+R()*.3);dummy.updateMatrix();wim.setMatrixAt(k++,dummy.matrix);}
  wim.count=k; scene.add(wim);
  FGATE_G.position.set(5000*S,hgt(5000,FWALL_Y+20),(FWALL_Y+20)*S); scene.add(FGATE_G);
  const ob=new THREE.MeshStandardMaterial({color:0x14100e,roughness:.35,metalness:.2,emissive:0x501004,emissiveIntensity:.8,flatShading:true});
  for(const s of [-1,1]){const p=new THREE.Mesh(new THREE.CylinderGeometry(.9,1.4,9,6),ob);p.position.set(s*4.6,4.5,0);p.castShadow=true;FGATE_G.add(p);
    const t=new THREE.Mesh(new THREE.ConeGeometry(1,2.6,6),ob);t.position.set(s*4.6,10.2,0);FGATE_G.add(t);
    const bowl=new THREE.Mesh(new THREE.SphereGeometry(.35,8,6),MAT.ember);bowl.position.set(s*4.6,11.7,0);FGATE_G.add(bowl);
    FIRE_FX.push({x:5000*S+s*4.6,y:FGATE_G.position.y+11.6,z:(FWALL_Y+20)*S,light:null,base:0,small:1});}
  const cur=new THREE.Mesh(new THREE.PlaneGeometry(8.4,8.5),FIRE_CURTAIN); cur.position.y=4.2; FGATE_G.add(cur); FGATE_G.userData.curtain=cur;
  // Gnipahellir: the cave mouth, black inside, with Garm's broken chain on the ground
  const cave=new THREE.Mesh(new THREE.SphereGeometry(1,20,12,0,TAU,0,Math.PI/2),new THREE.MeshBasicMaterial({color:0x020101}));
  cave.scale.set(3.6,4.4,2.2); cave.position.set(GNIPA.x*S,hgt(GNIPA.x,GNIPA.y+30)-.2,(GNIPA.y-25)*S); scene.add(cave);
  const chainM=MAT.iron;
  for(let i=0;i<14;i++){const l=new THREE.Mesh(new THREE.TorusGeometry(.22,.06,6,10),chainM);const x=4300+(i-7)*9+Math.sin(i)*8,y=1080+i*6;
    l.position.set(x*S,hgt(x,y)+.08,y*S);l.rotation.set(Math.PI/2+(i%2?0:.5),0,i*.4);l.castShadow=true;scene.add(l);}
  // Surt's arena: obsidian spires with glowing tips around the rift
  for(let i=0;i<14;i++){const a=i/14*TAU;if(Math.abs(angDiff(a,Math.PI/2))<.35)continue;const x=5000+Math.cos(a)*330,y=560+Math.sin(a)*270;
    const h=5+R()*5,c=new THREE.Mesh(new THREE.ConeGeometry(1+R()*.6,h,5),ob);c.position.set(x*S,hgt(x,y)+h/2-.4,y*S);c.rotation.set((R()-.5)*.2,R()*3,(R()-.5)*.2);c.castShadow=true;scene.add(c);
    OBS.push({x,y,r:26});}
  // beacons: stacked logs that Ragna asks you to light
  for(const b of ASH.beacons){const g=new THREE.Group();g.position.set(b.x*S,hgt(b.x,b.y),b.y*S);scene.add(g);
    for(let i=0;i<4;i++)for(let j=0;j<2;j++){const l=new THREE.Mesh(new THREE.CylinderGeometry(.12,.14,2.2,6),MAT.bark);l.rotation.z=Math.PI/2;l.rotation.y=i*Math.PI/2+j*.2;l.position.y=.2+i*.28;l.castShadow=true;g.add(l);}
    const core=new THREE.Mesh(new THREE.SphereGeometry(.5,8,6),MAT.ember);core.position.y=1.1;core.visible=false;g.add(core);
    BEACON_M[b.id]={g,core,fx:{x:b.x*S,y:hgt(b.x,b.y)+1.2,z:b.y*S,light:null,base:0,beacon:1}};}
}
/** Lights a beacon for good. */
function lightBeacon(id,silent){const m=BEACON_M[id];if(!m||m.lit)return;m.lit=true;m.core.visible=true;FIRE_FX.push(m.fx);if(!silent){sfx('rune');burst(m.fx.x,m.fx.y,m.fx.z,60,4,1.2,.4,3,1.2,.3,{grav:-1});}}
function resetBeacons(){for(const id in BEACON_M){const m=BEACON_M[id];m.lit=false;m.core.visible=false;const i=FIRE_FX.indexOf(m.fx);if(i>=0)FIRE_FX.splice(i,1);}}
/** The ice wall melts away when the second act begins. */
function setIceWall(open,instant){ICEWALL.gone=open;G.iceMelt=open?(instant?1:0):null;if(!open){ICE_WALL.visible=true;ICE_WALL.scale.set(1,1,1);ICE_WALL.position.y=hgt(RIDGE.x,RIDGE.passY);}else if(instant)ICE_WALL.visible=false;}
function setFireGate(open,instant){FIREGATE.gone=open;FIRE_CURTAIN.uniforms.uOpen.value=open&&instant?1:0;G.fgateAnim=open&&!instant?0:null;FGATE_G.userData.curtain.visible=!(open&&instant);}
function updAct2(dt){
  if(G.iceMelt!=null&&G.iceMelt<1){G.iceMelt=Math.min(1,G.iceMelt+dt*.25);const k=G.iceMelt;ICE_WALL.scale.set(1,1-k*.95,1);ICE_WALL.position.y=hgt(RIDGE.x,RIDGE.passY)-k*2;
    if(Math.random()<.6)FXN.emit((RIDGE.x+rand(-30,30))*S,ICE_WALL.position.y+rand(1,6),(RIDGE.passY+rand(-90,90))*S,rand(-.3,.3),rand(.5,1.5),rand(-.3,.3),2.5,rand(1,2),.8,.85,.9,.35,-.1,.3,2);
    if(k>=1)ICE_WALL.visible=false;}
  if(G.fgateAnim!=null&&G.fgateAnim<1){G.fgateAnim=Math.min(1,G.fgateAnim+dt*.4);FIRE_CURTAIN.uniforms.uOpen.value=G.fgateAnim;if(G.fgateAnim>=1)FGATE_G.userData.curtain.visible=false;}
  // embers rising from the lava near the camera
  if(G.ashK>.3){const c=G.camLook;for(let i=0;i<3;i++)FXA.emit(c.x+rand(-30,30),c.y+rand(0,4),c.z+rand(-30,30),rand(-.4,.4)+wind*.1,rand(.4,1.4),rand(-.4,.4),rand(2,4),rand(.08,.16),3,1,.2,G.ashK,-.05,.2,0);
    for(const p of LAVA){if(Math.abs(p.x*S-c.x)>45||Math.abs(p.y*S-c.z)>45)continue;if(Math.random()<.5){const a=Math.random()*TAU,r=Math.sqrt(Math.random());FXA.emit((p.x+Math.cos(a)*p.rx*r)*S,p.lv+.5,(p.y+Math.sin(a)*p.ry*r)*S,rand(-.2,.2),rand(1,3),rand(-.2,.2),rand(.8,1.6),rand(.15,.3),3,1,.2,1,-.2,.3,0);}}}
}

/* --- Skjoldvik: the burnt fishing town where the survivors gather */
function buildAct2Props(){
  const burnt=new Map();
  const dark=p=>{p.obj.traverse(o=>{if(!o.isMesh)return;let m=burnt.get(o.material);if(!m){m=o.material.clone();m.color.multiplyScalar(.32);m.color.r*=1.15;burnt.set(o.material,m);}o.material=m;});return p;};
  for(const [x,y,r,s] of [[4170,2330,.4,6.2],[4520,2280,-.5,5.8],[4600,2480,2.2,6],[4210,2520,1.2,5.5]]) {dark(placeProp('building_destroyed',x,y,{rot:r,fit:s}));OBS.push({x,y,r:40});}
  for(const [x,y,r] of [[4300,2470,.3],[4420,2500,-.4],[4250,2400,1.2]]){placeProp('tent',x,y,{fit:3,rot:r,collide:24});}
  [['barrel',4380,2430,0],['barrel',4392,2446,1],['crate_A_big',4470,2420,.3],['sack',4455,2436,0],['weaponrack',4470,2380,Math.PI/2],['crate_B_small',4240,2290,.2],['sack',4320,2520,1],['resource_lumber',4150,2420,.8],['wheelbarrow',4560,2390,2]]
    .forEach(([k,x,y,r])=>placeProp(k,x,y,{rot:r,fit:k==='resource_lumber'?2.4:k==='weaponrack'?1.8:k==='wheelbarrow'?1.6:1.1,collide:10}));
  for(let x=4180;x<=4560;x+=44) if(Math.random()<.6) dark(placeProp('fence_wood_straight',x,2600,{fit:2.3,rot:(Math.random()-.5)*.5}));
  placeProp('flag_red',4335,2205,{fit:1.2});
  buildFire({x:4350,y:2400,big:1}); OBS.push({x:4350,y:2400,r:12});
  // Sindri's anvil
  placeProp('barrel_large',4475,2460,{fit:1.1,collide:12});
}
