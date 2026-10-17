'use strict';
/* =========================================================
   PARTICLES
   ========================================================= */
class PSys{
  constructor(n,blending){
    this.n=n;this.i=0;this.alive=new Uint8Array(n);
    this.p=new Float32Array(n*3);this.v=new Float32Array(n*3);this.c=new Float32Array(n*3);this.sz=new Float32Array(n);this.a=new Float32Array(n);
    this.life=new Float32Array(n);this.max=new Float32Array(n);this.grav=new Float32Array(n);this.drag=new Float32Array(n);this.s0=new Float32Array(n);this.grow=new Float32Array(n);
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(this.p,3));g.setAttribute('pcol',new THREE.BufferAttribute(this.c,3));g.setAttribute('psize',new THREE.BufferAttribute(this.sz,1));g.setAttribute('palpha',new THREE.BufferAttribute(this.a,1));
    this.g=g;
    const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending,uniforms:{uPR:{value:renderer.getPixelRatio()},uTex:{value:softDot}},
      vertexShader:`attribute vec3 pcol;attribute float psize;attribute float palpha;varying vec3 vC;varying float vA;uniform float uPR;void main(){vC=pcol;vA=palpha;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=psize*uPR*(420./-mv.z);gl_Position=projectionMatrix*mv;}`,
      fragmentShader:`uniform sampler2D uTex;varying vec3 vC;varying float vA;void main(){float t=texture2D(uTex,gl_PointCoord).a;if(vA<=0.001)discard;gl_FragColor=vec4(vC,t*vA);}`});
    this.pts=new THREE.Points(g,m);this.pts.frustumCulled=false;scene.add(this.pts);
  }
  emit(x,y,z,vx,vy,vz,life,size,r,g,b,alpha=1,grav=0,drag=0,grow=0){
    const i=this.i;this.i=(this.i+1)%this.n;this.alive[i]=1;
    this.p[i*3]=x;this.p[i*3+1]=y;this.p[i*3+2]=z;this.v[i*3]=vx;this.v[i*3+1]=vy;this.v[i*3+2]=vz;
    this.c[i*3]=r;this.c[i*3+1]=g;this.c[i*3+2]=b;this.life[i]=life;this.max[i]=life;this.s0[i]=size;this.sz[i]=size;this.a[i]=alpha;this.grav[i]=grav;this.drag[i]=drag;this.grow[i]=grow;this.a0=alpha;
    this.aBase??=new Float32Array(this.n);this.aBase[i]=alpha;
  }
  update(dt){
    for(let i=0;i<this.n;i++){ if(!this.alive[i]) continue;
      this.life[i]-=dt; if(this.life[i]<=0){this.alive[i]=0;this.a[i]=0;continue;}
      const k=this.life[i]/this.max[i], dr=1-this.drag[i]*dt;
      this.v[i*3]*=dr;this.v[i*3+2]*=dr;this.v[i*3+1]=this.v[i*3+1]*dr-this.grav[i]*dt;
      this.p[i*3]+=this.v[i*3]*dt;this.p[i*3+1]+=this.v[i*3+1]*dt;this.p[i*3+2]+=this.v[i*3+2]*dt;
      this.a[i]=this.aBase[i]*Math.min(1,k*2.2)*Math.min(1,(1-k)*12+.2);
      this.sz[i]=this.s0[i]*(1+this.grow[i]*(1-k));
    }
    this.g.attributes.position.needsUpdate=true;this.g.attributes.pcol.needsUpdate=true;this.g.attributes.psize.needsUpdate=true;this.g.attributes.palpha.needsUpdate=true;
  }
}
const FXA=new PSys(4000,THREE.AdditiveBlending), FXN=new PSys(2500,THREE.NormalBlending);
function burst(x,y,z,n,spd,life,size,r,g,b,{sys=FXA,up=1,grav=4,drag=1.5,alpha=1,grow=0}={}){
  for(let i=0;i<n;i++){const a=Math.random()*TAU,s=spd*(.3+Math.random()*.7);sys.emit(x,y,z,Math.cos(a)*s,up*(Math.random()*spd*.8+spd*.2),Math.sin(a)*s,life*(.6+Math.random()*.6),size*(.6+Math.random()*.7),r,g,b,alpha,grav,drag,grow);}
}

/* --- Ground decals: footprints in the snow and marks where blows landed */
const TEX_FOOT=canvasTex(64,128,(g,w,h)=>{g.clearRect(0,0,w,h);const gr=(cx,cy,rx,ry)=>{const r=g.createRadialGradient(cx,cy,0,cx,cy,Math.max(rx,ry));r.addColorStop(0,'rgba(255,255,255,.95)');r.addColorStop(.7,'rgba(255,255,255,.6)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.beginPath();g.ellipse(cx,cy,rx,ry,0,0,TAU);g.fill();};gr(32,40,20,32);gr(32,98,16,20);});
const TEX_SPLAT=canvasTex(128,128,(g,w,h)=>{g.clearRect(0,0,w,h);const r=rng(17);for(let i=0;i<26;i++){const a=r()*TAU,d=r()*r()*48,x=64+Math.cos(a)*d,y=64+Math.sin(a)*d,rad=4+r()*(18-d*.25);const gr=g.createRadialGradient(x,y,0,x,y,rad);gr.addColorStop(0,'rgba(255,255,255,.9)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.beginPath();g.arc(x,y,rad,0,TAU);g.fill();}});
const DECALS=[]; let decalI=0;
{const dg=new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2);
  for(let i=0;i<220;i++){const m=new THREE.Mesh(dg,new THREE.MeshBasicMaterial({transparent:true,depthWrite:false,opacity:0,polygonOffset:true,polygonOffsetFactor:-2}));m.visible=false;m.renderOrder=1;scene.add(m);DECALS.push({m,t:0,life:1,op:1});}}
function decal(tex,x,y,rot,w,l,col,life,op){
  const d=DECALS[decalI];decalI=(decalI+1)%DECALS.length;
  d.m.material.map=tex;d.m.material.color.setRGB(col[0],col[1],col[2]);d.m.material.needsUpdate=true;
  d.m.position.set(x*S,groundY(x,y)+.03,y*S);d.m.rotation.y=rot;d.m.scale.set(w,1,l);d.m.visible=true;d.t=0;d.life=life;d.op=op;d.m.material.opacity=op;
}
function updDecals(dt){for(const d of DECALS){if(!d.m.visible)continue;d.t+=dt;const k=d.t/d.life;if(k>=1){d.m.visible=false;continue;}d.m.material.opacity=d.op*Math.min(1,(1-k)*3.5);}}
const SPLAT_COL={bone:[.82,.78,.7],ice:[.6,.85,1],ichor:[.45,.15,.6],blood:[.32,.02,.03],ash:[.12,.1,.09],ember:[1,.35,.08]};
function splatType(t){return ['askedraugr','askeskytte','eldseidr'].includes(t)?'ash':['lavavaette','glodkaempe','surt'].includes(t)?'ember':['draugr','archer','minion','seidr','vogter','jarl'].includes(t)?'bone':['jotun','lindorm','frostvaette','lindyngel'].includes(t)?'ice':['gjenganger','gjenganger2','vaette','ildvaette','stenvaette','stenvaette2'].includes(t)?'ichor':'blood';}

// Snowfall around the camera
const SNOW_N=9000;
const snowGeo=new THREE.BufferGeometry(); const snowPos=new Float32Array(SNOW_N*3), snowSeed=new Float32Array(SNOW_N);
for(let i=0;i<SNOW_N;i++){snowPos[i*3]=rand(-40,40);snowPos[i*3+1]=rand(0,26);snowPos[i*3+2]=rand(-40,40);snowSeed[i]=Math.random();}
snowGeo.setAttribute('position',new THREE.BufferAttribute(snowPos,3));
const snow=new THREE.Points(snowGeo,new THREE.PointsMaterial({size:.13,map:softDot,transparent:true,opacity:.85,depthWrite:false,color:0xe8f1ff}));
snow.frustumCulled=false; scene.add(snow);
const NEAR_N=320; const nearGeo=new THREE.BufferGeometry(); const nearPos=new Float32Array(NEAR_N*3), nearSeed=new Float32Array(NEAR_N);
for(let i=0;i<NEAR_N;i++){nearPos[i*3]=rand(-7,7);nearPos[i*3+1]=rand(-5,5);nearPos[i*3+2]=rand(-7,7);nearSeed[i]=Math.random();}
nearGeo.setAttribute('position',new THREE.BufferAttribute(nearPos,3));
const nearSnow=new THREE.Points(nearGeo,new THREE.PointsMaterial({size:.32,map:softDot,transparent:true,opacity:.42,depthWrite:false,color:0xf2f6ff,fog:false}));
nearSnow.frustumCulled=false; scene.add(nearSnow);
let wind=0;
function updateSnow(dt,center,t){
  wind=Math.sin(t*.13)*2.2+Math.sin(t*.41)*1.2;
  for(let i=0;i<SNOW_N;i++){const s=snowSeed[i];let x=snowPos[i*3],y=snowPos[i*3+1],z=snowPos[i*3+2];
    y-=dt*(1.1+s*1.3); x+=dt*(wind+Math.sin(t*1.3+s*40)*.4); z+=dt*(Math.cos(t*.9+s*30)*.3+.4);
    if(y<0){y+=26;} const dx=x-center.x,dz=z-center.z; if(dx>40)x-=80;else if(dx<-40)x+=80; if(dz>40)z-=80;else if(dz<-40)z+=80;
    snowPos[i*3]=x;snowPos[i*3+1]=y+0;snowPos[i*3+2]=z;}
  snowGeo.attributes.position.needsUpdate=true;
  const cp=camera.position;
  for(let i=0;i<NEAR_N;i++){const sd=nearSeed[i];let x=nearPos[i*3],y=nearPos[i*3+1],z=nearPos[i*3+2];
    y-=dt*(.7+sd*.8);x+=dt*(wind*.8+Math.sin(t*1.7+sd*50)*.5);z+=dt*Math.cos(t*1.1+sd*20)*.4;
    if(y<-5)y+=10;if(x>7)x-=14;else if(x<-7)x+=14;if(z>7)z-=14;else if(z<-7)z+=14;nearPos[i*3]=x;nearPos[i*3+1]=y;nearPos[i*3+2]=z;}
  nearSnow.position.copy(cp); nearGeo.attributes.position.needsUpdate=true; nearSnow.visible=snow.visible&&!nearSnow.userData.off;
}
// Ground mist planes
const MIST=[]; {const mm=new THREE.MeshBasicMaterial({map:fogTex,transparent:true,opacity:.0,depthWrite:false,color:0xb9cbe0,fog:true});
  for(let i=0;i<34;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(14,14),mm.clone());m.rotation.x=-Math.PI/2;m.material.opacity=.22+Math.random()*.2;m.renderOrder=2;scene.add(m);MIST.push({m,ox:rand(-34,34),oz:rand(-34,34),sp:rand(.2,.6),rot:rand(-.05,.05),h:rand(.3,1.4)});}}
// Ravens circling
const RAVENS=[]; {const bm=new THREE.MeshStandardMaterial({color:0x0c0d10,roughness:.6,side:THREE.DoubleSide});
  for(let i=0;i<14;i++){const g=new THREE.Group();const body=new THREE.Mesh(new THREE.ConeGeometry(.12,.6,5),bm);body.rotation.z=-Math.PI/2;g.add(body);
    const wl=new THREE.Mesh(new THREE.PlaneGeometry(.35,.7),bm);wl.position.z=.35;const wr=wl.clone();wr.position.z=-.35;g.add(wl,wr);
    const c=[[1800,2300],[560,1200],[1800,500],[2850,1400],[1450,1850]][i%5];
    scene.add(g);RAVENS.push({g,wl,wr,cx:c[0]*S,cz:c[1]*S,r:rand(6,16),h:rand(12,22),sp:rand(.25,.5)*(Math.random()<.5?-1:1),ph:Math.random()*TAU});}}
