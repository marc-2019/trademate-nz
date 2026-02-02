# TradeMate NZ - Asset Generation Scripts

This directory contains scripts for generating placeholder assets for the TradeMate NZ mobile app.

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
npm run generate:assets
```

This will generate the following files in the `assets/` directory:

| File | Size | Description |
|------|------|-------------|
| `icon.png` | 1024x1024 | App icon with "TM" letters on blue background |
| `adaptive-icon.png` | 1024x1024 | Android adaptive icon (slightly smaller text for safe zone) |
| `splash.png` | 1284x2778 | Splash screen with "TradeMate NZ" text centered |
| `favicon.png` | 48x48 | Web favicon with "T" letter |

## Brand Colors

- **Primary Blue**: `#2563EB` (Tailwind blue-600)
- **Text**: `#FFFFFF` (White)

## Customization

To customize the assets, edit `generate-assets.js`:

- Change `BRAND_BLUE` constant to use a different background color
- Modify font sizes and text in each generate function
- Add additional assets by creating new functions

## Replacing with Production Assets

These are placeholder assets. For production:

1. Replace with professionally designed assets
2. Ensure icon follows iOS/Android guidelines
3. Test splash screen on various device sizes
4. Consider using vector formats (SVG) where possible

## Troubleshooting

### "canvas" package installation fails
- Ensure you have the native dependencies installed (see Prerequisites)
- Try clearing npm cache: `npm cache clean --force`
- On Windows, ensure you have Python and Visual C++ Build Tools

### Fonts look different
- The script uses Arial as a fallback font
- For consistent cross-platform fonts, consider embedding a custom font file

### Images look blurry
- The generated images are at the specified resolution
- Ensure your image viewer is displaying at 100% zoom
