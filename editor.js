"use strict";
/* CutVault v1 — original browser video editor. All processing is local. */
const $=s=>document.querySelector(s);
const cv=$("#cv"), ctx=cv.getContext("2d");
const vid=$("#vid"), imgEl=$("#imgEl"), musEl=$("#musEl"), mus2El=$("#mus2El"), vid2=$("#vid2"), img2=$("#img2");
let media=new Map(), segments=[], texts=[];
let overlays=[], ovSeq=0, selOv=null;
let selSeg=null, selText=null, midSeq=0, segSeq=0, txtSeq=0;
let playing=false, curSeg=-1, segStartedAt=0, imgSegStart=0, exporting=false;
let audioCtx=null, vidGain=null, musGain=null, mus2Gain=null, streamDest=null, vidSrcNode=null, musSrcNode=null, mus2SrcNode=null;
let vidAnalyser=null, duckOn=false, duckCur=1, duckBuf=null;
const RATIOS={"16:9":[1280,720],"9:16":[720,1280],"1:1":[960,960],"4:5":[960,1200]};
const PRESETS={
 "None":"", "Cinematic":"contrast(1.12) saturate(1.15) brightness(0.98)",
 "Vivid":"saturate(1.55) contrast(1.08)", "Warm":"sepia(0.32) saturate(1.2) brightness(1.03)",
 "Cold":"saturate(0.85) hue-rotate(12deg) brightness(1.02)", "Mono":"grayscale(1) contrast(1.1)",
 "Vintage":"sepia(0.5) contrast(0.95) brightness(1.05)", "Fade":"brightness(1.1) contrast(0.82) saturate(0.75)",
 "Noir":"grayscale(1) contrast(1.35) brightness(0.92)",
 "Teal & Orange":"contrast(1.15) saturate(1.25) hue-rotate(-8deg)", "Golden Hour":"sepia(0.38) saturate(1.3) brightness(1.06) contrast(1.05)",
 "Pastel":"brightness(1.12) saturate(0.8) contrast(0.9)", "Dream":"brightness(1.08) saturate(1.1) contrast(0.92)",
 "Sharp Pop":"contrast(1.22) saturate(1.3)", "Moody":"brightness(0.9) contrast(1.2) saturate(0.8)",
 "Retro 70s":"sepia(0.55) saturate(1.2) hue-rotate(-8deg)", "Cross Process":"saturate(1.5) hue-rotate(14deg) contrast(1.1)",
 "Bleach":"saturate(0.55) contrast(1.2) brightness(1.06)", "Infrared":"hue-rotate(160deg) saturate(1.6)",
 "Duotone":"grayscale(0.7) sepia(0.4) hue-rotate(185deg) saturate(2.2)", "Sepia Tone":"sepia(0.8) contrast(1.02) brightness(1.02)"};
let curPreset="None";
let filterIntensity=1;
let pcCol={temp:0,tint:0,vib:0,fade:0};
let tlZoom=1;
let curTransition="none", letterbox=false;
const fmt=t=>{t=Math.max(0,t||0);const m=Math.floor(t/60),s=t-m*60;return m+":"+(s<10?"0":"")+s.toFixed(1)};
const segDur=s=>{const m=media.get(s.mediaId);if(!m)return 0;return m.type==="image"?s.dur:(s.out-s.in)/(s.speed||1)};
const progDur=()=>segments.reduce((a,s)=>a+segDur(s),0);
function segStart(i){let a=0;for(let k=0;k<i;k++)a+=segDur(segments[k]);return a}
function progTime(){if(curSeg<0)return 0;const s=segments[curSeg];if(!s)return 0;const m=media.get(s.mediaId);let off=0;
 if(m&&m.type==="image")off=(performance.now()-imgSegStart)/1000;
 else if(m)off=Math.max(0,(vid.currentTime-s.in)/(s.speed||1));
 return segStart(curSeg)+Math.min(off,segDur(s))}

/* ---------- media import ---------- */
const drop=$("#drop"), fileIn=$("#fileIn");
drop.onclick=()=>fileIn.click();
["dragover","dragenter"].forEach(e=>drop.addEventListener(e,ev=>{ev.preventDefault();drop.classList.add("over")}));
["dragleave","drop"].forEach(e=>drop.addEventListener(e,ev=>{ev.preventDefault();drop.classList.remove("over")}));
drop.addEventListener("drop",ev=>addFiles(ev.dataTransfer.files));
fileIn.onchange=()=>{addFiles(fileIn.files);fileIn.value=""};
function addFiles(files){
 for(const f of files){
  const kind=f.type.startsWith("video")?"video":f.type.startsWith("image")?"image":f.type.startsWith("audio")?"audio":null;
  if(!kind)continue;
  const id="m"+(++midSeq), url=URL.createObjectURL(f);
  const item={id,name:f.name,type:kind,url,duration:0,thumb:"",file:f};
  media.set(id,item);
  if(kind==="video"){const seg=addSegment(item,0);probeVideo(item,seg)}
  else if(kind==="image"){item.duration=0;item.thumb=url;addSegment(item,0)}
  else{refreshMusicSel()}
 }
 renderMedia(); renderTimeline();
}
function probeVideo(item,seg){
 const v=document.createElement("video");v.muted=true;v.src=item.url;v.preload="metadata";
 v.onloadedmetadata=()=>{item.duration=v.duration; if(seg&&!seg.out)seg.out=v.duration; renderTimeline();
  v.currentTime=Math.min(0.6,v.duration/2);
 };
 v.onseeked=()=>{try{const c=document.createElement("canvas");c.width=104;c.height=68;const x=c.getContext("2d");
   const r=v.videoWidth/v.videoHeight,cr=104/68;let w,h;if(r>cr){h=68;w=68*r}else{w=104;h=104/r}
   x.drawImage(v,(104-w)/2,(68-h)/2,w,h);item.thumb=c.toDataURL("image/jpeg",0.7)}catch(e){}
  renderTimeline();renderMedia()};
 v.onerror=()=>{renderTimeline();renderMedia()};
}
function addSegment(item,render){
 const s={id:"s"+(++segSeq),mediaId:item.id,in:0,out:item.type==="image"?3:item.duration||0,dur:3,speed:1};
 if(item.type==="image")s.dur=3;
 segments.push(s); if(selSeg===null)selSeg=s.id;
 if(render)renderTimeline();
 refreshMusicSel();
 return s;
}
function refreshMusicSel(){
 for(const id of ["#musicSel","#music2Sel"]){
  const sel=$(id); if(!sel)continue; const cur=sel.value; sel.innerHTML='<option value="">— none —</option>';
  for(const m of media.values()) if(m.type==="audio"){const o=document.createElement("option");o.value=m.id;o.textContent=m.name;sel.appendChild(o)}
  sel.value=[...sel.options].some(o=>o.value===cur)?cur:"";
 }
}
function renderMedia(){
 const list=$("#mediaList");list.innerHTML="";
 for(const m of media.values()){
  const d=document.createElement("div");d.className="media-item";
  d.innerHTML=`<img src="${m.thumb||""}" alt=""><div style="min-width:0"><div class="nm">${m.name.replace(/</g,"&lt;")}</div><div class="mt">${m.type}${m.duration?" · "+fmt(m.duration):""}</div></div>`;
  if(m.type!=="audio"){const b=document.createElement("button");b.textContent="＋ Timeline";b.onclick=()=>{segments.push({id:"s"+(++segSeq),mediaId:m.id,in:0,out:m.type==="image"?3:m.duration||0,dur:3,speed:1});renderTimeline();pushHistory()};d.appendChild(b);
   const pb=document.createElement("button");pb.textContent="＋ PiP";pb.title="Add as picture-in-picture overlay";pb.onclick=()=>addOverlay(m.id);d.appendChild(pb)}
  list.appendChild(d);
 }
 refreshMusicSel();
}
/* ---------- timeline ---------- */
function renderTimeline(){
 const tr=$("#tlTrack");tr.innerHTML="";
 if(!segments.length){tr.innerHTML='<div class="tl-empty">Your clips will appear here…</div>'}
 const total=Math.max(progDur(),0.1);
 segments.forEach((s,i)=>{const m=media.get(s.mediaId);if(!m)return;
  const d=document.createElement("div");d.className="seg"+(s.id===selSeg?" sel":"");
  d.style.width=Math.max(64,(segDur(s)/total)*560*tlZoom)+"px";
  d.innerHTML=`<img src="${m.thumb||""}" alt=""><div class="sg-d">${fmt(segDur(s))}${s.freeze?" ❄":""}${s.reverse?" ⏪":""}</div><div class="sg-t">${i+1}. ${m.name.replace(/</g,"&lt;")}${s.kf&&s.kf.on?" 🎞":""}${s.ramp&&s.ramp!=="none"?" 🌀":""}${s.track?" 🎯":""}</div>`;
  let pX0=null,pMoved=false;
  d.addEventListener("pointerdown",ev=>{pX0=ev.clientX;pMoved=false;try{d.setPointerCapture(ev.pointerId)}catch(e){}});
  d.addEventListener("pointermove",ev=>{if(pX0===null||ev.buttons!==1)return;const dx=ev.clientX-pX0;
   if(Math.abs(dx)>12)pMoved=true;
   if(pMoved){d.style.transform=`translateX(${dx}px)`;d.style.opacity="0.85";d.style.zIndex="5";d.style.position="relative"}});
  d.addEventListener("pointerup",ev=>{if(pX0===null)return;const dx=ev.clientX-pX0;pX0=null;
   d.style.transform="";d.style.opacity="";
   if(pMoved){let idx=segments.indexOf(s),target=idx,acc=dx;const chips=[...tr.querySelectorAll(".seg")];
    if(dx>0){for(let k=idx+1;k<segments.length;k++){const w=chips[k].offsetWidth+7;if(acc>w/2){target=k;acc-=w}else break}}
    else{for(let k=idx-1;k>=0;k--){const w=chips[k].offsetWidth+7;if(-acc>w/2){target=k;acc+=w}else break}}
    if(target!==idx){segments.splice(idx,1);segments.splice(target,0,s)}
    renderTimeline();pushHistory();ev.preventDefault()}
   pMoved=false});
  d.onclick=()=>{selSeg=s.id;renderTimeline();renderSegPanel();seekToSegment(i)};
  tr.appendChild(d)});
 $("#tDur").textContent=fmt(progDur());
 renderTextTrack(); renderSegPanel();
}
function renderTextTrack(){
 const el=$("#tlTexts");
 el.innerHTML=texts.length?("Text: "+texts.map(t=>`<span class="tx" data-t="${t.id}">${t.content.replace(/</g,"&lt;")} · ${fmt(t.start)}–${fmt(t.end)}</span>`).join("")):"";
 el.querySelectorAll(".tx").forEach(x=>x.onclick=()=>{selText=x.dataset.t;renderTextList()});
}
function renderSegPanel(){
 const p=$("#segPanel"), s=segments.find(x=>x.id===selSeg);
 if(!s){p.innerHTML='<p class="hint">Select a clip on the timeline to trim it.</p>';return}
 const m=media.get(s.mediaId);if(!m)return;
 if(m.type==="image"){
  p.innerHTML=`<div class="field"><label>Photo duration (seconds)</label><input type="number" id="spDur" min="0.5" max="30" step="0.5" value="${s.dur}" style="width:100%"></div>
  <div class="row"><button id="spLeft">← Move</button><button id="spRight">Move →</button></div>`+TF_HTML(s);
  $("#spDur").onchange=e=>{s.dur=Math.max(0.5,+e.target.value||3);renderTimeline();pushHistory()};
 }else{
  p.innerHTML=`
  <div class="slider-row"><span>Trim start</span><input type="range" id="spIn" min="0" max="${m.duration}" step="0.05" value="${s.in}"><output>${fmt(s.in)}</output></div>
  <div class="slider-row"><span>Trim end</span><input type="range" id="spOut" min="0" max="${m.duration}" step="0.05" value="${s.out}"><output>${fmt(s.out)}</output></div>
  <div class="field"><label>Speed</label><select id="spSpeed" style="width:100%">${[0.5,0.75,1,1.25,1.5,2].map(v=>`<option value="${v}" ${s.speed===v?"selected":""}>${v}×</option>`).join("")}</select></div>
  <div class="field"><label>Speed ramp (curve)</label><select id="spRamp" style="width:100%">
    ${[["none","None — constant speed"],["up","Ramp up · slow → fast"],["down","Ramp down · fast → slow"],["hero","Hero moment · fast → slow-mo → fast"],["slowmo","Smooth slow motion"]].map(([v,l])=>`<option value="${v}" ${(s.ramp||"none")===v?"selected":""}>${l}</option>`).join("")}
  </select></div>
  <div class="slider-row"><span>Volume</span><input type="range" id="spVol" min="0" max="100" value="${s.vol!=null?s.vol:100}"><output>${s.vol!=null?s.vol:100}%</output></div>
  <div class="row"><button id="spLeft">← Move</button><button id="spRight">Move →</button></div>`+TF_HTML(s);
  $("#spVol").oninput=e=>{s.vol=+e.target.value;e.target.nextElementSibling.textContent=s.vol+"%";const cs=segments[curSeg];if(cs&&cs.id===s.id)vid.volume=($("#videoVol").value/100)*(s.vol/100)};
  $("#spVol").onchange=()=>pushHistory();
  $("#spIn").oninput=e=>{s.in=Math.min(+e.target.value,s.out-0.1);e.target.nextElementSibling.textContent=fmt(s.in);$("#tDur").textContent=fmt(progDur());renderTimelineSoft()};
  $("#spOut").oninput=e=>{s.out=Math.max(+e.target.value,s.in+0.1);e.target.nextElementSibling.textContent=fmt(s.out);$("#tDur").textContent=fmt(progDur());renderTimelineSoft()};
  $("#spIn").onchange=()=>pushHistory(); $("#spOut").onchange=()=>pushHistory();
  $("#spSpeed").onchange=e=>{s.speed=+e.target.value;renderTimeline();pushHistory()};
  $("#spRamp").onchange=e=>{s.ramp=e.target.value;pushHistory();flashNow(s.ramp==="none"?"Speed ramp off":"Speed ramp set — press ▶ to feel it")};
 }
 const L=$("#spLeft"),R=$("#spRight"),i=segments.indexOf(s);
 if(L)L.onclick=()=>{if(i>0){[segments[i-1],segments[i]]=[segments[i],segments[i-1]];renderTimeline();pushHistory()}};
 if(R)R.onclick=()=>{if(i<segments.length-1){[segments[i+1],segments[i]]=[segments[i],segments[i+1]];renderTimeline();pushHistory()}};
 wireTF(s); wireSmart(s,p);
}
let softT=null;function renderTimelineSoft(){clearTimeout(softT);softT=setTimeout(renderTimeline,350)}
$("#splitBtn").onclick=()=>{
 const i=curSeg>=0?curSeg:segments.findIndex(x=>x.id===selSeg); if(i<0)return;
 const s=segments[i],m=media.get(s.mediaId); if(!m||m.type==="image")return;
 const pt=progTime(), off=pt-segStart(i); if(off<=0.05||off>=segDur(s)-0.05){flashNow("Move the playhead inside the selected clip to split it");return}
 const cut=s.in+off*(s.speed||1);
 const s2={id:"s"+(++segSeq),mediaId:s.mediaId,in:cut,out:s.out,dur:3,speed:s.speed,zoom:s.zoom,rot:s.rot,flip:s.flip,ox:s.ox,oy:s.oy};
 s.out=cut; segments.splice(i+1,0,s2); selSeg=s2.id; renderTimeline(); pushHistory(); flashNow("Clip split ✂");
};
$("#dupBtn").onclick=()=>{const s=segments.find(x=>x.id===selSeg);if(!s)return;const c={...s,id:"s"+(++segSeq)};segments.splice(segments.indexOf(s)+1,0,c);selSeg=c.id;renderTimeline();pushHistory()};
$("#delSegBtn").onclick=()=>{const i=segments.findIndex(x=>x.id===selSeg);if(i<0)return;segments.splice(i,1);selSeg=segments[Math.max(0,i-1)]?.id||null;stopPlayback();renderTimeline();pushHistory()};
function flashNow(t){$("#nowPlaying").textContent=t}

/* ---------- filters & settings ---------- */
const presetBox=$("#presets");
Object.keys(PRESETS).forEach(name=>{const b=document.createElement("button");b.className="preset"+(name===curPreset?" sel":"");b.textContent=name;
 b.onclick=()=>{curPreset=name;presetBox.querySelectorAll(".preset").forEach(x=>x.classList.toggle("sel",x.textContent===name));drawFrame()};presetBox.appendChild(b)});
function filterStr(){const adj=`brightness(${$("#adjB").value/100}) contrast(${$("#adjC").value/100}) saturate(${$("#adjS").value/100})`;
 let pro=""; const t=pcCol.temp;
 if(t>0)pro+=` sepia(${Math.min(0.4,t*0.004).toFixed(3)}) brightness(${(1+t*0.0004).toFixed(3)})`;
 else if(t<0)pro+=` hue-rotate(${(t*0.12).toFixed(1)}deg) saturate(${(1+t*0.001).toFixed(3)})`;
 if(pcCol.tint)pro+=` hue-rotate(${(pcCol.tint*0.15).toFixed(1)}deg)`;
 if(pcCol.vib)pro+=` saturate(${(1+pcCol.vib/100).toFixed(3)})`;
 if(pcCol.fade)pro+=` brightness(${(1+pcCol.fade*0.0012).toFixed(3)}) contrast(${(1-pcCol.fade*0.0022).toFixed(3)})`;
 return (PRESETS[curPreset]?PRESETS[curPreset]+" ":"")+adj+pro}
[["#adjB","#adjBO"],["#adjC","#adjCO"],["#adjS","#adjSO"]].forEach(([a,o])=>{$(a).oninput=e=>{$(o).textContent=e.target.value;drawFrame()}});
$("#ratioSel").onchange=e=>{const[w,h]=RATIOS[e.target.value];const f=+($("#resSel")?.value||1);cv.width=Math.round(w*f);cv.height=Math.round(h*f);drawFrame()};
$("#fitSel").onchange=()=>drawFrame();
$("#musicSel").onchange=e=>{const m=media.get(e.target.value);if(m){musEl.src=m.url;ensureAudio()}else{musEl.pause();musEl.removeAttribute("src")}};
$("#musicVol").oninput=e=>{$("#musicVolO").textContent=e.target.value;if(musGain)musGain.gain.value=e.target.value/100};
$("#music2Sel").onchange=e=>{const m=media.get(e.target.value);if(!m){mus2El.removeAttribute("src");mus2El.load();markDirty();return}ensureAudio();mus2El.src=m.url;markDirty()};
$("#music2Vol").oninput=e=>{$("#music2VolO").textContent=e.target.value;if(mus2Gain)mus2Gain.gain.value=e.target.value/100;markDirty()};
$("#music2Off").onchange=()=>markDirty();
const duckBtnEl=$("#duckBtn");
if(duckBtnEl)duckBtnEl.onclick=()=>{duckOn=!duckOn;duckBtnEl.textContent=duckOn?"🦆 Auto-duck music under speech: ON":"🦆 Auto-duck music under speech: OFF";pushHistory();markDirty()};
[["pcTemp","temp"],["pcTint","tint"],["pcVib","vib"],["pcFade","fade"]].forEach(([id,k])=>{
 const el=$("#"+id); if(!el)return;
 el.oninput=e=>{pcCol[k]=+e.target.value;$("#"+id+"O").textContent=e.target.value;drawFrame()};
 el.onchange=()=>{pushHistory();markDirty()};
});
[["fxVig","vig"],["fxGrain","grain"],["fxGlow","glow"],["fxLeak","leak"]].forEach(([id,k])=>{
 const el=$("#"+id); if(!el)return;
 el.oninput=e=>{postfx[k]=+e.target.value/100;$("#"+id+"O").textContent=e.target.value;drawFrame()};
 el.onchange=()=>{pushHistory();markDirty()};
});
const fxGl=$("#fxGlitch");
if(fxGl)fxGl.onclick=()=>{postfx.glitch=!postfx.glitch;fxGl.textContent=postfx.glitch?"📺 Glitch bursts: ON":"📺 Glitch bursts: OFF";drawFrame();pushHistory();markDirty()};
$("#videoVol").oninput=e=>{$("#videoVolO").textContent=e.target.value;vid.volume=e.target.value/100;if(vidGain)vidGain.gain.value=e.target.value/100};

/* ---------- text overlays ---------- */
$("#addTextBtn").onclick=()=>{
 const content=$("#newText").value.trim(); if(!content){flashNow("Type some text first");return}
 const t={id:"t"+(++txtSeq),content,start:+progTime().toFixed(2),end:+Math.min(progDur()||progTime()+3,progTime()+3).toFixed(2),size:64,color:"#ffffff",stroke:true,x:50,y:82};
 if(t.end<=t.start)t.end=t.start+1;
 texts.push(t); selText=t.id; $("#newText").value=""; renderTextTrack(); renderTextList(); drawFrame(); pushHistory();
};
function renderTextList(){
 const box=$("#textList");box.innerHTML=texts.length?"":'<p class="hint">No text yet. Texts appear on the video between their start and end times.</p>';
 texts.forEach(t=>{const d=document.createElement("div");d.className="text-item"+(t.id===selText?" sel":"");
  d.innerHTML=`<div class="field"><label>Text</label><input style="width:100%" value="${t.content.replace(/"/g,"&quot;")}" data-k="content"></div>
  <div class="row"><div class="field"><label>Start (s)</label><input type="number" step="0.1" min="0" value="${t.start}" data-k="start"></div>
  <div class="field"><label>End (s)</label><input type="number" step="0.1" min="0" value="${t.end}" data-k="end"></div></div>
  <div class="row"><div class="field"><label>Size</label><input type="number" min="20" max="140" value="${t.size}" data-k="size"></div>
  <div class="field"><label>Color</label><input type="color" value="${t.color}" data-k="color" style="width:100%;height:34px;padding:2px"></div></div>
  <div class="row"><div class="field"><label>↔ Position %</label><input type="number" min="0" max="100" value="${t.x}" data-k="x"></div>
  <div class="field"><label>↕ Position %</label><input type="number" min="0" max="100" value="${t.y}" data-k="y"></div></div>
  <div class="row"><div class="field"><label>Style</label><select data-k="style" style="width:100%">${["classic","gold","neon","box","highlight","outline","retro","block","cursive","type","grad","pop","thin","sticker"].map(v=>`<option value="${v}" ${(t.style||"classic")===v?"selected":""}>${v}</option>`).join("")}</select></div>
  <div class="field"><label>Animation</label><select data-k="anim" style="width:100%">${["none","fade","pop","slide","drop"].map(v=>`<option value="${v}" ${(t.anim||"none")===v?"selected":""}>${v}</option>`).join("")}</select></div></div>
  <button class="danger" style="width:100%">Delete text</button>`;
  d.onclick=()=>{selText=t.id;renderTextList();renderTextTrack()};
  d.querySelectorAll("input,select").forEach(inp=>{const upd=()=>{const k=inp.dataset.k;t[k]=["content","color","style","anim"].includes(k)?inp.value:+inp.value;renderTextTrack();drawFrame()};inp.oninput=upd;inp.onchange=()=>{upd();pushHistory()}});
  d.querySelector("button").onclick=e=>{e.stopPropagation();texts=texts.filter(x=>x.id!==t.id);renderTextList();renderTextTrack();drawFrame();pushHistory()};
  box.appendChild(d)});
}

/* ---------- playback engine ---------- */
let prevFrame=null;
function loadSegment(i,autoplay){
 if(i<0||i>=segments.length){stopPlayback();return}
 if(curSeg!==-1&&curSeg!==i&&(playing||exporting)){try{const fc=document.createElement("canvas");fc.width=cv.width;fc.height=cv.height;fc.getContext("2d").drawImage(cv,0,0);prevFrame=fc}catch(e){}}
 curSeg=i; const s=segments[i],m=media.get(s.mediaId); if(!m)return;
 selSeg=s.id; renderTimelineSoft();
 flashNow("▶ "+m.name);
 if(m.type==="image"){vid.pause();imgEl.src=m.url;imgSegStart=performance.now();if(playing)scheduleImageEnd(s)}
 else{imgEl.removeAttribute("src");
  if(vid.dataset.mid!==m.id){vid.src=m.url;vid.dataset.mid=m.id}
  vid.playbackRate=s.speed||1; vid.volume=($("#videoVol").value/100)*((s.vol!=null?s.vol:100)/100);
  const go=()=>{vid.currentTime=s.in; if(playing||autoplay)vid.play().catch(()=>{})};
  if(vid.readyState>=1)go(); else vid.onloadedmetadata=go;
 }
}
let imgTimer=null;
function scheduleImageEnd(s){clearTimeout(imgTimer);imgTimer=setTimeout(()=>{if(playing)nextSegment()},segDur(s)*1000)}
function nextSegment(){if(curSeg+1<segments.length){loadSegment(curSeg+1,true)}else{stopPlayback();if(exporting)finishExport()}}
function stopPlayback(){playing=false;$("#playBtn").textContent="▶";vid.pause();clearTimeout(imgTimer);if(!exporting){musEl.pause();mus2El.pause()}}
function seekToSegment(i){const wasPlaying=playing;loadSegment(i,wasPlaying);drawFrame()}
$("#playBtn").onclick=()=>{
 if(exporting)return;
 if(playing){stopPlayback();return}
 if(!segments.length){flashNow("Add a clip first");return}
 ensureAudio();
 playing=true;$("#playBtn").textContent="⏸";
 if(curSeg<0||curSeg>=segments.length)loadSegment(0,true); else {const s=segments[curSeg],m=media.get(s.mediaId);
   if(m&&m.type==="image"){imgSegStart=performance.now()-(progTime()-segStart(curSeg))*1000;scheduleImageEnd(s)} else vid.play().catch(()=>{})}
 if($("#musicSel").value){musEl.currentTime=progTime()% (musEl.duration||1); musEl.play().catch(()=>{})}
};
$("#restartBtn").onclick=()=>{if(!segments.length)return;const w=playing;stopPlayback();playing=w;$("#playBtn").textContent=w?"⏸":"▶";loadSegment(0,w);if(w&&$("#musicSel").value){musEl.currentTime=0;musEl.play().catch(()=>{})}};
vid.addEventListener("ended",()=>{if(playing)nextSegment()});
vid.addEventListener("timeupdate",()=>{const s=segments[curSeg];if(!s)return;const m=media.get(s.mediaId);
 if(m&&m.type!=="image"&&vid.currentTime>=s.out-0.03&&playing)nextSegment()});

/* ---------- drawing ---------- */
function drawFrame(){
 const W=cv.width,H=cv.height;ctx.fillStyle="#000";ctx.fillRect(0,0,W,H);
 const s=segments[curSeg],m=s?media.get(s.mediaId):null;
 if(m){
  const lt=s?(progTime()-segStart(curSeg)):0, ld=s?segDur(s):0;
  const zoomK=curTransition==="zoom"?(1+0.09*Math.max(0,1-lt/0.55)):curTransition==="zoomout"?(1-0.09*Math.max(0,1-lt/0.55)):1;
  const src=m.type==="image"?imgEl:vid;
  const ready=m.type==="image"?(imgEl.complete&&imgEl.naturalWidth):vid.readyState>=2;
  if(ready){
   const sw=m.type==="image"?imgEl.naturalWidth:vid.videoWidth, sh=m.type==="image"?imgEl.naturalHeight:vid.videoHeight;
   if(sw&&sh){
    const fit=$("#fitSel").value;
    const smartOn=(s.chroma&&s.chroma.on)||(s.cutout&&s.cutout.on);
    if(smartOn){ drawSmartFrame(src,sw,sh,s,W,H,fit) }
    else{
    if(fit==="fit"){ctx.save();ctx.filter="blur(28px) brightness(0.55)";const sc=Math.max(W/sw,H/sh);ctx.drawImage(src,(W-sw*sc)/2,(H-sh*sc)/2,sw*sc,sh*sc);ctx.restore()}
    const tp=Math.max(0,Math.min(1,lt/0.45));
    const blurPx=curTransition==="blur"?Math.round(16*(1-tp)):0;
    const slideX=curTransition==="slide"?(1-tp)*W*0.92:0;
    const slideYv=curTransition==="slideup"?(1-tp)*H*0.92:0;
    const spinA=curTransition==="spin"?-0.16*(1-tp):0;
    const spinS=curTransition==="spin"?(0.9+0.1*tp):1;
    const shk=curTransition==="shake"&&lt<0.32?1:0;
    const shX=shk?Math.sin(lt*310)*9*(1-lt/0.32):0, shY=shk?Math.cos(lt*270)*7*(1-lt/0.32):0;
    const clipped=(curTransition==="wipe"||curTransition==="iris");
    if(clipped){ctx.save();ctx.beginPath();
      if(curTransition==="wipe")ctx.rect(0,0,W*tp,H);
      else ctx.arc(W/2,H/2,Math.max(1,tp)*Math.hypot(W,H)/2,0,Math.PI*2);
      ctx.clip()}
    let Z=s.zoom||1, OX=s.ox||0, OY=s.oy||0, OP=1, ROT=0;
    if(s.kf&&s.kf.on&&ld>0){const p=Math.max(0,Math.min(1,lt/ld));const e=s.kf.ease==="smooth"?(p*p*(3-2*p)):p;
      const fo=s.kf.from.op!=null?s.kf.from.op:1, to2=s.kf.to.op!=null?s.kf.to.op:1;
      const fr=s.kf.from.rot||0, tr2=s.kf.to.rot||0;
      Z=s.kf.from.z+(s.kf.to.z-s.kf.from.z)*e; OX=s.kf.from.x+(s.kf.to.x-s.kf.from.x)*e; OY=s.kf.from.y+(s.kf.to.y-s.kf.from.y)*e;
      OP=fo+(to2-fo)*e; ROT=fr+(tr2-fr)*e;
      window.__kfDebug={z:+Z.toFixed(3),x:+OX.toFixed(1),y:+OY.toFixed(1),op:+OP.toFixed(2),rot:+ROT.toFixed(1)}}
    if(s.track&&trackPt)Z*=1.18;
    const doDraw=(alpha,useF)=>{
      ctx.save();ctx.globalAlpha=alpha*OP;if(useF)ctx.filter=filterStr()+(blurPx?` blur(${blurPx}px)`:"");
      let sc; if(fit==="fill")sc=Math.max(W/sw,H/sh); else sc=Math.min(W/sw,H/sh);
      sc*=zoomK*Z*spinS;
      const dw=sw*sc, dh=sh*sc;
      ctx.translate(W/2+(OX/100)*W+slideX+shX, H/2+(OY/100)*H+shY+slideYv);
      if(s.flip)ctx.scale(-1,1);
      if(s.track&&trackPt){const sx2=Math.max(-(dw-W)/2,Math.min((dw-W)/2,-(trackPt.x-0.5)*dw)), sy2=Math.max(-(dh-H)/2,Math.min((dh-H)/2,-(trackPt.y-0.5)*dh)); ctx.translate(sx2,sy2)}
      ctx.rotate((s.rot||0)*Math.PI/180+spinA+ROT*Math.PI/180);
      ctx.drawImage(src,-dw/2,-dh/2,dw,dh);ctx.restore();
    };
    if(filterIntensity<0.999){doDraw(1,false);doDraw(filterIntensity,true)}else{doDraw(1,true)}
    if(clipped)ctx.restore();
    }
    if(curTransition==="dip"&&ld>0.8){const a=Math.min(1,lt/0.35,(ld-lt)/0.35);if(a<1){ctx.fillStyle=`rgba(0,0,0,${(1-Math.max(a,0)).toFixed(3)})`;ctx.fillRect(0,0,W,H)}}
    if(curTransition==="flash"&&lt<0.28){ctx.fillStyle=`rgba(255,255,255,${(0.85*(1-lt/0.28)).toFixed(3)})`;ctx.fillRect(0,0,W,H)}
    if(curTransition==="fade"&&lt<0.45){ctx.fillStyle=`rgba(0,0,0,${(1-lt/0.45).toFixed(3)})`;ctx.fillRect(0,0,W,H)}
    if(curTransition==="cross"&&prevFrame&&lt<0.5&&prevFrame.width===W){ctx.save();ctx.globalAlpha=1-lt/0.5;ctx.drawImage(prevFrame,0,0,W,H);ctx.restore()}
   }
  }
 }
 const pt=progTime();
 drawOverlays(pt);
 applyPostFX();
 for(const t of texts){if(pt<t.start||pt>t.end)continue;
  const age=pt-t.start, remain=t.end-pt;
  let alpha=1, scaleK=1, yOff=0;
  if(t.anim==="fade"){alpha=Math.max(0,Math.min(1,age/0.3,remain/0.3))}
  else if(t.anim==="pop"){const p=Math.max(0,Math.min(1,age/0.32));scaleK=0.55+0.45*(1-Math.pow(1-p,3))}
  else if(t.anim==="slide"){const p=Math.max(0,Math.min(1,age/0.35));yOff=(1-p)*38;alpha=Math.min(1,Math.max(0,age)/0.2)}
  else if(t.anim==="drop"){const p=Math.max(0,Math.min(1,age/0.3));yOff=-(1-p)*(1-p)*70;alpha=Math.min(1,Math.max(0,age)/0.15)}
  ctx.save();ctx.globalAlpha=Math.max(0,Math.min(1,alpha));
  const fontFor=(f)=>`${t.style==="thin"?"300":t.style==="cursive"?"italic 700":"800"} ${f}px ${t.style==="cursive"?"'Segoe Script','Comic Sans MS',cursive":t.style==="type"?"'Courier New',monospace":"Inter,Arial,sans-serif"}`;
  let fs=t.size*(W/720);ctx.font=fontFor(fs);ctx.textAlign="center";ctx.textBaseline="middle";
  const mw0=ctx.measureText(t.content).width; if(mw0>W*0.92){fs=fs*(W*0.92)/mw0;ctx.font=fontFor(fs)}
  ctx.translate(W*t.x/100, H*t.y/100+yOff); if(scaleK!==1)ctx.scale(scaleK,scaleK);
  const mw=ctx.measureText(t.content).width, style=t.style||"classic";
  if(t.words&&t.words.length){
   const words=t.words, spaceW=ctx.measureText(" ").width;
   const widths=words.map(wd=>ctx.measureText(wd.w).width);
   const total=widths.reduce((a,b)=>a+b,0)+spaceW*(words.length-1);
   let cx2=-total/2;
   words.forEach((wd,wi)=>{ const wpx=widths[wi], cxw=cx2+wpx/2;
    const active=pt>=wd.s&&pt<wd.e, done=pt>=wd.e;
    if(active){ ctx.save(); ctx.fillStyle="#f5cd63"; ctx.beginPath(); ctx.roundRect(cx2-6,-fs*0.68,wpx+12,fs*1.36,fs*0.3); ctx.fill(); ctx.restore();
     ctx.fillStyle="#141414"; ctx.fillText(wd.w,cxw,0) }
    else { ctx.fillStyle=done?(t.color||"#ffffff"):"rgba(255,255,255,0.45)"; ctx.shadowColor="rgba(0,0,0,.5)"; ctx.shadowBlur=5; ctx.fillText(wd.w,cxw,0); ctx.shadowBlur=0 }
    cx2+=wpx+spaceW });
   ctx.restore(); continue }
  if(style==="box"||style==="highlight"||style==="sticker"){const pad=fs*0.32;ctx.fillStyle=style==="box"?"rgba(0,0,0,0.58)":style==="sticker"?"#ffffff":"#f5cd63";
   ctx.beginPath();ctx.roundRect(-mw/2-pad,-fs*0.72,mw+pad*2,fs*1.44,fs*0.28);ctx.fill()}
  if(style==="retro"||style==="pop"){ctx.save();ctx.shadowBlur=0;ctx.fillStyle=style==="retro"?"#e4572e":"#141414";ctx.fillText(t.content,fs*0.07,fs*0.08);ctx.restore()}
  if(style!=="neon"&&(t.stroke||style==="gold"||style==="outline"||style==="block"||style==="pop"||style==="retro")){ctx.lineWidth=style==="outline"?fs/7:style==="block"?fs/5.5:style==="pop"?fs/7:style==="retro"?fs/10:fs/9;ctx.strokeStyle=style==="gold"?"rgba(60,35,0,0.9)":style==="retro"?"#7c2d12":"rgba(0,0,0,0.88)";ctx.lineJoin="round";ctx.strokeText(t.content,0,0)}
  if(style!=="outline"){
   if(style==="grad"){const gr=ctx.createLinearGradient(0,-fs/2,0,fs/2);gr.addColorStop(0,"#f5cd63");gr.addColorStop(0.55,"#ff7ad9");gr.addColorStop(1,"#7d7aff");ctx.fillStyle=gr}
   else ctx.fillStyle=style==="gold"?"#f5cd63":style==="neon"?"#7df9ff":style==="highlight"?"#141414":style==="sticker"?"#141414":style==="retro"?"#ffe8c9":style==="block"?"#ffffff":t.color;
   ctx.shadowColor=style==="neon"?"#19c8e8":"rgba(0,0,0,.45)";ctx.shadowBlur=style==="neon"?26:style==="thin"?0:6;ctx.fillText(t.content,0,0)}
  ctx.restore()}
 if(!segments.length){
  ctx.save();ctx.fillStyle="#8b93a5";ctx.font="600 30px Inter,Arial";ctx.textAlign="center";
  ctx.fillText("Add media to start editing",W/2,H/2);ctx.restore()}
 if(letterbox){ctx.fillStyle="#000";ctx.fillRect(0,0,W,Math.round(H*0.11));ctx.fillRect(0,Math.round(H*0.89),W,Math.round(H*0.11))}
}
/* ----- post FX (whole-video layer, drawn after clips, before text) ----- */
let postfx={vig:0,grain:0,glow:0,leak:0,glitch:false};
const noiseCvs=document.createElement("canvas"); noiseCvs.width=noiseCvs.height=256;
{ const nx=noiseCvs.getContext("2d"); const im=nx.createImageData(256,256);
  for(let i=0;i<im.data.length;i+=4){const v=(Math.random()*255)|0;im.data[i]=im.data[i+1]=im.data[i+2]=v;im.data[i+3]=255}
  nx.putImageData(im,0,0) }
const fxCvs=document.createElement("canvas"), fxCtx=fxCvs.getContext("2d");
function applyPostFX(){
 const F=postfx; if(!F.vig&&!F.grain&&!F.glow&&!F.leak&&!F.glitch)return;
 const W=cv.width,H=cv.height;
 if(F.glow>0){ fxCvs.width=W;fxCvs.height=H; fxCtx.clearRect(0,0,W,H);
  fxCtx.filter=`blur(${Math.max(2,Math.round(14*F.glow))}px)`; fxCtx.drawImage(cv,0,0); fxCtx.filter="none";
  ctx.save(); ctx.globalCompositeOperation="screen"; ctx.globalAlpha=0.42*F.glow; ctx.drawImage(fxCvs,0,0); ctx.restore() }
 if(F.leak>0){ const t=performance.now()/1000; const lx=W*(0.78+0.06*Math.sin(t*0.35)), ly=H*0.10;
  const g=ctx.createRadialGradient(lx,ly,0,lx,ly,Math.max(W,H)*0.8);
  g.addColorStop(0,`rgba(255,170,66,${(0.5*F.leak).toFixed(3)})`); g.addColorStop(0.5,`rgba(255,90,60,${(0.18*F.leak).toFixed(3)})`); g.addColorStop(1,"rgba(255,80,40,0)");
  ctx.save(); ctx.globalCompositeOperation="screen"; ctx.fillStyle=g; ctx.fillRect(0,0,W,H); ctx.restore() }
 if(F.glitch){ const cyc=(performance.now()/1000)%2.7;
  if(cyc<0.16){ fxCvs.width=W;fxCvs.height=H; fxCtx.clearRect(0,0,W,H); fxCtx.drawImage(cv,0,0);
   for(let i=0;i<6;i++){ const y=(Math.random()*H)|0, h=8+((Math.random()*36)|0), dx=((Math.random()*36-18)|0);
    ctx.drawImage(fxCvs,0,y,W,h,dx,y,W,h) } } }
 if(F.grain>0){ ctx.save(); ctx.globalAlpha=0.16*F.grain; ctx.globalCompositeOperation="overlay";
  const pat=ctx.createPattern(noiseCvs,"repeat"); ctx.translate(-((Math.random()*256)|0),-((Math.random()*256)|0));
  ctx.fillStyle=pat; ctx.fillRect(0,0,W+256,H+256); ctx.restore() }
 if(F.vig>0){ const g=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.36,W/2,H/2,Math.max(W,H)*0.8);
  g.addColorStop(0,"rgba(0,0,0,0)"); g.addColorStop(1,`rgba(0,0,0,${(0.62*F.vig).toFixed(3)})`);
  ctx.save(); ctx.fillStyle=g; ctx.fillRect(0,0,W,H); ctx.restore() }
}
let musicFadeIn=0, musicFadeOut=0;
function loop(){
 $("#tCur").textContent=fmt(progTime());
 if(playing||exporting)drawFrame();
 if(playing||exporting){
  const s=segments[curSeg]; const m=s?media.get(s.mediaId):null;
  if(s&&m&&m.type!=="image"&&s.ramp&&s.ramp!=="none"&&vid.readyState>=1){
   const q=Math.max(0,Math.min(1,(vid.currentTime-s.in)/Math.max(0.1,s.out-s.in))); const b=s.speed||1; let r=b;
   if(s.ramp==="up")r=b*(0.4+1.7*q);
   else if(s.ramp==="down")r=b*(2.1-1.7*q);
   else if(s.ramp==="hero")r=b*(q<0.45?(1.9-3.4*q):(0.37+2.9*(q-0.45)));
   else if(s.ramp==="slowmo")r=b*0.45;
   vid.playbackRate=Math.max(0.12,Math.min(4,r));
  }
 }
 if(audioCtx){
  const pt2=progTime(), total2=progDur();
  let mf=1;
  if(musicFadeIn>0)mf=Math.min(mf,pt2/musicFadeIn);
  if(musicFadeOut>0&&total2>0)mf=Math.min(mf,Math.max(0,(total2-pt2)/musicFadeOut));
  if(musGain){ let dk=1;
   if(duckOn&&vidAnalyser){ if(!duckBuf||duckBuf.length!==vidAnalyser.frequencyBinCount)duckBuf=new Uint8Array(vidAnalyser.frequencyBinCount);
    vidAnalyser.getByteTimeDomainData(duckBuf); let sum=0,n=0; for(let i=0;i<duckBuf.length;i+=4){const v=(duckBuf[i]-128)/128; sum+=v*v; n++}
    dk=Math.sqrt(sum/Math.max(1,n))>0.03?0.3:1 }
   duckCur+=(dk-duckCur)*0.12;
   musGain.gain.value=($("#musicVol").value/100)*Math.max(0,Math.min(1,mf))*duckCur }
  if(vidGain){const cs=segments[curSeg];vidGain.gain.value=($("#videoVol").value/100)*((cs&&cs.vol!=null)?cs.vol/100:1)}
 }
 requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
vid.addEventListener("seeked",drawFrame); imgEl.onload=drawFrame;
renderTimeline(); renderTextList(); drawFrame();

/* ---------- audio graph (for export) ---------- */
function ensureAudio(){
 if(audioCtx)return;
 try{
  audioCtx=new (window.AudioContext||window.webkitAudioContext)();
  vidSrcNode=audioCtx.createMediaElementSource(vid); vidGain=audioCtx.createGain(); vidGain.gain.value=$("#videoVol").value/100;
  vidSrcNode.connect(vidGain); vidGain.connect(audioCtx.destination);
  vidAnalyser=audioCtx.createAnalyser(); vidAnalyser.fftSize=512; vidGain.connect(vidAnalyser);
  musSrcNode=audioCtx.createMediaElementSource(musEl); musGain=audioCtx.createGain(); musGain.gain.value=$("#musicVol").value/100;
  musSrcNode.connect(musGain); musGain.connect(audioCtx.destination);
  mus2SrcNode=audioCtx.createMediaElementSource(mus2El); mus2Gain=audioCtx.createGain(); mus2Gain.gain.value=$("#music2Vol").value/100;
  mus2SrcNode.connect(mus2Gain); mus2Gain.connect(audioCtx.destination);
  streamDest=audioCtx.createMediaStreamDestination();
  vidGain.connect(streamDest); musGain.connect(streamDest); mus2Gain.connect(streamDest);
 }catch(e){/* preview still works without the graph in most browsers */}
 if(audioCtx&&audioCtx.state==="suspended")audioCtx.resume();
}

/* ---------- export (real-time canvas recording) ---------- */
let recorder=null, chunks=[], expStart=0, expTimer=null;
$("#exportBtn").onclick=()=>{
 if(exporting)return;
 if(!segments.length){flashNow("Add at least one clip before exporting");return}
 if(typeof MediaRecorder==="undefined"){flashNow("Your browser does not support MediaRecorder export — try Chrome/Edge.");return}
 ensureAudio();
 exporting=true; chunks=[]; $("#expDone").innerHTML=""; $("#expProg").style.display="block"; $("#exportBtn").disabled=true;
 stopPlayback(); playing=true; $("#playBtn").textContent="⏸";
 const canvasStream=cv.captureStream(30);
 const tracks=[...canvasStream.getVideoTracks()];
 if(streamDest)tracks.push(...streamDest.stream.getAudioTracks());
 const mixed=new MediaStream(tracks);
 const mime=["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"].find(x=>{try{return MediaRecorder.isTypeSupported(x)}catch(e){return false}})||"";
 recorder=new MediaRecorder(mixed,mime?{mimeType:mime,videoBitsPerSecond:8_000_000}:undefined);
 recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
 recorder.onstop=finishExportBlob;
 expStart=performance.now();
 loadSegment(0,true);
 if($("#musicSel").value){musEl.currentTime=0;musEl.play().catch(()=>{})}
 recorder.start(250);
 const total=progDur();
 expTimer=setInterval(()=>{const done=Math.min(1,progTime()/Math.max(total,0.1));
   $("#expBar").style.width=(done*100).toFixed(1)+"%";
   $("#expLabel").textContent="Rendering… "+Math.round(done*100)+"% — "+fmt(progTime())+" / "+fmt(total);
   if(curSeg<0&&playing===false){/* ended via nextSegment */}
 },200);
 // safety: if playback stalls at the end, finish after total+2s of wall time at 1x segments
 setTimeout(()=>{if(exporting&&recorder&&recorder.state==="recording"){try{recorder.stop()}catch(e){}}},(total+4)*1000+8000);
};
function finishExport(){ if(recorder&&recorder.state==="recording"){try{recorder.stop()}catch(e){}} }
function finishExportBlob(){
 clearInterval(expTimer); exporting=false; playing=false; $("#playBtn").textContent="▶"; musEl.pause();
 $("#exportBtn").disabled=false;
 const blob=new Blob(chunks,{type:"video/webm"});
 window.__lastWebm=blob;
 const url=URL.createObjectURL(blob), mb=(blob.size/1048576).toFixed(2);
 $("#expBar").style.width="100%"; $("#expLabel").textContent="Export complete ✓";
 $("#expDone").innerHTML=`<div class="text-item"><b>Your video is ready</b> — ${mb} MB · WebM<div style="height:8px"></div>
  <video src="${url}" controls style="width:100%;border-radius:9px;background:#000"></video>
  <div style="height:8px"></div><a href="${url}" download="cutvault-export.webm"><button class="gold" style="width:100%">⬇ Download WebM</button></a>
  <div class="row" style="margin-top:9px"><select id="mp4Q"><option value="23">MP4 · Balanced</option><option value="18">MP4 · High quality</option><option value="28">MP4 · Small file</option></select>
  <button id="mp4Btn" class="gold">🎬 Convert to MP4</button></div>
  <p class="hint" id="mp4State" style="margin-top:7px">MP4 conversion runs on your device too (first time downloads a ~31 MB converter — needs internet once).</p>
  <div id="mp4Done"></div></div>`;
 recorder=null;
}

/* ---------- v2: templates, transitions, stickers, demo ---------- */
$("#transSel").onchange=e=>{curTransition=e.target.value;drawFrame()};
function setSelect(id,val){const el=$(id);el.value=val;el.dispatchEvent(new Event("change"))}
function setPreset(name){presetBox.querySelectorAll(".preset").forEach(b=>{if(b.textContent===name)b.click()})}
function mkTplText(content,o){const t={id:"t"+(++txtSeq),content,start:o.start||0,end:o.end||6,size:o.size||64,color:o.color||"#ffffff",stroke:true,x:o.x??50,y:o.y??82,anim:o.anim||"pop",style:o.style||"classic",tpl:true};texts.push(t);return t}
const TEMPLATES={
 reel:{ratio:"9:16",fit:"fit",preset:"Vivid",trans:"dip",texts:d=>[["YOUR HOOK HERE",{start:0,end:Math.min(3,d),size:88,y:13}],["Your caption — edit me",{start:0,end:d,size:52,y:85}]]},
 cine:{ratio:"16:9",fit:"fit",preset:"Cinematic",trans:"dip",letter:true,texts:d=>[["YOUR FILM TITLE",{start:0,end:Math.min(3.5,d),size:76,y:50}]]},
 product:{ratio:"4:5",fit:"fit",preset:"None",trans:"flash",texts:d=>[["PRODUCT NAME",{start:0,end:d,size:72,y:11}],["Only $19 🔥",{start:0,end:d,size:66,y:68,style:"gold",anim:"pop"}],["Link in bio 👇",{start:0.5,end:d,size:54,y:87,style:"box"}]]},
 vlog:{ratio:"9:16",fit:"fit",preset:"Warm",trans:"none",texts:d=>[["A day in my life ✨",{start:0,end:Math.min(3,d),size:60,y:10}],["Your Name",{start:0,end:d,size:46,x:34,y:79}]]},
 estate:{ratio:"9:16",fit:"fill",preset:"Cinematic",trans:"dip",texts:d=>[["Tangier · Sea view 🌊",{start:0,end:d,size:56,y:9}],["3 bed · 120 m²",{start:0,end:d,size:56,y:79}],["DM for the price",{start:0,end:d,size:54,y:88,color:"#f5cd63"}]]},
 quote:{ratio:"9:16",fit:"fit",preset:"Fade",trans:"fade",texts:d=>[["“ Your quote here ”",{start:0,end:d,size:62,y:44,style:"classic",anim:"fade"}],["— Author Name",{start:0.6,end:d,size:44,y:56,anim:"fade"}]]},
 news:{ratio:"16:9",fit:"fill",preset:"Sharp Pop",trans:"slide",texts:d=>[["BREAKING NEWS",{start:0,end:Math.min(3,d),size:64,y:12,style:"highlight",anim:"slide"}],["Your headline goes here",{start:0,end:d,size:56,y:86,style:"box"}]]},
 tutorial:{ratio:"9:16",fit:"fit",preset:"None",trans:"none",texts:d=>[["STEP 1",{start:0,end:Math.min(3,d),size:72,y:12,style:"gold"}],["Watch what I do 👇",{start:0,end:d,size:50,y:86,style:"box"}]]},
 beforeafter:{ratio:"9:16",fit:"fill",preset:"Vivid",trans:"wipe",texts:d=>[["BEFORE",{start:0,end:Math.max(1,d/2),size:70,y:14,anim:"slide"}],["AFTER ✨",{start:Math.max(1,d/2),end:d,size:70,y:14,style:"gold",anim:"pop"}]]},
 countdown:{ratio:"9:16",fit:"fit",preset:"Noir",trans:"zoom",texts:d=>[["3",{start:0,end:1,size:150,y:50,anim:"pop"}],["2",{start:1,end:2,size:150,y:50,anim:"pop"}],["1",{start:2,end:3,size:150,y:50,anim:"pop"}],["GO! 🚀",{start:3,end:d,size:96,y:50,style:"gold",anim:"pop"}]]},
 sale:{ratio:"9:16",fit:"fit",preset:"Vivid",trans:"flash",texts:d=>[["BIG SALE",{start:0,end:d,size:92,y:14,style:"gold"}],["-50% TODAY ONLY",{start:0,end:d,size:64,y:26,anim:"pop"}],["Shop now 👇",{start:0.5,end:d,size:54,y:88,style:"box"}]]},
 travel:{ratio:"9:16",fit:"fill",preset:"Golden Hour",trans:"fade",texts:d=>[["📍 City Name",{start:0,end:d,size:60,y:11,anim:"slide"}],["Save this trip ✈️",{start:0,end:d,size:50,y:87,style:"box"}]]},
 food:{ratio:"9:16",fit:"fill",preset:"Warm",trans:"dip",texts:d=>[["RECIPE NAME 🍔",{start:0,end:d,size:64,y:11}],["Full recipe in comments",{start:0,end:d,size:48,y:87,style:"box"}]]},
 fitness:{ratio:"9:16",fit:"fill",preset:"Sharp Pop",trans:"zoom",texts:d=>[["DAY 1 💪",{start:0,end:Math.min(3,d),size:76,y:12,style:"gold",anim:"pop"}],["No excuses.",{start:0,end:d,size:54,y:86}]]},
 gaming:{ratio:"16:9",fit:"fill",preset:"Teal & Orange",trans:"shake",texts:d=>[["INSANE PLAY 🎮",{start:0,end:Math.min(3,d),size:72,y:12,style:"neon",anim:"pop"}],["Follow for more",{start:0,end:d,size:50,y:88,style:"box"}]]},
 music:{ratio:"9:16",fit:"fit",preset:"Dream",trans:"fade",texts:d=>[["🎵 Track Title",{start:0,end:d,size:66,y:16,anim:"fade"}],["Artist Name",{start:0,end:d,size:50,y:25,anim:"fade"}],["Out now — link in bio",{start:1,end:d,size:48,y:87,style:"box"}]]},
 birthday:{ratio:"9:16",fit:"fit",preset:"Pastel",trans:"flash",texts:d=>[["🎂 Happy Birthday!",{start:0,end:d,size:74,y:16,style:"gold",anim:"pop"}],["Name · Age",{start:0,end:d,size:52,y:26,anim:"fade"}]]},
 business:{ratio:"16:9",fit:"fit",preset:"Cinematic",trans:"dip",texts:d=>[["COMPANY NAME",{start:0,end:d,size:70,y:14}],["Your slogan here",{start:0,end:d,size:50,y:24,anim:"fade"}],["📞 0600 000 000",{start:0,end:d,size:52,y:87,style:"box"}]]},
 minimal:{ratio:"9:16",fit:"fit",preset:"Fade",trans:"fade",texts:d=>[["less, but better.",{start:0,end:d,size:56,y:48,anim:"fade"}]]},
 podcast:{ratio:"16:9",fit:"fill",preset:"Moody",trans:"none",texts:d=>[["🎙 Podcast Name",{start:0,end:Math.min(3,d),size:58,y:11,style:"box",anim:"slide"}],["“The quote that hooks them…”",{start:0,end:d,size:52,y:85,style:"classic"}]]},
 wedding:{ratio:"9:16",fit:"fit",preset:"Pastel",trans:"fade",texts:d=>[["💍 Sara & Yassine",{start:0,end:d,size:70,y:44,style:"cursive",anim:"fade"}],["12 · 05 · 2026",{start:0.5,end:d,size:46,y:55,anim:"fade"}]]},
 motivation:{ratio:"9:16",fit:"fill",preset:"Noir",trans:"zoom",texts:d=>[["DISCIPLINE 🔥",{start:0,end:Math.min(3,d),size:80,y:14,style:"block",anim:"pop"}],["Day 47. Still going.",{start:0,end:d,size:50,y:86,style:"box"}]]},
 sports:{ratio:"16:9",fit:"fill",preset:"Sharp Pop",trans:"shake",texts:d=>[["GOAL! ⚽",{start:0,end:Math.min(2.5,d),size:96,y:16,style:"pop",anim:"pop"}],["Team 2 — 1 Rivals",{start:0,end:d,size:54,y:86,style:"box"}]]},
 tech:{ratio:"16:9",fit:"fill",preset:"Cross Process",trans:"slide",texts:d=>[["💻 Gadget Name",{start:0,end:Math.min(3,d),size:66,y:12,style:"type",anim:"slide"}],["Honest review in 60s",{start:0,end:d,size:50,y:87,style:"box"}]]},
 fashion:{ratio:"9:16",fit:"fit",preset:"Dream",trans:"fade",texts:d=>[["✨ New Drop",{start:0,end:Math.min(3,d),size:72,y:13,style:"grad",anim:"fade"}],["Shop the look 👇",{start:0,end:d,size:50,y:87,style:"sticker"}]]},
 education:{ratio:"9:16",fit:"fit",preset:"None",trans:"none",texts:d=>[["DID YOU KNOW? 📚",{start:0,end:Math.min(3,d),size:62,y:12,style:"highlight",anim:"slide"}],["The fact in one line",{start:0,end:d,size:50,y:86,style:"box"}]]},
 unboxing:{ratio:"9:16",fit:"fill",preset:"Vivid",trans:"zoom",texts:d=>[["UNBOXING 📦",{start:0,end:Math.min(2.5,d),size:84,y:13,style:"pop",anim:"pop"}],["Wait for the reveal…",{start:0,end:d,size:50,y:87,style:"box"}]]},
 storytime:{ratio:"9:16",fit:"fit",preset:"Vintage",trans:"fade",texts:d=>[["Story time 📖",{start:0,end:Math.min(3,d),size:64,y:12,style:"retro",anim:"fade"}],["Part 1 — it gets wild",{start:0,end:d,size:48,y:87}]]},
 challenge:{ratio:"9:16",fit:"fill",preset:"Teal & Orange",trans:"flash",texts:d=>[["🏆 CHALLENGE",{start:0,end:Math.min(3,d),size:80,y:13,style:"gold",anim:"pop"}],["Can you beat this?",{start:0,end:d,size:52,y:87,style:"box"}],["Try it & tag me",{start:1,end:d,size:46,y:79}]]},
 recap:{ratio:"9:16",fit:"fill",preset:"Cinematic",trans:"cross",texts:d=>[["⏪ RECAP",{start:0,end:Math.min(3,d),size:74,y:12,style:"block",anim:"slide"}],["Everything you missed",{start:0,end:d,size:50,y:87,style:"box"}]]},
 teaser:{ratio:"16:9",fit:"fill",preset:"Moody",trans:"dip",letter:true,texts:d=>[["👀 SOON",{start:0,end:d,size:88,y:50,style:"thin",anim:"fade"}]]},
 flashsale:{ratio:"9:16",fit:"fit",preset:"Sharp Pop",trans:"flash",texts:d=>[["⚡ FLASH SALE",{start:0,end:Math.min(3,d),size:82,y:13,style:"pop",anim:"pop"}],["-70% · 24h only",{start:0,end:d,size:62,y:24,style:"gold"}],["Link in bio 👇",{start:0.5,end:d,size:52,y:88,style:"box"}]]}
};
function applyTemplate(name){
 document.querySelectorAll(".tplchip").forEach(c=>c.classList.toggle("sel",c.dataset.tpl===name));
 texts=texts.filter(t=>!t.tpl); letterbox=false;
 if(name==="none"){renderTextTrack();renderTextList();drawFrame();flashNow("Template cleared");return}
 const T=TEMPLATES[name]; if(!T)return;
 const d=Math.max(progDur(),6);
 setSelect("#ratioSel",T.ratio); setSelect("#fitSel",T.fit); setPreset(T.preset);
 curTransition=T.trans; $("#transSel").value=T.trans;
 letterbox=!!T.letter;
 T.texts(d).forEach(([c,o])=>mkTplText(c,o));
 renderTextTrack(); renderTextList(); drawFrame(); pushHistory();
 flashNow("Template applied ✓ — tap the gold texts on the right to make them yours");
 if(window.innerWidth<=980)document.querySelector(".stage").scrollIntoView({behavior:"smooth"});
}
document.querySelectorAll(".tplchip").forEach(c=>c.onclick=()=>applyTemplate(c.dataset.tpl));
document.querySelectorAll("#stickers button").forEach(b=>b.onclick=()=>{
 const t={id:"t"+(++txtSeq),content:b.textContent,start:+progTime().toFixed(2),end:+Math.min((progDur()||progTime()+2),progTime()+2).toFixed(2),size:96,color:"#ffffff",stroke:false,x:50,y:45};
 if(t.end<=t.start)t.end=t.start+1;
 texts.push(t); selText=t.id; renderTextTrack(); renderTextList(); drawFrame(); pushHistory();
});
/* demo project — hosted sample files, zero uploads needed */
function addUrlMedia(name,type,url){
 const id="m"+(++midSeq); const item={id,name,type,url,duration:0,thumb:""}; media.set(id,item);
 if(type==="video"){const seg=addSegment(item,0);probeVideo(item,seg)}
 renderMedia(); renderTimeline(); return item;
}
$("#demoBtn").onclick=()=>{
 if([...media.values()].some(m=>m.name==="demo.mp4")){flashNow("Demo already loaded — press ▶");return}
 const v=addUrlMedia("demo.mp4","video","assets/demo.mp4");
 const mu=addUrlMedia("demo-music.mp3","audio","assets/demo-music.mp3");
 setTimeout(()=>{ $("#musicSel").value=mu.id; musEl.src=mu.url;
   applyTemplate("reel");
   document.querySelector(".stage").scrollIntoView({behavior:"smooth"});
   flashNow("Demo loaded ✓ — press ▶ Play, then Export");
 },900);
};
fileIn.addEventListener("change",()=>{if(window.innerWidth<=980)setTimeout(()=>document.querySelector(".stage").scrollIntoView({behavior:"smooth"}),700)});

/* ---------- v3: bottom sheets, quick captions, PWA ---------- */
const sheets={}; document.querySelectorAll(".sheet").forEach(sh=>sheets[sh.id.replace("sheet-","")]=sh);
function closeSheets(){Object.values(sheets).forEach(s=>s.classList.remove("open"));document.querySelectorAll(".tool").forEach(t=>t.classList.remove("on"))}
document.querySelectorAll(".tool").forEach(btn=>btn.onclick=()=>{
 const key=btn.dataset.sheet, sh=sheets[key]; if(!sh)return;
 const was=sh.classList.contains("open"); closeSheets();
 if(!was){sh.classList.add("open");btn.classList.add("on")}
});
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=closeSheets);
const demo2=$("#demoBtn2"); if(demo2)demo2.onclick=()=>{closeSheets();$("#demoBtn").click()};
$("#capBtn").onclick=()=>{
 const lines=$("#capLines").value.split("\n").map(x=>x.trim()).filter(Boolean);
 if(!lines.length){flashNow("Type caption lines first");return}
 let t0=Math.max(0,progTime());
 lines.forEach((ln,i)=>{texts.push({id:"t"+(++txtSeq),content:ln,start:+(t0+i*2.5).toFixed(2),end:+(t0+(i+1)*2.5).toFixed(2),size:54,color:"#ffffff",stroke:true,x:50,y:88})});
 $("#capLines").value=""; renderTextTrack(); renderTextList(); drawFrame(); pushHistory();
 flashNow(lines.length+" captions added ✓ — they burn into the export");
};
if("serviceWorker" in navigator){window.addEventListener("load",()=>{navigator.serviceWorker.register("sw.js").catch(()=>{})})}
let deferredInstall=null;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e;$("#installBtn").style.display=""});
$("#installBtn").onclick=async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$("#installBtn").style.display="none"};

/* ---------- v4 · Phase A: transforms, overlays, undo/redo, autosave, MP4 ---------- */
function TF_HTML(s){return `<div class="sub" style="margin-top:14px">Transform</div>
 <div class="slider-row"><span>Zoom</span><input type="range" id="spZoom" min="50" max="250" step="5" value="${Math.round((s.zoom||1)*100)}"><output>${Math.round((s.zoom||1)*100)}%</output></div>
 <div class="slider-row"><span>Move ↔</span><input type="range" id="spOx" min="-50" max="50" step="1" value="${s.ox||0}"><output>${s.ox||0}</output></div>
 <div class="slider-row"><span>Move ↕</span><input type="range" id="spOy" min="-50" max="50" step="1" value="${s.oy||0}"><output>${s.oy||0}</output></div>
 <div class="row"><button id="spFlip">${s.flip?"↔ Flipped ✓":"↔ Flip"}</button>
 <select id="spRot"><option value="0">Rotate 0°</option><option value="90">Rotate 90°</option><option value="180">Rotate 180°</option><option value="270">Rotate 270°</option></select></div>
 <div class="sub" style="margin-top:14px">🎞 Keyframe animation</div>
 ${s.kf&&s.kf.on?`
 <div class="row"><button data-kf="zoomin">🔍 Zoom in</button><button data-kf="zoomout">🔎 Zoom out</button></div>
 <div class="row" style="margin-top:7px"><button data-kf="panl">⬅ Pan left</button><button data-kf="panr">Pan right ➡</button></div>
 <div class="slider-row"><span>End zoom</span><input type="range" id="kfZ" min="50" max="300" step="5" value="${Math.round(s.kf.to.z*100)}"><output>${Math.round(s.kf.to.z*100)}%</output></div>
 <div class="slider-row"><span>End ↔</span><input type="range" id="kfX" min="-50" max="50" value="${s.kf.to.x}"><output>${s.kf.to.x}</output></div>
 <div class="slider-row"><span>End ↕</span><input type="range" id="kfY" min="-50" max="50" value="${s.kf.to.y}"><output>${s.kf.to.y}</output></div>
 <div class="slider-row"><span>End opacity</span><input type="range" id="kfO" min="5" max="100" step="5" value="${Math.round((s.kf.to.op!=null?s.kf.to.op:1)*100)}"><output>${Math.round((s.kf.to.op!=null?s.kf.to.op:1)*100)}%</output></div>
 <div class="slider-row"><span>End rotation</span><input type="range" id="kfR" min="-180" max="180" step="5" value="${s.kf.to.rot||0}"><output>${s.kf.to.rot||0}°</output></div>
 <div class="row"><select id="kfEase"><option value="linear">Linear motion</option><option value="smooth" ${s.kf.ease==="smooth"?"selected":""}>Smooth ease</option></select>
 <button id="kfOff">Disable</button></div>
 <p class="hint">Animates from the Transform above (start) to these end values, across the whole clip.</p>`
 :`<button id="kfOn" style="width:100%">＋ Animate this clip (zoom / pan over time)</button>`}`}
function wireTF(s){
 const z=$("#spZoom"),ox=$("#spOx"),oy=$("#spOy"),fl=$("#spFlip"),ro=$("#spRot");
 if(!z)return;
 ro.value=String(s.rot||0);
 z.oninput=e=>{s.zoom=+e.target.value/100;e.target.nextElementSibling.textContent=e.target.value+"%";drawFrame()};
 ox.oninput=e=>{s.ox=+e.target.value;e.target.nextElementSibling.textContent=e.target.value;drawFrame()};
 oy.oninput=e=>{s.oy=+e.target.value;e.target.nextElementSibling.textContent=e.target.value;drawFrame()};
 z.onchange=ox.onchange=oy.onchange=()=>pushHistory();
 fl.onclick=()=>{s.flip=!s.flip;renderSegPanel();drawFrame();pushHistory()};
 ro.onchange=e=>{s.rot=+e.target.value;drawFrame();pushHistory()};
 wireKF(s);
}
function wireKF(s){
 const on=$("#kfOn");
 if(on){on.onclick=()=>{s.kf={on:true,ease:"smooth",from:{z:s.zoom||1,x:s.ox||0,y:s.oy||0,op:1,rot:s.rot||0},to:{z:1.6,x:0,y:0,op:1,rot:s.rot||0}};renderSegPanel();drawFrame();pushHistory()};return}
 const off=$("#kfOff"); if(off)off.onclick=()=>{s.kf.on=false;renderSegPanel();drawFrame();pushHistory()};
 document.querySelectorAll("[data-kf]").forEach(b=>b.onclick=()=>{const k=b.dataset.kf;
  if(k==="zoomin")s.kf.to={z:1.8,x:s.kf.from.x,y:s.kf.from.y};
  if(k==="zoomout"){s.kf.from={z:1.8,x:s.kf.from.x,y:s.kf.from.y};s.kf.to={z:1,x:0,y:0}}
  if(k==="panl")s.kf.to={z:s.kf.to.z,x:-22,y:s.kf.from.y};
  if(k==="panr")s.kf.to={z:s.kf.to.z,x:22,y:s.kf.from.y};
  renderSegPanel();drawFrame();pushHistory()});
 const kz=$("#kfZ"),kx2=$("#kfX"),ky=$("#kfY"),ke=$("#kfEase"),ko=$("#kfO"),kr=$("#kfR");
 if(kz){kz.oninput=e=>{s.kf.to.z=+e.target.value/100;e.target.nextElementSibling.textContent=e.target.value+"%";drawFrame()};
  kx2.oninput=e=>{s.kf.to.x=+e.target.value;e.target.nextElementSibling.textContent=e.target.value;drawFrame()};
  ky.oninput=e=>{s.kf.to.y=+e.target.value;e.target.nextElementSibling.textContent=e.target.value;drawFrame()};
  if(ko)ko.oninput=e=>{s.kf.to.op=+e.target.value/100;e.target.nextElementSibling.textContent=e.target.value+"%";drawFrame()};
  if(kr)kr.oninput=e=>{s.kf.to.rot=+e.target.value;e.target.nextElementSibling.textContent=e.target.value+"°";drawFrame()};
  kz.onchange=kx2.onchange=ky.onchange=()=>pushHistory();
  if(ko)ko.onchange=()=>pushHistory(); if(kr)kr.onchange=()=>pushHistory();
  ke.onchange=e=>{s.kf.ease=e.target.value;pushHistory()}}
}
/* ----- overlays (picture-in-picture) ----- */
function addOverlay(mediaId){
 const m=media.get(mediaId); if(!m)return;
 const ov={id:"o"+(++ovSeq),mediaId,start:+progTime().toFixed(2),dur:m.type==="image"?3:Math.min(5,m.duration||3),x:74,y:24,scale:34};
 overlays.push(ov); selOv=ov.id; renderOverlays(); renderOvPanel(); pushHistory();
 flashNow("Overlay added — open Edit ✂️ to position it, or tap its bar above the timeline");
 drawFrame();
}
function drawOverlays(pt){
 let vidUsed=false;
 for(const ov of overlays){
  if(pt<ov.start||pt>ov.start+ov.dur)continue;
  const m=media.get(ov.mediaId); if(!m)continue;
  let src=null,sw=0,sh=0;
  if(m.type==="image"){ if(img2.dataset.mid!==m.id){img2.src=m.url;img2.dataset.mid=m.id} if(img2.complete&&img2.naturalWidth){src=img2;sw=img2.naturalWidth;sh=img2.naturalHeight} }
  else if(m.type==="video"&&!vidUsed){ vidUsed=true; if(vid2.dataset.mid!==m.id){vid2.src=m.url;vid2.dataset.mid=m.id} if(vid2.readyState>=2){src=vid2;sw=vid2.videoWidth;sh=vid2.videoHeight} }
  if(!src||!sw)continue;
  const w=cv.width*(ov.scale/100), h=w*sh/sw;
  ctx.save(); ctx.shadowColor="rgba(0,0,0,.5)"; ctx.shadowBlur=12;
  ctx.drawImage(src, cv.width*ov.x/100-w/2, cv.height*ov.y/100-h/2, w, h); ctx.restore();
 }
}
function renderOverlays(){
 const wrap=$("#ovTrackWrap"), tr=$("#tlOverlay"); if(!wrap)return;
 wrap.style.display=overlays.length?"":"none"; tr.innerHTML="";
 const total=Math.max(progDur(),0.1);
 overlays.forEach(ov=>{const m=media.get(ov.mediaId);if(!m)return;
  const d=document.createElement("div");d.className="seg"+(ov.id===selOv?" sel":"");
  d.style.width=Math.max(64,(ov.dur/total)*560*tlZoom)+"px";d.style.minHeight="40px";
  d.innerHTML=`<img src="${m.thumb||""}" alt="" style="height:24px"><div class="sg-d">${fmt(ov.start)} +${fmt(ov.dur)}</div><div class="sg-t">PiP · ${m.name.replace(/</g,"&lt;")}</div>`;
  d.onclick=()=>{selOv=ov.id;renderOverlays();renderOvPanel();
    document.querySelectorAll(".tool").forEach(t=>t.classList.remove("on")); closeSheets();
    const sh=$("#sheet-edit"); sh.classList.add("open"); document.querySelector('.tool[data-sheet="edit"]').classList.add("on")};
  tr.appendChild(d)});
}
function renderOvPanel(){
 const p=$("#ovPanel"); if(!p)return;
 const ov=overlays.find(o=>o.id===selOv);
 if(!ov){p.innerHTML='<p class="hint">Tap an overlay bar on the overlay track to edit it.</p>';return}
 const m=media.get(ov.mediaId);
 p.innerHTML=`<p class="hint" style="margin-bottom:8px">Selected: <b>${m?m.name.replace(/</g,"&lt;"):""}</b> (overlay sound is muted)</p>
 <div class="slider-row"><span>Size</span><input type="range" id="ovScale" min="10" max="85" value="${ov.scale}"><output>${ov.scale}%</output></div>
 <div class="slider-row"><span>Position ↔</span><input type="range" id="ovX" min="5" max="95" value="${ov.x}"><output>${ov.x}</output></div>
 <div class="slider-row"><span>Position ↕</span><input type="range" id="ovY" min="5" max="95" value="${ov.y}"><output>${ov.y}</output></div>
 <div class="row"><div class="field"><label>Start (s)</label><input type="number" id="ovStart" step="0.1" min="0" value="${ov.start}"></div>
 <div class="field"><label>Duration (s)</label><input type="number" id="ovDur" step="0.1" min="0.3" value="${ov.dur}"></div></div>
 <button class="danger" id="ovDel" style="width:100%">🗑 Delete overlay</button>`;
 $("#ovScale").oninput=e=>{ov.scale=+e.target.value;e.target.nextElementSibling.textContent=ov.scale+"%";drawFrame()};
 $("#ovX").oninput=e=>{ov.x=+e.target.value;e.target.nextElementSibling.textContent=ov.x;drawFrame()};
 $("#ovY").oninput=e=>{ov.y=+e.target.value;e.target.nextElementSibling.textContent=ov.y;drawFrame()};
 ["#ovScale","#ovX","#ovY"].forEach(id=>{$(id).onchange=()=>{renderOverlays();pushHistory()}});
 $("#ovStart").onchange=e=>{ov.start=Math.max(0,+e.target.value||0);renderOverlays();pushHistory()};
 $("#ovDur").onchange=e=>{ov.dur=Math.max(0.3,+e.target.value||1);renderOverlays();pushHistory()};
 $("#ovDel").onclick=()=>{overlays=overlays.filter(o=>o.id!==ov.id);selOv=null;renderOverlays();renderOvPanel();drawFrame();pushHistory()};
}
/* overlay video sync */
setInterval(()=>{
 const pt=progTime();
 // second audio track: start-at-offset gating
 const m2id=$("#music2Sel")?$("#music2Sel").value:""; const off2=+($("#music2Off")&&$("#music2Off").value||0);
 if(m2id&&(playing||exporting)){
  if(pt>=off2){ if(mus2El.paused){ try{mus2El.currentTime=(pt-off2)%(mus2El.duration||1)}catch(e){} mus2El.play().catch(()=>{}) } }
  else if(!mus2El.paused)mus2El.pause();
 } else if(!mus2El.paused&&!playing&&!exporting)mus2El.pause();
 const ov=overlays.find(o=>pt>=o.start&&pt<=o.start+o.dur&&media.get(o.mediaId)?.type==="video");
 if(!ov){if(!vid2.paused)vid2.pause();return}
 const m=media.get(ov.mediaId); if(!m)return;
 if(vid2.dataset.mid!==m.id){vid2.src=m.url;vid2.dataset.mid=m.id}
 const want=Math.min(pt-ov.start, Math.max(0,(m.duration||ov.dur)-0.05));
 if(Math.abs(vid2.currentTime-want)>0.45){try{vid2.currentTime=want}catch(e){}}
 if(playing||exporting){if(vid2.paused)vid2.play().catch(()=>{})}
 else if(!vid2.paused)vid2.pause();
},220);
vid2.addEventListener("seeked",()=>{if(!playing&&!exporting)drawFrame()});
$("#tlZoomIn").onclick=()=>{tlZoom=Math.min(3,tlZoom*1.3);renderTimeline();renderOverlays()};
$("#tlZoomOut").onclick=()=>{tlZoom=Math.max(0.6,tlZoom/1.3);renderTimeline();renderOverlays()};
/* ----- undo / redo ----- */
let hist=[], histIdx=-1, histLock=false;
function snapshotState(){return JSON.stringify({segments,texts,overlays,selSeg,
 ratio:$("#ratioSel").value,fit:$("#fitSel").value,res:$("#resSel")?.value||"1",
 preset:curPreset,trans:curTransition,letterbox,music:$("#musicSel").value,
 int:filterIntensity,fi:musicFadeIn,fo:musicFadeOut,
 adj:[$("#adjB").value,$("#adjC").value,$("#adjS").value],
 pc:[pcCol.temp,pcCol.tint,pcCol.vib,pcCol.fade],
 m2:{sel:$("#music2Sel").value,vol:+$("#music2Vol").value,off:+($("#music2Off").value||0)},
 fx:[postfx.vig,postfx.grain,postfx.glow,postfx.leak,postfx.glitch?1:0],duck:duckOn?1:0})}
function pushHistory(){
 if(histLock)return;
 const s=snapshotState();
 if(hist[histIdx]===s)return;
 hist=hist.slice(0,histIdx+1); hist.push(s); if(hist.length>60)hist.shift();
 histIdx=hist.length-1; updateUndoBtns(); markDirty();
}
function applySnapshot(s){
 histLock=true;
 try{const o=JSON.parse(s);
  segments=o.segments||[]; texts=o.texts||[]; overlays=o.overlays||[]; selSeg=o.selSeg; selOv=null;
  if(o.ratio){$("#ratioSel").value=o.ratio;const[w,h]=RATIOS[o.ratio];const f=+(o.res||1);$("#resSel").value=String(o.res||"1");cv.width=Math.round(w*f);cv.height=Math.round(h*f)}
  if(o.fit)$("#fitSel").value=o.fit;
  curTransition=o.trans||"none"; $("#transSel").value=curTransition; letterbox=!!o.letterbox;
  if(o.preset)setPreset(o.preset);
  if(o.int!=null){filterIntensity=o.int;const ir=$("#intRange");if(ir){ir.value=Math.round(o.int*100);$("#intRangeO").textContent=Math.round(o.int*100)+"%"}}
  musicFadeIn=o.fi||0; musicFadeOut=o.fo||0;
  const fiEl=$("#fadeInS"),foEl=$("#fadeOutS"); if(fiEl)fiEl.value=musicFadeIn; if(foEl)foEl.value=musicFadeOut;
  if(o.adj){["#adjB","#adjC","#adjS"].forEach((id,i)=>{$(id).value=o.adj[i]});["#adjBO","#adjCO","#adjSO"].forEach((id,i)=>{$(id).textContent=o.adj[i]})}
  if(o.pc){pcCol={temp:o.pc[0],tint:o.pc[1],vib:o.pc[2],fade:o.pc[3]};["#pcTemp","#pcTint","#pcVib","#pcFade"].forEach((id,i)=>{$(id).value=o.pc[i];$(id+"O").textContent=o.pc[i]})}
  if(o.m2){$("#music2Sel").value=o.m2.sel||"";$("#music2Sel").dispatchEvent(new Event("change"));$("#music2Vol").value=o.m2.vol!=null?o.m2.vol:80;$("#music2VolO").textContent=$("#music2Vol").value;$("#music2Off").value=o.m2.off||0}
  if(o.fx){postfx={vig:o.fx[0],grain:o.fx[1],glow:o.fx[2],leak:o.fx[3],glitch:!!o.fx[4]};
   ["#fxVig","#fxGrain","#fxGlow","#fxLeak"].forEach((id,i)=>{$(id).value=Math.round(o.fx[i]*100);$(id+"O").textContent=Math.round(o.fx[i]*100)});
   $("#fxGlitch").textContent=postfx.glitch?"📺 Glitch bursts: ON":"📺 Glitch bursts: OFF"}
  if(o.duck!=null){duckOn=!!o.duck;const db=$("#duckBtn");if(db)db.textContent=duckOn?"🦆 Auto-duck music under speech: ON":"🦆 Auto-duck music under speech: OFF"}
  stopPlayback(); curSeg=-1;
  renderTimeline(); renderTextList(); renderOverlays(); renderOvPanel(); drawFrame();
 }catch(e){}
 histLock=false; updateUndoBtns(); markDirty();
}
function updateUndoBtns(){$("#undoBtn").disabled=histIdx<=0;$("#redoBtn").disabled=histIdx>=hist.length-1}
$("#undoBtn").onclick=()=>{if(histIdx>0){histIdx--;applySnapshot(hist[histIdx])}};
$("#redoBtn").onclick=()=>{if(histIdx<hist.length-1){histIdx++;applySnapshot(hist[histIdx])}};
/* ----- autosave on device (IndexedDB) ----- */
let idbP=null, saveTimer=null;
function idb(){ if(idbP)return idbP;
 idbP=new Promise((res,rej)=>{const r=indexedDB.open("cutvault-db",1);
  r.onupgradeneeded=()=>{r.result.createObjectStore("files");r.result.createObjectStore("state")};
  r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error)}); return idbP}
function markDirty(){const el=$("#saveState"); if(el)el.textContent="● Saving…";
 clearTimeout(saveTimer); saveTimer=setTimeout(saveProject,2200)}
function saveProject(){return saveProjectTo("project")}
async function saveProjectTo(key,slotName){
 if(!segments.length&&!texts.length&&!overlays.length&&!media.size)return; /* never overwrite a saved project with an empty state */
 try{ const d=await idb(); const tx=d.transaction(["files","state"],"readwrite");
  const fs=tx.objectStore("files");
  fs.clear();
  for(const m of media.values()){
   if(m.file)fs.put({file:m.file,name:m.name,type:m.type,thumb:m.thumb||""},m.id);
   else if(m.url&&!m.url.startsWith("blob:"))fs.put({url:m.url,name:m.name,type:m.type,thumb:m.thumb||""},m.id);
  }
  const meta={segments,texts,overlays,midSeq,segSeq,txtSeq,ovSeq,music:$("#musicSel").value,
   music2:{sel:$("#music2Sel").value,vol:+$("#music2Vol").value,off:+($("#music2Off").value||0)},
   mediaMeta:[...media.values()].map(m=>({id:m.id,name:m.name,type:m.type,duration:m.duration}))};
  meta.name=slotName||""; meta.savedAt=Date.now();
  try{const st=JSON.parse(snapshotState()); delete st.segments; delete st.texts; delete st.overlays; meta.settings=st}catch(e){}
  tx.objectStore("state").put(meta,key);
  await new Promise(r=>{tx.oncomplete=r;tx.onerror=r});
  const el=$("#saveState"); if(el)el.textContent="✓ Saved on this device";
 }catch(e){}
}
function idbGet(store,key){return idb().then(d=>new Promise(res=>{const rq=d.transaction(store).objectStore(store).get(key);rq.onsuccess=()=>res(rq.result);rq.onerror=()=>res(null)}))}
async function checkRestore(){
 try{ const meta=await idbGet("state","project");
  if(meta&&meta.segments&&meta.segments.length){window.__savedMeta=meta;$("#restoreBar").style.display=""}
 }catch(e){}
}
async function loadProjectMeta(meta){
 if(!meta)return;
 $("#restoreBar").style.display="none";
 midSeq=meta.midSeq||midSeq; segSeq=meta.segSeq||segSeq; txtSeq=meta.txtSeq||txtSeq; ovSeq=meta.ovSeq||ovSeq;
 for(const mm of (meta.mediaMeta||[])){
  const rec=await idbGet("files",mm.id);
  const item={id:mm.id,name:mm.name,type:mm.type,duration:mm.duration||0,thumb:(rec&&rec.thumb)||""};
  if(rec&&rec.file){item.file=rec.file;item.url=URL.createObjectURL(rec.file)}
  else if(rec&&rec.url){item.url=rec.url}
  else continue;
  if(item.type==="image"&&!item.thumb)item.thumb=item.url;
  media.set(item.id,item);
 }
 segments=meta.segments||[]; texts=meta.texts||[]; overlays=meta.overlays||[];
 selSeg=segments[0]?.id||null;
 renderMedia(); renderTimeline(); renderTextList(); renderOverlays();
 if(meta.music){$("#musicSel").value=meta.music;const mm=media.get(meta.music);if(mm)musEl.src=mm.url}
 if(meta.music2){$("#music2Sel").value=meta.music2.sel||"";$("#music2Sel").dispatchEvent(new Event("change"));$("#music2Vol").value=meta.music2.vol!=null?meta.music2.vol:80;$("#music2VolO").textContent=$("#music2Vol").value;$("#music2Off").value=meta.music2.off||0}
 if(meta.settings){try{const st=meta.settings; st.segments=segments; st.texts=texts; st.overlays=overlays; st.selSeg=selSeg; applySnapshot(JSON.stringify(st))}catch(e){}}
 for(const s of segments){const m=media.get(s.mediaId);if(m&&m.type==="video"&&!m.duration)probeVideo(m,null)}
 hist=[];histIdx=-1;pushHistory();
 if(segments[0]){selSeg=segments[0].id;loadSegment(0,false)}
 drawFrame();
 flashNow("Project loaded ✓");
}
$("#restoreBtn").onclick=()=>loadProjectMeta(window.__savedMeta);
async function refreshSlotLabels(){
 for(const n of [1,2,3]){ const el=$("#slotLbl"+n); if(!el)continue;
  const meta=await idbGet("state","slot"+n);
  el.textContent=meta?`Slot ${n} — ${meta.name||"Project"} · ${new Date(meta.savedAt||Date.now()).toLocaleDateString()}`:`Slot ${n} — empty`;
 }
}
document.querySelectorAll("[data-slot-save]").forEach(b=>b.onclick=async()=>{
 const n=b.dataset.slotSave;
 if(!segments.length){flashNow("Nothing to save yet — add a clip first");return}
 await saveProjectTo("slot"+n,"Project "+n); refreshSlotLabels(); flashNow("Saved to slot "+n+" ✓")});
document.querySelectorAll("[data-slot-load]").forEach(b=>b.onclick=async()=>{
 const n=b.dataset.slotLoad; const meta=await idbGet("state","slot"+n);
 if(!meta){flashNow("Slot "+n+" is empty");return}
 loadProjectMeta(meta); closeSheets()});
refreshSlotLabels();
$("#discardBtn").onclick=async()=>{
 $("#restoreBar").style.display="none"; window.__savedMeta=null;
 try{const d=await idb();const tx=d.transaction(["files","state"],"readwrite");tx.objectStore("files").clear();tx.objectStore("state").delete("project")}catch(e){}
};
/* ----- export size ----- */
$("#resSel").onchange=()=>{$("#ratioSel").dispatchEvent(new Event("change"));markDirty()};
/* ----- MP4 conversion (ffmpeg.wasm, single-thread core, on-device) ----- */
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement("script");s.src=src;s.onload=res;s.onerror=()=>rej(new Error("load failed: "+src));document.head.appendChild(s)})}
let ffInst=null;
document.addEventListener("click",async e=>{
 if(e.target.id!=="mp4Btn")return;
 const st=$("#mp4State"), btn=$("#mp4Btn"); if(!window.__lastWebm||!st)return;
 btn.disabled=true;
 try{
  await ensureFF(st);
  ffInst.on("progress",({progress})=>{st.textContent="Converting to MP4… "+Math.round(Math.max(0,Math.min(1,progress))*100)+"%"});
  st.textContent="Converting to MP4… 0%";
  const data=await window.FFmpegUtil.fetchFile(window.__lastWebm);
  await ffInst.writeFile("in.webm",data);
  const crf=$("#mp4Q")?.value||"23";
  await ffInst.exec(["-i","in.webm","-c:v","libx264","-pix_fmt","yuv420p","-crf",crf,"-preset","veryfast","-c:a","aac","-b:a","160k","-movflags","+faststart","out.mp4"]);
  const out=await ffInst.readFile("out.mp4");
  const blob=new Blob([out.buffer],{type:"video/mp4"});
  const url=URL.createObjectURL(blob), mb=(blob.size/1048576).toFixed(2);
  st.textContent="MP4 ready ✓ — "+mb+" MB";
  $("#mp4Done").innerHTML=`<video src="${url}" controls style="width:100%;border-radius:9px;background:#000;margin-top:8px"></video>
   <a href="${url}" download="cutvault-export.mp4"><button class="gold" style="width:100%;margin-top:8px">⬇ Download MP4</button></a>`;
 }catch(err){
  st.textContent="MP4 conversion failed ("+(err.message||"network")+") — the WebM above still works everywhere; check your connection and tap Convert again.";
 }
 btn.disabled=false;
});
/* ----- init ----- */
pushHistory(); updateUndoBtns(); checkRestore(); renderOvPanel();

/* ---------- v5 · Phase B: intensity, fades wiring, freeze, reverse ---------- */
$("#intRange").oninput=e=>{filterIntensity=+e.target.value/100;$("#intRangeO").textContent=e.target.value+"%";drawFrame()};
$("#intRange").onchange=()=>pushHistory();
$("#fadeInS").onchange=e=>{musicFadeIn=Math.max(0,+e.target.value||0);pushHistory()};
$("#fadeOutS").onchange=e=>{musicFadeOut=Math.max(0,+e.target.value||0);pushHistory()};
async function ensureFF(statusEl){
 const say=t=>{if(statusEl)statusEl.textContent=t;else flashNow(t)};
 if(!window.FFmpegWASM){
  say("Loading the on-device converter (one-time ~31 MB download)…");
  await loadScript("https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js");
  await loadScript("https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/dist/umd/index.js");
 }
 if(!ffInst){
  ffInst=new window.FFmpegWASM.FFmpeg();
  const base="https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm";
  const wbase="https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/umd";
  await ffInst.load({coreURL:await window.FFmpegUtil.toBlobURL(base+"/ffmpeg-core.js","text/javascript"),
                     wasmURL:await window.FFmpegUtil.toBlobURL(base+"/ffmpeg-core.wasm","application/wasm"),
                     classWorkerURL:await window.FFmpegUtil.toBlobURL(wbase+"/814.ffmpeg.js","text/javascript")});
 }
 return ffInst;
}
$("#freezeBtn").onclick=()=>{
 const i=curSeg;
 if(i<0){flashNow("Play a clip first and pause on the frame you want");return}
 const s=segments[i],m=media.get(s.mediaId);
 if(!m||m.type==="image"){flashNow("Freeze works on video clips — select one and pause on a frame");return}
 if(vid.readyState<2||!vid.videoWidth){flashNow("Frame not ready yet — press play, pause on the frame, then Freeze");return}
 const c=document.createElement("canvas");c.width=vid.videoWidth;c.height=vid.videoHeight;
 c.getContext("2d").drawImage(vid,0,0);
 c.toBlob(b=>{
  if(!b){flashNow("Could not capture that frame");return}
  const f=new File([b],"freeze-"+Date.now()+".png",{type:"image/png"});
  const id="m"+(++midSeq),url=URL.createObjectURL(f);
  media.set(id,{id,name:f.name,type:"image",url,duration:0,thumb:url,file:f});
  const pt=progTime(),off=pt-segStart(i);
  if(off>0.05&&off<segDur(s)-0.05){
   const cut=s.in+off*(s.speed||1);
   const s2={id:"s"+(++segSeq),mediaId:s.mediaId,in:cut,out:s.out,dur:3,speed:s.speed,zoom:s.zoom,rot:s.rot,flip:s.flip,ox:s.ox,oy:s.oy,vol:s.vol};
   s.out=cut; segments.splice(i+1,0,s2);
  }
  const fs={id:"s"+(++segSeq),mediaId:id,in:0,out:3,dur:2,speed:1};
  segments.splice(i+1,0,fs); selSeg=fs.id;
  renderMedia(); renderTimeline(); pushHistory();
  flashNow("Frame frozen ❄ — a 2s still was inserted here (change its length in Edit)");
 },"image/png");
};
$("#revBtn").onclick=async()=>{
 const s=segments.find(x=>x.id===selSeg);
 if(!s){flashNow("Select a clip on the timeline first");return}
 const m=media.get(s.mediaId);
 if(!m||m.type!=="video"){flashNow("Reverse works on video clips");return}
 if((m.duration||0)>60){flashNow("That clip is over 60s — too long to reverse on a phone. Trim it first");return}
 const btn=$("#revBtn"); btn.disabled=true; btn.textContent="⏪ Reversing…";
 try{
  const ff=await ensureFF(null);
  ff.on("progress",({progress})=>{btn.textContent="⏪ Reversing… "+Math.round(Math.max(0,Math.min(1,progress))*100)+"%"});
  const srcBlob=m.file||await (await fetch(m.url)).blob();
  const data=await window.FFmpegUtil.fetchFile(new File([srcBlob],"rev-in.mp4"));
  await ff.writeFile("rev-in.mp4",data);
  await ff.exec(["-i","rev-in.mp4","-vf","reverse","-af","areverse","-y","rev-out.mp4"]);
  const out=await ff.readFile("rev-out.mp4");
  const f=new File([out.buffer],"reversed-"+(m.name||"clip").replace(/\.[^.]+$/,"")+".mp4",{type:"video/mp4"});
  addFiles([f]);
  flashNow("Reversed copy added ⏪ — it is the newest clip on your timeline");
 }catch(e){
  flashNow("Reverse failed for this clip ("+((e&&e.message)||"format")+") — the original is untouched");
 }
 btn.disabled=false; btn.textContent="⏪ Reverse clip";
};

/* ---------- v6 · Phase C: chroma key, AI cutout, Whisper captions ---------- */
function wireSmart(s,p){
 if(!p)return;
 const m=media.get(s.mediaId); if(!m||m.type==="audio")return;
 s.chroma=s.chroma||{on:false,color:"#00e600",sim:38,smooth:18};
 s.cutout=s.cutout||{on:false,bg:"blur",color:"#101418"};
 const box=document.createElement("div");
 box.innerHTML=`<div class="sub" style="margin-top:14px">Smart tools — background</div>
 <div class="row">
   <button id="smChroma">${s.chroma.on?"🟢 Chroma key: ON":"🟢 Chroma key"}</button>
   <button id="smCutout">${s.cutout.on?"🤖 AI cutout: ON":"🤖 AI cutout"}</button>
 </div>
 <div class="row" style="margin-top:7px">
   <button id="smTrack">${s.track?"🎯 Tracking person: ON":"🎯 Track person — camera follows them"}</button>
 </div>
 <div id="smChromaPanel" style="display:${s.chroma.on?"":"none"};margin-top:10px">
   <div class="row"><div class="field"><label>Key color (tap the backdrop color)</label><input type="color" id="smColor" value="${s.chroma.color}" style="width:100%;height:40px;padding:2px"></div></div>
   <div class="slider-row"><span>Similarity</span><input type="range" id="smSim" min="5" max="80" value="${s.chroma.sim}"><output>${s.chroma.sim}</output></div>
   <div class="slider-row"><span>Edge softness</span><input type="range" id="smSmooth" min="0" max="60" value="${s.chroma.smooth}"><output>${s.chroma.smooth}</output></div>
   <p class="hint">Removes a solid backdrop color (green screen) from this clip. The blurred scene stays behind.</p>
 </div>
 <div id="smCutoutPanel" style="display:${s.cutout.on?"":"none"};margin-top:10px">
   <div class="field"><label>Backdrop behind the person</label>
   <select id="smBg" style="width:100%"><option value="blur" ${s.cutout.bg==="blur"?"selected":""}>Blurred scene</option><option value="color" ${s.cutout.bg==="color"?"selected":""}>Solid color</option></select></div>
   <div class="field"><label>Backdrop color</label><input type="color" id="smBgColor" value="${s.cutout.color}" style="width:100%;height:40px;padding:2px"></div>
   <p class="hint" id="smCutState">AI finds the person in this clip and keeps only them. First use downloads a small AI model (~3 MB).</p>
 </div>`;
 p.appendChild(box);
 $("#smChroma").onclick=()=>{s.chroma.on=!s.chroma.on;if(s.chroma.on)s.cutout.on=false;renderSegPanel();drawFrame();pushHistory()};
 $("#smCutout").onclick=()=>{s.cutout.on=!s.cutout.on;if(s.cutout.on){s.chroma.on=false;initSegmenters()}renderSegPanel();drawFrame();pushHistory()};
 const smTr=$("#smTrack"); if(smTr)smTr.onclick=()=>{s.track=!s.track;if(s.track){initSegmenters();flashNow("Tracking on — press ▶ and the camera follows the person")}renderSegPanel();drawFrame();pushHistory()};
 const cc=$("#smColor"); if(cc)cc.oninput=e=>{s.chroma.color=e.target.value;chromaDirty=true;drawFrame()};
 const cs=$("#smSim"); if(cs)cs.oninput=e=>{s.chroma.sim=+e.target.value;e.target.nextElementSibling.textContent=s.chroma.sim;chromaDirty=true;drawFrame()};
 const cm=$("#smSmooth"); if(cm)cm.oninput=e=>{s.chroma.smooth=+e.target.value;e.target.nextElementSibling.textContent=s.chroma.smooth;chromaDirty=true;drawFrame()};
 const bg=$("#smBg"); if(bg)bg.onchange=e=>{s.cutout.bg=e.target.value;drawFrame();pushHistory()};
 const bc=$("#smBgColor"); if(bc)bc.oninput=e=>{s.cutout.color=e.target.value;drawFrame()};
}
/* ----- chroma key layer ----- */
let kc=null,kx=null,chromaDirty=true,lastKeyT=-1;
function drawChromaLayer(src,dx,dy,dw,dh,s,W,H){
 if(!kc){kc=document.createElement("canvas");kx=kc.getContext("2d",{willReadFrequently:true})}
 if(kc.width!==W||kc.height!==H){kc.width=W;kc.height=H}
 const isVid=src===vid;
 const tNow=isVid?vid.currentTime:0;
 if(chromaDirty||!isVid||Math.abs(tNow-lastKeyT)>0.02){
  lastKeyT=tNow; chromaDirty=false;
  kx.clearRect(0,0,W,H); kx.drawImage(src,dx,dy,dw,dh);
  const ch=s.chroma;
  const kr=parseInt(ch.color.slice(1,3),16),kg=parseInt(ch.color.slice(3,5),16),kb=parseInt(ch.color.slice(5,7),16);
  const t0=(ch.sim/100)*441, sm=Math.max(24,(ch.smooth/100)*320);
  const imgd=kx.getImageData(0,0,W,H), d=imgd.data;
  for(let i=0;i<d.length;i+=4){
   if(d[i+3]===0)continue;
   const dr=d[i]-kr,dg=d[i+1]-kg,db=d[i+2]-kb;
   const dist=Math.sqrt(dr*dr+dg*dg+db*db);
   if(dist<t0){d[i+3]=0;continue}
   if(dist<t0+sm){d[i+3]=Math.round(d[i+3]*(dist-t0)/sm);
    if(d[i+1]>d[i]&&d[i+1]>d[i+2])d[i+1]=Math.max(d[i],d[i+2])}
  }
  kx.putImageData(imgd,0,0);
 }
 ctx.save();ctx.filter=filterStr();ctx.drawImage(kc,0,0);ctx.restore();
}
/* ----- AI cutout layer ----- */
let fxc=null,fxx=null,cutMaskCvs=null,segVideo=null,segImage=null,segInitP=null,segErr="";
async function initSegmenters(){
 if(segInitP)return segInitP;
 segInitP=(async()=>{
  try{
   const vision=await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs");
   const fileset=await vision.FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
   const model="https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite";
   segVideo=await vision.ImageSegmenter.createFromOptions(fileset,{baseOptions:{modelAssetPath:model,delegate:"CPU"},runningMode:"VIDEO",outputCategoryMask:true});
   segImage=await vision.ImageSegmenter.createFromOptions(fileset,{baseOptions:{modelAssetPath:model,delegate:"CPU"},runningMode:"IMAGE",outputCategoryMask:true});
  }catch(e){ segErr="AI cutout could not load ("+((e&&e.message)||"network")+") — check connection and reopen the clip."; const el=$("#smCutState"); if(el)el.textContent=segErr }
 })();
 return segInitP;
}
function maskToCanvas(mask){
 try{
  const w=mask.width,h=mask.height,arr=mask.getAsUint8Array();
  if(!cutMaskCvs)cutMaskCvs=document.createElement("canvas");
  cutMaskCvs.width=w;cutMaskCvs.height=h;
  const c=cutMaskCvs.getContext("2d"), imgd=c.createImageData(w,h), d=imgd.data;
  /* verified empirically with a real portrait: this model's mask is 0 = person, 255 = background */
  for(let i=0;i<arr.length;i++){const o=i*4;d[o]=255;d[o+1]=255;d[o+2]=255;d[o+3]=arr[i]<128?255:0}
  c.putImageData(imgd,0,0);
  /* person centroid for auto-follow tracking (sampled) */
  let sx=0,sy=0,cnt=0;
  for(let y=0;y<h;y+=4)for(let x=0;x<w;x+=4){if(arr[y*w+x]<128){sx+=x;sy+=y;cnt++}}
  if(cnt>40){ const nx2=(sx/cnt)/w, ny2=(sy/cnt)/h;
   if(!trackPt)trackPt={x:nx2,y:ny2}; else {trackPt.x+=(nx2-trackPt.x)*0.35; trackPt.y+=(ny2-trackPt.y)*0.35}
   window.__trackDebug={x:+trackPt.x.toFixed(3),y:+trackPt.y.toFixed(3)} }
  return true;
 }catch(e){return false}
}
let lastSegRun=0;
let trackPt=null;
setInterval(()=>{
 const s=segments[curSeg]; if(!s||!((s.cutout&&s.cutout.on)||s.track))return;
 if(segErr)return;
 if(!segVideo&&!segImage){initSegmenters();return}
 const m=media.get(s.mediaId); if(!m)return;
 const now=performance.now();
 if(m.type==="video"&&segVideo&&vid.readyState>=2&&(playing||exporting||now-lastSegRun>600)){
  lastSegRun=now;
  try{const r=segVideo.segmentForVideo(vid,now); if(r&&r.categoryMask)maskToCanvas(r.categoryMask)}catch(e){}
 }else if(m.type==="image"&&segImage&&imgEl.complete&&imgEl.naturalWidth&&now-lastSegRun>600){
  lastSegRun=now;
  try{const r=segImage.segment(imgEl); if(r&&r.categoryMask)maskToCanvas(r.categoryMask)}catch(e){}
 }
},130);
function drawCutoutLayer(src,dx,dy,dw,dh,s,W,H){
 if(!fxc){fxc=document.createElement("canvas");fxx=fxc.getContext("2d")}
 if(fxc.width!==W||fxc.height!==H){fxc.width=W;fxc.height=H}
 fxx.clearRect(0,0,W,H);
 fxx.globalCompositeOperation="source-over";
 fxx.drawImage(src,dx,dy,dw,dh);
 if(cutMaskCvs){fxx.globalCompositeOperation="destination-in";fxx.drawImage(cutMaskCvs,dx,dy,dw,dh);fxx.globalCompositeOperation="source-over"}
 ctx.save();ctx.filter=filterStr();ctx.drawImage(fxc,0,0);ctx.restore();
}
/* ----- smart frame composer ----- */
function drawSmartFrame(src,sw,sh,s,W,H,fit){
 if(s.cutout&&s.cutout.on&&s.cutout.bg==="color"){ctx.fillStyle=s.cutout.color||"#101418";ctx.fillRect(0,0,W,H)}
 else{ctx.save();ctx.filter="blur(28px) brightness(0.55)";const scb=Math.max(W/sw,H/sh);ctx.drawImage(src,(W-sw*scb)/2,(H-sh*scb)/2,sw*scb,sh*scb);ctx.restore()}
 let sc=fit==="fill"?Math.max(W/sw,H/sh):Math.min(W/sw,H/sh);
 const dw=sw*sc,dh=sh*sc,dx=(W-dw)/2,dy=(H-dh)/2;
 if(s.chroma&&s.chroma.on)drawChromaLayer(src,dx,dy,dw,dh,s,W,H);
 else if(s.cutout&&s.cutout.on)drawCutoutLayer(src,dx,dy,dw,dh,s,W,H);
}
/* ----- Whisper auto captions ----- */
let whisperPipe=null;
async function getWhisper(st){
 if(whisperPipe)return whisperPipe;
 st.textContent="Loading the speech AI engine…";
 const T=await import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.3/dist/transformers.min.js");
 T.env.allowLocalModels=false;
 st.textContent="Downloading the Whisper model (one time, ~40 MB)…";
 whisperPipe=await T.pipeline("automatic-speech-recognition","onnx-community/whisper-tiny",{dtype:"q8",
  progress_callback:p=>{if(p.status==="progress"&&p.progress!=null)st.textContent="Downloading Whisper model… "+Math.round(p.progress)+"% (one time)"}});
 return whisperPipe;
}
async function mediaPCM16k(m){
 const blob=m.file||await (await fetch(m.url)).blob();
 const ab=await blob.arrayBuffer();
 const ac=new (window.AudioContext||window.webkitAudioContext)();
 const buf=await ac.decodeAudioData(ab); ac.close();
 const off=new OfflineAudioContext(1,Math.ceil(buf.duration*16000),16000);
 const srcNode=off.createBufferSource(); srcNode.buffer=buf; srcNode.connect(off.destination); srcNode.start();
 const rendered=await off.startRendering();
 return rendered.getChannelData(0);
}
$("#autoCapBtn").onclick=async()=>{
 const st=$("#autoCapState"), btn=$("#autoCapBtn");
 const i=segments.findIndex(x=>x.id===selSeg);
 const s=segments[i], m=s?media.get(s.mediaId):null;
 if(!s||!m||m.type!=="video"){st.textContent="Select a video clip on the timeline first — auto captions listen to that clip.";return}
 btn.disabled=true;
 try{
  const pipe=await getWhisper(st);
  st.textContent="Listening to “"+m.name+"”… (on your device — longer clips take longer)";
  const pcm=await mediaPCM16k(m);
  const lang=$("#capLang").value;
  const karaoke=$("#capKaraoke")&&$("#capKaraoke").checked;
  const base=segStart(i);
  const toProg=mt=>base+Math.max(0,(Math.min(Math.max(mt,s.in),s.out)-s.in)/(s.speed||1));
  let added=0;
  if(karaoke){
   /* Word-level timestamps need attention outputs this on-device model export
      doesn't carry — so karaoke timing is distributed proportionally (by word
      length) inside each Whisper sentence chunk. Visually in sync. */
   const optsK={return_timestamps:true,chunk_length_s:30,stride_length_s:5,task:"transcribe"};
   if(lang)optsK.language=lang;
   const resK=await pipe(pcm,optsK);
   const chunksK=(resK.chunks&&resK.chunks.length)?resK.chunks:[{timestamp:[0,Math.min(3,m.duration||3)],text:resK.text}];
   const allWords=[];
   for(const c of chunksK){
    const ws=(c.text||"").trim().split(/\s+/).filter(Boolean); if(!ws.length)continue;
    const mt0=c.timestamp[0]??0, mt1=c.timestamp[1]??(mt0+2.5);
    const totCh=ws.reduce((a,w)=>a+w.length,0)||1;
    let cur=mt0;
    for(const w of ws){ const d=Math.max(0.12,(mt1-mt0)*(w.length/totCh)); allWords.push({w,t0:cur,t1:cur+d}); cur+=d }
   }
   for(let k=0;k<allWords.length;k+=5){
    const grp=allWords.slice(k,k+5);
    const p0=toProg(grp[0].t0), p1=Math.max(toProg(grp[grp.length-1].t1),p0+0.3);
    texts.push({id:"t"+(++txtSeq),content:grp.map(g=>g.w).join(" "),start:+p0.toFixed(2),end:+p1.toFixed(2),size:54,color:"#ffffff",stroke:false,x:50,y:88,style:"classic",anim:"none",
     words:grp.map(g=>({w:g.w,s:+toProg(g.t0).toFixed(2),e:+toProg(g.t1).toFixed(2)}))});
    added++;
   }
   if(!added)st.textContent="Karaoke heard no clear speech in that clip — nothing was added.";
  } else {
  const opts={return_timestamps:true,chunk_length_s:30,stride_length_s:5,task:"transcribe"};
  if(lang)opts.language=lang;
  const res=await pipe(pcm,opts);
  const chunks=(res.chunks&&res.chunks.length)?res.chunks:[{timestamp:[0,Math.min(3,m.duration||3)],text:res.text}];
  for(const c of chunks){
   const txt=(c.text||"").trim(); if(!txt||txt==="[BLANK_AUDIO]")continue;
   const mt0=c.timestamp[0]??0, mt1=c.timestamp[1]??(mt0+2.5);
   if(mt1<s.in||mt0>s.out)continue;
   const p0=base+Math.max(0,(Math.max(mt0,s.in)-s.in)/(s.speed||1));
   const p1=base+Math.max(0,(Math.min(mt1,s.out)-s.in)/(s.speed||1));
   if(p1<=p0)continue;
   texts.push({id:"t"+(++txtSeq),content:txt,start:+p0.toFixed(2),end:+p1.toFixed(2),size:54,color:"#ffffff",stroke:true,x:50,y:88,style:"classic",anim:"none"});
   added++;
  }
  }
  renderTextTrack(); renderTextList(); pushHistory(); drawFrame();
  st.textContent=added?("✓ "+added+" captions generated from the speech — tap any caption in Text to fix words or restyle.")
                      :"The AI heard no clear speech in that clip — nothing was added.";
 }catch(e){
  st.textContent="Auto captions failed ("+((e&&e.message)||"network")+") — check your connection (first use needs the model download) and try again.";
 }
 btn.disabled=false;
};
