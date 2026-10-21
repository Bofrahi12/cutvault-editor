"use strict";
/* CutVault v1 — original browser video editor. All processing is local. */
const $=s=>document.querySelector(s);
const cv=$("#cv"), ctx=cv.getContext("2d");
const vid=$("#vid"), imgEl=$("#imgEl"), musEl=$("#musEl"), vid2=$("#vid2"), img2=$("#img2");
let media=new Map(), segments=[], texts=[];
let overlays=[], ovSeq=0, selOv=null;
let selSeg=null, selText=null, midSeq=0, segSeq=0, txtSeq=0;
let playing=false, curSeg=-1, segStartedAt=0, imgSegStart=0, exporting=false;
let audioCtx=null, vidGain=null, musGain=null, streamDest=null, vidSrcNode=null, musSrcNode=null;
const RATIOS={"16:9":[1280,720],"9:16":[720,1280],"1:1":[960,960],"4:5":[960,1200]};
const PRESETS={
 "None":"", "Cinematic":"contrast(1.12) saturate(1.15) brightness(0.98)",
 "Vivid":"saturate(1.55) contrast(1.08)", "Warm":"sepia(0.32) saturate(1.2) brightness(1.03)",
 "Cold":"saturate(0.85) hue-rotate(12deg) brightness(1.02)", "Mono":"grayscale(1) contrast(1.1)",
 "Vintage":"sepia(0.5) contrast(0.95) brightness(1.05)", "Fade":"brightness(1.1) contrast(0.82) saturate(0.75)",
 "Noir":"grayscale(1) contrast(1.35) brightness(0.92)"};
let curPreset="None";
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
 const sel=$("#musicSel"), cur=sel.value; sel.innerHTML='<option value="">— none —</option>';
 for(const m of media.values()) if(m.type==="audio"){const o=document.createElement("option");o.value=m.id;o.textContent=m.name;sel.appendChild(o)}
 sel.value=[...sel.options].some(o=>o.value===cur)?cur:"";
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
  d.style.width=Math.max(64,(segDur(s)/total)*560)+"px";
  d.innerHTML=`<img src="${m.thumb||""}" alt=""><div class="sg-d">${fmt(segDur(s))}</div><div class="sg-t">${i+1}. ${m.name.replace(/</g,"&lt;")}</div>`;
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
  <div class="row"><button id="spLeft">← Move</button><button id="spRight">Move →</button></div>`+TF_HTML(s);
  $("#spIn").oninput=e=>{s.in=Math.min(+e.target.value,s.out-0.1);e.target.nextElementSibling.textContent=fmt(s.in);$("#tDur").textContent=fmt(progDur());renderTimelineSoft()};
  $("#spOut").oninput=e=>{s.out=Math.max(+e.target.value,s.in+0.1);e.target.nextElementSibling.textContent=fmt(s.out);$("#tDur").textContent=fmt(progDur());renderTimelineSoft()};
  $("#spIn").onchange=()=>pushHistory(); $("#spOut").onchange=()=>pushHistory();
  $("#spSpeed").onchange=e=>{s.speed=+e.target.value;renderTimeline();pushHistory()};
 }
 const L=$("#spLeft"),R=$("#spRight"),i=segments.indexOf(s);
 if(L)L.onclick=()=>{if(i>0){[segments[i-1],segments[i]]=[segments[i],segments[i-1]];renderTimeline();pushHistory()}};
 if(R)R.onclick=()=>{if(i<segments.length-1){[segments[i+1],segments[i]]=[segments[i],segments[i+1]];renderTimeline();pushHistory()}};
 wireTF(s);
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
 return (PRESETS[curPreset]?PRESETS[curPreset]+" ":"")+adj}
[["#adjB","#adjBO"],["#adjC","#adjCO"],["#adjS","#adjSO"]].forEach(([a,o])=>{$(a).oninput=e=>{$(o).textContent=e.target.value;drawFrame()}});
$("#ratioSel").onchange=e=>{const[w,h]=RATIOS[e.target.value];const f=+($("#resSel")?.value||1);cv.width=Math.round(w*f);cv.height=Math.round(h*f);drawFrame()};
$("#fitSel").onchange=()=>drawFrame();
$("#musicSel").onchange=e=>{const m=media.get(e.target.value);if(m){musEl.src=m.url;ensureAudio()}else{musEl.pause();musEl.removeAttribute("src")}};
$("#musicVol").oninput=e=>{$("#musicVolO").textContent=e.target.value;if(musGain)musGain.gain.value=e.target.value/100};
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
  <button class="danger" style="width:100%">Delete text</button>`;
  d.onclick=()=>{selText=t.id;renderTextList();renderTextTrack()};
  d.querySelectorAll("input").forEach(inp=>{inp.oninput=()=>{const k=inp.dataset.k;t[k]=["content","color"].includes(k)?inp.value:+inp.value;renderTextTrack();drawFrame()};inp.onchange=()=>pushHistory()});
  d.querySelector("button").onclick=e=>{e.stopPropagation();texts=texts.filter(x=>x.id!==t.id);renderTextList();renderTextTrack();drawFrame();pushHistory()};
  box.appendChild(d)});
}

/* ---------- playback engine ---------- */
function loadSegment(i,autoplay){
 if(i<0||i>=segments.length){stopPlayback();return}
 curSeg=i; const s=segments[i],m=media.get(s.mediaId); if(!m)return;
 selSeg=s.id; renderTimelineSoft();
 flashNow("▶ "+m.name);
 if(m.type==="image"){vid.pause();imgEl.src=m.url;imgSegStart=performance.now();if(playing)scheduleImageEnd(s)}
 else{imgEl.removeAttribute("src");
  if(vid.dataset.mid!==m.id){vid.src=m.url;vid.dataset.mid=m.id}
  vid.playbackRate=s.speed||1; vid.volume=$("#videoVol").value/100;
  const go=()=>{vid.currentTime=s.in; if(playing||autoplay)vid.play().catch(()=>{})};
  if(vid.readyState>=1)go(); else vid.onloadedmetadata=go;
 }
}
let imgTimer=null;
function scheduleImageEnd(s){clearTimeout(imgTimer);imgTimer=setTimeout(()=>{if(playing)nextSegment()},segDur(s)*1000)}
function nextSegment(){if(curSeg+1<segments.length){loadSegment(curSeg+1,true)}else{stopPlayback();if(exporting)finishExport()}}
function stopPlayback(){playing=false;$("#playBtn").textContent="▶";vid.pause();clearTimeout(imgTimer);if(!exporting)musEl.pause()}
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
  const zoomK=curTransition==="zoom"?(1+0.09*Math.max(0,1-lt/0.55)):1;
  const src=m.type==="image"?imgEl:vid;
  const ready=m.type==="image"?(imgEl.complete&&imgEl.naturalWidth):vid.readyState>=2;
  if(ready){
   const sw=m.type==="image"?imgEl.naturalWidth:vid.videoWidth, sh=m.type==="image"?imgEl.naturalHeight:vid.videoHeight;
   if(sw&&sh){
    const fit=$("#fitSel").value;
    if(fit==="fit"){ctx.save();ctx.filter="blur(28px) brightness(0.55)";const sc=Math.max(W/sw,H/sh);ctx.drawImage(src,(W-sw*sc)/2,(H-sh*sc)/2,sw*sc,sh*sc);ctx.restore()}
    ctx.save();ctx.filter=filterStr();
    let sc; if(fit==="fill")sc=Math.max(W/sw,H/sh); else sc=Math.min(W/sw,H/sh);
    sc*=zoomK*(s.zoom||1);
    const dw=sw*sc, dh=sh*sc;
    ctx.translate(W/2+((s.ox||0)/100)*W, H/2+((s.oy||0)/100)*H);
    if(s.flip)ctx.scale(-1,1);
    if(s.rot)ctx.rotate(s.rot*Math.PI/180);
    ctx.drawImage(src,-dw/2,-dh/2,dw,dh);ctx.restore();
    if(curTransition==="dip"&&ld>0.8){const a=Math.min(1,lt/0.35,(ld-lt)/0.35);if(a<1){ctx.fillStyle=`rgba(0,0,0,${(1-Math.max(a,0)).toFixed(3)})`;ctx.fillRect(0,0,W,H)}}
    if(curTransition==="flash"&&lt<0.28){ctx.fillStyle=`rgba(255,255,255,${(0.85*(1-lt/0.28)).toFixed(3)})`;ctx.fillRect(0,0,W,H)}
   }
  }
 }
 const pt=progTime();
 drawOverlays(pt);
 for(const t of texts){if(pt<t.start||pt>t.end)continue;
  ctx.save();let fs=t.size*(W/720);ctx.font=`800 ${fs}px Inter,Arial,sans-serif`;ctx.textAlign="center";ctx.textBaseline="middle";
  const mw=ctx.measureText(t.content).width; if(mw>W*0.92){fs=fs*(W*0.92)/mw;ctx.font=`800 ${fs}px Inter,Arial,sans-serif`}
  if(t.stroke){ctx.lineWidth=fs/9;ctx.strokeStyle="rgba(0,0,0,0.85)";ctx.lineJoin="round";ctx.strokeText(t.content,W*t.x/100,H*t.y/100)}
  ctx.fillStyle=t.color;ctx.shadowColor="rgba(0,0,0,.45)";ctx.shadowBlur=6;ctx.fillText(t.content,W*t.x/100,H*t.y/100);ctx.restore()}
 if(!segments.length){
  ctx.save();ctx.fillStyle="#8b93a5";ctx.font="600 30px Inter,Arial";ctx.textAlign="center";
  ctx.fillText("Add media to start editing",W/2,H/2);ctx.restore()}
 if(letterbox){ctx.fillStyle="#000";ctx.fillRect(0,0,W,Math.round(H*0.11));ctx.fillRect(0,Math.round(H*0.89),W,Math.round(H*0.11))}
}
function loop(){
 $("#tCur").textContent=fmt(progTime());
 if(playing||exporting)drawFrame();
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
  musSrcNode=audioCtx.createMediaElementSource(musEl); musGain=audioCtx.createGain(); musGain.gain.value=$("#musicVol").value/100;
  musSrcNode.connect(musGain); musGain.connect(audioCtx.destination);
  streamDest=audioCtx.createMediaStreamDestination();
  vidGain.connect(streamDest); musGain.connect(streamDest);
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
function mkTplText(content,o){const t={id:"t"+(++txtSeq),content,start:o.start||0,end:o.end||6,size:o.size||64,color:o.color||"#ffffff",stroke:true,x:o.x??50,y:o.y??82,tpl:true};texts.push(t);return t}
const TEMPLATES={
 reel:{ratio:"9:16",fit:"fit",preset:"Vivid",trans:"dip",texts:d=>[["YOUR HOOK HERE",{start:0,end:Math.min(3,d),size:88,y:13}],["Your caption — edit me",{start:0,end:d,size:52,y:85}]]},
 cine:{ratio:"16:9",fit:"fit",preset:"Cinematic",trans:"dip",letter:true,texts:d=>[["YOUR FILM TITLE",{start:0,end:Math.min(3.5,d),size:76,y:50}]]},
 product:{ratio:"4:5",fit:"fit",preset:"None",trans:"flash",texts:d=>[["PRODUCT NAME",{start:0,end:d,size:72,y:11}],["Only $19 🔥",{start:0,end:d,size:66,y:68,color:"#f5cd63"}],["Link in bio 👇",{start:0.5,end:d,size:54,y:87}]]},
 vlog:{ratio:"9:16",fit:"fit",preset:"Warm",trans:"none",texts:d=>[["A day in my life ✨",{start:0,end:Math.min(3,d),size:60,y:10}],["Your Name",{start:0,end:d,size:46,x:34,y:79}]]},
 estate:{ratio:"9:16",fit:"fill",preset:"Cinematic",trans:"dip",texts:d=>[["Tangier · Sea view 🌊",{start:0,end:d,size:56,y:9}],["3 bed · 120 m²",{start:0,end:d,size:56,y:79}],["DM for the price",{start:0,end:d,size:54,y:88,color:"#f5cd63"}]]}
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
 <select id="spRot"><option value="0">Rotate 0°</option><option value="90">Rotate 90°</option><option value="180">Rotate 180°</option><option value="270">Rotate 270°</option></select></div>`}
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
  d.style.width=Math.max(64,(ov.dur/total)*560)+"px";d.style.minHeight="40px";
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
/* ----- undo / redo ----- */
let hist=[], histIdx=-1, histLock=false;
function snapshotState(){return JSON.stringify({segments,texts,overlays,selSeg,
 ratio:$("#ratioSel").value,fit:$("#fitSel").value,res:$("#resSel")?.value||"1",
 preset:curPreset,trans:curTransition,letterbox,music:$("#musicSel").value,
 adj:[$("#adjB").value,$("#adjC").value,$("#adjS").value]})}
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
  if(o.adj){["#adjB","#adjC","#adjS"].forEach((id,i)=>{$(id).value=o.adj[i]});["#adjBO","#adjCO","#adjSO"].forEach((id,i)=>{$(id).textContent=o.adj[i]})}
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
async function saveProject(){
 if(!segments.length&&!texts.length&&!overlays.length&&!media.size)return; /* never overwrite a saved project with an empty state */
 try{ const d=await idb(); const tx=d.transaction(["files","state"],"readwrite");
  const fs=tx.objectStore("files");
  fs.clear();
  for(const m of media.values()){
   if(m.file)fs.put({file:m.file,name:m.name,type:m.type,thumb:m.thumb||""},m.id);
   else if(m.url&&!m.url.startsWith("blob:"))fs.put({url:m.url,name:m.name,type:m.type,thumb:m.thumb||""},m.id);
  }
  const meta={segments,texts,overlays,midSeq,segSeq,txtSeq,ovSeq,music:$("#musicSel").value,
   mediaMeta:[...media.values()].map(m=>({id:m.id,name:m.name,type:m.type,duration:m.duration}))};
  tx.objectStore("state").put(meta,"project");
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
$("#restoreBtn").onclick=async()=>{
 const meta=window.__savedMeta; if(!meta)return;
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
 for(const s of segments){const m=media.get(s.mediaId);if(m&&m.type==="video"&&!m.duration)probeVideo(m,null)}
 hist=[];histIdx=-1;pushHistory();
 flashNow("Project restored ✓");
};
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
  st.textContent="Loading the MP4 converter (one-time ~31 MB download)…";
  if(!window.FFmpegWASM){await loadScript("https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js");
   await loadScript("https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/dist/umd/index.js")}
  if(!ffInst){
   ffInst=new window.FFmpegWASM.FFmpeg();
   ffInst.on("progress",({progress})=>{st.textContent="Converting to MP4… "+Math.round(Math.max(0,Math.min(1,progress))*100)+"%"});
   const base="https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm";
   const wbase="https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/umd";
   await ffInst.load({coreURL:await window.FFmpegUtil.toBlobURL(base+"/ffmpeg-core.js","text/javascript"),
                     wasmURL:await window.FFmpegUtil.toBlobURL(base+"/ffmpeg-core.wasm","application/wasm"),
                     classWorkerURL:await window.FFmpegUtil.toBlobURL(wbase+"/814.ffmpeg.js","text/javascript")});
  }
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
