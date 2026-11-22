'use client'

import { useCallback, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, X, Image, Loader2, AlertCircle } from 'lucide-react'
import { apiService } from '../utils/api'
import type { PhotoFile, UploadResponse } from '../types'

interface PhotoUploadZoneProps {
  onAnalysisComplete: (analysisId: string) => void
  onError: (message: string) => void
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff', 'image/bmp']
const MAX_SIZE = 50 * 1024 * 1024 // 50MB

export function PhotoUploadZone({ onAnalysisComplete, onError }: PhotoUploadZoneProps) {
  const [photo, setPhoto] = useState<PhotoFile | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewImgRef = useRef<HTMLImageElement>(null)

  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Unsupported file type. Please upload JPEG, PNG, WebP, TIFF, or BMP.'
    }
    if (file.size > MAX_SIZE) {
      return 'File too large. Maximum size is 50MB.'
    }
    return null
  }, [])

  const createPreview = useCallback((file: File): Promise<PhotoFile> => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file)
      const img = new window.Image()
      img.onload = () => {
        resolve({
          file,
          preview: url,
          name: file.name,
          size: file.size,
          width: img.naturalWidth,
          height: img.naturalHeight,
          type: file.type,
        })
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to load image preview'))
      }
      img.src = url
    })
  }, [])

  const handleFileSelect = useCallback(async (file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    try {
      const photoFile = await createPreview(file)
      setPhoto(photoFile)
    } catch {
      setError('Failed to create preview')
    }
  }, [validateFile, createPreview])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }, [handleFileSelect])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }, [handleFileSelect])

  const handleRemove = useCallback(() => {
    if (photo) {
      URL.revokeObjectURL(photo.preview)
    }
    setPhoto(null)
    setError(null)
    setUploadProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [photo])

  const handleAnalyze = useCallback(async () => {
    if (!photo || isUploading) return

    setIsUploading(true)
    setUploadProgress(0)
    setError(null)

    try {
      const response: UploadResponse = await apiService.uploadPhoto(photo.file)
      setUploadProgress(100)
      onAnalysisComplete(response.analysis_id)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      setError(message)
      onError(message)
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }, [photo, isUploading, onAnalysisComplete, onError])

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <AnimatePresence mode="wait">
        {!photo ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative w-full min-h-[320px] md:min-h-[400px] rounded-2xl border-2 border-dashed
              transition-all duration-300 cursor-pointer
              ${isDragging
                ? 'border-cyan-500/50 bg-cyan-500/5 bg-gradient-to-br from-cyan-500/10 to-violet-500/10'
                : 'border-slate-700/50 hover:border-cyan-500/30 hover:bg-slate-800/30'
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_TYPES.join(',')}
              onChange={handleInputChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              aria-label="Upload photo"
            />

            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="mb-6"
              >
                <div className={`
                  w-20 h-20 md:w-24 md:h-24 rounded-2xl flex items-center justify-center
                  ${isDragging
                    ? 'bg-gradient-to-br from-cyan-500 to-violet-500 text-white'
                    : 'bg-slate-800/50 border border-slate-700/50 text-slate-400'
                  }
                  transition-all duration-300
                `}>
                  <Upload className="w-10 h-10 md:w-12 md:h-12" />
                </div>
              </motion.div>

              <h3 className="text-xl md:text-2xl font-bold mb-2 text-white">
                {isDragging ? 'Drop your photo here' : 'Upload Photo for Analysis'}
              </h3>
              <p className="text-slate-400 mb-6 max-w-md mx-auto">
                Drag & drop or click to select an image (JPEG, PNG, WebP, TIFF, BMP • Max 50MB)
              </p>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => fileInputRef.current?.click()}
                className="btn-primary"
                disabled={isUploading}
              >
                <Upload className="w-5 h-5 mr-2" />
                SELECT FILE
              </motion.button>

              <p className="mt-4 text-xs text-slate-500 font-mono">
                Supported: {ALLOWED_TYPES.map(t => t.split('/')[1].toUpperCase()).join(', ')} • Max 50MB
              </p>
            </div>

            {isDragging && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-cyan-500/10 rounded-2xl flex items-center justify-center pointer-events-none"
              >
                <span className="text-cyan-400 font-semibold text-lg">Release to analyze</span>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="relative w-full rounded-2xl overflow-hidden glass border border-slate-700/30"
          >
            <div className="relative aspect-[4/3] md:aspect-[16/10] overflow-hidden">
              <img
                ref={previewImgRef}
                src={photo.preview}
                alt={photo.name}
                className="w-full h-full object-cover"
              />

              {isUploading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-4"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-12 h-12 border-3 border-cyan-500/30 border-t-cyan-500 rounded-full"
                  />
                  <div className="text-center">
                    <p className="text-lg font-semibold text-white">Analyzing...</p>
                    <motion.div
                      animate={{ scaleX: [0, 1] }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className="w-64 h-2 bg-slate-800 rounded-full overflow-hidden mt-2"
                    >
                      <motion.div
                        animate={{ scaleX: uploadProgress / 100 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        className="w-full h-full bg-gradient-to-r from-cyan-500 to-violet-500"
                      />
                    </motion.div>
                    <p className="text-sm text-slate-400 mt-1">{Math.round(uploadProgress)}%</p>
                  </div>
                </motion.div>
              )}
            </div>

            <div className="p-4 md:p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
                    <Image className="w-4 h-4" />
                    <span className="font-mono truncate">{photo.name}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <span className="font-mono">{formatFileSize(photo.size)}</span>
                    <span className="font-mono">{photo.width} × {photo.height} px</span>
                    <span className="font-mono uppercase">{photo.type.split('/')[1]}</span>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleRemove}
                  className="p-2 rounded-lg hover:bg-slate-800/50 text-slate-400 hover:text-white transition-colors flex-shrink-0"
                  aria-label="Remove photo"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm mb-4"
                  >
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAnalyze}
                disabled={isUploading}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    ANALYZING...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    START FORENSIC ANALYSIS
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

import { Search } from 'lucide-react'