# Butterchurn Desktop Visualizer Blueprint

## 1. Vision & Architecture
This project is a standalone desktop application designed to provide world-class, authentic MilkDrop audio visualization reacting to the user's local system audio or microphone.

### Technological Stack
*   **Application Framework:** Electron.js (Provides the Chromium window and Node.js backend).
*   **Frontend Framework:** React 18 + Vite (For building the modern UI overlays like preset selectors and settings menus).
*   **Visualization Engine:** **Butterchurn** (A pure JavaScript/WebGL 2 reimplementation of MilkDrop/ProjectM).
*   **Audio Routing:** Native Web Audio API (`navigator.mediaDevices.getUserMedia`) to capture loopback/system audio or direct microphone input.

---

## 2. Core Components

### A. The Electron Wrapper (Backend)
The Electron Main Process is responsible for:
*   Creating a borderless, transparent, or fullscreen Chromium window.
*   Handling OS-level permissions (e.g., requesting microphone access on macOS/Windows).
*   Managing global keyboard shortcuts (e.g., pressing Spacebar to change presets).

### B. The React/Vite UI (Frontend)
The React application acts as the UI overlay running *on top* of the WebGL canvas.
*   **UI Overlay:** A sleek, glassmorphic menu that fades out when inactive. It contains controls for:
    *   Selecting Audio Input Devices (Microphone vs. System Audio).
    *   Browsing and selecting Butterchurn presets (MilkDrop `.milk` files).
    *   Adjusting audio sensitivity and blend times.

### C. The Butterchurn Engine (Graphics & Audio)
This is the core of the application.
*   **Initialization:** We create an `AudioContext` and instantiate a `butterchurn` visualizer instance attached to a full-screen `<canvas>`.
*   **Audio Pipeline:** We capture audio using `getUserMedia`, route it into a `MediaStreamAudioSourceNode`, and connect that node directly to the Butterchurn visualizer.
*   **Render Loop:** A `requestAnimationFrame` loop that calls `visualizer.render()` at 60 FPS. Butterchurn handles all the complex FFT analysis and WebGL shader compilation internally based on the active preset.

---

## 3. Development Phases

### Phase 1: Electron & React Scaffolding
*   Initialize a Vite + React + TypeScript project.
*   Install and configure Electron to wrap the Vite dev server.
*   Ensure the Electron window launches successfully with a basic React component.

### Phase 2: Audio Routing & Permissions
*   Configure Electron to automatically grant or request `getUserMedia` permissions.
*   Build a React component to enumerate available audio devices (`navigator.mediaDevices.enumerateDevices`).
*   Successfully capture a `MediaStream` from the selected input.

### Phase 3: Butterchurn Integration
*   Install `butterchurn` and `butterchurn-presets`.
*   Create a full-screen `<canvas>` element behind the React UI.
*   Initialize Butterchurn, connect the captured `MediaStream`, and start the `requestAnimationFrame` render loop.

### Phase 4: Polish & UI
*   Implement a preset browser within the React UI.
*   Add keyboard shortcuts to cycle through presets.
*   Package the application for macOS/Windows distribution using `electron-builder`.
