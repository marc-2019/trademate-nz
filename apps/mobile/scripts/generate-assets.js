/**
 * BossBoard - Asset Generator Script (sharp-based)
 *
 * Generates branded PNG image assets for the Expo mobile app using the 'sharp' package.
 * sharp uses pre-built native binaries (no C++ build tools needed on Windows).
 *
 * Usage:
 *   node scripts/generate-assets.js
 *   (or) npm run generate:assets
 *
 * Prerequisites:
 *   npm install sharp --save-dev
 *
 * Generated assets:
 *   - assets/icon.png             (1024x1024) - App icon
 *   - assets/adaptive-icon.png    (1024x1024) - Android adaptive icon (safe area centered)
 *   - assets/splash-icon.png      (512x512)   - Expo SDK 50+ splash icon
 *   - assets/notification-icon.png (96x96)    - Android notification icon
 *   - assets/favicon.png          (48x48)     - Web favicon
 */

// ---------------------------------------------------------------------------
// Dependency check
// ---------------------------------------------------------------------------
let sharp;
try {
  sharp = require('sharp');
} catch (_err) {
  console.error('ERROR: The "sharp" package is not installed.\n');
  console.error('Install it with:\n');
  console.error('  npm install sharp --save-dev\n');
  process.exit(1);
}

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Brand constants
// ---------------------------------------------------------------------------
const NAVY = '#1e3a5f';
const ACCENT = '#2563EB';
const WHITE = '#FFFFFF';

// Output directory (apps/mobile/assets)
const ASSETS_DIR = path.join(__dirname, '..', 'assets');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Ensure the assets directory exists. */
function ensureAssetsDir() {
  if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
    console.log('  Created assets directory:', ASSETS_DIR);
  }
}

/** Save a sharp buffer to a PNG file and log the result. */
async function saveBuffer(buffer, filename, width, height) {
  const filePath = path.join(ASSETS_DIR, filename);
  fs.writeFileSync(filePath, buffer);
  const kb = (buffer.length / 1024).toFixed(1);
  console.log(`  [OK] ${filename} (${width}x${height}, ${kb} KB)`);
}

/**
 * Create a PNG from an SVG string using sharp.
 */
async function svgToPng(svgString, width, height, filename) {
  const buffer = await sharp(Buffer.from(svgString))
    .resize(width, height)
    .png()
    .toBuffer();
  await saveBuffer(buffer, filename, width, height);
}

// ---------------------------------------------------------------------------
// 1. App Icon  (1024 x 1024)
// ---------------------------------------------------------------------------
async function generateIcon() {
  const size = 1024;
  const radius = 180;

  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="${NAVY}" />
      <text x="${size / 2}" y="${size / 2}"
            font-family="Arial, Helvetica, sans-serif"
            font-weight="bold" font-size="420"
            fill="${WHITE}" text-anchor="middle" dominant-baseline="central">BB</text>
    </svg>`;

  await svgToPng(svg, size, size, 'icon.png');
}

// ---------------------------------------------------------------------------
// 2. Adaptive Icon  (1024 x 1024)
//    Content must fit within the inner 66% (safe area).
//    Background color is set separately in app.json.
// ---------------------------------------------------------------------------
async function generateAdaptiveIcon() {
  const size = 1024;
  const safeSize = Math.round(size * 0.66);
  const cx = size / 2;
  const cy = size / 2;
  const bbFontSize = Math.round(safeSize * 0.52);

  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="${NAVY}" />
      <text x="${cx}" y="${cy}"
            font-family="Arial, Helvetica, sans-serif"
            font-weight="bold" font-size="${bbFontSize}"
            fill="${WHITE}" text-anchor="middle" dominant-baseline="central">BB</text>
    </svg>`;

  await svgToPng(svg, size, size, 'adaptive-icon.png');
}

// ---------------------------------------------------------------------------
// 3. Splash Icon  (512 x 512) — Expo SDK 50+ uses splash icon, not full image
// ---------------------------------------------------------------------------
async function generateSplashIcon() {
  const size = 512;

  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="${NAVY}" rx="80" ry="80" />
      <text x="${size / 2}" y="${size / 2}"
            font-family="Arial, Helvetica, sans-serif"
            font-weight="bold" font-size="210"
            fill="${WHITE}" text-anchor="middle" dominant-baseline="central">BB</text>
    </svg>`;

  await svgToPng(svg, size, size, 'splash-icon.png');
}

// ---------------------------------------------------------------------------
// 4. Legacy Splash Screen  (1284 x 2778) — For older Expo SDK / fallback
// ---------------------------------------------------------------------------
async function generateSplash() {
  const width = 1284;
  const height = 2778;
  const cx = width / 2;
  const cy = height / 2;

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="${NAVY}" />
      <text x="${cx}" y="${cy - 40}"
            font-family="Arial, Helvetica, sans-serif"
            font-weight="bold" font-size="140"
            fill="${WHITE}" text-anchor="middle" dominant-baseline="central">BossBoard</text>
      <line x1="${cx - 100}" y1="${cy + 40}" x2="${cx + 100}" y2="${cy + 40}"
            stroke="${ACCENT}" stroke-width="3" />
      <text x="${cx}" y="${cy + 100}"
            font-family="Arial, Helvetica, sans-serif"
            font-size="36"
            fill="rgba(255,255,255,0.75)" text-anchor="middle" dominant-baseline="central">Built for Kiwi Tradies</text>
    </svg>`;

  await svgToPng(svg, width, height, 'splash.png');
}

// ---------------------------------------------------------------------------
// 5. Notification Icon  (96 x 96)
//    Android requires white silhouette on transparent background.
// ---------------------------------------------------------------------------
async function generateNotificationIcon() {
  const size = 96;

  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <text x="${size / 2}" y="${size / 2 + 2}"
            font-family="Arial, Helvetica, sans-serif"
            font-weight="bold" font-size="52"
            fill="${WHITE}" text-anchor="middle" dominant-baseline="central">BB</text>
    </svg>`;

  // Create with transparent background
  const svgBuffer = Buffer.from(svg);
  const buffer = await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toBuffer();
  await saveBuffer(buffer, 'notification-icon.png', size, size);
}

// ---------------------------------------------------------------------------
// 6. Favicon  (48 x 48)
// ---------------------------------------------------------------------------
async function generateFavicon() {
  const size = 48;
  const radius = 8;

  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="${NAVY}" />
      <text x="${size / 2}" y="${size / 2 + 1}"
            font-family="Arial, Helvetica, sans-serif"
            font-weight="bold" font-size="22"
            fill="${WHITE}" text-anchor="middle" dominant-baseline="central">BB</text>
    </svg>`;

  await svgToPng(svg, size, size, 'favicon.png');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('');
  console.log('  BossBoard - Asset Generator (sharp)');
  console.log('  =======================================');
  console.log('');
  console.log(`  Brand:  Navy ${NAVY}  |  Accent ${ACCENT}`);
  console.log(`  Output: ${ASSETS_DIR}`);
  console.log('');

  try {
    ensureAssetsDir();

    await generateIcon();
    await generateAdaptiveIcon();
    await generateSplashIcon();
    await generateSplash();
    await generateNotificationIcon();
    await generateFavicon();

    console.log('');
    console.log('  All 6 assets generated successfully!');
    console.log('');
  } catch (err) {
    console.error('');
    console.error('  ERROR generating assets:', err.message);
    console.error('');
    if (err.stack) {
      console.error(err.stack);
    }
    process.exit(1);
  }
}

main();
