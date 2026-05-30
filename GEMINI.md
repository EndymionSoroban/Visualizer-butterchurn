**CRITICAL LONG-TERM MEMORY:** This document serves as the absolute ground-truth for the visualizer's system architecture. 
YOU MUST UPDATE THIS FILE CONTINUOUSLY whenever architectural paradigms shift, new data flows are established, or core algorithms are refined.
For every core system component, you must explicitly document:
1. **Purpose:** What the function/module does (its singular responsibility).
2. **Data Signatures:** The expected input and output data structures.
3. **Interactions:** How it interfaces with other components.
4. **Constraints:** Any known edge cases, browser limitations, or required fallback mechanisms.

1. Architectural Stack (The Butterchurn Desktop Pivot)
*   **Application Shell:** Electron (Node.js backend, Chromium frontend) for packaging as a standalone desktop app.
*   **Frontend UI:** React 18 + Vite. Used strictly for UI overlays (menus, preset selectors).
*   **Visualization Engine:** Butterchurn (JavaScript/WebGL 2 port of MilkDrop).
*   **Audio Source:** Local System Audio or Microphone via `navigator.mediaDevices.getUserMedia()`. No Spotify API integration.

2. Core Operational Rules
*   **UI vs Canvas Decoupling:** The React UI must float independently on top of the Butterchurn `<canvas>`. Do not intertwine React state with the high-frequency 60-FPS Butterchurn render loop.
*   **Audio Context Lifecycle:** The `AudioContext` and Butterchurn visualizer instance should be singletons initialized once, rather than recreated on component mounts.
*   **Permissions:** Electron's main process must be configured to silently grant or properly request microphone/audio-capture permissions from the OS.

3. Agentic Development Rules
*   **Intent-Based Architecture:** As the agent, focus on executing the human developer's high-level architectural intent rather than manual scripting.
*   **Subagent Specialization:** Break down complex tasks and delegate them mentally to specialized domains (Electron Backend, React UI, Audio Pipeline, Butterchurn Graphics).
*   **Artifact Management:** Always utilize `implementation_plan.md`, `task.md`, and `walkthrough.md` to track progress and request user feedback before major architectural shifts.
