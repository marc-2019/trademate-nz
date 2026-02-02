/**
 * TradeMate NZ - Asset Generator Script
 *
 * Generates placeholder images for the Expo mobile app using the 'canvas' package.
 *
 * Usage:
 *   npm run generate:assets
 *
 * Prerequisites:
 *   npm install canvas --save-dev
 *
 * Generated assets:
 *   - icon.png (1024x1024) - App icon with "TM" letters
 *   - adaptive-icon.png (1024x1024) - Android adaptive icon
 *   - splash.png (1284x2778) - Splash screen
 *   - favicon.png (48x48) - Web favicon
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// TradeMate brand colors
const BRAND_BLUE = '#2563EB';
const WHITE = '#FFFFFF';

// Asset directory
const ASSETS_DIR = path.join(__dirname, '..', 'assets');

/**
 * Ensure the assets directory exists
 */
function ensureAssetsDir() {
  if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
    console.log('Created assets directory:', ASSETS_DIR);
  }
}

/**
 * Generate the app icon (1024x1024) with "TM" letters
 */
function generateIcon() {
  const size = 1024;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Blue background
  ctx.fillStyle = BRAND_BLUE;
  ctx.fillRect(0, 0, size, size);

  // Rounded corners (for visual appeal in the source, iOS will mask it)
  // Note: We draw a full square; iOS/Android handle masking

  // "TM" text
  ctx.fillStyle = WHITE;
  ctx.font = 'bold 420px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TM', size / 2, size / 2 + 20);

  // Save
  const buffer = canvas.toBuffer('image/png');
  const filePath = path.join(ASSETS_DIR, 'icon.png');
  fs.writeFileSync(filePath, buffer);
  console.log('Generated:', filePath);
}

/**
 * Generate the adaptive icon (1024x1024) - same as icon for Android
 */
function generateAdaptiveIcon() {
  const size = 1024;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Blue background
  ctx.fillStyle = BRAND_BLUE;
  ctx.fillRect(0, 0, size, size);

  // "TM" text - slightly smaller to account for Android's safe zone
  ctx.fillStyle = WHITE;
  ctx.font = 'bold 320px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TM', size / 2, size / 2 + 15);

  // Save
  const buffer = canvas.toBuffer('image/png');
  const filePath = path.join(ASSETS_DIR, 'adaptive-icon.png');
  fs.writeFileSync(filePath, buffer);
  console.log('Generated:', filePath);
}

/**
 * Generate the splash screen (1284x2778) - iPhone 14 Pro Max size
 */
function generateSplash() {
  const width = 1284;
  const height = 2778;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Blue background
  ctx.fillStyle = BRAND_BLUE;
  ctx.fillRect(0, 0, width, height);

  // "TradeMate" text
  ctx.fillStyle = WHITE;
  ctx.font = 'bold 120px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TradeMate', width / 2, height / 2 - 40);

  // "NZ" subtitle
  ctx.font = '60px Arial, sans-serif';
  ctx.fillText('NZ', width / 2, height / 2 + 50);

  // Tagline
  ctx.font = '36px Arial, sans-serif';
  ctx.globalAlpha = 0.8;
  ctx.fillText('Trade Documentation Made Simple', width / 2, height / 2 + 130);
  ctx.globalAlpha = 1.0;

  // Save
  const buffer = canvas.toBuffer('image/png');
  const filePath = path.join(ASSETS_DIR, 'splash.png');
  fs.writeFileSync(filePath, buffer);
  console.log('Generated:', filePath);
}

/**
 * Generate the favicon (48x48)
 */
function generateFavicon() {
  const size = 48;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Blue background
  ctx.fillStyle = BRAND_BLUE;
  ctx.fillRect(0, 0, size, size);

  // "T" letter (just T for small favicon)
  ctx.fillStyle = WHITE;
  ctx.font = 'bold 32px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('T', size / 2, size / 2 + 2);

  // Save
  const buffer = canvas.toBuffer('image/png');
  const filePath = path.join(ASSETS_DIR, 'favicon.png');
  fs.writeFileSync(filePath, buffer);
  console.log('Generated:', filePath);
}

/**
 * Main execution
 */
function main() {
  console.log('TradeMate NZ - Asset Generator');
  console.log('==============================\n');

  ensureAssetsDir();

  console.log('Generating assets with brand color:', BRAND_BLUE);
  console.log('');

  generateIcon();
  generateAdaptiveIcon();
  generateSplash();
  generateFavicon();

  console.log('\nAll assets generated successfully!');
  console.log('Assets directory:', ASSETS_DIR);
}

// Run
main();
