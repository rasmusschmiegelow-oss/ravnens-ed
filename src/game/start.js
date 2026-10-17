'use strict';
// Kicks off the render loop, waits for fonts and models, then shows the title screen.
G.camPos.set(1800*S+30,10,2300*S);G.camLook.set(1800*S,5,2300*S-8);
requestAnimationFrame(frame);
Promise.all([
  document.fonts?document.fonts.ready:Promise.resolve(),
  loadAll(f=>{$('loadTxt').textContent=`Ravnene samles … ${Math.round(f*100)} %`;}),
]).then(()=>{
  // redraw rune textures once the runic font is ready
  RS_MESH.forEach(m=>{m.mat.emissiveMap=runeTex('ᚱᚨᚢᚾ','#ffcf6a');m.mat.needsUpdate=true;});
  initNPCs(); buildWorldProps(); initCritters();
  start({});
}).catch(err=>{$('loadTxt').textContent='Spillets figurer kunne ikke indlæses ('+(err&&err.message||err)+'). Genindlæs siden.';});
