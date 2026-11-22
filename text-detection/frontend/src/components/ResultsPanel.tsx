'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, AlertTriangle, CheckCircle, HelpCircle, Cpu, Search,
  FileText, Download, ChevronDown, Info, Clock, Hash, Brain,
  Zap, Eye, Scissors, Type
} from 'lucide-react'
import type { AnalysisResult, AssessmentCategory, DetectorResult } from '../types'
import {
  getAssessmentColor,
  getAssessmentLabel,
  getAssessmentDescription,
  formatDuration,
  formatNumber,
  formatTimestamp
} from '../utils/text'

interface ResultsPanelProps {
  result: AnalysisResult | null
  onExportReport: (format: 'json') => void
  onNewAnalysis: () => void
}

const categoryIcons: Record<AssessmentCategory, React.ComponentType<{ className?: string }>> = {
  LIKELY_AI_GENERATED: AlertTriangle,
  LIKELY_HUMAN_WRITTEN: CheckCircle,
  POSSIBLY_AI_ASSISTED: Shield,
  MIXED_UNCERTAIN: HelpCircle,
  INCONCLUSIVE: HelpCircle,
}

function EvidenceCard({
  title,
  icon: Icon,
  items,
  color,
  emptyMessage
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  items: string[]
  color: string
  emptyMessage: string
}) {
  return (
    <motion.div
      className="glass rounded-xl p-5 border border-slate-700/50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg" style={{ background: `${color}20` as const }}>
          <span style={{ color }}><Icon className="w-5 h-5" /></span>
        </div>
        <h4 className="font-medium text-slate-100">{title}</h4>
      </div>

      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 * i }}
              className="flex items-start gap-3 text-sm text-slate-300"
            >
              <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: color }} />
              <span>{item}</span>
            </motion.li>
          ))}
        </ul>
      ) : (
        <p className="text-slate-500 text-sm italic">{emptyMessage}</p>
      )}
    </motion.div>
  )
}

function DetectorCard({ detector }: { detector: DetectorResult }) {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    'RoBERTa OpenAI Detector': Brain,
    'GPT-2 Perplexity Detector': Cpu,
  }

  const Icon = iconMap[detector.name] || Cpu
  const isAI = detector.label === 'AI'
  const color = isAI ? '#ef4444' : '#22c55e'

  return (
    <motion.div
      className="glass rounded-xl p-5 border border-slate-700/50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: `${color}20` as const }}>
            <span style={{ color }}><Icon className="w-5 h-5" /></span>
          </div>
          <div>
            <h4 className="font-medium text-slate-100">{detector.name}</h4>
            <p className="text-xs text-slate-500 font-mono">{formatDuration(detector.processing_time)}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-lg" style={{ color: color as any }}>{detector.confidence.toFixed(1)}%</div>
          <div className="text-xs text-slate-500">confidence</div>
        </div>
      </div>

      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${detector.confidence}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}80, ${color})` }}
        />
      </div>

      <p className="mt-3 text-sm text-slate-400 capitalize">
        {detector.label === 'AI' ? 'AI-Generated' : detector.label === 'Human' ? 'Human-Written' : 'Uncertain'}
      </p>

      <div className="mt-3 pt-3 border-t border-slate-700/30 grid grid-cols-2 gap-2 text-xs">
        {Object.entries(detector.raw_scores).map(([label, score]) => (
          <div key={label} className="flex justify-between">
            <span className="text-slate-500 capitalize">{label.toLowerCase()}</span>
            <span className="font-mono text-slate-100">{score.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

function LinguisticMetricsPanel({ features }: { features: AnalysisResult['linguistic_features'] }) {
  const stats = features.statistics
  const metrics = [
    { label: 'Characters', value: formatNumber(stats.character_count), icon: Type },
    { label: 'Words', value: formatNumber(stats.word_count), icon: Type },
    { label: 'Sentences', value: formatNumber(stats.sentence_count), icon: Type },
    { label: 'Paragraphs', value: formatNumber(stats.paragraph_count), icon: Scissors },
    { label: 'Avg Word Length', value: `${stats.avg_word_length.toFixed(1)}`, icon: Eye },
    { label: 'Avg Sentence Length', value: `${stats.avg_sentence_length.toFixed(1)} words`, icon: Eye },
    { label: 'Type-Token Ratio', value: `${(stats.type_token_ratio * 100).toFixed(1)}%`, icon: Brain },
    { label: 'Hapax Legomena', value: `${(stats.hapax_legomena_ratio * 100).toFixed(1)}%`, icon: Brain },
    { label: 'Burstiness', value: features.burstiness_score.toFixed(3), icon: Zap },
    { label: 'Repetition Score', value: features.repetition_score.toFixed(3), icon: Scissors },
    { label: 'Function Word Ratio', value: `${(features.function_word_ratio * 100).toFixed(1)}%`, icon: Brain },
  ]

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h3 className="flex items-center gap-2 text-slate-200 font-medium">
        <Brain className="w-5 h-5 text-cyan-400" />
        Linguistic Metrics
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {metrics.map((metric, i) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 * i }}
            className="glass rounded-lg p-4 border border-slate-700/30"
          >
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <metric.icon className="w-3 h-3 text-cyan-400" />
              <span className="uppercase tracking-wider">{metric.label}</span>
            </div>
            <p className="font-mono text-sm text-slate-100">{metric.value}</p>
          </motion.div>
        ))}
      </div>

      {Object.keys(features.readability_scores).length > 0 && (
        <div className="pt-4 border-t border-slate-700/30">
          <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">READABILITY SCORES</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(features.readability_scores).map(([key, value]) => (
              <div key={key} className="glass rounded-lg p-3 border border-slate-700/30">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                  {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </p>
                <p className="font-mono text-sm text-slate-100">{typeof value === 'number' ? value.toFixed(1) : value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pt-4 border-t border-slate-700/30">
        <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">N-GRAM ENTROPY</h4>
        <div className="grid grid-cols-4 gap-3">
          {Object.entries(features.ngram_entropy).map(([n, value]) => (
            <div key={n} className="glass rounded-lg p-3 border border-slate-700/30 text-center">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{n}-gram</p>
              <p className="font-mono text-lg text-slate-100">{value.toFixed(2)}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

function TechnicalDetailsPanel({ result }: { result: AnalysisResult }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      className="glass rounded-xl border border-slate-700/50 overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Hash className="w-5 h-5 text-cyan-400" />
          <span className="font-medium text-slate-100">Technical Details</span>
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-slate-500"
        >
          <ChevronDown className="w-5 h-5" />
        </motion.div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-5 pb-5 border-t border-slate-700/30"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <DetailRow label="Analysis ID" value={result.id} icon={Hash} />
              <DetailRow label="Timestamp" value={formatTimestamp(result.timestamp)} icon={Clock} />
              <DetailRow label="Processing Time" value={formatDuration(result.technical_details.processing_time)} icon={Clock} />
              <DetailRow label="Detector Agreement" value={`${(result.detector_agreement * 100).toFixed(1)}%`} icon={Shield} />
              <DetailRow label="Text Hash" value={result.technical_details.text_hash} icon={Hash} />
              <DetailRow label="Models Used" value={result.technical_details.models_used.join(', ')} icon={Brain} />
              <DetailRow label="Text Length" value={`${formatNumber(result.text_length)} chars`} icon={Type} />
              <DetailRow label="AI Probability" value={result.ai_generated_probability !== null ? `${(result.ai_generated_probability * 100).toFixed(1)}%` : 'N/A'} icon={Brain} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function DetailRow({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="glass rounded-lg p-4 border border-slate-700/30">
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
        <Icon className="w-3 h-3" />
        <span>{label}</span>
      </div>
      <p className="font-mono text-sm text-slate-100 truncate">{value}</p>
    </div>
  )
}

function AssessmentBadge({ category }: { category: AssessmentCategory }) {
  const Icon = categoryIcons[category]
  const colorClass = getAssessmentColor(category)
  const label = getAssessmentLabel(category)

  return (
    <motion.div
      className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl font-medium border ${colorClass}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <Icon className="w-5 h-5" />
      <span className="text-sm">{label}</span>
    </motion.div>
  )
}

export function ResultsPanel({ result, onExportReport, onNewAnalysis }: ResultsPanelProps) {
  if (!result) return null

  const category = result.overall_assessment
  const Icon = categoryIcons[category]
  const colorClass = getAssessmentColor(category)
  const description = getAssessmentDescription(category)

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="glass-strong rounded-2xl p-6 border border-slate-700/30">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl" style={{ background: `${colorClass.split(' ')[1].replace('bg-', '').replace('/10', '')}20` as const }}>
              <span style={{ color: colorClass.split(' ')[0].replace('text-', '') as any }}><Icon className="w-8 h-8" /></span>
            </div>
            <div>
              <AssessmentBadge category={category} />
              <p className="mt-2 text-slate-400 text-sm max-w-md">{description}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => onExportReport('json')}
              className="btn-secondary text-sm flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export JSON
            </button>
            <button
              onClick={onNewAnalysis}
              className="btn-primary text-sm flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              New Analysis
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="AI Probability"
            value={result.ai_generated_probability !== null ? `${(result.ai_generated_probability * 100).toFixed(1)}%` : 'N/A'}
            icon={Brain}
            color="#ef4444"
          />
          <StatCard
            label="Overall Confidence"
            value={`${result.confidence.toFixed(1)}%`}
            icon={Shield}
            color="#06b6d4"
          />
          <StatCard
            label="Detector Agreement"
            value={`${(result.detector_agreement * 100).toFixed(1)}%`}
            icon={FileText}
            color="#8b5cf6"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-slate-200 font-medium">
            <Search className="w-5 h-5 text-cyan-400" />
            Detector Results
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {result.detectors.map((detector) => (
              <DetectorCard key={detector.name} detector={detector} />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-slate-200 font-medium">
            <Zap className="w-5 h-5 text-cyan-400" />
            Evidence Breakdown
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <EvidenceCard
              title="AI Indicators"
              icon={AlertTriangle}
              items={result.evidence.ai_indicators}
              color="#ef4444"
              emptyMessage="No AI indicators detected"
            />
            <EvidenceCard
              title="Human Indicators"
              icon={CheckCircle}
              items={result.evidence.human_indicators}
              color="#22c55e"
              emptyMessage="No human indicators detected"
            />
            <EvidenceCard
              title="Stylistic Observations"
              icon={Eye}
              items={result.evidence.stylistic_observations}
              color="#06b6d4"
              emptyMessage="No specific observations"
            />
            <EvidenceCard
              title="Limitations"
              icon={Info}
              items={result.evidence.limitations}
              color="#64748b"
              emptyMessage="No specific limitations noted"
            />
          </div>
        </div>
      </div>

      <LinguisticMetricsPanel features={result.linguistic_features} />

      <TechnicalDetailsPanel result={result} />
    </motion.div>
  )
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ComponentType<{ className?: string }>; color: string }) {
  return (
    <motion.div
      className="glass rounded-xl p-5 border border-slate-700/30"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-bold font-mono mt-1" style={{ color: color as any }}>{value}</p>
        </div>
        <div className="p-3 rounded-xl" style={{ background: `${color}20` as const }}>
          <span style={{ color: color as any }}><Icon className="w-6 h-6" /></span>
        </div>
      </div>
    </motion.div>
  )
}