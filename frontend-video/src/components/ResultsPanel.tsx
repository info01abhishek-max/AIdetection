import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, FileText, Share2, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import { getCategoryColor, getCategoryLabel, getCategoryIcon } from '../utils/video';
import type { AnalysisResult, FrameAnalysis, AssessmentCategory } from '../types';
import { Timeline } from './Timeline';
import { FrameAnalysisView } from './FrameAnalysisView';

interface ResultsPanelProps {
  result: AnalysisResult;
  videoSrc?: string;
  onDownloadReport: () => void;
  onNewAnalysis: () => void;
}

export function ResultsPanel({ result, videoSrc, onDownloadReport, onNewAnalysis }: ResultsPanelProps) {
  const [selectedFrame, setSelectedFrame] = useState<number | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    evidence: true,
    technical: true,
    frames: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleFrameSelect = (frameIndex: number) => {
    setSelectedFrame(frameIndex);
  };

  const getAssessmentIcon = (category: AssessmentCategory) => {
    switch (category) {
      case 'LIKELY_AI_GENERATED': return <XCircle className="w-8 h-8 text-red-400" />;
      case 'LIKELY_AUTHENTIC': return <CheckCircle className="w-8 h-8 text-green-400" />;
      case 'POSSIBLE_MANIPULATION': return <AlertTriangle className="w-8 h-8 text-yellow-400" />;
      case 'INCONCLUSIVE': return <HelpCircle className="w-8 h-8 text-slate-400" />;
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="results"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -30 }}
        className="space-y-6"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card-elevated gradient-border"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="flex-shrink-0 w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 flex items-center justify-center border border-cyan-500/30">
                {getAssessmentIcon(result.overall_assessment)}
              </div>
              <div>
                <h2 className="text-3xl font-bold gradient-text">Analysis Complete</h2>
                <p className="text-slate-400 mt-1">{result.video_info.filename} • {result.video_info.duration.toFixed(1)}s • {result.technical_details.frames_analyzed} frames</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className={`flex items-center gap-3 px-6 py-3 rounded-xl font-medium ${getCategoryColor(result.overall_assessment)}`}
              >
                {getCategoryIcon(result.overall_assessment)}
                <span className="text-lg">{getCategoryLabel(result.overall_assessment)}</span>
              </motion.div>

              {result.ai_generated_probability !== null && (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="glass rounded-xl px-6 py-3 border border-cyan-500/30"
                >
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="text-xs uppercase tracking-wider">AI Probability</span>
                    <span className="font-mono text-2xl gradient-text">{Math.round(result.ai_generated_probability * 100)}%</span>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Confidence"
              value={`${result.confidence.toFixed(1)}%`}
              icon={<CheckCircle className="w-5 h-5" />}
              color="text-green-400"
            />
            <StatCard
              label="Detector Agreement"
              value={`${Math.round(result.detector_agreement * 100)}%`}
              icon={<HelpCircle className="w-5 h-5" />}
              color="text-cyan-400"
            />
            <StatCard
              label="Frames Analyzed"
              value={result.technical_details.frames_analyzed.toString()}
              icon={<FileText className="w-5 h-5" />}
              color="text-violet-400"
            />
            <StatCard
              label="Processing Time"
              value={`${result.technical_details.processing_time.toFixed(1)}s`}
              icon={<AlertTriangle className="w-5 h-5" />}
              color="text-yellow-400"
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          <div className="lg:col-span-2 space-y-6">
            {videoSrc && (
              <div className="card">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-500" />
                  Video Player with Frame Analysis
                </h3>
                <VideoPlayerWithTimeline
                  src={videoSrc}
                  frameAnalyses={result.frame_analyses}
                  onFrameSelect={handleFrameSelect}
                />
              </div>
            )}

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-violet-500" />
                  Temporal Analysis
                </h3>
                <button
                  onClick={() => toggleSection('frames')}
                  className="p-1 rounded-lg hover:bg-slate-800/50 text-slate-400"
                >
                  {expandedSections.frames ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </div>
              <AnimatePresence>
                {expandedSections.frames && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <Timeline
                      frameAnalyses={result.frame_analyses}
                      temporalAnalysis={result.temporal_analysis}
                      selectedFrame={selectedFrame ?? undefined}
                      onFrameSelect={handleFrameSelect}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Evidence Summary
                </h3>
                <button
                  onClick={() => toggleSection('evidence')}
                  className="p-1 rounded-lg hover:bg-slate-800/50 text-slate-400"
                >
                  {expandedSections.evidence ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </div>
              <AnimatePresence>
                {expandedSections.evidence && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <EvidenceSection evidence={result.evidence} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-500" />
                  Technical Details
                </h3>
                <button
                  onClick={() => toggleSection('technical')}
                  className="p-1 rounded-lg hover:bg-slate-800/50 text-slate-400"
                >
                  {expandedSections.technical ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </div>
              <AnimatePresence>
                {expandedSections.technical && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <TechnicalDetailsSection details={result.technical_details} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-pink-500" />
                Actions
              </h3>
              <div className="space-y-3">
                <button
                  onClick={onDownloadReport}
                  className="btn-secondary w-full justify-start gap-3"
                >
                  <Download className="w-4 h-4" />
                  Download Report (JSON)
                </button>
                <button
                  onClick={onNewAnalysis}
                  className="btn-primary w-full justify-center gap-3"
                >
                  <Share2 className="w-4 h-4" />
                  Analyze Another Video
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        <FrameAnalysisView
          frameAnalyses={result.frame_analyses}
          selectedFrameIndex={selectedFrame}
          onClose={() => { setSelectedFrame(null); }}
          onPrevious={() => {
            const idx = result.frame_analyses.findIndex(f => f.frame_index === selectedFrame);
            if (idx > 0) setSelectedFrame(result.frame_analyses[idx - 1].frame_index);
          }}
          onNext={() => {
            const idx = result.frame_analyses.findIndex(f => f.frame_index === selectedFrame);
            if (idx < result.frame_analyses.length - 1) setSelectedFrame(result.frame_analyses[idx + 1].frame_index);
          }}
          videoSrc={videoSrc}
        />
      </motion.div>
    </AnimatePresence>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className={color}>{icon}</span>
      </div>
      <p className="stat-value font-mono">{value}</p>
      <p className="stat-label">{label}</p>
    </div>
  );
}

function EvidenceSection({ evidence }: { evidence: AnalysisResult['evidence'] }) {
  const sections = [
    { title: 'AI-Generated Indicators', items: evidence.synthetic_indicators, icon: '🤖', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
    { title: 'Manipulation Signs', items: evidence.manipulation_indicators, icon: '⚠️', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
    { title: 'Authenticity Indicators', items: evidence.authenticity_indicators, icon: '✅', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
    { title: 'Temporal Indicators', items: evidence.temporal_indicators, icon: '📊', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
    { title: 'Limitations', items: evidence.limitations, icon: '📋', color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' },
  ];

  return (
    <div className="space-y-4">
      {sections.map((section, index) => (
        section.items.length > 0 && (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`rounded-xl p-4 border ${section.bg}`}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{section.icon}</span>
              <h4 className="font-medium text-slate-200">{section.title}</h4>
              <span className={`px-2 py-0.5 rounded text-xs font-mono ${section.color}`}>{section.items.length}</span>
            </div>
            <ul className="space-y-1">
              {section.items.map((item, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 + i * 0.02 }}
                  className="flex items-start gap-2 text-sm text-slate-300"
                >
                  <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: section.color.replace('text-', '') }} />
                  <span>{item}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )
      ))}
    </div>
  );
}

function TechnicalDetailsSection({ details }: { details: AnalysisResult['technical_details'] }) {
  return (
    <div className="space-y-4">
      <div className="glass rounded-xl p-4">
        <h4 className="font-medium text-slate-200 mb-3">Models Used</h4>
        <div className="flex flex-wrap gap-2">
          {details.models_used.map((model, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="px-3 py-1 rounded-full text-xs font-mono glass border border-cyan-500/30"
            >
              {model}
            </motion.span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <DetailItem label="Video Hash" value={details.video_hash} />
        <DetailItem label="Frames Analyzed" value={details.frames_analyzed.toString()} />
        <DetailItem label="Processing Time" value={`${details.processing_time.toFixed(2)}s`} />
        <DetailItem label="Consistency Score" value={`${Math.round(details.temporal_analysis.consistency_score * 100)}%`} />
        <DetailItem label="Scene Changes" value={details.temporal_analysis.scene_changes.toString()} />
        <DetailItem label="Flicker Detected" value={details.temporal_analysis.flicker_detected ? 'Yes' : 'No'} />
      </div>

      <div className="glass rounded-xl p-4">
        <h4 className="font-medium text-slate-200 mb-3">Detector Consistency</h4>
        <div className="space-y-2">
          {Object.entries((details.temporal_analysis.details?.detector_consistency || {}) as Record<string, any>).map(([name, data]) => (
            <div key={name} className="flex items-center justify-between text-sm">
              <span className="text-slate-300">{name}</span>
              <div className="flex items-center gap-3">
                <span className="text-slate-400">Variance: {data.variance?.toFixed(3) ?? 'N/A'}</span>
                <span className="text-slate-400">Mean: {data.mean?.toFixed(1) ?? 'N/A'}%</span>
                <span className={`px-2 py-0.5 rounded text-xs ${(data.category_changes ?? 0) > 3 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
                  {data.category_changes ?? 0} changes
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-xl p-4">
      <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="font-mono text-lg text-cyan-300">{value}</p>
    </div>
  );
}

function VideoPlayerWithTimeline({ src, frameAnalyses, onFrameSelect }: { src: string; frameAnalyses: FrameAnalysis[]; onFrameSelect: (frameIndex: number) => void }) {
  return (
    <div className="relative">
      <video
        src={src}
        controls
        className="w-full rounded-lg bg-slate-900"
      />

      <div className="mt-4 h-20 relative">
        <div className="absolute inset-0 flex items-end gap-1">
          {frameAnalyses.map((frame) => (
            <button
              key={frame.frame_index}
              onClick={() => onFrameSelect(frame.frame_index)}
              className="flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all hover:scale-105"
              style={{ borderColor: getCategoryColor(frame.overall_category) }}
            >
              <div className="w-full h-full bg-gradient-to-t from-black/50 to-transparent flex items-end p-1">
                <span className="text-xs font-mono text-white">{frame.timestamp.toFixed(1)}s</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}