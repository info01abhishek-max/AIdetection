'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { motion, AnimatePresence } from 'framer-motion'
import { Header } from './components/Header'
import { AudioUploadZone } from './components/AudioUploadZone'
import { ResultsPanel } from './components/ResultsPanel'
import { Scene3D } from './components/three/audio/Scene3D'
import { apiService } from './utils/api'
import type { AudioFile, AnalysisResult, AnalysisStatus } from './types'

function ThreeScene({ audioData, analysisState, audioLevel, progress }: {
  audioData: Float32Array | undefined
  analysisState: AnalysisStatus
  audioLevel: number
  progress: number
}) {
  return (
    <Canvas
      camera={{ position: [0, 0, 10], fov: 45, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' }}
      shadows={{ enabled: false }}
      style={{ outline: 'none', width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#020617']} />
      <fog attach="fog" args={['#020617', 5, 50]} />

      <directionalLight position={[5, 10, 7]} intensity={1.5} color="#ffffff" />
      <directionalLight position={[-5, 5, -7]} intensity={0.5} color="#06b6d4" />
      <ambientLight color="#1e293b" intensity={0.8} />
      <hemisphereLight color="#06b6d4" groundColor="#0f172a" intensity={0.3} />

      <Scene3D
        audioData={audioData}
        analysisState={analysisState}
        audioLevel={audioLevel}
        progress={progress}
      />
    </Canvas>
  )
}

export default function App() {
  const [currentAudio, setCurrentAudio] = useState<AudioFile | null>(null)
  const [analysisState, setAnalysisState] = useState<AnalysisStatus>('idle')
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [audioData, setAudioData] = useState<Float32Array | undefined>(undefined)
  const [audioLevel, setAudioLevel] = useState(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const animationRef = useRef<number>()
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const analysisIdRef = useRef<string | null>(null)

  // Load audio data for visualization
  useEffect(() => {
    if (currentAudio?.preview) {
      const loadAudioData = async () => {
        try {
          const response = await fetch(currentAudio.preview)
          const arrayBuffer = await response.arrayBuffer()

          if (!audioContextRef.current) {
            audioContextRef.current = new AudioContext()
          }

          const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer)

          // Get mono channel data
          const channelData = audioBuffer.getChannelData(0)

          // Downsample to 256 points for visualization
          const downsampled = new Float32Array(256)
          const step = Math.floor(channelData.length / 256)
          for (let i = 0; i < 256; i++) {
            downsampled[i] = channelData[i * step] || 0
          }

          setAudioData(downsampled)
        } catch (err) {
          console.error('Failed to load audio data:', err)
          setAudioData(undefined)
        }
      }

      loadAudioData()
    } else {
      setAudioData(undefined)
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [currentAudio?.preview])

  // Real-time audio level visualization during analysis
  useEffect(() => {
    if (analysisState === 'scanning' || analysisState === 'analyzing') {
      const animate = () => {
        // Simulate audio level based on analysis state
        setAudioLevel(0.3 + Math.random() * 0.5 + Math.sin(Date.now() * 0.005) * 0.2)
        animationRef.current = requestAnimationFrame(animate)
      }
      animate()
    } else {
      setAudioLevel(0)
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [analysisState])

  const handleAudioSelect = useCallback((audio: AudioFile | null) => {
    setCurrentAudio(audio)
    setAnalysisResult(null)
    setError(null)
    setAnalysisState('idle')
    setAnalysisProgress(0)
    setAudioLevel(0)
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
  }, [])

  const startAnalysis = useCallback(async () => {
    if (!currentAudio || analysisState !== 'idle') return

    setError(null)
    setAnalysisState('uploading')
    setAnalysisProgress(10)

    try {
      const response = await apiService.uploadAudio(currentAudio.file)
      analysisIdRef.current = response.analysisId
      setAnalysisState('scanning')
      setAnalysisProgress(30)

      pollForResult(response.analysisId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setAnalysisState('error')
    }
  }, [currentAudio, analysisState])

  const pollForResult = useCallback(async (analysisId: string) => {
    const poll = async () => {
      try {
        const status = await apiService.getAnalysisStatus(analysisId)
        setAnalysisProgress(Math.min(status.progress, 95))

        if (status.status === 'complete') {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }
          setAnalysisState('analyzing')
          setAnalysisProgress(95)

          const result = await apiService.getAnalysisResult(analysisId)
          setAnalysisResult(result)
          setAnalysisState('complete')
          setAnalysisProgress(100)
        } else if (status.status === 'error') {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }
          setError('Analysis failed')
          setAnalysisState('error')
        }
      } catch (err) {
        console.error('Polling error:', err)
      }
    }

    pollingIntervalRef.current = setInterval(poll, 2000)
    poll()
  }, [])

  const handleExportReport = useCallback(async (format: 'json') => {
    if (!analysisIdRef.current || !analysisResult) return

    try {
      const blob = await apiService.downloadReport(analysisIdRef.current, format)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audio-analysis-report-${analysisResult.id}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed:', err)
    }
  }, [analysisResult])

  const handleNewAnalysis = useCallback(() => {
    handleAudioSelect(null)
  }, [handleAudioSelect])

  return (
    <div className="min-h-screen bg-dark-950">
      <Header />

      <main className="pt-20 pb-12 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <motion.div
                className="relative"
                style={{ minHeight: '500px' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <ThreeScene
                  audioData={audioData}
                  analysisState={analysisState}
                  audioLevel={audioLevel}
                  progress={analysisProgress / 100}
                />

                <div className="absolute bottom-6 left-6 right-6 md:left-8 md:right-8 md:bottom-8">
                  <AudioUploadZone
                    onAudioSelect={handleAudioSelect}
                    currentAudio={currentAudio}
                    analysisState={analysisState}
                    disabled={analysisState === 'uploading' || analysisState === 'scanning' || analysisState === 'analyzing'}
                  />
                </div>
              </motion.div>

              <AnimatePresence mode="wait">
                {analysisResult && (
                  <motion.div
                    key="results"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                  >
                    <ResultsPanel
                      result={analysisResult}
                      onExportReport={handleExportReport}
                      onNewAnalysis={handleNewAnalysis}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass rounded-xl p-4 border border-red-500/30 bg-red-500/10"
                >
                  <div className="flex items-center gap-3 text-red-400">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-sm">{error}</p>
                    <button
                      onClick={() => setError(null)}
                      className="ml-auto text-xs text-red-300 hover:text-red-200 font-mono"
                    >
                      DISMISS
                    </button>
                  </div>
                </motion.div>
              )}
            </div>

            <div className="lg:col-span-1 space-y-6">
              <motion.div
                className="glass-strong rounded-2xl p-6 border border-slate-700/30 h-fit sticky top-28"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/30 to-violet-500/30 flex items-center justify-center border border-cyan-500/30">
                    <svg className="w-5 h-5 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </span>
                  ANALYSIS CONTROL
                </h2>

                <div className="space-y-4">
                  <button
                    onClick={startAnalysis}
                    disabled={!currentAudio || analysisState !== 'idle'}
                    className="btn-primary w-full justify-center py-4 text-lg"
                  >
                    {analysisState === 'idle' && currentAudio ? 'START ANALYSIS' : 'ANALYZING...'}
                  </button>

                  {(analysisState === 'uploading' || analysisState === 'scanning' || analysisState === 'analyzing') && (
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">PROGRESS</span>
                        <span className="font-mono text-cyan-300">{analysisProgress}%</span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                          animate={{ width: `${analysisProgress}%` }}
                          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500"
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 text-center font-mono">
                        {analysisState === 'uploading' && 'Uploading audio to analysis engine...'}
                        {analysisState === 'scanning' && 'Scanning audio for artifacts...'}
                        {analysisState === 'analyzing' && 'Running detection models...'}
                      </p>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-700/30">
                    <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">SUPPORTED FORMATS</h3>
                    <div className="flex flex-wrap gap-2">
                      {['WAV', 'MP3', 'M4A', 'FLAC', 'OGG', 'OPUS', 'WebM'].map(fmt => (
                        <span key={fmt} className="px-3 py-1 text-xs font-mono glass rounded border border-slate-700/50 text-slate-300">
                          {fmt}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-700/30">
                    <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">DETECTORS</h3>
                    <div className="space-y-2 text-sm">
                      {[
                        'Synthetic Speech Detection',
                        'Spectral Artifact Analysis',
                        'Voice Consistency Analysis',
                        'Audio Quality Assessment',
                        'Statistical Anomaly Detection'
                      ].map(detector => (
                        <div key={detector} className="flex items-center justify-between text-slate-400">
                          <span>{detector}</span>
                          <span className="w-2 h-2 rounded-full bg-green-500/50" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-700/30">
                    <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">LIMITS</h3>
                    <div className="space-y-1 text-xs text-slate-500 font-mono">
                      <div>Max file size: 100MB</div>
                      <div>Max duration: 5 minutes</div>
                      <div>Target sample rate: 16kHz</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 glass border-t border-slate-700/30 py-3 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-slate-500">
          <span className="font-mono">AI AUDIO AUTHENTICITY ANALYSIS SYSTEM v1.0</span>
          <span>For research and educational purposes only • Results are probabilistic estimates</span>
        </div>
      </footer>
    </div>
  )
}