'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Shield, AlertTriangle, CheckCircle, XCircle, HelpCircle, ChevronDown, ChevronUp, ExternalLink, Download, Trash2, RefreshCw, FileText } from 'lucide-react'
import { apiService } from '../utils/api'
import type { AnalysisResult, AssessmentCategory, DetectorResult, Evidence, TechnicalDetails, PhotoInfo } from '../types'

interface ResultsPanelProps {
  analysisId: string
  onNewAnalysis: () => void
  onError: (message: string) => void
}

const ASSESSMENT_CONFIG: Record<AssessmentCategory, { icon: React.ComponentType<{ className?: string }>; label: string; description: string; color: string; bgColor: string; borderColor: string }> = {
  LIKELY_AI_GENERATED: {
    icon: AlertTriangle,
    label: 'LIKELY AI GENERATED',
    description: 'Strong indicators of synthetic image generation detected',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
  POSSIBLE_MANIPULATION: {
    icon: Shield,
    label: 'POSSIBLE MANIPULATION',
    description: 'Signs of digital manipulation or editing detected',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  LIKELY_AUTHENTIC: {
    icon: CheckCircle,
    label: 'LIKELY AUTHENTIC',
    description: 'Image appears to be a genuine photograph',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
  },
  INCONCLUSIVE: {
    icon: HelpCircle,
    label: 'INCONCLUSIVE',
    description: 'Insufficient evidence to determine authenticity',
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/10',
    borderColor: 'border-slate-500/30',
  },
}

const DETECTOR_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'Frequency Analysis': Shield,
  'Noise Analysis': AlertTriangle,
  'EXIF Metadata Analysis': FileText,
  'Error Level Analysis': XCircle,
  'Statistical Anomaly Detection': HelpCircle,
  'EfficientNet-B0 Deep Learning': Shield,
}

export function ResultsPanel({ analysisId, onNewAnalysis, onError }: ResultsPanelProps) {
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedDetectors, setExpandedDetectors] = useState<Set<string>>(new Set())
  const [isDownloading, setIsDownloading] = useState(false)

  useEffect(() => {
    fetchResult()
  }, [analysisId])

  const fetchResult = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await apiService.getAnalysisResult(analysisId)
      setResult(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch results'
      setError(message)
      onError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadReport = async () => {
    setIsDownloading(true)
    try {
      const blob = await apiService.downloadReport(analysisId, 'json')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ai-photo-analysis-${analysisId.slice(0, 8)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      onError('Failed to download report')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this analysis? This cannot be undone.')) return
    try {
      await apiService.deleteAnalysis(analysisId)
      onNewAnalysis()
    } catch (err) {
      onError('Failed to delete analysis')
    }
  }

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full"
      >
        <div className="glass rounded-2xl p-8 md:p-12 text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full mx-auto mb-6"
          />
          <h3 className="text-xl font-semibold text-white mb-2">Analyzing Photo...</h3>
          <p className="text-slate-400">Running forensic detectors on your image</p>
          <div className="mt-6 w-64 mx-auto h-2 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              animate={{ scaleX: [0, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="w-full h-full bg-gradient-to-r from-cyan-500 to-violet-500"
            />
          </div>
        </div>
      </motion.div>
    )
  }

  if (error || !result) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full"
      >
        <div className="glass rounded-2xl p-8 md:p-12 text-center">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Analysis Failed</h3>
          <p className="text-slate-400 mb-6">{error || 'Unknown error occurred'}</p>
          <div className="flex gap-3 justify-center">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={fetchResult}
              className="btn-primary flex items-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              RETRY
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onNewAnalysis}
              className="btn-ghost"
            >
              NEW ANALYSIS
            </motion.button>
          </div>
        </div>
      </motion.div>
    )
  }

  const assessment = ASSESSMENT_CONFIG[result.overall_assessment]
  const AssessmentIcon = assessment.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full space-y-6"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className={`${assessment.bgColor} border ${assessment.borderColor} rounded-2xl p-6 md:p-8`}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className={`
              w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center
              ${assessment.color.replace('text-', 'bg-').replace('400', '100')} border ${assessment.borderColor}
            `}>
              <AssessmentIcon className={`w-8 h-8 md:w-10 md:h-10 ${assessment.color}`} />
            </div>
            <div>
              <p className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-1">Overall Assessment</p>
              <h2 className="text-2xl md:text-3xl font-bold text-white">{assessment.label}</h2>
              <p className="text-slate-400 mt-1">{assessment.description}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 md:ml-auto">
            <div className="flex items-center gap-4 text-center">
              <div className={`w-20 h-20 rounded-2xl ${assessment.bgColor} border ${assessment.borderColor} flex flex-col items-center justify-center`}>
                <p className="text-3xl md:text-4xl font-bold text-white">
                  {result.ai_generated_probability !== null
                    ? `${Math.round(result.ai_generated_probability * 100)}%`
                    : 'N/A'}
                </p>
                <p className="text-xs text-slate-400 font-mono">AI Probability</p>
              </div>
              <div className="w-20 h-20 rounded-2xl glass border border-slate-700/30 flex flex-col items-center justify-center">
                <p className="text-3xl md:text-4xl font-bold text-white">{Math.round(result.confidence * 100)}%</p>
                <p className="text-xs text-slate-400 font-mono">Confidence</p>
              </div>
              <div className="w-20 h-20 rounded-2xl glass border border-slate-700/30 flex flex-col items-center justify-center">
                <p className="text-3xl md:text-4xl font-bold text-white">{Math.round(result.detector_agreement * 100)}%</p>
                <p className="text-xs text-slate-400 font-mono">Agreement</p>
              </div>
            </div>

            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleDownloadReport}
                disabled={isDownloading}
                className="btn-ghost flex items-center gap-2 px-4"
              >
                <Download className="w-4 h-4" />
                {isDownloading ? 'DOWNLOADING...' : 'REPORT'}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleDelete}
                className="btn-ghost flex items-center gap-2 px-4 text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4" />
                DELETE
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="glass rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="section-title">
            <FileText className="w-5 h-5" />
            DETECTOR RESULTS
          </h3>
          <span className="text-xs text-slate-500 font-mono">{result.detectors.length} detectors</span>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {result.detectors.map((detector, index) => (
            <motion.div
              key={detector.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 + index * 0.05 }}
              className="card-detector group"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center flex-shrink-0">
                    {(() => {
                      const Icon = DETECTOR_ICONS[detector.name] || Shield
                      return <Icon className="w-5 h-5 text-cyan-400" />
                    })()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-white truncate">{detector.name}</h4>
                    <p className="text-xs text-slate-500 font-mono">{detector.processing_time.toFixed(2)}s</p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setExpandedDetectors(prev => {
                      const next = new Set(prev)
                      if (next.has(detector.name)) next.delete(detector.name)
                      else next.add(detector.name)
                      return next
                    })
                  }}
                  className="p-1 rounded-lg hover:bg-slate-800/50 text-slate-500 transition-colors flex-shrink-0"
                >
                  {expandedDetectors.has(detector.name) ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </motion.button>
              </div>

              <div className="mb-3">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-400">Assessment</span>
                  <span className={`font-semibold ${getCategoryColor(detector.category)}`}>
                    {getCategoryLabel(detector.category)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Confidence</span>
                  <span className="font-mono font-semibold text-white">{Math.round(detector.confidence * 100)}%</span>
                </div>
              </div>

              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: detector.confidence }}
                  transition={{ duration: 0.8, delay: 0.4 + index * 0.05, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full origin-left"
                />
              </div>

              <AnimatePresence>
                {expandedDetectors.has(detector.name) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mt-4 pt-4 border-t border-slate-700/30 space-y-2"
                  >
                    {Object.entries(detector.details).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between text-sm">
                        <span className="text-slate-500 font-mono">{formatKey(key)}</span>
                        <span className="text-white font-mono text-right max-w-[60%] truncate">{formatValue(value)}</span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="grid gap-4 md:grid-cols-3"
      >
        <EvidenceCard
          title="SYNTHETIC INDICATORS"
          icon={AlertTriangle}
          color="text-red-400"
          bgColor="bg-red-500/10"
          borderColor="border-red-500/30"
          items={result.evidence.synthetic_indicators}
        />
        <EvidenceCard
          title="MANIPULATION INDICATORS"
          icon={Shield}
          color="text-amber-400"
          bgColor="bg-amber-500/10"
          borderColor="border-amber-500/30"
          items={result.evidence.manipulation_indicators}
        />
        <EvidenceCard
          title="AUTHENTICITY INDICATORS"
          icon={CheckCircle}
          color="text-green-400"
          bgColor="bg-green-500/10"
          borderColor="border-green-500/30"
          items={result.evidence.authenticity_indicators}
        />
      </motion.div>

      {result.evidence.limitations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="glass rounded-2xl p-6 border border-amber-500/30 bg-amber-500/5"
        >
          <div className="flex items-center gap-2 text-amber-400 mb-3">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="section-title">LIMITATIONS</h3>
          </div>
          <ul className="space-y-2">
            {result.evidence.limitations.map((limitation, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: 0.5 + i * 0.05 }}
                className="flex items-start gap-2 text-sm text-slate-300"
              >
                <span className="text-amber-400 mt-0.5">•</span>
                <span>{limitation}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="glass rounded-2xl p-6"
      >
        <h3 className="section-title mb-4">
          <FileText className="w-5 h-5" />
          TECHNICAL DETAILS
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          <TechnicalDetail
            label="Processing Time"
            value={`${result.technical_details.processing_time.toFixed(2)}s`}
            icon="⏱"
          />
          <TechnicalDetail
            label="Models Used"
            value={result.technical_details.models_used.length.toString()}
            icon="🤖"
          />
          <TechnicalDetail
            label="Image Hash"
            value={result.technical_details.image_hash.slice(0, 16) + '...'}
            icon="#"
          />
        </div>
        <div className="mt-4 pt-4 border-t border-slate-700/30 grid gap-4 md:grid-cols-2">
          <PhotoInfoItem label="Filename" value={result.photo_info.filename} />
          <PhotoInfoItem label="Dimensions" value={`${result.photo_info.width} × ${result.photo_info.height} px`} />
          <PhotoInfoItem label="Format" value={result.photo_info.format.toUpperCase()} />
          <PhotoInfoItem label="Color Mode" value={result.photo_info.mode} />
          <PhotoInfoItem label="File Size" value={formatBytes(result.photo_info.size)} />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.6 }}
        className="flex gap-3 justify-center"
      >
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onNewAnalysis}
          className="btn-primary px-8 flex items-center gap-2"
        >
          <RefreshCw className="w-5 h-5" />
          NEW ANALYSIS
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => window.open(`/api/docs`, '_blank')}
          className="btn-ghost px-8 flex items-center gap-2"
        >
          <ExternalLink className="w-5 h-5" />
          API DOCS
        </motion.button>
      </motion.div>
    </motion.div>
  )
}

function getCategoryColor(category: AssessmentCategory): string {
  switch (category) {
    case 'LIKELY_AI_GENERATED': return 'text-red-400'
    case 'POSSIBLE_MANIPULATION': return 'text-amber-400'
    case 'LIKELY_AUTHENTIC': return 'text-green-400'
    case 'INCONCLUSIVE': return 'text-slate-400'
  }
}

function getCategoryLabel(category: AssessmentCategory): string {
  switch (category) {
    case 'LIKELY_AI_GENERATED': return 'AI GENERATED'
    case 'POSSIBLE_MANIPULATION': return 'MANIPULATED'
    case 'LIKELY_AUTHENTIC': return 'AUTHENTIC'
    case 'INCONCLUSIVE': return 'INCONCLUSIVE'
  }
}

function formatKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatValue(value: any): string {
  if (typeof value === 'number') {
    return value % 1 === 0 ? value.toString() : value.toFixed(4)
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }
  if (Array.isArray(value)) {
    return `[${value.length} items]`
  }
  return String(value)
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface EvidenceCardProps {
  title: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
  borderColor: string
  items: string[]
}

function EvidenceCard({ title, icon: Icon, color, bgColor, borderColor, items }: EvidenceCardProps) {
  return (
    <div className={`${bgColor} border ${borderColor} rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-5 h-5 ${color}`} />
        <h4 className="text-xs font-bold uppercase tracking-wider text-white">{title}</h4>
      </div>
      {items.length === 0 ? (
        <p className="text-slate-500 text-sm italic">None detected</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: 0.4 + i * 0.05 }}
              className="flex items-start gap-2 text-sm text-slate-300"
            >
              <span className={`${color} mt-0.5`}>•</span>
              <span>{item}</span>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  )
}

interface TechnicalDetailProps {
  label: string
  value: string
  icon: string
}

function TechnicalDetail({ label, value, icon }: TechnicalDetailProps) {
  return (
    <div className="glass-strong rounded-xl p-4 text-center">
      <div className="text-3xl mb-2">{icon}</div>
      <p className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="font-semibold text-white text-sm font-mono truncate">{value}</p>
    </div>
  )
}

interface PhotoInfoItemProps {
  label: string
  value: string
}

function PhotoInfoItem({ label, value }: PhotoInfoItemProps) {
  return (
    <div className="flex items-center justify-between py-2 px-3 glass-strong rounded-xl">
      <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">{label}</span>
      <span className="font-mono text-white text-sm truncate text-right max-w-[60%]">{value}</span>
    </div>
  )
}

import { useState, useEffect } from 'react'