# TradeMate NZ - Asset Generation Scripts

This directory contains scripts for generating branded image assets for the TradeMate NZ mobile app.

## Prerequisites

Before running the asset generation script, you need to install the `canvas` package:

```bash
npm install canvas --save-dev
```

**Note**: The `canvas` package requires native dependencies. On some systems you may need to install additional libraries:

### Windows
Canvas should work with the pre-built binaries. If you encounter issues, ensure you have the Visual C++ Build Tools installed.

### macOS
```bash
brew install pkg-config cairo pango libpng jpeg giflib librsvg
```

### Linux (Ubuntu/Debian)
```bash
sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
```

## Generating Assets

Once `canvas` is installed, run:

```bash
node scripts/generate-assets.js
```

Or if configured in package.json:

```bash
npm run generate:assets
```

This will generate the following files in the `assets/` directory:

| File | Size | Description |
|------|------|-------------|
| `icon.png` | 1024x1024 | App icon - white "TM" + accent "NZ" on dark navy rounded rect |
| `adaptive-icon.png` | 1024x1024 | Android adaptive icon - content centered in 66% safe area |
| `splash.png` | 1284x2778 | Splash screen - "TradeMate NZ" + tagline on dark navy |
| `notification-icon.png` | 96x96 | Android notification icon - white "TM" on transparent background |
| `favicon.png` | 48x48 | Web favicon - "TM" on dark navy with rounded corners |

## Brand Colors

- **Primary Navy**: `#1e3a5f` (dark navy blue - backgrounds)
- **Accent Blue**: `#2563EB` (blue - "NZ" text, decorative elements)
- **Text**: `#FFFFFF` (white - primary text)

## Customization

To customize the assets, edit `generate-assets.js`:

- Change the `NAVY` and `ACCENT` constants for different brand colors
- Modify font sizes in each generate function
- Adjust the adaptive icon safe area inset (currently 17% per side)

## Replacing with Production Assets

These are programmatically generated assets suitable for beta/development. For production:

1. Replace with professionally designed assets
2. Ensure icon follows iOS Human Interface Guidelines and Android Adaptive Icon spec
3. Test splash screen on various device sizes
4. Verify notification icon renders correctly in the Android status bar
