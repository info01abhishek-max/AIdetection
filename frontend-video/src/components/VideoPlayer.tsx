import { useRef, useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, SkipBack, SkipForward, RotateCcw } from 'lucide-react';
import { formatDuration } from '../utils/video';

interface VideoPlayerProps {
  src: string;
  frameAnalyses?: Array<{
    frame_index: number;
    timestamp: number;
    overall_category: string;
    confidence: number;
  }>;
  onTimeUpdate?: (time: number) => void;
  onFrameSelect?: (frameIndex: number, timestamp: number) => void;
  className?: string;
}

export function VideoPlayer({
  src,
  frameAnalyses = [],
  onTimeUpdate,
  onFrameSelect,
  className = '',
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setPlaying(!playing);
  }, [playing]);

  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);
    onTimeUpdate?.(time);
  }, [onTimeUpdate]);

  const handleLoadedMetadata = useCallback(() => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  }, []);

  const handleEnded = useCallback(() => {
    setPlaying(false);
  }, []);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const time = parseFloat(e.target.value);
    videoRef.current.currentTime = time;
    setCurrentTime(time);
    onTimeUpdate?.(time);
  }, [onTimeUpdate]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const vol = parseFloat(e.target.value);
    videoRef.current.volume = vol;
    setVolume(vol);
    setMuted(vol === 0);
  }, []);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !muted;
    setMuted(!muted);
  }, [muted]);

  const toggleFullscreen = useCallback(async () => {
    if (!videoRef.current) return;
    if (!fullscreen) {
      try {
        await videoRef.current.requestFullscreen();
        setFullscreen(true);
      } catch (err) {
        console.error('Fullscreen error:', err);
      }
    } else {
      try {
        await document.exitFullscreen();
        setFullscreen(false);
      } catch (err) {
        console.error('Exit fullscreen error:', err);
      }
    }
  }, [fullscreen]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!videoRef.current) return;
    switch (e.key) {
      case ' ':
      case 'k':
        e.preventDefault();
        togglePlay();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
        break;
      case 'ArrowRight':
        e.preventDefault();
        videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 5);
        break;
      case 'ArrowUp':
        e.preventDefault();
        videoRef.current.volume = Math.min(1, videoRef.current.volume + 0.1);
        setVolume(videoRef.current.volume);
        break;
      case 'ArrowDown':
        e.preventDefault();
        videoRef.current.volume = Math.max(0, videoRef.current.volume - 0.1);
        setVolume(videoRef.current.volume);
        break;
      case 'm':
        toggleMute();
        break;
      case 'f':
        toggleFullscreen();
        break;
      case '0':
        videoRef.current.currentTime = 0;
        break;
    }
  }, [togglePlay, toggleMute, toggleFullscreen, duration]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (playing) setShowControls(false);
    }, 3000);
  }, [playing]);

  const frameMarkers = frameAnalyses.map((frame) => ({
    ...frame,
    percentage: duration > 0 ? (frame.timestamp / duration) * 100 : 0,
  }));

  return (
    <div
      className={`relative bg-black rounded-xl overflow-hidden ${className}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => { if (playing) setShowControls(false); }}
      onMouseMove={handleMouseMove}
    >
      <video
        ref={videoRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        playsInline
        className="w-full h-auto"
      />

      <div
        className={`absolute inset-0 flex flex-col justify-end p-4 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="relative mb-2">
          <div className="relative h-2">
            <div
              className="absolute inset-0 bg-slate-800/50 rounded-full"
            />
            {frameMarkers.length > 0 && (
              <>
                {frameMarkers.map((frame, index) => (
                  <motion.div
                    key={index}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className="absolute top-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-slate-800"
                    style={{
                      left: `${frame.percentage}%`,
                      backgroundColor: getCategoryColor(frame.overall_category),
                    }}
                    title={`Frame ${frame.frame_index} at ${formatDuration(frame.timestamp)} - ${frame.overall_category}`}
                  />
                ))}
              </>
            )}
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer"
              style={{
                WebkitAppearance: 'none',
                background: 'transparent',
              }}
            />
            <div
              className="absolute top-0 bottom-0 left-0 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500"
              style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="p-2 rounded-full bg-slate-900/50 hover:bg-slate-800/50 transition-colors text-white"
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>

            <button
              onClick={() => { if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10); }}
              className="p-2 rounded-full bg-slate-900/50 hover:bg-slate-800/50 transition-colors text-white"
              aria-label="Rewind 10s"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              onClick={() => { if (videoRef.current) videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10); }}
              className="p-2 rounded-full bg-slate-900/50 hover:bg-slate-800/50 transition-colors text-white"
              aria-label="Forward 10s"
            >
              <SkipForward className="w-5 h-5" />
            </button>

            <button
              onClick={() => { if (videoRef.current) videoRef.current.currentTime = 0; }}
              className="p-2 rounded-full bg-slate-900/50 hover:bg-slate-800/50 transition-colors text-white"
              aria-label="Restart"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <span className="text-sm font-mono text-slate-300 min-w-[100px] text-center">
              {formatDuration(currentTime)} / {formatDuration(duration)}
            </span>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={toggleMute}
              className="p-2 rounded-full bg-slate-900/50 hover:bg-slate-800/50 transition-colors text-white"
              aria-label={muted ? 'Unmute' : 'Mute'}
            >
              {muted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>

            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={muted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-20 appearance-none h-1 bg-slate-700 rounded-full accent-cyan-500"
            />

            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-full bg-slate-900/50 hover:bg-slate-800/50 transition-colors text-white"
              aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {fullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {frameAnalyses.length > 0 && (
        <div className="absolute bottom-20 left-4 right-4 pointer-events-none">
          <div className="flex items-end gap-1 h-16 overflow-x-auto pb-2 scrollbar-hide">
            {frameMarkers.map((frame, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => onFrameSelect?.(frame.frame_index, frame.timestamp)}
                className="flex-shrink-0 w-20 cursor-pointer pointer-events-auto group"
              >
                <div
                  className="relative h-12 rounded-lg overflow-hidden border-2 transition-all duration-200 group-hover:scale-105"
                  style={{
                    borderColor: getCategoryColor(frame.overall_category),
                    backgroundColor: getCategoryColor(frame.overall_category).replace('bg-', 'bg-').replace('/20', '/30'),
                  }}
                >
                  <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute bottom-1 left-1 right-1 text-xs text-white font-mono truncate">
                    {formatDuration(frame.timestamp)}
                  </div>
                </div>
                <div className="text-xs text-slate-400 text-center mt-1 font-mono">
                  Frame {frame.frame_index}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getCategoryColor(category: string): string {
  switch (category) {
    case 'LIKELY_AI_GENERATED':
      return 'bg-red-500/30 border-red-500/50';
    case 'LIKELY_AUTHENTIC':
      return 'bg-green-500/30 border-green-500/50';
    case 'POSSIBLE_MANIPULATION':
      return 'bg-yellow-500/30 border-yellow-500/50';
    case 'INCONCLUSIVE':
      return 'bg-slate-500/30 border-slate-500/50';
    default:
      return 'bg-slate-500/30 border-slate-500/50';
  }
}