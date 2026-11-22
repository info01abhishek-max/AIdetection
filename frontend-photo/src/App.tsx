'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Header,
  PhotoUploadZone,
  ResultsPanel,
  Scene3D,
} from './components'
import { apiService } from './utils/api'
import type { HealthCheck, AnalysisResult } from './types'

function App() {
  const [health, setHealth] = useState<HealthCheck | null>(null)
  const [analysisId, setAnalysisId] = useState<string | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isHealthy, setIsHealthy] = useState(false)

  const checkHealth = useCallback(async () => {
    try {
      const data = await apiService.healthCheck()
      setHealth(data)
      setIsHealthy(data.status === 'healthy' || data.status === 'ok')
    } catch {
      setIsHealthy(false)
    }
  }, [])

  // Initialize health check on mount
  useEffect(() => {
    checkHealth()
  }, [checkHealth])

  const handleAnalysisComplete = useCallback(async (id: string) => {
    setAnalysisId(id)
    setError(null)

    const pollResult = async () => {
      try {
        const status = await apiService.getAnalysisStatus(id)
        if (status.status === 'complete') {
          const data = await apiService.getAnalysisResult(id)
          setResult(data)
        } else if (status.status === 'error') {
          setError('Analysis failed on server')
        } else {
          setTimeout(pollResult, 1000)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to get results')
      }
    }

    setTimeout(pollResult, 500)
  }, [])

  const handleNewAnalysis = useCallback(() => {
    setAnalysisId(null)
    setResult(null)
    setError(null)
  }, [])

  const handleError = useCallback((message: string) => {
    setError(message)
  }, [])

  return (
    <div className="min-h-screen bg-dark-950">
      <Header />

      <main className="pt-20 pb-12 px-4 md:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <AnimatePresence mode="wait">
            {!analysisId && !result ? (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-3xl mx-auto"
              >
                <div className="glass rounded-2xl p-6 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${isHealthy ? 'bg-green-400' : 'bg-red-400'}`} />
                      <span className="text-sm font-medium text-slate-300">
                        API Status: {isHealthy ? 'CONNECTED' : 'DISCONNECTED'}
                      </span>
                    </div>
                    {health && (
                      <div className="flex items-center gap-4 text-xs text-slate-500 font-mono">
                        <span>v{health.version}</span>
                        <span>Models: {health.models_loaded?.length || 0}</span>
                        <span>Uptime: {Math.floor(health.uptime)}s</span>
                      </div>
                    )}
                  </div>
                </div>

                <PhotoUploadZone
                  onAnalysisComplete={handleAnalysisComplete}
                  onError={handleError}
                />
              </motion.div>
            ) : (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="w-full"
              >
                <div className="grid gap-8 lg:grid-cols-3">
                  <div className="lg:col-span-2 space-y-6">
                    <ResultsPanel
                      analysisId={analysisId!}
                      onNewAnalysis={handleNewAnalysis}
                      onError={handleError}
                    />
                  </div>

                  <div className="space-y-6">
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                      className="glass rounded-2xl overflow-hidden"
                    >
                      <Scene3D analysisId={analysisId} result={result} className="h-[500px]" />
                    </motion.div>

                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass rounded-xl p-4 border border-red-500/30 bg-red-500/5"
                      >
                        <div className="flex items-start gap-2 text-red-400 text-sm">
                          <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span>{error}</span>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <footer className="border-t border-slate-800/50 py-6 px-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <p className="text-slate-500 text-sm font-mono">
            AI PHOTO DETECTION SYSTEM v1.0
          </p>
          <div className="flex items-center gap-6 text-xs text-slate-500">
            <span>6 Forensic Detectors</span>
            <span>Real-time 3D Visualization</span>
            <span>Advanced Analysis</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App