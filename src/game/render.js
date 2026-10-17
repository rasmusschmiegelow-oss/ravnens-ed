'use strict';
/* =========================================================
   RENDERER / SCENE
   ========================================================= */
const cv=$('cv');
const renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,powerPreference:'high-performance'});
// Graphics quality: 'high' (default) or 'ultra' (ambient occlusion, sharper shadows, full pixel density)
let GFX='high'; try{GFX=localStorage.getItem('ravnensEd.gfx')||'high';}catch(e){}
const PR={low:1,high:1.5,ultra:2};
renderer.setPixelRatio(Math.min(devicePixelRatio||1,PR[GFX]||1.5));
renderer.setSize(innerWidth,innerHeight,false);
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=.82;
const scene=new THREE.Scene();
const FOG_COL=new THREE.Color(0x1b2738);
scene.fog=new THREE.FogExp2(FOG_COL,.0135);
scene.background=FOG_COL;
const camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,.1,700);
// Render chain: multisampled scene -> AO (ultra) -> depth of field (dialogue) -> bloom -> tone mapping -> colour grade
const composer=new EffectComposer(renderer,new THREE.WebGLRenderTarget(innerWidth,innerHeight,{type:THREE.HalfFloatType,samples:4}));
composer.addPass(new RenderPass(scene,camera));
const gtao=new GTAOPass(scene,camera,innerWidth,innerHeight); gtao.blendIntensity=.85;
gtao.updateGtaoMaterial({radius:1.2,distanceExponent:1.4,thickness:1.2,scale:1,samples:12}); gtao.enabled=GFX==='ultra'; composer.addPass(gtao);
const dof=new BokehPass(scene,camera,{focus:6,aperture:.0035,maxblur:.008}); dof.enabled=false; composer.addPass(dof);
const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.6,.5,1.05);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade=new ShaderPass({uniforms:{tDiffuse:{value:null},uTime:{value:0},uDark:{value:0}},
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform sampler2D tDiffuse;uniform float uTime;uniform float uDark;varying vec2 vUv;
  void main(){vec2 c=vUv-.5;float r2=dot(c,c);
    vec2 off=c*r2*.012;vec3 col=vec3(texture2D(tDiffuse,vUv+off).r,texture2D(tDiffuse,vUv).g,texture2D(tDiffuse,vUv-off).b);
    float l=dot(col,vec3(.299,.587,.114));
    col=mix(vec3(l),col,1.08);
    col+=mix(vec3(-.012,-.004,.022),vec3(.018,.008,-.012),smoothstep(.15,.75,l));
    col=pow(max(col,0.),vec3(1.04));
    col*=1.-smoothstep(.18,.62,r2)*(.32+uDark*.25);
    gl_FragColor=vec4(col,1.);}`});
composer.addPass(grade);
function onResize(){renderer.setSize(innerWidth,innerHeight,false);composer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}
function applyGfx(q){
  GFX=q; if(!applyGfx.boot) {try{localStorage.setItem('ravnensEd.gfx',q);}catch(e){}}
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,PR[q])); onResize();
  gtao.enabled=q==='ultra'; bloom.enabled=q!=='low';
  // multisampling off on low; the render targets are rebuilt on the next frame
  const samples=q==='low'?0:4; for(const rt of [composer.renderTarget1,composer.renderTarget2]){if(rt.samples!==samples){rt.samples=samples;rt.dispose();}}
  const size={low:1024,high:2048,ultra:4096}[q]; if(moon.shadow.mapSize.x!==size){moon.shadow.mapSize.set(size,size);if(moon.shadow.map){moon.shadow.map.dispose();moon.shadow.map=null;}}
  if(typeof DETAIL!=='undefined') DETAIL.forEach(m=>m.visible=q!=='low');
  if(typeof nearSnow!=='undefined') nearSnow.userData.off=q==='low';
  const b=document.getElementById('pzGfx'); if(b) b.textContent='Grafik: '+{low:'Lav',high:'Høj',ultra:'Ultra'}[q];
}
addEventListener('resize',onResize);

// --- Sky with aurora, stars and moon
const skyUniforms={uTime:{value:0},uAsh:{value:0},uAur:{value:.8}};
const skyMat=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms:skyUniforms,
  vertexShader:`varying vec3 vDir;void main(){vDir=normalize(position);vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;}`,
  fragmentShader:`uniform float uTime;uniform float uAsh;uniform float uAur;varying vec3 vDir;
  float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float h3(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
  float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y);}
  float fbm(vec2 p){float a=0.,w=.5;for(int i=0;i<4;i++){a+=w*n2(p);p*=2.03;w*=.5;}return a;}
  void main(){vec3 d=normalize(vDir);float y=d.y;
    vec3 col=mix(vec3(.105,.15,.215),vec3(.012,.018,.04),smoothstep(-.02,.55,y));
    col=mix(col,vec3(.08,.1,.14),smoothstep(0.,-.3,y));
    vec3 sp=floor(d*420.);float s=h3(sp);col+=vec3(.9,.95,1.)*step(.9965,s)*smoothstep(.02,.35,y)*(.55+.45*sin(uTime*2.+s*90.));
    if(y>0.){vec2 uv=d.xz/(y+.18);float a=0.;
      for(int i=0;i<3;i++){float fi=float(i);float wav=uv.y+.35*sin(uv.x*1.3+uTime*.07+fi*2.)+.15*sin(uv.x*3.1-uTime*.11)-.5+fi*.45;
        float band=exp(-wav*wav*5.);float cur=fbm(vec2(uv.x*2.2+fi*7.,uTime*.05+fi))*.8+.2;float rays=.6+.4*n2(vec2(uv.x*16.+uTime*.3,fi));a+=band*cur*rays;}
      vec3 ac=mix(vec3(.15,1.,.62),vec3(.55,.3,1.),smoothstep(.15,.65,y));col+=ac*a*.55*smoothstep(.0,.22,y)*(uAur/.8);}
    vec3 md=normalize(vec3(-.35,.42,-.84));float m=dot(d,md);col+=vec3(1.,.98,.92)*1.6*smoothstep(.99935,.99965,m)+vec3(.35,.45,.7)*pow(max(m,0.),300.)*.5+vec3(.2,.25,.4)*pow(max(m,0.),20.)*.12;
    if(uAsh>0.){ // Askefjorden: a sky of smoke lit red from below, with drifting embers instead of an aurora
      vec2 su=d.xz/(abs(y)+.25);float sm=fbm(su*1.3+vec2(uTime*.02,uTime*.013));
      vec3 ash=mix(vec3(.42,.12,.05),vec3(.05,.025,.03),smoothstep(-.05,.5,y));ash=mix(ash,vec3(.16,.07,.06),sm*.6*smoothstep(0.,.3,y));
      ash+=vec3(1.2,.35,.08)*pow(max(0.,1.-abs(y)*4.),3.)*(.6+.4*sm);
      float em=h3(floor(d*300.+vec3(0.,-uTime*3.,0.)));ash+=vec3(2.,.7,.15)*step(.9985,em)*smoothstep(.0,.4,y);
      col=mix(col,ash,uAsh);}
    gl_FragColor=vec4(col,1.);}`});
const sky=new THREE.Mesh(new THREE.SphereGeometry(450,48,24),skyMat); sky.renderOrder=-1; sky.frustumCulled=false; scene.add(sky);
{ // environment map from a copy of the sky
  const pm=new THREE.PMREMGenerator(renderer); const es=new THREE.Scene(); es.add(new THREE.Mesh(new THREE.SphereGeometry(10,32,16),skyMat));
  scene.environment=pm.fromScene(es,.04).texture; scene.environmentIntensity=1;
}

// --- Lights
const hemi=new THREE.HemisphereLight(0x7f97bd,0x1d222c,.62); scene.add(hemi);
const moon=new THREE.DirectionalLight(0xb4c8f4,1.45);
moon.castShadow=true; moon.shadow.mapSize.set(GFX==='ultra'?4096:2048,GFX==='ultra'?4096:2048);
Object.assign(moon.shadow.camera,{left:-32,right:32,top:32,bottom:-32,near:1,far:160});
moon.shadow.bias=-.0004; moon.shadow.normalBias=.035;
scene.add(moon,moon.target);
const MOON_OFF=new THREE.Vector3(-28,52,-44);
const lantern=new THREE.PointLight(0xffb072,10,14,1.7); lantern.castShadow=false; scene.add(lantern);

/* --- Procedural textures */
function canvasTex(w,h,draw,repeat){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');draw(g,w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;if(repeat){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeat,repeat);}return t;}
const snowTex=canvasTex(256,256,(g,w,h)=>{g.fillStyle='#fff';g.fillRect(0,0,w,h);const r=rng(5);for(let i=0;i<5000;i++){const v=200+r()*55|0;g.fillStyle=`rgba(${v},${v+3},${Math.min(255,v+10)},${.25+r()*.4})`;g.fillRect(r()*w,r()*h,1+r()*2,1+r()*2);}for(let i=0;i<40;i++){g.fillStyle=`rgba(170,185,205,${r()*.18})`;g.beginPath();g.ellipse(r()*w,r()*h,8+r()*30,4+r()*10,r()*3,0,TAU);g.fill();}},90);
const woodTex=canvasTex(128,128,(g,w,h)=>{g.fillStyle='#4a3424';g.fillRect(0,0,w,h);const r=rng(9);for(let y=0;y<h;y+=16){g.fillStyle=`rgba(0,0,0,${.25+r()*.2})`;g.fillRect(0,y,w,2);for(let i=0;i<14;i++){g.fillStyle=`rgba(${110+r()*40|0},${80+r()*20|0},50,${.15})`;g.fillRect(0,y+2+r()*13,w,1);}}},1);
const stoneTex=canvasTex(128,128,(g,w,h)=>{g.fillStyle='#6b7279';g.fillRect(0,0,w,h);const r=rng(3);for(let i=0;i<900;i++){const v=80+r()*90|0;g.fillStyle=`rgba(${v},${v+4},${v+10},.35)`;g.fillRect(r()*w,r()*h,2+r()*4,2+r()*4);}for(let i=0;i<30;i++){g.fillStyle=`rgba(110,140,90,${r()*.25})`;g.beginPath();g.arc(r()*w,r()*h,3+r()*8,0,TAU);g.fill();}},1);
function runeTex(glyphs,col){return canvasTex(128,384,(g,w,h)=>{g.fillStyle='#000';g.fillRect(0,0,w,h);g.font='54px "Noto Sans Runic", sans-serif';g.textAlign='center';g.fillStyle=col;g.shadowColor=col;g.shadowBlur=14;[...glyphs].forEach((c,i)=>g.fillText(c,w/2,70+i*62));g.strokeStyle=col;g.lineWidth=3;g.beginPath();g.moveTo(18,14);g.lineTo(18,h-14);g.moveTo(w-18,14);g.lineTo(w-18,h-14);g.stroke();});}
const iceTex=canvasTex(512,512,(g,w,h)=>{const gr=g.createRadialGradient(w/2,h/2,10,w/2,h/2,w/2);gr.addColorStop(0,'#cfe9f5');gr.addColorStop(1,'#6f9fb8');g.fillStyle=gr;g.fillRect(0,0,w,h);const r=rng(11);g.strokeStyle='rgba(255,255,255,.55)';for(let i=0;i<40;i++){let x=r()*w,y=r()*h;g.lineWidth=.5+r()*1.4;g.beginPath();g.moveTo(x,y);for(let j=0;j<8;j++){x+=(r()-.5)*70;y+=(r()-.5)*70;g.lineTo(x,y);}g.stroke();}for(let i=0;i<300;i++){g.fillStyle=`rgba(255,255,255,${r()*.25})`;g.beginPath();g.arc(r()*w,r()*h,r()*3,0,TAU);g.fill();}});
const shieldTex=canvasTex(128,128,(g,w,h)=>{g.fillStyle='#e6dcc4';g.fillRect(0,0,w,h);g.fillStyle='#8c2a22';for(let i=0;i<4;i++){g.beginPath();g.moveTo(64,64);g.arc(64,64,64,i*Math.PI/2,i*Math.PI/2+Math.PI/4);g.fill();}g.strokeStyle='#2a1d12';g.lineWidth=5;g.beginPath();g.arc(64,64,60,0,TAU);g.stroke();});
const softDot=canvasTex(64,64,(g,w,h)=>{const gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.4,'rgba(255,255,255,.5)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);});
const fogTex=canvasTex(256,256,(g,w,h)=>{const r=rng(21);for(let i=0;i<26;i++){const x=60+r()*136,y=60+r()*136,rad=30+r()*70;const gr=g.createRadialGradient(x,y,0,x,y,rad);gr.addColorStop(0,'rgba(255,255,255,.22)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);}});

/* --- Photographed textures (Poly Haven, CC0) */
const texL=new THREE.TextureLoader();
function ptex(name,srgb,rep){const t=texL.load('assets/textures/'+name);if(srgb)t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep,rep);t.anisotropy=8;return t;}
const SNOW_REP=120;
/* --- Materials */
const MAT={
  snowMount:new THREE.MeshStandardMaterial({color:0xffffff,map:ptex('snow_02_diff_1k.jpg',1,SNOW_REP),normalMap:ptex('snow_02_nor_gl_1k.jpg',0,SNOW_REP),roughnessMap:ptex('snow_02_rough_1k.jpg',0,SNOW_REP),normalScale:new THREE.Vector2(.9,.9),vertexColors:true,roughness:1}),
  bark:new THREE.MeshStandardMaterial({color:0x3b2c22,roughness:1}),
  pine:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95,flatShading:true}),
  rock:new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true,map:ptex('rock_face_diff_1k.jpg',1,1),normalMap:ptex('rock_face_nor_gl_1k.jpg',0,1),roughnessMap:ptex('rock_face_rough_1k.jpg',0,1)}),
  wood:new THREE.MeshStandardMaterial({map:woodTex,roughness:.9}),
  roof:new THREE.MeshStandardMaterial({color:0xe9eef4,roughness:.85,map:snowTex}),
  stone:new THREE.MeshStandardMaterial({color:0xb4b8bc,roughness:1,map:ptex('rock_face_diff_1k.jpg',1,1),normalMap:ptex('rock_face_nor_gl_1k.jpg',0,1),flatShading:true}),
  iron:new THREE.MeshStandardMaterial({color:0x2c3035,roughness:.45,metalness:.85}),
  steel:new THREE.MeshStandardMaterial({color:0xaab3bd,roughness:.25,metalness:1}),
  gold:new THREE.MeshStandardMaterial({color:0xd4ae55,roughness:.3,metalness:1}),
  ember:new THREE.MeshBasicMaterial({color:new THREE.Color(2,.7,.15)}),
  window:new THREE.MeshBasicMaterial({color:new THREE.Color(2.4,1.3,.5)}),
  dark:new THREE.MeshBasicMaterial({color:0x050608}),
  iceGlow:new THREE.MeshStandardMaterial({color:0xa8e4ff,emissive:0x5fb8e6,emissiveIntensity:.75,roughness:.15,metalness:.1,flatShading:true,transparent:true,opacity:.92}),
  ice:new THREE.MeshPhysicalMaterial({color:0xc6e7f5,map:iceTex,roughness:.08,metalness:0,clearcoat:1,clearcoatRoughness:.05,envMapIntensity:1.6}),
  banner:new THREE.MeshStandardMaterial({color:0x7d1f1a,roughness:.9,side:THREE.DoubleSide}),
};

/* --- Trees between the camera and the player turn see-through (screen-door dither) */
const DETAIL=[];
const SEE={uPlayer:{value:new THREE.Vector3()},uCam:{value:new THREE.Vector3()},uFade:{value:0}};
const WIND={uTime:{value:0},uWind:{value:1}};
function seeThrough(mat,sway=0){
  mat.onBeforeCompile=sh=>{
    Object.assign(sh.uniforms,SEE,WIND);
    sh.vertexShader='varying vec3 vWP;uniform float uTime;uniform float uWind;\n'+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec2 ip=instanceMatrix[3].xz;
      #else
        vec2 ip=vec2(0.);
      #endif
      float sw=${sway.toFixed(3)}*max(transformed.y,0.)*max(transformed.y,0.);
      transformed.x+=sw*(sin(uTime*1.1+ip.x*.13+ip.y*.07)*.6+sin(uTime*2.7+ip.y*.21)*.25)*uWind;
      transformed.z+=sw*sin(uTime*.9+ip.x*.11)*.35*uWind;`).replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
      #ifdef USE_INSTANCING
        vWP=(modelMatrix*instanceMatrix*vec4(transformed,1.0)).xyz;
      #else
        vWP=(modelMatrix*vec4(transformed,1.0)).xyz;
      #endif`);
    sh.fragmentShader='varying vec3 vWP;uniform vec3 uPlayer;uniform vec3 uCam;uniform float uFade;\n'+sh.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
      if(uFade>0.5){vec2 pc=uPlayer.xz,ab=uCam.xz-pc;float t=clamp(dot(vWP.xz-pc,ab)/max(dot(ab,ab),.001),0.,1.);
        float dseg=length(vWP.xz-(pc+ab*t));float hLine=mix(uPlayer.y+.6,uCam.y,t);
        if(dseg<3.4&&vWP.y>uPlayer.y+.7&&vWP.y<hLine+4.){vec2 f=mod(floor(gl_FragCoord.xy),3.);if(!(f.x==0.&&f.y==0.))discard;}}`);
  };
  return mat;
}

/* =========================================================
   TERRAIN
   ========================================================= */
{
  const ext=900, TW=WORLD.w+ext*2, TH=WORLD.h+ext*2;
  const geo=new THREE.PlaneGeometry(TW*S,TH*S,Math.round(600*TW/5400),500); geo.rotateX(-Math.PI/2);
  const pos=geo.attributes.position, cols=new Float32Array(pos.count*3), nr=rng(77);
  for(let i=0;i<pos.count;i++){
    const px=pos.getX(i)/S+WORLD.w/2, py=pos.getZ(i)/S+WORLD.h/2;
    pos.setY(i,hgt(px,py));
    let r=.7,g=.76,b=.88; const v=.93+nr()*.07;
    const pd=pathDist(px,py); const pk=sstep(70,20,pd);
    r=lerp(r,.42,pk*.8);g=lerp(g,.43,pk*.8);b=lerp(b,.46,pk*.8);
    const vk=sstep(340,120,Math.hypot(px-1800,py-2380)); r=lerp(r,.5,vk*.55);g=lerp(g,.45,vk*.55);b=lerp(b,.42,vk*.55);
    const bk=sstep(340,80,Math.hypot(px-560,py-1200)); r=lerp(r,.36,bk*.6);g=lerp(g,.42,bk*.6);b=lerp(b,.36,bk*.6);
    const jk=sstep(420,100,Math.hypot(px-1800,py-500)); r=lerp(r,.75,jk*.4);g=lerp(g,.9,jk*.4);b=lerp(b,1.05,jk*.4);
    const le=lakeE(px,py); if(le<1.6){const k=sstep(1.6,1.05,le);r=lerp(r,.55,k);g=lerp(g,.62,k);b=lerp(b,.7,k);}
    const ak=ashK(px); if(ak>0){ // ash and black rock, scorched around the lava
      const n=Math.abs(Math.sin(px*.021+py*.017)*Math.cos(px*.013-py*.009));
      let ar=.2+n*.07,ag=.18+n*.05,ab=.18+n*.04; ar=lerp(ar,.3,pk*.8);ag=lerp(ag,.24,pk*.8);ab=lerp(ab,.2,pk*.8);
      let lk=0;for(const p of LAVA){const e=lavaE(p,px,py);if(e<2.6)lk=Math.max(lk,sstep(2.6,1.0,e));}ar=lerp(ar,.1,lk);ag=lerp(ag,.07,lk);ab=lerp(ab,.06,lk);
      const sk=sstep(240,90,Math.hypot(px-4350,py-2380)); ar=lerp(ar,.34,sk*.5);ag=lerp(ag,.3,sk*.5);ab=lerp(ab,.27,sk*.5);
      r=lerp(r,ar,ak);g=lerp(g,ag,ak);b=lerp(b,ab,ak);}
    cols[i*3]=r*v;cols[i*3+1]=g*v;cols[i*3+2]=b*v;
  }
  geo.setAttribute('color',new THREE.BufferAttribute(cols,3)); geo.computeVertexNormals();
  const terr=new THREE.Mesh(geo,MAT.snowMount); terr.position.set(WORLD.w/2*S,0,WORLD.h/2*S); terr.receiveShadow=true; scene.add(terr);
  // frozen lake
  const lg=new THREE.CircleGeometry(1,72); lg.rotateX(-Math.PI/2);
  const lake=new THREE.Mesh(lg,MAT.ice); lake.scale.set(LAKE.rx*S*1.12,1,LAKE.ry*S*1.12); lake.position.set(LAKE.x*S,ICE_Y,LAKE.y*S); lake.receiveShadow=true; scene.add(lake);
}
