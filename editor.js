"use strict";
/* CutVault v1 — original browser video editor. All processing is local. */
const $=s=>document.querySelector(s);
const cv=$("#cv"), ctx=cv.getContext("2d");
const vid=$("#vid"), imgEl=$("#imgEl"), musEl=$("#musEl");
let media=new Map(), segments=[], texts=[];
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
  const item={id,name:f.name,type:kind,url,duration:0,thumb:""};
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
  if(m.type!=="audio"){const b=document.createElement("button");b.textContent="＋ Timeline";b.onclick=()=>{segments.push({id:"s"+(++segSeq),mediaId:m.id,in:0,out:m.type==="image"?3:m.duration||0,dur:3,speed:1});renderTimeline()};d.appendChild(b)}
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
  <div class="row"><button id="spLeft">← Move</button><button id="spRight">Move →</button></div>`;
  $("#spDur").onchange=e=>{s.dur=Math.max(0.5,+e.target.value||3);renderTimeline()};
 }else{
  p.innerHTML=`
  <div class="slider-row"><span>Trim start</span><input type="range" id="spIn" min="0" max="${m.duration}" step="0.05" value="${s.in}"><output>${fmt(s.in)}</output></div>
  <div class="slider-row"><span>Trim end</span><input type="range" id="spOut" min="0" max="${m.duration}" step="0.05" value="${s.out}"><output>${fmt(s.out)}</output></div>
  <div class="field"><label>Speed</label><select id="spSpeed" style="width:100%">${[0.5,0.75,1,1.25,1.5,2].map(v=>`<option value="${v}" ${s.speed===v?"selected":""}>${v}×</option>`).join("")}</select></div>
  <div class="row"><button id="spLeft">← Move</button><button id="spRight">Move →</button></div>`;
  $("#spIn").oninput=e=>{s.in=Math.min(+e.target.value,s.out-0.1);e.target.nextElementSibling.textContent=fmt(s.in);$("#tDur").textContent=fmt(progDur());renderTimelineSoft()};
  $("#spOut").oninput=e=>{s.out=Math.max(+e.target.value,s.in+0.1);e.target.nextElementSibling.textContent=fmt(s.out);$("#tDur").textContent=fmt(progDur());renderTimelineSoft()};
  $("#spSpeed").onchange=e=>{s.speed=+e.target.value;renderTimeline()};
 }
 const L=$("#spLeft"),R=$("#spRight"),i=segments.indexOf(s);
 if(L)L.onclick=()=>{if(i>0){[segments[i-1],segments[i]]=[segments[i],segments[i-1]];renderTimeline()}};
 if(R)R.onclick=()=>{if(i<segments.length-1){[segments[i+1],segments[i]]=[segments[i],segments[i+1]];renderTimeline()}};
}
let softT=null;function renderTimelineSoft(){clearTimeout(softT);softT=setTimeout(renderTimeline,350)}
$("#splitBtn").onclick=()=>{
 const i=curSeg>=0?curSeg:segments.findIndex(x=>x.id===selSeg); if(i<0)return;
 const s=segments[i],m=media.get(s.mediaId); if(!m||m.type==="image")return;
 const pt=progTime(), off=pt-segStart(i); if(off<=0.05||off>=segDur(s)-0.05){flashNow("Move the playhead inside the selected clip to split it");return}
 const cut=s.in+off*(s.speed||1);
 const s2={id:"s"+(++segSeq),mediaId:s.mediaId,in:cut,out:s.out,dur:3,speed:s.speed};
 s.out=cut; segments.splice(i+1,0,s2); selSeg=s2.id; renderTimeline(); flashNow("Clip split ✂");
};
$("#dupBtn").onclick=()=>{const s=segments.find(x=>x.id===selSeg);if(!s)return;const c={...s,id:"s"+(++segSeq)};segments.splice(segments.indexOf(s)+1,0,c);selSeg=c.id;renderTimeline()};
$("#delSegBtn").onclick=()=>{const i=segments.findIndex(x=>x.id===selSeg);if(i<0)return;segments.splice(i,1);selSeg=segments[Math.max(0,i-1)]?.id||null;stopPlayback();renderTimeline()};
function flashNow(t){$("#nowPlaying").textContent=t}

/* ---------- filters & settings ---------- */
const presetBox=$("#presets");
Object.keys(PRESETS).forEach(name=>{const b=document.createElement("button");b.className="preset"+(name===curPreset?" sel":"");b.textContent=name;
 b.onclick=()=>{curPreset=name;presetBox.querySelectorAll(".preset").forEach(x=>x.classList.toggle("sel",x.textContent===name));drawFrame()};presetBox.appendChild(b)});
function filterStr(){const adj=`brightness(${$("#adjB").value/100}) contrast(${$("#adjC").value/100}) saturate(${$("#adjS").value/100})`;
 return (PRESETS[curPreset]?PRESETS[curPreset]+" ":"")+adj}
[["#adjB","#adjBO"],["#adjC","#adjCO"],["#adjS","#adjSO"]].forEach(([a,o])=>{$(a).oninput=e=>{$(o).textContent=e.target.value;drawFrame()}});
$("#ratioSel").onchange=e=>{const[w,h]=RATIOS[e.target.value];cv.width=w;cv.height=h;drawFrame()};
$("#fitSel").onchange=()=>drawFrame();
$("#musicSel").onchange=e=>{const m=media.get(e.target.value);if(m){musEl.src=m.url;ensureAudio()}else{musEl.pause();musEl.removeAttribute("src")}};
$("#musicVol").oninput=e=>{$("#musicVolO").textContent=e.target.value;if(musGain)musGain.gain.value=e.target.value/100};
$("#videoVol").oninput=e=>{$("#videoVolO").textContent=e.target.value;vid.volume=e.target.value/100;if(vidGain)vidGain.gain.value=e.target.value/100};

/* ---------- text overlays ---------- */
$("#addTextBtn").onclick=()=>{
 const content=$("#newText").value.trim(); if(!content){flashNow("Type some text first");return}
 const t={id:"t"+(++txtSeq),content,start:+progTime().toFixed(2),end:+Math.min(progDur()||progTime()+3,progTime()+3).toFixed(2),size:64,color:"#ffffff",stroke:true,x:50,y:82};
 if(t.end<=t.start)t.end=t.start+1;
 texts.push(t); selText=t.id; $("#newText").value=""; renderTextTrack(); renderTextList(); drawFrame();
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
  d.querySelectorAll("input").forEach(inp=>inp.oninput=()=>{const k=inp.dataset.k;t[k]=["content","color"].includes(k)?inp.value:+inp.value;renderTextTrack();drawFrame()});
  d.querySelector("button").onclick=e=>{e.stopPropagation();texts=texts.filter(x=>x.id!==t.id);renderTextList();renderTextTrack();drawFrame()};
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
    sc*=zoomK;
    ctx.drawImage(src,(W-sw*sc)/2,(H-sh*sc)/2,sw*sc,sh*sc);ctx.restore();
    if(curTransition==="dip"&&ld>0.8){const a=Math.min(1,lt/0.35,(ld-lt)/0.35);if(a<1){ctx.fillStyle=`rgba(0,0,0,${(1-Math.max(a,0)).toFixed(3)})`;ctx.fillRect(0,0,W,H)}}
    if(curTransition==="flash"&&lt<0.28){ctx.fillStyle=`rgba(255,255,255,${(0.85*(1-lt/0.28)).toFixed(3)})`;ctx.fillRect(0,0,W,H)}
   }
  }
 }
 const pt=progTime();
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
 const url=URL.createObjectURL(blob), mb=(blob.size/1048576).toFixed(2);
 $("#expBar").style.width="100%"; $("#expLabel").textContent="Export complete ✓";
 $("#expDone").innerHTML=`<div class="text-item"><b>Your video is ready</b> — ${mb} MB · WebM<div style="height:8px"></div>
  <video src="${url}" controls style="width:100%;border-radius:9px;background:#000"></video>
  <div style="height:8px"></div><a href="${url}" download="cutvault-export.webm"><button class="gold" style="width:100%">⬇ Download video</button></a>
  <p class="hint" style="margin-top:7px">WebM plays in Chrome/Android and uploads directly to YouTube/TikTok. MP4 conversion is on the v2 roadmap.</p></div>`;
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
 renderTextTrack(); renderTextList(); drawFrame();
 flashNow("Template applied ✓ — tap the gold texts on the right to make them yours");
 if(window.innerWidth<=980)document.querySelector(".stage").scrollIntoView({behavior:"smooth"});
}
document.querySelectorAll(".tplchip").forEach(c=>c.onclick=()=>applyTemplate(c.dataset.tpl));
document.querySelectorAll("#stickers button").forEach(b=>b.onclick=()=>{
 const t={id:"t"+(++txtSeq),content:b.textContent,start:+progTime().toFixed(2),end:+Math.min((progDur()||progTime()+2),progTime()+2).toFixed(2),size:96,color:"#ffffff",stroke:false,x:50,y:45};
 if(t.end<=t.start)t.end=t.start+1;
 texts.push(t); selText=t.id; renderTextTrack(); renderTextList(); drawFrame();
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
 $("#capLines").value=""; renderTextTrack(); renderTextList(); drawFrame();
 flashNow(lines.length+" captions added ✓ — they burn into the export");
};
if("serviceWorker" in navigator){window.addEventListener("load",()=>{navigator.serviceWorker.register("sw.js").catch(()=>{})})}
let deferredInstall=null;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e;$("#installBtn").style.display=""});
$("#installBtn").onclick=async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$("#installBtn").style.display="none"};
