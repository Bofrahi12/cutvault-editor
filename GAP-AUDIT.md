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
