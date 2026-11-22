'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, Volume2, VolumeX, Loader2 } from 'lucide-react'
import type { AudioFile } from '../types'
import { formatDuration } from '../utils/audio'

interface AudioPlayerProps {
  audioFile: AudioFile | null
  analysisState: 'idle' | 'uploading' | 'scanning' | 'analyzing' | 'complete' | 'error'
  onTimeUpdate?: (currentTime: number, duration: number) => void
}

export function AudioPlayer({ audioFile, analysisState, onTimeUpdate }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (audioFile?.preview) {
      if (audioRef.current) {
        audioRef.current.src = audioFile.preview
        audioRef.current.load()
      }
      setCurrentTime(0)
      setDuration(0)
      setIsPlaying(false)
      setError(null)
    }
  }, [audioFile?.preview])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleLoadedMetadata = () => setDuration(audio.duration)
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
      onTimeUpdate?.(audio.currentTime, audio.duration)
    }
    const handleEnded = () => setIsPlaying(false)
    const handleError = () => {
      setError('Failed to play audio')
      setIsPlaying(false)
    }
    const handleWaiting = () => setIsLoading(true)
    const handleCanPlay = () => setIsLoading(false)

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)
    audio.addEventListener('waiting', handleWaiting)
    audio.addEventListener('canplay', handleCanPlay)

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
      audio.removeEventListener('waiting', handleWaiting)
      audio.removeEventListener('canplay', handleCanPlay)
    }
  }, [onTimeUpdate])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play().catch(() => {
        setError('Playback failed')
        setIsPlaying(false)
      })
      setIsPlaying(true)
    }
  }, [isPlaying])

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio) return
    const vol = parseFloat(e.target.value)
    audio.volume = vol
    setVolume(vol)
    setIsMuted(vol === 0)
  }, [])

  const toggleMute = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.muted = !isMuted
    setIsMuted(!isMuted)
  }, [isMuted])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space' && e.target === document.body) {
      e.preventDefault()
      togglePlay()
    }
  }, [togglePlay])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (!audioFile) {
    return (
      <div className="glass rounded-xl p-6 border border-slate-700/50 text-center">
        <div className="text-slate-500">
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-cyan-500/50" />
          <p className="text-sm">No audio loaded</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="glass rounded-2xl p-6 border border-slate-700/50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500/30 to-violet-500/30 flex items-center justify-center border border-cyan-500/30">
              <svg className="w-6 h-6 text-cyan-300" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
              </svg>
            </div>
            <div>
              <p className="font-medium text-slate-100 truncate max-w-xs">{audioFile.file.name}</p>
              <p className="text-xs text-slate-500 font-mono">
                {formatDuration(audioFile.duration)} • {audioFile.format} • {audioFile.sampleRate > 0 ? `${audioFile.sampleRate}Hz` : 'Unknown SR'} • {audioFile.channels > 0 ? `${audioFile.channels}ch` : 'Unknown channels'}
              </p>
            </div>
          </div>

          {error && (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded"
            >
              {error}
            </motion.span>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              disabled={isLoading || analysisState !== 'idle' && analysisState !== 'complete' && analysisState !== 'error'}
              className="p-3 glass rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-1" />
              )}
            </button>

            <div className="flex-1 h-2 bg-slate-800 rounded-full cursor-pointer relative" onClick={(e) => {
              const audio = audioRef.current
              if (!audio || duration === 0) return
              const rect = e.currentTarget.getBoundingClientRect()
              const percent = (e.clientX - rect.left) / rect.width
              audio.currentTime = percent * duration
            }}>
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500"
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                animate={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                transition={{ duration: 0.1, ease: 'linear' }}
              />
              <motion.div
                className="absolute top-1/2 w-3 h-3 rounded-full bg-white border-2 border-cyan-500 -translate-y-1/2 -translate-x-1/2 shadow-lg"
                style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                animate={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                transition={{ duration: 0.1, ease: 'linear' }}
              />
            </div>

            <div className="flex items-center gap-2 text-sm font-mono text-slate-400 min-w-[120px]">
              <span>{formatDuration(currentTime)}</span>
              <span>/</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleMute}
              className="p-2 glass rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="flex-1 h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-cyan-500"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-700/30 flex flex-wrap gap-2 text-xs text-slate-500 font-mono">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-600" />
            {formatFileSize(audioFile.size)}
          </span>
          {audioFile.sampleRate > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-600" />
              {audioFile.sampleRate}Hz
            </span>
          )}
          {audioFile.channels > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-600" />
              {audioFile.channels}ch
            </span>
          )}
        </div>
      </div>

      <audio ref={audioRef} preload="metadata" />
    </motion.div>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}