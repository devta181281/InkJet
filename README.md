# Inkjet

**Turn your digital text into realistic handwriting**

Inkjet is a React Native app that converts typed text into beautiful handwritten notes. Perfect for creating personalized documents, study notes, or adding a human touch to your digital content.

## Features

- 📝 **Text to Handwriting** - Convert any text into realistic handwriting
- 📄 **PDF Import** - Extract text from PDF files to convert
- 🎨 **Customizable Styles** - Choose from multiple handwriting fonts
- 🎭 **Effects** - Apply shadows and scanner effects for realism
- 📱 **Export Options** - Save as image or PDF
- 🌓 **Dark Mode** - Full dark mode support

## Getting Started

### Prerequisites

- Node.js >= 20
- React Native development environment set up

### Installation

```bash
npm install
```

### Running the App

```bash
# Start Metro bundler
npm start

# Run on Android
npm run android

# Run on iOS
cd ios && pod install && cd ..
npm run ios
```

## Tech Stack

- React Native 0.82
- TypeScript
- React Navigation
- React Native WebView (for handwriting generation)

## Project Structure

```
src/
├── components/       # Reusable components
├── context/          # React Context providers
├── screens/          # App screens
├── types/            # TypeScript type definitions
└── utils/            # Utility functions and helpers
```

## License

MIT
