import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Eye, EyeOff, Download, Info } from 'lucide-react';
import { getCategoryColor, getCategoryLabel, getCategoryIcon } from '../utils/video';
import type { FrameAnalysis } from '../types';

interface FrameAnalysisViewProps {
  frameAnalyses: FrameAnalysis[];
  selectedFrameIndex: number | null;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  videoSrc?: string;
}

export function FrameAnalysisView({
  frameAnalyses,
  selectedFrameIndex,
  onClose,
  onPrevious,
  onNext,
  videoSrc,
}: FrameAnalysisViewProps) {
  if (selectedFrameIndex === null || frameAnalyses.length === 0) return null;

  const frame = frameAnalyses.find(f => f.frame_index === selectedFrameIndex);
  if (!frame) return null;

  const currentIndex = frameAnalyses.findIndex(f => f.frame_index === selectedFrameIndex);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < frameAnalyses.length - 1;

  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="frame-analysis-title"
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto glass-strong rounded-3xl border-cyan-500/20"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 glass-strong border-b border-slate-700/50 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-800/50 transition-colors text-slate-400 hover:text-white"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h2 id="frame-analysis-title" className="text-xl font-bold">Frame Analysis</h2>
              <p className="text-sm text-slate-400 font-mono">
                Frame {frame.frame_index} • {frame.timestamp.toFixed(2)}s • {frame.detectors.length} detectors
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasPrevious && (
              <button
                onClick={onPrevious}
                className="p-2 rounded-xl hover:bg-slate-800/50 transition-colors text-slate-400 hover:text-white"
                aria-label="Previous frame"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            {hasNext && (
              <button
                onClick={onNext}
                className="p-2 rounded-xl hover:bg-slate-800/50 transition-colors text-slate-400 hover:text-white"
                aria-label="Next frame"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="card">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-500" />
                  Overall Assessment
                </h3>
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    <span className={`text-6xl ${getCategoryColor(frame.overall_category).split(' ')[0]}`}>
                      {getCategoryIcon(frame.overall_category)}
                    </span>
                  </div>
                  <div>
                    <span className={`text-2xl font-bold ${getCategoryColor(frame.overall_category).split(' ')[0]}`}>
                      {getCategoryLabel(frame.overall_category)}
                    </span>
                    <p className="text-slate-400 mt-1">Confidence: <span className="font-mono text-cyan-300">{frame.confidence.toFixed(1)}%</span></p>
                    <div className="mt-3 h-2 bg-slate-800 rounded-full overflow-hidden w-64">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${frame.confidence}%` }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="h-full bg-gradient-to-r from-cyan-500 to-violet-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-violet-500" />
                  Detector Results
                </h3>
                <div className="space-y-3">
                  {frame.detectors.map((detector, index) => (
                    <motion.div
                      key={detector.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="glass rounded-xl p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-medium text-slate-200">{detector.name.replace('FrameDetector', '').replace('Detector', '')}</h4>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(detector.category)}`}>
                              {getCategoryLabel(detector.category)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${detector.confidence}%` }}
                                transition={{ duration: 0.6, delay: index * 0.05 + 0.3 }}
                                className="h-full bg-gradient-to-r from-cyan-500 to-violet-500"
                              />
                            </div>
                            <span className="font-mono text-cyan-300 w-16 text-right">{detector.confidence.toFixed(1)}%</span>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowDetails(prev => ({ ...prev, [detector.name]: !prev[detector.name] }))}
                          className="p-2 rounded-xl hover:bg-slate-800/50 transition-colors text-slate-400 hover:text-white flex-shrink-0"
                          aria-label="Toggle details"
                        >
                          <Info className="w-5 h-5" />
                        </button>
                      </div>

                      {showDetails[detector.name] && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 pt-4 border-t border-slate-700/50 space-y-2"
                        >
                          <h5 className="text-xs font-medium text-slate-400 uppercase tracking-wider">Details</h5>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {Object.entries(detector.details).map(([key, value]) => (
                              <div key={key} className="glass rounded-lg p-2">
                                <p className="text-xs text-slate-400">{key.replace(/_/g, ' ')}</p>
                                <p className="font-mono text-slate-200">{typeof value === 'number' ? value.toFixed(4) : String(value)}</p>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-slate-500 mt-2">Processing time: {detector.processing_time.toFixed(3)}s</p>
                        </motion.div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="card">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-pink-500" />
                  Video Context
                </h3>
                {videoSrc && (
                  <video
                    src={videoSrc}
                    controls
                    className="w-full rounded-lg bg-slate-900"
                    onLoadedData={() => {}}
                  />
                )}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="glass rounded-lg p-3">
                    <p className="text-xs text-slate-400">Frame Index</p>
                    <p className="font-mono text-xl text-cyan-300">{frame.frame_index}</p>
                  </div>
                  <div className="glass rounded-lg p-3">
                    <p className="text-xs text-slate-400">Timestamp</p>
                    <p className="font-mono text-xl text-cyan-300">{frame.timestamp.toFixed(2)}s</p>
                  </div>
                  <div className="glass rounded-lg p-3">
                    <p className="text-xs text-slate-400">Overall Category</p>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getCategoryColor(frame.overall_category)}`}>
                      {getCategoryLabel(frame.overall_category)}
                    </span>
                  </div>
                  <div className="glass rounded-lg p-3">
                    <p className="text-xs text-slate-400">Confidence</p>
                    <p className="font-mono text-xl text-cyan-300">{frame.confidence.toFixed(1)}%</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-500" />
                  Quick Actions
                </h3>
                <div className="space-y-2">
                  <button className="btn-secondary w-full justify-start gap-3">
                    <Eye className="w-4 h-4" />
                    View in Timeline
                  </button>
                  <button className="btn-secondary w-full justify-start gap-3">
                    <Download className="w-4 h-4" />
                    Export Frame Data
                  </button>
                  <button className="btn-secondary w-full justify-start gap-3">
                    <EyeOff className="w-4 h-4" />
                    Hide Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}