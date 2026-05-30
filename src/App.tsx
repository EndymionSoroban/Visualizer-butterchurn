import React, { useState, useRef, useEffect } from 'react';
import AudioVisualizer from './AudioVisualizer';
import { visualizerManager } from './visualizerManager';

export default function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [sourceType, setSourceType] = useState<'file' | 'mic'>('file');
  const [presets, setPresets] = useState<string[]>([]);
  const [activePreset, setActivePreset] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [isUiVisible, setIsUiVisible] = useState(true);
  const [isPresetsDrawerOpen, setIsPresetsDrawerOpen] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [songName, setSongName] = useState('Arctic Monkeys - Do I Wanna Know?');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('visualizer-favorites');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('visualizer-favorites', JSON.stringify(favorites));
  }, [favorites]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const idleTimerRef = useRef<number | null>(null);
  const activePresetRef = useRef<HTMLButtonElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Initialize visualizer manager presets
  useEffect(() => {
    // We delay slightly to let visualizerManager initialize
    const timer = setTimeout(() => {
      visualizerManager.init(window.innerWidth, window.innerHeight);
      const presetList = visualizerManager.getPresetsList();
      setPresets(presetList);
      setActivePreset(visualizerManager.getActivePresetName());

      // Fetch input devices
      navigator.mediaDevices.enumerateDevices().then((deviceList) => {
        const audioInputs = deviceList.filter((d) => d.kind === 'audioinput');
        setDevices(audioInputs);
        if (audioInputs.length > 0) {
          setSelectedDevice(audioInputs[0].deviceId);
        }
      });
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Handle source routing (local file vs microphone loopback)
  const setupAudioRouting = async (type: 'file' | 'mic', devId?: string) => {
    try {
      if (type === 'file') {
        if (audioRef.current) {
          visualizerManager.connectAudioElement(audioRef.current);
          if (isPlaying) {
            audioRef.current.play().catch(console.error);
          } else {
            audioRef.current.pause();
          }
        }
      } else {
        // Microphone/System capturing
        if (audioRef.current) {
          audioRef.current.pause();
        }
        await visualizerManager.connectMicrophone(devId || selectedDevice);
      }
      setSourceType(type);
    } catch (err) {
      console.error('Audio routing failed:', err);
    }
  };

  // Toggle play/pause for local file
  const togglePlay = async () => {
    if (sourceType === 'mic') {
      // If mic is selected, clicking play toggles it back to file
      await setupAudioRouting('file');
      setIsPlaying(true);
      return;
    }

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        try {
          setAudioError(null);
          // Ensure visualizer is connected before playing
          visualizerManager.connectAudioElement(audioRef.current);
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (err: any) {
          console.error('Play failed:', err);
          setAudioError(`Play failed: ${err.message || err}`);
          setIsPlaying(false);
        }
      }
    }
  };

  // Switch to system capture/microphone
  const handleSwitchToMic = async (deviceId?: string) => {
    const devId = deviceId || selectedDevice;
    await setupAudioRouting('mic', devId);
    if (deviceId) setSelectedDevice(deviceId);
  };

  // Handle manual preset change
  const handlePresetSelect = (presetName: string) => {
    visualizerManager.loadPreset(presetName, 1.5);
    setActivePreset(presetName);
  };

  // Toggle preset favorite status
  const toggleFavorite = (presetName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid choosing the preset when starring it
    
    // Capture current scroll offset
    const container = scrollContainerRef.current;
    const oldScrollTop = container ? container.scrollTop : 0;

    setFavorites((prev) =>
      prev.includes(presetName)
        ? prev.filter((p) => p !== presetName)
        : [...prev, presetName]
    );

    // Snap the scroll offset right back to prevent visual jumps due to sorting changes
    if (container) {
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = oldScrollTop;
        }
      });
    }
  };

  // Handle seek in song
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // Handle local song file upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && audioRef.current) {
      const fileUrl = URL.createObjectURL(file);
      setSongName(file.name.replace(/\.[^/.]+$/, '')); // Strip extension
      audioRef.current.src = fileUrl;
      setAudioError(null);
      
      // Setup and play the loaded song
      visualizerManager.connectAudioElement(audioRef.current);
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          setupAudioRouting('file');
        })
        .catch((err: any) => {
          console.error('Play failed:', err);
          setAudioError(`Play failed: ${err.message || err}`);
        });
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Auto-hide HUD on mouse inactivity (pure immersion)
  useEffect(() => {
    const resetIdleTimer = () => {
      setIsUiVisible(true);
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
      }
      idleTimerRef.current = window.setTimeout(() => {
        setIsUiVisible(false);
      }, 3500); // Hide UI after 3.5 seconds of no activity
    };

    window.addEventListener('mousemove', resetIdleTimer);
    window.addEventListener('mousedown', resetIdleTimer);
    window.addEventListener('keydown', resetIdleTimer);

    resetIdleTimer();
    return () => {
      window.removeEventListener('mousemove', resetIdleTimer);
      window.removeEventListener('mousedown', resetIdleTimer);
      window.removeEventListener('keydown', resetIdleTimer);
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    };
  }, []);

  // Scroll to active preset when the drawer opens or active preset changes
  useEffect(() => {
    if (isPresetsDrawerOpen && activePresetRef.current) {
      const timer = setTimeout(() => {
        activePresetRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }, 250); // Small delay to let the drawer open transition start/finish
      return () => clearTimeout(timer);
    }
  }, [isPresetsDrawerOpen, activePreset]);

  const filteredPresets = presets.filter((p) =>
    p.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedPresets = [...filteredPresets].sort((a, b) => {
    const aFav = favorites.includes(a);
    const bFav = favorites.includes(b);
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;
    return a.localeCompare(b); // Alphabetical fallback
  });

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#000', overflow: 'hidden' }}>
      {/* Hidden local MP3 audio element */}
      <audio
        ref={audioRef}
        src="/Arctic Monkeys - Do I Wanna Know (Official Video).mp3"
        onEnded={() => setIsPlaying(false)}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
        onDurationChange={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration);
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration);
          }
        }}
        onError={(e) => {
          const err = audioRef.current?.error;
          const msg = err ? `Code ${err.code}: ${err.message || 'Unknown media error'}` : 'Audio load error';
          console.error('Audio element error:', err);
          setAudioError(msg);
        }}
      />

      {/* Hidden File Input for Custom Song Selection */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Fullscreen Decoupled Three.js WebGL / Butterchurn Canvas */}
      <AudioVisualizer />

      {/* SLEEK GLASSMORPHIC HUD SYSTEM */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none', // Allow clicking canvas beneath if needed, but UI elements override this
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '24px',
          opacity: isUiVisible ? 1 : 0,
          transition: 'opacity 0.6s cubic-bezier(0.25, 1, 0.5, 1)',
          zIndex: 10,
        }}
      >
        {/* HEADER BAR */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            pointerEvents: 'auto',
          }}
        >
          {/* Brand/Title */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <h1
              style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: 800,
                fontFamily: 'Outfit',
                letterSpacing: '-0.5px',
                background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 0 20px rgba(0,242,254,0.3)',
              }}
            >
              MILKDROP / BUTTERCHURN DESKTOP
            </h1>
            <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>
              Authentic Psychedelic Shader Engine
            </p>
            {audioError && (
              <div style={{
                marginTop: '8px',
                padding: '6px 12px',
                background: 'rgba(255, 75, 75, 0.15)',
                border: '1px solid rgba(255, 75, 75, 0.3)',
                borderRadius: '8px',
                color: '#ff4b4b',
                fontSize: '11px',
                fontWeight: 500,
                textShadow: '0 0 8px rgba(255,75,75,0.2)'
              }}>
                ⚠️ {audioError}
              </div>
            )}
          </div>

          {/* Active Preset Display HUD */}
          <div
            style={{
              padding: '8px 16px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              backdropFilter: 'blur(16px)',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 30px rgba(0, 0, 0, 0.2)',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
            }}
            onClick={() => setIsPresetsDrawerOpen(!isPresetsDrawerOpen)}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#00f2fe';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.transform = 'scale(1.03)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#00f2fe', borderRadius: '50%', boxShadow: '0 0 8px #00f2fe' }} />
            <span>Preset: <strong style={{ color: '#00f2fe' }}>{activePreset || 'Loading...'}</strong></span>
          </div>
        </div>

        {/* BOTTOM HUD PANEL */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            pointerEvents: 'auto',
            width: '100%',
          }}
        >
          {/* Custom scrubbable audio progress bar */}
          {sourceType === 'file' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '600px',
                maxWidth: '90%',
                padding: '10px 20px',
                background: 'rgba(18, 18, 18, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '20px',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
              }}
            >
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', minWidth: '35px', textAlign: 'right', fontFamily: 'Inter' }}>
                {formatTime(currentTime)}
              </span>
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="progress-slider"
              />
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', minWidth: '35px', fontFamily: 'Inter' }}>
                {formatTime(duration)}
              </span>
            </div>
          )}
          {/* Main Controls Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
              padding: '16px 32px',
              background: 'rgba(18, 18, 18, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '30px',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
              color: 'white',
              maxWidth: '90%',
            }}
          >
            {/* Presets Toggle Button */}
            <button
              onClick={() => setIsPresetsDrawerOpen(!isPresetsDrawerOpen)}
              style={{
                background: isPresetsDrawerOpen ? 'rgba(0, 242, 254, 0.15)' : 'transparent',
                border: '1px solid rgba(255,255,255,0.1)',
                color: isPresetsDrawerOpen ? '#00f2fe' : '#fff',
                padding: '10px 18px',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#00f2fe';
                e.currentTarget.style.transform = 'scale(1.03)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = isPresetsDrawerOpen ? '#00f2fe' : 'rgba(255,255,255,0.1)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="9" />
                <rect x="14" y="3" width="7" height="5" />
                <rect x="14" y="12" width="7" height="9" />
                <rect x="3" y="16" width="7" height="5" />
              </svg>
              <span>Presets</span>
            </button>

            {/* Play/Pause control for Audio File */}
            <button
              onClick={togglePlay}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#fff',
                border: 'none',
                color: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(255,255,255,0.2)',
                transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.08)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(255,255,255,0.35)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(255,255,255,0.2)';
              }}
            >
              {isPlaying && sourceType === 'file' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: '2px' }}>
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Middle Song details / device selection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '220px' }}>
              {sourceType === 'file' ? (
                <>
                  <span
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#00f2fe';
                      e.currentTarget.style.textShadow = '0 0 8px rgba(0,242,254,0.5)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#fff';
                      e.currentTarget.style.textShadow = 'none';
                    }}
                    title="Click to load a custom audio file"
                  >
                    {songName}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                      <path d="M12 5v14M5 12h14"/>
                    </svg>
                  </span>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                    Local Audio File Source (Click to change)
                  </span>
                </>
              ) : (
                <>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#00f2fe' }}>
                    System Loopback / Mic Active
                  </span>
                  <select
                    value={selectedDevice}
                    onChange={(e) => handleSwitchToMic(e.target.value)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'rgba(255,255,255,0.6)',
                      fontSize: '11px',
                      cursor: 'pointer',
                      outline: 'none',
                      padding: 0,
                    }}
                  >
                    {devices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId} style={{ background: '#121212', color: '#fff' }}>
                        {d.label || `Audio Capture Device (${d.deviceId.slice(0, 5)})`}
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: '9px', color: 'rgba(0, 242, 254, 0.45)', marginTop: '2px', whiteSpace: 'nowrap' }}>
                    Tip: Use virtual loopback (e.g. BlackHole) for silent desktop capture
                  </span>
                </>
              )}
            </div>

            {/* Input Toggle (MP3 File vs System Mic) */}
            <div
              style={{
                display: 'flex',
                background: 'rgba(255,255,255,0.05)',
                padding: '4px',
                borderRadius: '15px',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <button
                onClick={() => setupAudioRouting('file')}
                style={{
                  background: sourceType === 'file' ? 'rgba(255,255,255,0.1)' : 'transparent',
                  border: 'none',
                  color: sourceType === 'file' ? '#fff' : 'rgba(255,255,255,0.4)',
                  padding: '6px 14px',
                  borderRadius: '11px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 600,
                  transition: 'all 0.2s ease',
                }}
              >
                MP3 File
              </button>
              <button
                onClick={() => handleSwitchToMic()}
                style={{
                  background: sourceType === 'mic' ? 'rgba(0, 242, 254, 0.15)' : 'transparent',
                  border: 'none',
                  color: sourceType === 'mic' ? '#00f2fe' : 'rgba(255,255,255,0.4)',
                  padding: '6px 14px',
                  borderRadius: '11px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 600,
                  transition: 'all 0.2s ease',
                }}
              >
                System Mic
              </button>
            </div>


          </div>
        </div>
      </div>

      {/* SLIDE-OUT PRESET DRAWER */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: isPresetsDrawerOpen ? 0 : '-420px',
          width: '380px',
          height: '100%',
          background: 'rgba(10, 10, 10, 0.75)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(25px)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          transition: 'right 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
          zIndex: 20,
          color: 'white',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontFamily: 'Outfit', fontSize: '20px', fontWeight: 700 }}>Preset Browser</h2>
          <button
            onClick={() => setIsPresetsDrawerOpen(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.4)',
              cursor: 'pointer',
              fontSize: '20px',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Search presets */}
        <input
          type="text"
          placeholder="Search shaders/presets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '12px 16px',
            color: '#fff',
            fontSize: '13px',
            outline: 'none',
            fontFamily: 'Inter',
          }}
        />

        {/* Preset List */}
        <div
          ref={scrollContainerRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            paddingRight: '4px',
          }}
        >
          {sortedPresets.length > 0 ? (
            sortedPresets.map((p) => {
              const isPresetSelected = p === activePreset;
              const isFav = favorites.includes(p);
              return (
                <button
                  key={p}
                  ref={isPresetSelected ? activePresetRef : null}
                  onClick={() => handlePresetSelect(p)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    textAlign: 'left',
                    background: isPresetSelected ? 'rgba(0, 242, 254, 0.15)' : 'transparent',
                    border: '1px solid',
                    borderColor: isPresetSelected ? 'rgba(0, 242, 254, 0.3)' : 'transparent',
                    color: isPresetSelected ? '#00f2fe' : 'rgba(255,255,255,0.7)',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    lineHeight: '1.4',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                  }}
                  onMouseEnter={(e) => {
                    if (!isPresetSelected) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                      e.currentTarget.style.color = '#fff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isPresetSelected) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                    }
                  }}
                >
                  <span style={{ flex: 1 }}>{p}</span>
                  <span
                    onClick={(e) => toggleFavorite(p, e)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '50%',
                      transition: 'all 0.2s ease',
                      color: isFav ? '#ffd700' : 'rgba(255, 255, 255, 0.2)',
                    }}
                    onMouseEnter={(e) => {
                      e.stopPropagation();
                      e.currentTarget.style.color = '#ffd700';
                      e.currentTarget.style.background = 'rgba(255, 215, 0, 0.1)';
                      e.currentTarget.style.transform = 'scale(1.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.stopPropagation();
                      e.currentTarget.style.color = isFav ? '#ffd700' : 'rgba(255, 255, 255, 0.2)';
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                    title={isFav ? "Remove from favorites" : "Add to favorites"}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill={isFav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </span>
                </button>
              );
            })
          ) : (
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', padding: '10px' }}>
              No matching presets found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
