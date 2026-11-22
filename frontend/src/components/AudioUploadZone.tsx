'use client'

import { useCallback, useRef, useState, DragEvent, ChangeEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, X, FileAudio, AlertCircle, Loader2, Mic } from 'lucide-react'
import type { AudioFile } from '../types'
import {
  validateAudioFile,
  createAudioPreview,
  extractAudioMetadata,
  formatFileSize,
  getSupportedFormats
} from '../utils/audio'

interface AudioUploadZoneProps {
  onAudioSelect: (audio: AudioFile) => void
  currentAudio: AudioFile | null
  analysisState: 'idle' | 'uploading' | 'scanning' | 'analyzing' | 'complete' | 'error'
  disabled?: boolean
}

export function AudioUploadZone({
  onAudioSelect,
  currentAudio,
  analysisState,
  disabled = false
}: AudioUploadZoneProps) {
  const [dragActive, setDragActive] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isProcessingRef = useRef(false)

  const handleDrag = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (disabled || analysisState !== 'idle' || isProcessingRef.current) return

    const file = e.dataTransfer.files[0]
    if (file) await processFile(file)
  }, [disabled, analysisState])

  const handleFileSelect = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    if (disabled || analysisState !== 'idle' || isProcessingRef.current) return

    const file = e.target.files?.[0]
    if (file) await processFile(file)
    e.target.value = ''
  }, [disabled, analysisState])

  const processFile = async (file: File) => {
    isProcessingRef.current = true
    setPreviewError(null)

    const validation = validateAudioFile(file)
    if (!validation.valid) {
      setPreviewError(validation.error || 'Invalid file')
      isProcessingRef.current = false
      return
    }

    try {
      const preview = await createAudioPreview(file)
      const metadata = await extractAudioMetadata(file)

      const audioFile: AudioFile = {
        file,
        preview,
        duration: metadata.duration,
        sampleRate: metadata.sampleRate,
        channels: metadata.channels,
        format: metadata.format,
        size: metadata.size,
      }

      onAudioSelect(audioFile)
    } catch (error) {
      setPreviewError('Failed to process audio file')
    } finally {
      isProcessingRef.current = false
    }
  }

  const handleRemove = useCallback(() => {
    onAudioSelect(null as any)
  }, [onAudioSelect])

  const handleRetry = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }, [])

  if (currentAudio) {
    return (
      <motion.div
        className="relative w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="relative aspect-video rounded-2xl overflow-hidden glass border-cyan-500/20 min-h-[200px]">
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900/50 to-slate-950">
            <div className="text-center p-8">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-500/30 to-violet-500/30 flex items-center justify-center border border-cyan-500/30">
                <Mic className="w-12 h-12 text-cyan-300" />
              </div>
              <p className="text-lg font-medium text-slate-100 mb-2 truncate max-w-xs mx-auto">{currentAudio.file.name}</p>
              <div className="flex items-center justify-center gap-4 text-sm text-slate-400 font-mono">
                <span>{formatFileSize(currentAudio.size)}</span>
                <span>·</span>
                <span>{currentAudio.format.toUpperCase()}</span>
                <span>·</span>
                <span>{currentAudio.duration.toFixed(1)}s</span>
                {currentAudio.sampleRate > 0 && (
                  <>
                    <span>·</span>
                    <span>{currentAudio.sampleRate}Hz</span>
                  </>
                )}
                {currentAudio.channels > 0 && (
                  <>
                    <span>·</span>
                    <span>{currentAudio.channels}ch</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-dark-950/90 via-transparent to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm">
                <FileAudio className="w-4 h-4 text-cyan-400" />
                <span className="font-mono text-slate-300">{currentAudio.file.name}</span>
              </div>

              <button
                onClick={handleRemove}
                disabled={analysisState !== 'idle'}
                className="p-2 glass rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all disabled:opacity-50"
                aria-label="Remove audio"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <AnimatePresence>
            {(analysisState === 'uploading' || analysisState === 'scanning' || analysisState === 'analyzing') && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-dark-950/90"
              >
                <div className="text-center p-6">
                  <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto mb-4" />
                  <p className="text-cyan-300 font-medium text-lg">
                    {analysisState === 'uploading' && 'UPLOADING...'}
                    {analysisState === 'scanning' && 'SCANNING AUDIO...'}
                    {analysisState === 'analyzing' && 'ANALYZING PATTERNS...'}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            onClick={handleRetry}
            disabled={analysisState !== 'idle' && analysisState !== 'complete' && analysisState !== 'error'}
            className="btn-secondary text-sm"
          >
            <Upload className="w-4 h-4 mr-2" />
            {analysisState === 'error' ? 'RETRY' : 'REPLACE AUDIO'}
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      className="relative w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <label
        htmlFor="audio-file-upload"
        className={`relative w-full aspect-video rounded-2xl cursor-pointer transition-all duration-300 min-h-[200px]
          ${dragActive
            ? 'border-cyan-500/50 bg-cyan-500/5 shadow-[0_0_40px_rgba(6,182,212,0.2)]'
            : 'border-slate-700/50 hover:border-cyan-500/30 hover:bg-slate-800/50'
          } ${disabled || analysisState !== 'idle' ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          ref={fileInputRef}
          id="audio-file-upload"
          type="file"
          accept="audio/wav,audio/mpeg,audio/mp3,audio/mp4,audio/m4a,audio/flac,audio/ogg,audio/opus,audio/webm"
          onChange={handleFileSelect}
          disabled={disabled || analysisState !== 'idle'}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />

        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
          <div className={`relative mb-6 transition-all duration-300 ${dragActive ? 'scale-110' : ''}`}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 border-2 border-cyan-500/20 rounded-full"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 border-2 border-violet-500/10 rounded-full"
            />
            <Mic className="relative w-16 h-16 text-cyan-500/80 mx-auto" />
          </div>

          <p className="text-lg font-medium text-slate-200 mb-2">
            {dragActive ? 'DROP AUDIO TO ANALYZE' : 'DRAG & DROP OR CLICK TO UPLOAD'}
          </p>

          <p className="text-sm text-slate-500 max-w-xs mx-auto mb-6">
            Supports WAV, MP3, M4A, FLAC, OGG, OPUS, WebM up to 100MB
          </p>

          <div className="flex items-center justify-center gap-4 text-xs text-slate-500 font-mono flex-wrap">
            {getSupportedFormats().map(fmt => (
              <span key={fmt} className="px-2 py-1 glass rounded border border-slate-700/50 text-slate-300">
                {fmt}
              </span>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-500 font-mono">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-slate-600" />
              ≤ 100MB
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-slate-600" />
              ≤ 5min
            </span>
          </div>
        </div>

        <AnimatePresence>
          {previewError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {previewError}
            </motion.div>
          )}
        </AnimatePresence>
      </label>

      {(analysisState === 'uploading' || analysisState === 'scanning' || analysisState === 'analyzing') && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 flex items-center justify-center bg-dark-950/90 rounded-2xl z-10"
        >
          <div className="text-center p-6">
            <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto mb-4" />
            <p className="text-cyan-300 font-medium text-lg">
              {analysisState === 'uploading' && 'UPLOADING...'}
              {analysisState === 'scanning' && 'SCANNING AUDIO...'}
              {analysisState === 'analyzing' && 'ANALYZING PATTERNS...'}
            </p>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}