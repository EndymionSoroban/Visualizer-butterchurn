import butterchurn from 'butterchurn';
import butterchurnPresets from 'butterchurn-presets';
import customPsychedelicOrganic from './custom-presets/_Psychodelic_organic.json';

export interface VisualizerPreset {
  name: string;
  preset: any;
}

class VisualizerManager {
  private audioContext: AudioContext | null = null;
  private visualizer: any = null;
  private canvas: HTMLCanvasElement | null = null;
  private sourceNode: AudioNode | null = null;
  private micStream: MediaStream | null = null;
  private presets: Record<string, any> = {};
  private activePresetName: string = '';
  private currentSourceType: 'file' | 'mic' = 'file';
  private selectedMicDeviceId: string = '';
  private fileSourceNode: MediaElementAudioSourceNode | null = null;

  public init(canvasWidth: number, canvasHeight: number) {
    if (this.audioContext) return; // Only initialize once

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioContextClass();

    // Create a hidden canvas for Butterchurn rendering
    this.canvas = document.createElement('canvas');
    this.canvas.width = canvasWidth;
    this.canvas.height = canvasHeight;

    this.visualizer = butterchurn.createVisualizer(this.audioContext, this.canvas, {
      width: canvasWidth,
      height: canvasHeight,
      pixelRatio: window.devicePixelRatio || 1,
      textureRatio: 1,
    });

    // Load presets
    this.presets = butterchurnPresets.getPresets();
    this.presets['_Psychodelic_organic'] = customPsychedelicOrganic;
    const presetNames = Object.keys(this.presets);
    if (presetNames.length > 0) {
      // Pick a random default preset
      const randomPresetName = presetNames[Math.floor(Math.random() * presetNames.length)];
      this.loadPreset(randomPresetName, 0.0);
    }
  }

  public getAudioContext() {
    return this.audioContext;
  }

  public getVisualizer() {
    return this.visualizer;
  }

  public getCanvas() {
    return this.canvas;
  }

  public getPresetsList(): string[] {
    return Object.keys(this.presets);
  }

  public getActivePresetName(): string {
    return this.activePresetName;
  }

  public getSourceType(): 'file' | 'mic' {
    return this.currentSourceType;
  }

  public loadPreset(name: string, blendTime: number = 1.5) {
    if (!this.visualizer || !this.presets[name]) return;
    try {
      this.visualizer.loadPreset(this.presets[name], blendTime);
      this.activePresetName = name;
    } catch (e) {
      console.error('Failed to load Butterchurn preset:', name, e);
    }
  }

  // Connect local file source (HTMLAudioElement)
  public connectAudioElement(audioElement: HTMLAudioElement) {
    if (!this.audioContext || !this.visualizer) return;
    
    // Resume audio context if suspended (browser autoplay restrictions)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    this.disconnectSource();
    this.currentSourceType = 'file';

    // Reuse the existing source node if already created for this element to prevent browser duplicate connection errors
    if (!this.fileSourceNode) {
      this.fileSourceNode = this.audioContext.createMediaElementSource(audioElement);
    }

    // Connect to visualizer
    this.visualizer.connectAudio(this.fileSourceNode);
    // Connect to destination so the user can hear it
    this.fileSourceNode.connect(this.audioContext.destination);
    
    this.sourceNode = this.fileSourceNode;
  }

  // Connect microphone or system loopback audio source
  public async connectMicrophone(deviceId?: string) {
    if (!this.audioContext || !this.visualizer) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    this.disconnectSource();
    this.currentSourceType = 'mic';
    this.selectedMicDeviceId = deviceId || '';

    const constraints = {
      audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      video: false,
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.micStream = stream;

      const micSource = this.audioContext.createMediaStreamSource(stream);
      // Connect to visualizer ONLY (do NOT connect to audioContext.destination to avoid feedback squealing!)
      this.visualizer.connectAudio(micSource);
      
      this.sourceNode = micSource;
    } catch (err) {
      console.error('Error obtaining media stream / mic permissions:', err);
      throw err;
    }
  }

  public disconnectSource() {
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch (e) {
        // Source may already be disconnected
      }
      this.sourceNode = null;
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }
  }

  public resize(width: number, height: number) {
    if (this.canvas) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    if (this.visualizer) {
      this.visualizer.setRendererSize(width, height);
    }
  }
}

export const visualizerManager = new VisualizerManager();
