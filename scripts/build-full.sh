#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
# VERGR — Full Build Script
# Builds the React SPA into dist/app/ and copies static
# marketing pages + assets into dist/ root.
# ═══════════════════════════════════════════════════════════

set -euo pipefail

echo "═══ VERGR Build ═══"
echo ""

# ── Step 1: Clean previous build ──
echo "→ Cleaning dist/..."
rm -rf dist

# ── Step 2: Build the React SPA (outputs to dist/app/) ──
echo "→ Building React SPA..."
npx vite build
echo "  ✓ SPA built → dist/app/"

# ── Step 3: Copy static site pages ──
echo "→ Copying static pages..."
cp site/index.html dist/index.html
cp site/store.html dist/store.html
cp site/download.html dist/download.html
cp site/privacy.html dist/privacy.html
cp site/terms.html dist/terms.html
cp site/styles.css dist/styles.css
cp site/shared.js dist/shared.js
echo "  ✓ Static pages copied → dist/"

# ── Step 4: Copy shared assets from public/ ──
echo "→ Copying shared assets..."
# Backgrounds (used by hero sections)
if [ -d "public/backgrounds" ]; then
  cp -r public/backgrounds dist/backgrounds
  echo "  ✓ Backgrounds copied"
fi

# Icons
if [ -d "public/icons" ]; then
  cp -r public/icons dist/icons
  echo "  ✓ Icons copied"
fi

# Manifest & service workers
[ -f "public/manifest.json" ] && cp public/manifest.json dist/manifest.json
[ -f "public/sw.js" ] && cp public/sw.js dist/sw.js
[ -f "public/firebase-messaging-sw.js" ] && cp public/firebase-messaging-sw.js dist/firebase-messaging-sw.js
[ -f "public/app-ads.txt" ] && cp public/app-ads.txt dist/app-ads.txt
echo "  ✓ Service workers & manifest copied"

# ── Done ──
echo ""
echo "═══ Build complete! ═══"
echo ""
echo "Structure:"
echo "  dist/"
echo "  ├── index.html        (landing page)"
echo "  ├── store.html         (coin store)"
echo "  ├── download.html      (download page)"
echo "  ├── privacy.html       (privacy policy)"
echo "  ├── terms.html         (terms of service)"
echo "  ├── styles.css         (shared design system)"
echo "  ├── shared.js          (shared scripts)"
echo "  ├── backgrounds/       (hero backgrounds)"
echo "  ├── icons/             (app icons)"
echo "  └── app/               (React SPA)"
echo "      ├── index.html"
echo "      └── assets/"
echo ""
echo "Deploy with: firebase deploy --only hosting"
