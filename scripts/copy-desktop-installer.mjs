#!/usr/bin/env node
// ────────────────────────────────────────────────────────────
// copy-desktop-installer.mjs
// ────────────────────────────────────────────────────────────
// After `tauri build` finishes, Tauri writes installers into
//   src-tauri/target/release/bundle/nsis/VERGR_<version>_x64-setup.exe
//   src-tauri/target/release/bundle/msi/VERGR_<version>_x64_en-US.msi
//
// This helper picks up the newest NSIS build and copies it to
// public/downloads/VERGR-Setup.exe so the download landing page can
// serve it at /downloads/VERGR-Setup.exe after `npm run build` copies
// public/ into dist/.
//
// Run it manually: `node scripts/copy-desktop-installer.mjs`
// Or wired into npm: `npm run desktop:dist`

import { readdirSync, statSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const NSIS_DIR = join(ROOT, 'src-tauri', 'target', 'release', 'bundle', 'nsis');
const MSI_DIR = join(ROOT, 'src-tauri', 'target', 'release', 'bundle', 'msi');
const DEST_DIR = join(ROOT, 'public', 'downloads');
const DEST_EXE = join(DEST_DIR, 'VERGR-Setup.exe');
const DEST_MSI = join(DEST_DIR, 'VERGR-Setup.msi');

function newestFile(dir, extension) {
  if (!existsSync(dir)) return null;
  const candidates = readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(extension))
    .map((f) => {
      const full = join(dir, f);
      return { full, mtime: statSync(full).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);
  return candidates[0]?.full || null;
}

function copyIfFound(src, dest, label) {
  if (!src) {
    console.warn(`[copy-desktop-installer] No ${label} found — skipping.`);
    return false;
  }
  mkdirSync(DEST_DIR, { recursive: true });
  copyFileSync(src, dest);
  const size = (statSync(dest).size / 1_048_576).toFixed(1);
  console.log(`[copy-desktop-installer] ${label} → ${dest} (${size} MB)`);
  return true;
}

const nsis = newestFile(NSIS_DIR, '.exe');
const msi = newestFile(MSI_DIR, '.msi');

const okExe = copyIfFound(nsis, DEST_EXE, 'NSIS installer');
const okMsi = copyIfFound(msi, DEST_MSI, 'MSI installer');

if (!okExe && !okMsi) {
  console.error(
    '[copy-desktop-installer] Nothing to copy. Run `npx tauri build` first.'
  );
  process.exit(1);
}
