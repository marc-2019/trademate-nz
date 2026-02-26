# Expo + React Native Mobile Stack Reference

**Version**: 1.0.0 | **Last Updated**: 2026-02-03 | **Project**: TradeMate NZ

This document captures the verified working stack configuration for building cross-platform mobile apps with Expo and React Native. Use this as the baseline for future mobile projects.

---

## Core Stack Versions

### React & React Native
| Package | Version | Notes |
|---------|---------|-------|
| `react` | 18.3.1 | Core React library |
| `react-native` | 0.76.6 | React Native framework |

### Expo SDK
| Package | Version | Notes |
|---------|---------|-------|
| `expo` | 52.0.49 | Expo SDK 52 (latest stable) |
| `expo-router` | 4.0.22 | File-based routing (v3 API) |

### Development Tools
| Package | Version | Notes |
|---------|---------|-------|
| `typescript` | 5.9.3 | TypeScript compiler |
| `@babel/core` | 7.29.0 | Babel transpiler |
| `eslint` | 9.39.2 | Linting |
| `@typescript-eslint/parser` | 8.54.0 | TS parser for ESLint |
| `@typescript-eslint/eslint-plugin` | 8.54.0 | TS ESLint rules |

---

## Expo Modules (Verified Working Together)

### Storage & Security
| Package | Version | Purpose |
|---------|---------|---------|
| `expo-secure-store` | 14.0.1 | Encrypted key-value storage (tokens) |
| `expo-sqlite` | 15.0.6 | SQLite database (offline-first) |
| `@react-native-async-storage/async-storage` | 2.2.0 | Async storage (non-sensitive) |

### File & Media
| Package | Version | Purpose |
|---------|---------|---------|
| `expo-file-system` | 18.0.12 | File system access |
| `expo-document-picker` | 13.0.3 | Document selection |
| `expo-image-picker` | 16.0.6 | Camera/gallery access |

### Networking & Constants
| Package | Version | Purpose |
|---------|---------|---------|
| `expo-network` | 7.0.5 | Network state detection |
| `expo-constants` | 17.0.8 | App constants (API URL, etc.) |
| `expo-linking` | 7.0.5 | Deep linking |
| `expo-crypto` | 14.0.2 | Cryptographic functions |

### UI & UX
| Package | Version | Purpose |
|---------|---------|---------|
| `expo-splash-screen` | 0.29.24 | Splash screen control |
| `expo-status-bar` | 2.0.1 | Status bar styling |
| `expo-font` | 13.0.4 | Custom fonts |
| `expo-notifications` | 0.29.14 | Push notifications |

---

## Navigation Stack

| Package | Version | Purpose |
|---------|---------|---------|
| `expo-router` | 4.0.22 | File-based routing |
| `react-native-screens` | 4.4.0 | Native navigation screens |
| `react-native-safe-area-context` | 4.12.0 | Safe area handling |
| `react-native-gesture-handler` | 2.20.2 | Gesture handling |
| `react-native-reanimated` | 3.16.7 | Animations |

---

## Additional UI Libraries

| Package | Version | Purpose |
|---------|---------|---------|
| `@expo/vector-icons` | 14.1.0 | Icon library (MaterialIcons, Ionicons, etc.) |
| `react-native-svg` | 15.8.0 | SVG support |
| `react-native-signature-canvas` | 4.7.2 | Digital signature capture |

---

## Testing Stack

| Package | Version | Purpose |
|---------|---------|---------|
| `jest` | 29.7.0 | Test runner |
| `jest-expo` | 52.0.6 | Expo Jest preset |

### Jest Configuration for Expo
```javascript
// jest.config.js
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
};
```

---

## App Configuration (app.json)

```json
{
  "expo": {
    "name": "App Name",
    "slug": "app-slug",
    "version": "0.1.0",
    "orientation": "portrait",
    "newArchEnabled": true,
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.company.appname"
    },
    "android": {
      "package": "com.company.appname",
      "adaptiveIcon": {
        "backgroundColor": "#FFFFFF"
      }
    },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      "expo-splash-screen"
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

---

## EAS Build Configuration (eas.json)

```json
{
  "cli": {
    "version": ">= 3.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": true },
      "android": { "buildType": "apk" }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "ios": { "resourceClass": "m-medium" }
    }
  }
}
```

---

## Development Setup

### Prerequisites
- Node.js 20+ (LTS)
- npm 10+ or yarn 4+
- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli`
- Expo Go app on iOS/Android device

### Quick Start
```bash
# Create new project
npx create-expo-app@latest my-app --template expo-template-blank-typescript

# Install dependencies
cd my-app
npm install

# Start development server
npx expo start

# iOS-specific: Use tunnel mode for iPhone
npx expo start --tunnel
```

### Running on Physical Device

**Option A: Expo Go (Quickest)**
1. Install Expo Go from App Store / Play Store
2. Run `npx expo start`
3. Scan QR code with camera (iOS) or Expo Go app (Android)

**Option B: Development Build (For native modules)**
```bash
# Login to Expo
eas login

# Build development client
eas build --profile development --platform ios
# or
eas build --profile development --platform android
```

---

## Project Structure

```
mobile-app/
├── app/                      # Expo Router screens (file-based routing)
│   ├── _layout.tsx          # Root layout
│   ├── (auth)/              # Auth group
│   │   ├── _layout.tsx      # Auth stack
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/              # Tab group
│   │   ├── _layout.tsx      # Tab navigator
│   │   ├── index.tsx        # Home tab
│   │   └── ...
│   └── [dynamic]/           # Dynamic routes
│       └── [id].tsx
├── src/
│   ├── contexts/            # React contexts (Auth, Theme, etc.)
│   ├── services/            # API clients, offline sync
│   ├── components/          # Reusable components
│   └── hooks/               # Custom hooks
├── assets/                  # Images, fonts, icons
├── app.json                 # Expo config
├── eas.json                 # EAS Build config
├── tsconfig.json            # TypeScript config
├── babel.config.js          # Babel config
└── package.json
```

---

## TypeScript Configuration

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts"
  ]
}
```

---

## Common Issues & Solutions

### Port Already in Use
```bash
# Use different port
npx expo start --port 8082
```

### Network Request Failed (iOS/Android)
- Ensure device is on same WiFi as development machine
- Use tunnel mode: `npx expo start --tunnel`
- Check API URL is correct in app.json or environment config

### Metro Bundler Cache Issues
```bash
# Clear cache and restart
npx expo start --clear
```

### Native Module Not Found
If using native modules (like expo-sqlite), you may need a development build:
```bash
eas build --profile development --platform ios
```

---

## Compatibility Notes

### Expo SDK 52 Highlights
- React Native 0.76.6 (New Architecture ready)
- `newArchEnabled: true` supported
- expo-router v4 with file-based routing
- expo-sqlite improved performance
- Hermes engine default on both platforms

### Breaking Changes from SDK 51
- expo-router uses v4 API (groups use parentheses syntax)
- Some deprecated APIs removed
- Check migration guide: https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/

---

## References

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Expo Router Documentation](https://docs.expo.dev/router/introduction/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)

---

**Maintained by**: Instilligent Limited
**Used in**: TradeMate NZ, future mobile projects
