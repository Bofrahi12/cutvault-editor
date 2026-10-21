# CutVault — Play Store pack (v9, updated 2026-10-22)

## Status
- Installable PWA live at https://bofrahi12.github.io/cutvault-editor/ (manifest +
  service worker + icons + store screenshots in this repo). Installable TODAY for free:
  Chrome on Android → ⋮ → "Install app".
- **The one step only the owner can do:** a Google Play Console developer account —
  one-time $25 fee + Google identity verification, in his name. No one can do this for
  him or waive it. When he is ready, Muse walks him through it one step at a time.
- Everything else (packaging inputs, graphics, texts, privacy policy) is READY below.

## Packaging route (free, once the Play account exists)
1. https://www.pwabuilder.com → enter `https://bofrahi12.github.io/cutvault-editor/`
   → Package for Android.
2. Suggested package id: `com.cinevault.cutvault`. Download the .aab + the
   asset-links JSON PWABuilder generates. Keep the signing keystore file SAFE
   (losing it = losing the ability to update the app).
3. Put the asset-links values into `/.well-known/assetlinks.json` in this repo and
   redeploy (lets the app open full-screen, no browser bar).
4. Play Console → Create app → upload .aab → paste the listing below → upload
   graphics from `store-assets/` → privacy policy URL → content ratings &
   data-safety questionnaires (answers below) → submit for review.

## Ready assets (in repo, deployed)
- App icon: `icons/icon-512.png` (also the Play hi-res icon)
- Feature graphic 1024×500: `store-assets/feature-graphic.png`
- Phone screenshots (780×1688): `store-assets/shot-1-editor.png`,
  `shot-2-templates.png`, `shot-3-smart.png`, `shot-4-effects.png`
- Privacy policy (live): https://bofrahi12.github.io/cutvault-editor/privacy.html

## Store listing (v9-accurate, honest)
- **App name:** CutVault — Video Editor
- **Short description (≤80c):** Easy video editor: AI captions, background remover, templates & 4K export.
- **Full description:**
  CutVault is a free, private video editor that runs entirely on your device —
  your videos are never uploaded anywhere.

  EDIT
  • Multi-clip timeline: trim, split, duplicate, drag to reorder, timeline zoom
  • Speed control with ramps (slow-mo hero moments), freeze frames, reverse
  • Picture-in-picture overlays and per-clip transform (zoom, pan, flip, rotate)
  • Keyframe animation for zoom, position, opacity and rotation
  • Person tracking — the camera follows your subject automatically

  AI TOOLS (on-device)
  • Auto captions from speech (Whisper) + karaoke word highlighting
  • AI background remover and green-screen chroma key
  • Auto-ducking: music dips under your voice by itself

  STYLE
  • 32 one-tap templates (Reels, ads, weddings, gaming, real estate…)
  • 20 filter looks, pro color (temperature, tint, vibrance), post FX
    (vignette, film grain, glow, light leaks, glitch)
  • 14 text styles, 60 stickers, 14 transitions incl. true crossfade
  • Two audio tracks with fades — music + voiceover

  EXPORT
  • MP4 or WebM, up to 4K, ratios 9:16 / 16:9 / 1:1 / 4:5 for TikTok, Reels, YouTube
  • Projects auto-save on your device, plus 3 named project slots

  No account. No ads. No watermarks. No uploads.
  Made by CineVault. CutVault is an original app, not affiliated with CapCut/ByteDance.
- **Category:** Video Players & Editors · Free · No ads · No in-app purchases

## Play questionnaires — truthful answers
- Data safety: **No data collected, no data shared.** (Media is processed on-device;
  optional AI model files are downloaded from public CDNs — declare "app downloads
  content" only if the form asks about network use; no user data leaves the device.)
- Content rating: everyone / general creative tool. No user-generated public content,
  no social features, no purchases.
- Target audience: 13+ general (creative tool).
- Ads declaration: contains no ads.

## NOT claimed (honesty)
CutVault is an original clean-room product. It has no cloud stock library,
no team collaboration and no cloud rendering — editing is on-device by design.
