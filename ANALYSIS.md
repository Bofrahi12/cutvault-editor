# CapCut web editor — feature analysis (2026-10-21)
Sources: CapCut official pages (capcut.com/tools/online-video-editor, capcut.com/resource/capcut-tutorial-for-beginners).
REA note: REA's web lane (analyze-web-bundle) requires a loopback CDP browser target; the CapCut editor itself is behind sign-in. Analysis here is feature-level from CapCut's own public documentation — no CapCut code/assets were taken. CutVault is an original clean-room build.

## CapCut core workflow (official)
1. Upload media (device/cloud/Drive/Dropbox/QR) or stock library
2. Timeline: drag clips, trim, split, rearrange; add text, filters, transitions, effects, background music; smart tools (auto captions, background removal)
3. Canvas resize per platform; export with filename/resolution/quality/fps/format settings

## Interface zones
Preview (top) · multi-layer timeline (clips/text/audio rows) · tool menus (trim, speed, filters, sound, transitions, stickers)

## CutVault v1 mapping
IN: multi-clip import (video/image/audio), sequential timeline with per-segment trim in/out, split at playhead, reorder/delete, speed 0.5–2x, filter presets + adjust sliders, canvas ratios 16:9/9:16/1:1/4:5 with fit/fill + blurred background, timed text overlays (content/start/end/size/color/position), music track + volumes, real export (WebM via canvas capture + MediaRecorder, real-time).
OUT (v2 candidates): transitions library, stickers/effects library, auto captions (AI), background removal (AI), stock library, cloud projects, MP4 export via ffmpeg.wasm.
