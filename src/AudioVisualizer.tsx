import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { visualizerManager } from './visualizerManager';

export default function AudioVisualizer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  // References to WebGL resources for safe cleanup
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const geometryRef = useRef<THREE.PlaneGeometry | null>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // 1. Initialize our singleton VisualizerManager
    visualizerManager.init(width, height);
    const butterchurnCanvas = visualizerManager.getCanvas();
    const visualizer = visualizerManager.getVisualizer();

    if (!butterchurnCanvas || !visualizer) {
      console.error('Visualizer failed to initialize');
      return;
    }

    // 2. Setup Three.js Scene, Camera, and WebGLRenderer
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap at 2 for performance
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 3. Create Three.js Texture from hidden Butterchurn canvas
    const texture = new THREE.CanvasTexture(butterchurnCanvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    textureRef.current = texture;

    // Pre-allocate geometry and material (WebGL Optimization Rule)
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.MeshBasicMaterial({ map: texture });
    geometryRef.current = geometry;
    materialRef.current = material;

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // 4. Setup Post-Processing (Removed)

    // 5. The Render Loop
    const renderLoop = () => {
      // 60-FPS render calls (decoupled from React render triggers)
      if (visualizerManager.getVisualizer()) {
        // Render current Butterchurn visual math/fractals
        visualizerManager.getVisualizer().render();

        // Notify Three.js to re-read the canvas texture
        if (textureRef.current) {
          textureRef.current.needsUpdate = true;
        }

        // Render Three.js scene
        renderer.render(scene, camera);
      }
      animationFrameIdRef.current = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    // 6. Handle Window Resizing
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      if (rendererRef.current) {
        rendererRef.current.setSize(w, h);
      }
      visualizerManager.resize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup resources to prevent WebGL context leaks / crashes
    return () => {
      window.removeEventListener('resize', handleResize);

      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }

      // Explicitly dispose Three.js objects (WebGL Optimization Protocol)
      if (geometryRef.current) {
        geometryRef.current.dispose();
      }
      if (materialRef.current) {
        materialRef.current.dispose();
      }
      if (textureRef.current) {
        textureRef.current.dispose();
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (rendererRef.current.domElement && rendererRef.current.domElement.parentNode) {
          rendererRef.current.domElement.parentNode.removeChild(rendererRef.current.domElement);
        }
      }
      
      rendererRef.current = null;
      textureRef.current = null;
      geometryRef.current = null;
      materialRef.current = null;
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden' }} />;
}
