# InkCraft

**Transform your text into realistic handwritten notes**

InkCraft is a React Native app that converts typed text into beautiful, customizable handwriting. Perfect for creating personalized notes, study materials, or adding a human touch to digital documents.

## Features

- 📝 **Text to Handwriting** — Convert any text into realistic handwritten pages
- 📄 **PDF Import** — Extract text from PDF files directly
- 🎨 **Multiple Fonts** — Choose from various handwriting styles
- ✏️ **Ink Colors** — Customize the ink color to your preference
- 📐 **Paper Options** — Toggle ruled lines and margins
- 🎭 **Visual Effects** — Apply shadows or scanner effects for realism
- ⚡ **Quality Settings** — Choose between low, medium, and high quality output
- 📤 **Export Options** — Save as images or PDF
- 🌓 **Dark Mode** — Full theme support

## Getting Started

### Prerequisites

- Node.js ≥ 20
- React Native CLI
- Android Studio (for Android)
- Xcode (for iOS)

### Installation

```bash
npm install
```

### Run the App

```bash
# Start Metro
npm start

# Android
npm run android

# iOS
cd ios && pod install && cd ..
npm run ios
```

## Project Structure

```
src/
├── components/     # Reusable UI components
│   ├── ControlRow.tsx       # Settings row component
│   ├── ErrorBoundary.tsx    # Error handling wrapper
│   └── HandwritingGenerator.tsx  # WebView-based generator
│
├── context/        # React Context providers
│   ├── ThemeContext.tsx     # Theme/dark mode
│   └── WebViewContext.tsx   # WebView communication
│
├── screens/        # App screens
│   ├── HomeScreen.tsx       # Text input
│   ├── StylingScreen.tsx    # Style customization
│   └── OutputScreen.tsx     # Result display
│
└── utils/          # Helpers and utilities
    ├── bundledLibs.ts       # Bundled JS libraries
    ├── constants.ts         # App-wide constants
    ├── errorUtils.ts        # Error handling utilities
    ├── fonts.ts             # Font definitions
    ├── htmlTemplate.ts      # WebView HTML generator
    └── theme.ts             # Color theme definitions
```

## Tech Stack

- **React Native** 0.82
- **TypeScript**
- **React Navigation** 7.x
- **react-native-webview** — Core rendering engine
- **react-native-fs** — File system operations
- **react-native-share** — Export functionality
- **PDF.js** — PDF text extraction

## How It Works

InkCraft uses a WebView-based rendering engine that:

1. Takes your text and styling preferences
2. Renders the text with handwriting fonts in an HTML canvas
3. Applies effects (shadows, scanner look)
4. Captures the result as high-quality images
5. Optionally exports to PDF

All processing happens locally. **Note: Active internet connection is required** to load the handwriting fonts from Google Fonts.

## License

MIT
