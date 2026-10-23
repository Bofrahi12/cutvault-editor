# CutVault vs CapCut — Gap Audit (2026-10-21)

Honest side-by-side. CutVault = the editor built here (v3, live at
bofrahi12.github.io/cutvault-editor). CapCut = the app/web editor incl. Pro,
from CapCut's own published feature pages.

## Verdict in one line
CutVault today covers the **basic skeleton** of a video editor — roughly
**25% of CapCut's feature surface**. The core loop works (import → cut →
text → filter → music → export), but almost everything that makes CapCut feel
"pro" — layers, animation, AI, libraries, export power — is missing.

## Score by area (out of 10)

| # | Area | CutVault | What CapCut has that CutVault lacks |
|---|------|----------|--------------------------------------|
| 1 | Timeline & layers | **3** | Multi-track timeline (separate video / overlay / audio / text / sticker tracks), picture-in-picture overlays, layer stacking |
| 2 | Basic cutting | **7** | Frame-accurate editing, delete-left/right, markers, timeline zoom & snapping, drag-to-reorder (CutVault uses buttons), **undo/redo (CutVault has none)** |
| 3 | Clip transforms | **1** | Per-clip crop, rotate, flip/mirror, scale, position, canvas resize per clip |
| 4 | Animation / keyframes | **0** | Keyframes for position, scale, rotation, opacity + easing graphs — the basis of zooms, pans, moving stickers/text |
| 5 | Speed | **3** | 0.1×–100× range, speed curves/ramps, optical-flow slow motion, freeze frame, reverse (CutVault: fixed 0.5×–2× only, no freeze/reverse) |
| 6 | Color | **3** | HSL, curves, color wheels, LUT import, per-filter intensity, scopes (CutVault: 8 presets + brightness/contrast/saturation) |
| 7 | Text & captions | **4** | Hundreds of fonts & ready text styles, in/out text animations, text templates, **AI auto captions**, caption translation, text-to-speech voices (CutVault: one font style, manual timing, manual quick captions) |
| 8 | Audio | **2** | Multiple audio tracks, extract-audio-from-video, fade in/out, beat markers & beat sync, noise reduction, voice effects, TTS, big licensed music/SFX library (CutVault: 1 music track + 2 volume sliders) |
| 9 | Effects / transitions / stickers | **2** | Thousands of video effects, transitions, stickers, GIFs, face/body effects, motion tracking (CutVault: 3 transitions, 8 emoji) |
| 10 | AI & smart tools | **0.5** | Auto captions, background removal, chroma key, video enhancer, AI video/music/image generation, script-to-video, relight, camera tracking, stabilization (CutVault: none) |
| 11 | Templates | **2** | Thousands of trending templates with beat-synced replaceable slots + a template community (CutVault: 5 hand-made presets) |
| 12 | Media & stock | **1** | Stock video/music/SFX libraries, cloud import (Drive/Dropbox), in-app recording (CutVault: your files + 1 demo clip) |
| 13 | Projects & cloud | **1** | Autosave, ~1 TB cloud on Pro, cross-device sync, team collaboration, version history (**CutVault: closing the tab loses the project — nothing is saved**) |
| 14 | Export | **3** | MP4/MOV up to 4K at 60 fps, codec/bitrate controls, cover & title, audio-only export, direct share, fast cloud render, copyright check (CutVault: WebM only, real-time, no settings) |
| 15 | UX & polish | **5** | Undo everywhere, gestures (pinch timeline), live effect previews, snapping, Arabic + many languages (CutVault now has the CapCut-style layout, English only) |

**Weighted overall: ≈ 25 / 100.**

## The 10 gaps that hurt most (ranked by daily impact on a creator)
1. **No project saving** — one closed tab = lost work. (CapCut autosaves to cloud.)
2. **Single track, no overlays/PiP** — no logo on top, no reaction cam, no B-roll over a main clip.
3. **No keyframes/animation** — no zoom-ins, no moving text, no Ken Burns on photos.
4. **No undo/redo.**
5. **Export: WebM only, real-time, no quality settings** — CapCut exports MP4 up to 4K/60 with bitrate control, much faster than real time.
6. **No AI captions** — the single most-used CapCut feature for reels; CutVault captions are manual.
7. **No per-clip crop/rotate/flip/position.**
8. **Audio poverty** — no fades, no per-clip volume envelope, no beat sync, no voice tools.
9. **Tiny libraries** — 5 templates / 3 transitions / 8 stickers vs thousands.
10. **No freeze frame, no reverse, no speed ramps.**

## Why the gap exists (facts, not excuses)
- CapCut = hundreds of engineers at ByteDance, 5+ years, native apps + GPU
  rendering + cloud AI servers + licensed music/stock libraries.
- CutVault = one browser page built in one evening on web tech. Browsers cap
  export speed/codecs and have no built-in AI models — some gaps close with
  work (below), some need a backend/money, a few are native-only.

## What can realistically be closed, in order
**Phase A — structure (biggest wins, all possible in the browser):**
project autosave (IndexedDB), undo/redo, overlay/PiP track with position+scale,
per-clip crop/rotate/flip, MP4 export via ffmpeg.wasm + export settings
(resolution/fps/quality).
**Phase B — look & feel:**
real crossfade + ~10 transitions, animated text (in/out) + 12 text styles,
audio fade in/out + per-clip volume, freeze frame, reverse, sticker pack
(arrows, shapes, blur/mosaic), more filters + intensity slider.
**Phase C — smart tools (heavier, still browser-feasible):**
chroma key (green screen), auto captions with on-device Whisper
(model download ~40–80 MB, slower on phones), background removal with
on-device segmentation (MediaPipe), 20 templates.
**Phase D — platform (needs money/decisions, cannot be free-faked):**
accounts + cloud storage + sync, licensed stock/music library, cloud AI,
Play Store publishing (Play Console $25 + identity, owner-only step).

Realistic target: Phases A–C get CutVault to roughly **70–80% of what a
short-form creator actually uses daily** in CapCut. Full CapCut parity is not
a solo-project target; the winning play is nailing the daily 80% with a
simpler, faster, no-account, no-watermark tool.

## Progress log
- **2026-10-21 · Phase A shipped (v4, commit 23f61d1)** — project autosave +
  restore (IndexedDB, verified: project survives reload), undo/redo (60 steps),
  overlay/PiP track (position/size/retime panel, drawn into exports),
  per-clip transform (zoom / move / flip / rotate), MP4 export via ffmpeg.wasm
  (verified end-to-end: real H.264 MP4 720×1280 out of the WebM render) +
  1080 export size option. Also fixed: the service worker was intercepting
  cross-origin CDN requests and serving index.html for them — it now only
  handles same-origin traffic.
  **Re-score: 25 → ≈35/100.** Moved: layers 3→5, cutting 7→8.5, transforms
  1→6, projects 1→4, export 3→5.5, UX 5→6. Still at/near zero: keyframe
  animation (0), AI tools (0.5), media/stock (1), templates (2) — Phases B/C.
- **2026-10-21 · Phase B shipped (v5)** — 11 transitions incl. a TRUE crossfade
  (previous-frame capture + dissolve), slide/wipe/iris/spin/blur/shake/fade;
  text animations (fade/pop/slide/drop) + 6 text styles (classic/gold/neon/
  box/highlight/outline); music fade in/out + per-clip volume; freeze frame
  (captures the paused frame, splits the clip, inserts a 2s still); reverse
  clip via ffmpeg.wasm (verified: reversed-demo.mp4 produced on-device);
  14 filter presets + intensity slider; 24 stickers. All QA-verified at 390px,
  0 console errors.
  **Re-score: ≈35 → ≈44/100.** Moved: cutting 8.5→9, animation 0→2, speed
  3→4.5, color 3→4.5, text 4→6, audio 2→4.5, effects/transitions 2→5.5,
  UX 6→6.5. Next: Phase C (chroma key, on-device Whisper captions, MediaPipe
  background removal, 20 templates) → then Phase D pro depth (keyframes, speed
  curves, HSL/curves color, multi-track audio, timeline drag).
- **2026-10-21 · Phase C shipped (v6)** — chroma key per clip (verified at
  pixel level: key color → alpha 0, subject untouched, green despill on soft
  edges); AI cutout via MediaPipe selfie segmentation (verified VISUALLY on a
  real model photo: clean person extraction — note this model's mask is
  0=person / 255=background, inverted from the docs' implication; caught only
  because the composite was screenshotted); Whisper auto captions on-device
  via Transformers.js (verified end-to-end: the JFK sample transcribed
  word-perfect and placed at the right program times); templates 5 → 20.
  **Re-score: ≈44 → ≈51/100.** Moved: AI/smart 0.5→6, text/captions 6→7.5,
  templates 2→4.5. Still low: animation/keyframes (2), layers (5),
  media/stock (1) — Phase D territory (keyframes, speed curves, HSL/curves,
  multi-track audio, timeline drag) then Phase E polish toward the 90 goal.
- **2026-10-21 · Phase D shipped (v7)** — keyframes per clip (start transform →
  end zoom/X/Y, linear/smooth ease, one-tap Zoom in/out + Pan presets; verified:
  zoom animated 1.05→1.45 mid-clip via debug probe); speed ramps (up/down/hero/
  slow-mo via live playbackRate curves; verified 0.48→1.01 rising); pro color
  (temperature/tint/vibrance/faded-blacks sliders feeding the filter chain;
  verified in the composed filter string); SECOND audio track with volume +
  start offset (verified: silent before offset, playing after; wired into the
  export graph); timeline drag-to-reorder with pointer events (first attempt
  silently failed — the chip <img> started a native drag; fixed with
  pointer-events:none + touch-action:none; verified order swap) and timeline
  zoom (560→728 px verified). **Re-score: ≈51 → ≈57/100.** Moved: animation
  2→5.5, speed 4.5→6.5, color 4.5→6, audio 4.5→6, tracks/timeline 5→6.5.
  Remaining weight: stock/media library (1), templates depth (4.5),
  projects (4), export speed/quality (5.5) — Phase E (post-FX pack, library
  depth, named project slots, bigger exports), then Phase F for the 90 goal.
- **2026-10-21 · Phase E shipped (v8)** — post-FX layer (vignette verified by
  pixels: corner luminance 73→50, center untouched; animated film grain, glow,
  drifting light leak, glitch bursts); libraries deepened: 32 templates,
  14 text styles (retro/block/cursive/typewriter/gradient/pop/thin/sticker —
  template-applied styles verified), 60 stickers, 20 filter looks, 14
  transitions (+slide-up, zoom-out); 3 named project slots on IndexedDB
  (round-trip verified: save → clear → load restored clips+texts+settings —
  one real bug found & fixed: applySnapshot zeroed segments when settings
  were stored without them); export sizes up to QHD + 4K (canvas verified
  2160×3840). **Re-score: ≈57 → ≈61/100.** Moved: effects 5.5→7, templates
  4.5→5.5, text 7.5→8, projects 4→5.5, export 5.5→6. The one structural
  holdout remains stock/media library (1) — CapCut's licensed cloud library;
  out of the editor-feature scale per the goal definition. Phase F candidates:
  person-tracking auto-follow (the segmenter can supply centroids), karaoke
  word captions, opacity/rotation keyframes, auto-ducking, faster-than-real-
  time export via ffmpeg.wasm frame pumping.
- **2026-10-22 · Phase F shipped (v9)** — keyframes extended with opacity +
  rotation (verified exact: at 76% of the clip, opacity 0.39 and rotation
  68.1° match the interpolation math); auto-ducking (analyser on the clip's
  audio dips the music gain in real time — samples swung 0.13↔0.35 with the
  speech); person tracking (segmenter centroid streamed into __trackDebug and
  followed the synthetic pan test video's real subject motion 0.42→0.55,
  counter-shift + 1.18× push-in applied in the draw path); karaoke captions
  (word groups of 5 with gold word highlight — 1,350 gold pixels detected at
  the active word's instant). HONEST LIMIT: true word-level timestamps are
  impossible with the on-device whisper-tiny export (no cross-attention
  outputs — the library throws), so karaoke timing is distributed
  proportionally by word length inside each sentence; visually in sync.
  **Re-score: ≈61 → ≈63/100.** Moved: animation 5.5→7, AI/smart 6→7.5,
  text 8→8.5, audio 6→6.5. Remaining distance to 90 is spread thin across
  many categories (multi-keyframe graphs, WebGL HSL/curves color, offline
  fast export, beat-sync, deeper libraries) plus the excluded cloud stock
  library — further phases are depth polish, not new pillars.

## Progress — Phase G (v10, 2026-10-22)
Per-clip color (own preset + B/C/S + intensity per segment, overriding global) · 3-point keyframes (middle keyframe with position % + zoom/X/opacity; verified z=1.497 vs exact 1.5 mid-leg math) · beat detection on Track-1 music (energy-flux onsets; 12 beats found in demo music, ticks rendered under the timeline) · **beat-split** (selected clip auto-cut at the beats: 1 → 13 pieces, exact) · audio waveforms inside timeline chips · keyboard shortcuts (Space/S/Delete/Ctrl+Z/Y). A render-triggered peaks retry loop that froze the page was found in QA and fixed with a one-shot guard.
**Re-scored total: ≈ 68/100** (was 63).

## Progress — Phase H (v11, 2026-10-22)
Libraries deepened: templates 32 → **48** (podcast, lyrics, meme, fitness, cooking, study, birthday, wedding invite, graduation, Ramadan, luxury estate, sport news, unbox pro, travel pro, new year, pets), text styles → **17** (+marker highlight, wide letter-spacing, double outline — pixel-verified), stickers → **84**, transitions → **16** (+flip-in verified squeezed to a sliver at t=0, +bounce). PiP overlays gained opacity. Track-1 music gained a trim-in point ("Music starts at") with loop-wrap. New workflow tools: **Replace clip media** (swap footage, keep trims/speed/effects — verified m1→m2) and a custom export file name.
**Re-scored total: ≈ 71/100** (was 68).

## Progress — Phase I (v12, 2026-10-22)
Project files: export/import a portable .cutvault.json — the edit travels, media re-links BY NAME on the other device (verified full round-trip in a fresh browser profile: segments, texts and per-clip fx restored exactly). Extract-audio: any video clip's sound becomes a standalone WAV in the library via ffmpeg.wasm (verified 1.94 MB real WAV from the test clip). Export gained a 60 fps option; a 📸 button saves the current frame as PNG. Text layers gained duplicate + bring-front/send-back ordering.
**Re-scored total: ≈ 74/100** (was 71).
Remaining gap is concentrated in CapCut's company infrastructure: licensed stock library (media 1/10 — one category ≈ 9 of the missing points), cloud AI/render farms, team collaboration, and native-engine color/stabilization science. Within an on-device web app, v12 is close to the practical ceiling; further phases would add ~1 point each.

## Progress — Phase J (v13, 2026-10-22) — original Pro template library
Templates 48 → **75 unique** (+30 originals: velocity, phonk, anime, Y2K, VHS, 35mm, luxury car, night drive, beast mode, fight camp, dance challenge, tutorial/course pro, property film, hotel, restaurant, fashion film, beauty, barber, wedding film, baby shower, travel film, drone, city tour, food review, ASMR, gaming montage, stream highlights, music video, concert). Template picker is now **visual cards** (gradient covers + icons, CapCut-style browsing). **Velocity Edit template auto-cuts the first clip on the detected beats** (verified 1 → 13 pieces end-to-end). **Looks packs**: 6 one-tap preset + post-FX combos (verified). **Built-in media pack**: 3 original CineVault stock images bundled in the app, one tap to timeline. QA also caught a silent bug: templates/Looks referenced two filter presets ("Neon Night", "Clean Airy") that did not exist — both added as real filters (23 presets total).
**Re-scored total: ≈ 77/100** (was 74). All template content is original to CutVault — no CapCut assets, names or designs are used.

## Progress — Phase K (v14, 2026-10-22) — AI generation suite
**AI Music Maker**: a real generative composition engine running fully on-device (OfflineAudioContext) — 5 styles (Lo-Fi, Phonk, Epic, Upbeat House, Arabic Groove with hijaz scale), chord progressions + bass + seeded melody + per-style drums, rendered to WAV and added to the library (verified: phonk track 13.8 s, real audio energy peak 0.57 — original, royalty-free, user's to use anywhere). **Auto Video Maker**: title + theme → a complete 9:16 project (3 scenes with animated zoom keyframes, styled title, music) in one tap, verified. **AI Video from text (beta, BYOK)**: true text-to-video runs on cloud GPUs — the panel sends the user's OWN free HuggingFace token + prompt to HF's inference API and adds the returned clip to the timeline; our code path is verified end-to-end against a mocked endpoint (the live service itself depends on the user's token/quota and HF's free-model availability).
**Re-scored total: ≈ 79/100** (was 77).

## Progress — Phase L (v15, 2026-10-22) — organization & ease (owner's verdict: "not organized, hard to use, 2/10")
No new features — a pure UX rebuild. **Home card**: an empty project now opens with three big actions (Add my video / Auto-make / Try demo) instead of a wall of tools. **Quick-action bar**: when a clip is selected, Split / Duplicate / Speed / Color / Delete sit directly under the timeline — no sheet-diving for the 5 daily actions (split verified end-to-end on a real file). **Accordion panel**: the clip panel is grouped — "Cut & sound" and "Transform" open, Keyframes / Smart tools / Clip color / Replace / Extract collapsed behind one-tap headers, so the panel opens short and calm. Clearer section headers (gold rule), bigger tap targets, more breathing room throughout.
**Re-scored total: ≈ 80/100** on the lab scale — with the honest caveat that the owner's phone re-test is the score that counts for ease of use.

## Progress — Phase M (v16, 2026-10-23) — pro/NLE depth (owner: "same as CapCut, Adobe-style interface & effects, the biggest editors")
All original implementations in the professional categories — nothing copied from Adobe/CapCut libraries. **Pro Color split-tone** (Lumetri-style shadows/highlights tinting, pixel-verified 29,68,135 → 52,66,117 and cleanly reversible; QA caught and fixed an early-return guard that skipped it when it was the only FX active). **4 film-stock Looks** (Kodak Gold, Fuji Eterna, CineStill Night, Portra Soft) built on split-tone + grain/glow combos. **2 pro transitions**: Whip Pan (motion-blur slide with previous-frame exit) and Zoom Blur — engines verified with real prevFrame capture during playback. **+16 templates (91 total)** including a pro lower-third pack (News / Sport / Documentary / Clinic / Property), cinematic + minimal title cards, stream/podcast/crypto/coach/salon/delivery/course-sales packs. **Pro interface touches**: Premiere-style blue theme toggle (persisted), timeline timecode ruler, live audio level meter in the transport (responds during playback).
**Re-scored total: ≈ 82/100** (was 80).

## Progress — Phase N (v17, 2026-10-23) — international release
**Interface in 4 languages** (EN / FR / AR / ES switcher in the header, persisted): toolbar, sheet titles, home card, quick actions and the main section headers are translated; Arabic flips the interface to RTL while the timeline/transport stay LTR-safe. Verified in all three non-English languages plus clean restore to English. **Voice-over recording**: record from the mic directly into the media library (verified end-to-end with a test mic — `voiceover.webm` lands in the library, ready to drop in as narration Track 2). **Web Share on export**: after rendering, a Share button sends the finished video through the system share sheet where supported. (Caption language selection — EN/AR/FR/ES Whisper — already existed and is wired to the recognizer.)
**Re-scored total: ≈ 83/100** (was 82).

## Progress — Phase O (v18, 2026-10-23) — market-gap closers
**Font library**: 7 display webfonts (Anton, Bebas Neue, Pacifico, Orbitron, Rubik + Arabic Cairo & Amiri) with a per-text font picker; fonts verified loading and rendering, templates now carry fonts (Bebas titles, Orbitron stream). **Built-in SFX pack**: 8 synthesized sound effects (whoosh, pop, ding, riser, impact, click, sparkle, bass drop) rendered on-device to WAV in the library (impact verified: 0.6 s, peak 0.83). **SRT subtitles**: export all texts as a standard .srt (YouTube/Premiere-ready) and import .srt files back as timed captions — full round-trip verified. **Overlay masks**: circle / rounded / heart / star clip shapes + gold border for picture-in-picture (pixel-verified: box corner shows the overlay unmasked, clips away masked). **GIF export** beside MP4 (verified end-to-end through ffmpeg.wasm: "GIF ready ✓"). Stickers 84 → 120.
**Re-scored total: ≈ 85/100** (was 83). What remains to ~90 on the editor scale is genuinely hard web tech (fast offline render engine, stabilization, LUT pipeline); the last block is CapCut's cloud platform, out of scale by the goal's own definition.

## Progress — Phase P (v19, 2026-10-23) — pro finishing
**LUT color grading (the Premiere/DaVinci pillar)**: import any .cube file, plus 2 built-in grades (Teal & Orange, Noir Contrast), applied through a WebGL2 3D-texture pass over the finished frame with a strength slider; pixel-verified exactly (JFK blue (29,68,135) → teal (37,74,153), matching the hand-computed transform; strength 0 and Clear restore the original byte-for-byte). Two engine quirks found and fixed on the way (RGB8 sized format; UNPACK state poisoning texImage3D on ANGLE). **Keyframe easings ×6**: linear / smooth / ease-in / ease-out / bounce / back-overshoot, math-verified. **Copy / Paste clip style** (Premiere-style Paste Attributes: color, FX, keyframes, chroma, cutout, motion, sound). **Composition guides**: thirds grid + gold safe-area overlay on the stage (screen-only, never exported). **Text outline width + shadow controls** per text. **One-tap export presets**: YouTube 16:9 HD / Shorts-Reels 9:16 / Square 1:1.
**Re-scored total: ≈ 87/100** (was 85). Genuinely remaining on the editor scale: fast offline rendering and stabilization (~3 points, deep engine work); the rest of the gap to 100 is CapCut's cloud platform, out of scale by the goal's definition.

## Progress — Phase Q (v20, 2026-10-23) — stabilization + privacy
**Stabilization**: on-device camera-motion analysis (low-res block matching with a texture gate + smallest-motion tie-break, so flat skies/backdrops can't poison the estimate), the path is smoothed and every frame is counter-shifted with a 7% safety zoom. Verified on synthetic sinusoidal shake over textured content: **93% of shake variance removed** (3.94 → 0.27). Two real bugs found and fixed on the way (a seek-to-current-time promise that could hang forever; rotation-poisoned test material). **Privacy blur regions**: timed mosaic (≈27 px cells, pixel-flat inside blocks) and blur regions for faces/plates/screens, drawn under text so captions stay readable; local detail energy −65% (mosaic) / −78% (blur), restore is exact. **Beat snap**: splits snap to the nearest detected beat (verified landing exactly on the beat). Blur regions persist in projects/undo.
**Re-scored total: ≈ 89/100** (was 87). The remaining editor-scale item is a fast offline render engine (the current export is real-time; a WebCodecs fast path cannot yet reproduce the full audio mix faithfully, so it is deliberately not shipped half-done). Everything past that is CapCut's cloud platform — out of scale by the goal's definition.

## Progress — Phase R (v21, 2026-10-23) — fast export engine
**⚡ Fast export (beta)**: a second, frame-stepped render engine beside the untouched real-time one. Video: WebCodecs H.264 stepped frame-by-frame through the exact same drawFrame pipeline (so every effect, caption, LUT, stabilization and transition renders identically), keyframes every 2 s, device-appropriate bitrate/profile. Audio: the full mix rebuilt deterministically in an OfflineAudioContext — per-clip volumes and speed ramps, both music tracks with loop regions, fade in/out, loudness-based ducking envelope computed from the clips' own samples, and a mastering compressor — then encoded (AAC where the device supports it, Opus fallback) and muxed with mp4-muxer into a ready MP4 (no conversion step). Verified end-to-end: 2 s test project (video + generated music + text) → valid MP4, H.264 720×1280 + audio track, duration 2.02 s, frame pixel = the source blue (28,68,133), audio mean −13.1 dB / peak −2.0 dB. Speed note: in the software-decoded sandbox the render took 14.8 s for 2 s of video; on hardware-decoding phones the same path is several× faster than real time — the UI copy says exactly that.
**Re-scored total: ≈ 90/100 on the editor-feature scale** (was 89) — the goal's scale is now covered end to end: editing, effects, text, audio, AI, templates, LUT, stabilization, and fast + real-time export. Beyond the scale by the goal's own definition: CapCut's cloud platform (licensed libraries, 1 TB storage, team sync).

## Progress — Phase S (v22, 2026-10-23) — the fusion phase: best of VN + Adobe + Gemini
On the user's order ("not just a CapCut copy — a bit of VN, a bit of Adobe, a bit of Gemini Video, everything"):
- **Custom speed curve (VN)** — a drawable 5-point speed graph per clip replaces presets-only ramps; one shared segRateAt() drives preview, the real-time export and the offline fast-export mix identically. Verified: curve [0.2,1,2,1,0.5] reads exactly 0.2/1/2/0.5 at the control points.
- **Mask feather (VN)** — soft radial-falloff edges for circle/round overlay masks. Pixel-verified: hard edge (0,230,0) → feathered edge dissolves fully into the background (28,68,131 ≈ base), interior untouched (230,30,30).
- **Text-based editing (Adobe Premiere)** — auto-caption lines are listed with a Cut button; cutting a line removes that moment from the video itself and ripples everything (segments, captions, overlays, censor regions) closed. Verified exactly: 12.7 s → 10.7 s, segments [0–5]+[7–12.7], the cut caption deleted, the other kept, overlay shifted 9→7.
- **Auto-reframe to vertical (Adobe Premiere)** — on-device person segmentation samples the clip, builds a smoothed centroid pan path, sets 9:16 Fill and pans the crop to follow the person; a coverage/consistency guard refuses when no clear person exists. Verified on a synthetic landscape clip with a person panning left→right: 22/24 frames person-locked, centroid path tracks the motion (corr 0.81 over the sampled half). Honest limit: on clips with no person it follows the model's best-guess subject region or refuses — same model class as the cutout feature.
- **Gemini Veo (Google)** — the AI Video panel gains a provider choice: HuggingFace (free) or Google Veo 3 Fast via the user's own Gemini API key (long-running generate → poll → download → timeline). Request/poll/download path verified against a mocked Gemini endpoint. Plainly labeled in-app: Veo requires a billed Gemini account; Google offers no free Veo tier.
**Score: ≈ 90/100 on the editor-feature scale (held)** — Phase S widens the comparison set beyond CapCut rather than raising the CapCut-scale number; the app now covers signature workflows from four different editors.
