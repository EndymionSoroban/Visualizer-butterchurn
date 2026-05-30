# Butterchurn Desktop Visualizer

A standalone, immersive desktop application that brings the authentic MilkDrop/ProjectM psychedelic audio visualization experience to modern desktops. Powered by Electron, React 18, WebGL (Three.js), and Butterchurn.

## 🌟 Features

- **Authentic MilkDrop Visuals**: Uses the Butterchurn WebGL engine to render thousands of classic MilkDrop (`.milk`) presets.
- **Dual Audio Routing**: 
  - **Local MP3 Playback**: Play local audio files directly through the visualizer.
  - **System/Microphone Capture**: Visualize your system audio loopback or live microphone input using `navigator.mediaDevices.getUserMedia`.
- **Psychedelic Bloom Post-Processing**: Enhances the visualizer with a custom Three.js `UnrealBloomPass` for a stunning neon glow effect.
- **Glassmorphic UI**: Sleek, modern overlay built with React that auto-hides for pure immersion.
- **Preset Browser**: Search and seamlessly crossfade between presets.
- **Auto-Shuffle**: Automatically cycles through random presets every 15 seconds.

## 🏗️ Architecture

This project employs a decoupled architecture for maximum performance:
1. **Application Shell (Electron)**: Provides the standalone desktop environment, handles OS-level permissions (microphone access), and wraps the Chromium runtime.
2. **Frontend UI (React 18 + Vite)**: Manages state, menus, preset selection, and input devices. The UI floats *independently* on top of the rendering canvas to avoid interfering with the 60FPS render loop.
3. **Audio / Graphics Core (Butterchurn + Three.js)**: 
   - Managed as a singleton via `VisualizerManager` to prevent memory leaks and duplicate audio contexts.
   - The audio pipeline dynamically switches between `MediaElementAudioSourceNode` (for files) and `MediaStreamAudioSourceNode` (for mic/system capture).
   - Three.js captures the Butterchurn output as a `CanvasTexture` and applies post-processing shaders before final rendering.

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd psychedelic-visualizer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Development

Run the Vite dev server with Electron wrapper:
```bash
npm run dev
```

### Building for Production

Package the application into a standalone desktop executable (macOS `.dmg` / Windows `.exe`):
```bash
npm run build
```

## 🛠️ Tech Stack
- **Electron**: Desktop container
- **React 18**: UI Layer
- **Vite**: Build tool and dev server
- **TypeScript**: Type safety
- **Butterchurn**: WebGL audio visualization engine
- **Three.js**: Rendering and Post-processing
- **Web Audio API**: Audio pipeline management
