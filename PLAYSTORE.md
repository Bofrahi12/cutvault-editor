# CutVault — Play Store pack (prepared 2026-10-21)

## Status
- The app is an installable PWA at https://bofrahi12.github.io/cutvault-editor/
  (manifest + service worker + icons in this repo). It can be installed TODAY for free:
  open the link in Chrome on Android → ⋮ menu → "Install app" / "Add to Home screen".
- Publishing on Google Play itself requires the OWNER's Google Play Console account:
  one-time $25 developer fee + Google identity verification, in the owner's name.
  No one can do this step for him or waive the fee. Everything else below is ready.

## Free packaging route (when the Play account exists)
1. Go to https://www.pwabuilder.com → enter the app URL → "Package for Android".
2. Download the generated Android App Bundle (.aab) + asset-links file.
3. Put the asset-links values PWABuilder gives into the repo file
   `/.well-known/assetlinks.json` and redeploy (needed for the app to open full-screen without the browser bar).
4. Play Console → Create app → upload the .aab → complete the listing below → submit for review.

## Store listing (draft, honest — no copied CapCut text)
- App name: CutVault — Video Editor
- Short description (80c): Easy video editor: templates, captions, filters, music & fast export.
- Full description:
  CutVault is a free, easy video editor that runs entirely on your device.
  • Multi-clip timeline: trim, split, duplicate, reorder, speed control
  • One-tap templates: Reel Hook, Cinematic, Product Ad, Vlog, Real Estate
  • Timed text, stickers and quick captions that burn into your export
  • Filters & adjustments, canvas ratios for Reels/TikTok/YouTube (9:16, 16:9, 1:1, 4:5)
  • Background music with volume control
  • Export in your browser — your videos are never uploaded anywhere
  Perfect for creators, small businesses and real-estate tours.
- Category: Video Players & Editors · Contains no ads · Free
- Screenshots: capture from the live app on the phone (editor, templates sheet, export result).

## NOT claimed (honesty)
CutVault is an original product. It is not CapCut, not affiliated with ByteDance,
and does not include CapCut Pro's subscription features (cloud AI captions,
background removal, stock cloud library). Those need server AI and licensing;
on-device Whisper captions are the planned next milestone.
