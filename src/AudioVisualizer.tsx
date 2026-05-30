import React, { useEffect, useRef } from 'react';
import { visualizerManager } from './visualizerManager';

export default function AudioVisualizer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameIdRef = useRef<number | null>(null);

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

    // Since we removed post-processing, we can just append Butterchurn's canvas directly
    butterchurnCanvas.style.width = '100vw';
    butterchurnCanvas.style.height = '100vh';
    containerRef.current.appendChild(butterchurnCanvas);

    // 2. The Render Loop
    const renderLoop = () => {
      // 60-FPS render calls (decoupled from React render triggers)
      if (visualizerManager.getVisualizer()) {
        visualizerManager.getVisualizer().render();
      }
      animationFrameIdRef.current = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    // 3. Handle Window Resizing
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      visualizerManager.resize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup resources
    return () => {
      window.removeEventListener('resize', handleResize);

      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }

      if (butterchurnCanvas && butterchurnCanvas.parentNode) {
        butterchurnCanvas.parentNode.removeChild(butterchurnCanvas);
      }
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden' }} />;
}
