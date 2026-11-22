import { motion } from 'framer-motion';
import { formatDuration, getCategoryColor, getCategoryLabel } from '../utils/video';
import type { FrameAnalysis, TemporalAnalysis } from '../types';

interface TimelineProps {
  frameAnalyses: FrameAnalysis[];
  temporalAnalysis: TemporalAnalysis;
  selectedFrame?: number;
  onFrameSelect: (frameIndex: number) => void;
  className?: string;
}

export function Timeline({
  frameAnalyses,
  temporalAnalysis,
  selectedFrame,
  onFrameSelect,
  className = '',
}: TimelineProps) {
  const detectorNames = frameAnalyses[0]?.detectors.map(d => d.name) || [];
  const colors = {
    LIKELY_AI_GENERATED: '#ef4444',
    LIKELY_AUTHENTIC: '#22c55e',
    POSSIBLE_MANIPULATION: '#eab308',
    INCONCLUSIVE: '#64748b',
  };

  const getDetectorData = (detectorName: string) => {
    return frameAnalyses.map((frame, index) => {
      const detector = frame.detectors.find(d => d.name === detectorName);
      return {
        index,
        frameIndex: frame.frame_index,
        timestamp: frame.timestamp,
        confidence: detector?.confidence || 0,
        category: detector?.category || 'INCONCLUSIVE',
      };
    });
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-500" />
          Temporal Consistency Overview
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="glass rounded-xl p-4 text-center">
            <p className="stat-value">{Math.round(temporalAnalysis.consistency_score * 100)}%</p>
            <p className="stat-label">Frame Consistency</p>
            <div className="mt-2 h-2 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${temporalAnalysis.consistency_score * 100}%` }}
                transition={{ duration: 1, delay: 0.2 }}
                className="h-full bg-gradient-to-r from-cyan-500 to-violet-500"
              />
            </div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <p className="stat-value">{temporalAnalysis.scene_changes}</p>
            <p className="stat-label">Scene Changes</p>
            <p className="text-xs text-slate-400 mt-1">
              {temporalAnalysis.scene_changes > frameAnalyses.length * 0.3 ? 'High' : 'Normal'}
            </p>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <p className="stat-value">{temporalAnalysis.flicker_detected ? 'Yes' : 'No'}</p>
            <p className="stat-label">Temporal Flicker</p>
            <p className="text-xs text-slate-400 mt-1">
              {temporalAnalysis.flicker_detected ? 'Detected' : 'Clean'}
            </p>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <p className="stat-value">{temporalAnalysis.frame_similarity_variance.toFixed(3)}</p>
            <p className="stat-label">Similarity Variance</p>
            <p className="text-xs text-slate-400 mt-1">
              {temporalAnalysis.frame_similarity_variance > 0.1 ? 'High variance' : 'Stable'}
            </p>
          </div>
        </div>

        {temporalAnalysis.details.temporal_indicators && temporalAnalysis.details.temporal_indicators.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-slate-300">Temporal Indicators</h4>
            <ul className="space-y-1">
              {temporalAnalysis.details.temporal_indicators.map((indicator: string, index: number) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-2 text-sm text-slate-300"
                >
                  <span className="w-2 h-2 rounded-full bg-yellow-500" />
                  {indicator}
                </motion.li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-violet-500" />
          Per-Detector Temporal Consistency
        </h3>

        <div className="space-y-4">
          {detectorNames.map((detectorName, detIndex) => {
            const data = getDetectorData(detectorName);
            const consistency = (temporalAnalysis.details.detector_consistency as Record<string, any>)[detectorName];

            return (
              <motion.div
                key={detectorName}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: detIndex * 0.1 }}
                className="glass rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-slate-200">{detectorName}</h4>
                  {consistency && (
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-slate-400">
                        Variance: {consistency.variance.toFixed(3)}
                      </span>
                      <span className="text-slate-400">
                        Mean: {consistency.mean.toFixed(1)}%
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          consistency.category_changes > data.length * 0.3
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-green-500/20 text-green-400'
                        }`}
                      >
                        {consistency.category_changes} changes
                      </span>
                    </div>
                  )}
                </div>

                <div className="relative h-32">
                  <svg className="w-full h-full" viewBox="0 0 800 128">
                    <defs>
                      <linearGradient id={`gradient-${detectorName}`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.3" />
                      </linearGradient>
                    </defs>

                    <rect x="0" y="0" width="800" height="128" fill="url(#gradient-bg)" />
                    <rect x="0" y="0" width="800" height="128" fill="url(#grid-pattern)" />

                    {data.map((point, index) => {
                      const x = (index / Math.max(data.length - 1, 1)) * 780 + 10;
                      const y = 118 - (point.confidence / 100) * 100;
                      const color = colors[point.category as keyof typeof colors] || colors.INCONCLUSIVE;

                      return (
                        <g key={index}>
                          <line
                            x1={x}
                            y1={118}
                            x2={x}
                            y2={y}
                            stroke={color}
                            strokeWidth={2}
                            strokeLinecap="round"
                            opacity={0.8}
                          />
                          <circle
                            cx={x}
                            cy={y}
                            r={4}
                            fill={color}
                            stroke="#020617"
                            strokeWidth={1}
                          />
                        </g>
                      );
                    })}

                    {consistency && (
                      <line
                        x1={10}
                        y1={118 - consistency.mean}
                        x2={790}
                        y2={118 - consistency.mean}
                        stroke="#22d3ee"
                        strokeWidth={1}
                        strokeDasharray="5,5"
                        opacity={0.6}
                      />
                    )}
                  </svg>
                </div>

                <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
                  <span>0%</span>
                  <span>Frame {data[0]?.frameIndex || 0}</span>
                  <span>Frame {data[data.length - 1]?.frameIndex || 0}</span>
                  <span>100%</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-pink-500" />
          Frame Timeline
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-left text-slate-400">
                <th className="pb-2 px-3 font-medium">Frame</th>
                <th className="pb-2 px-3 font-medium">Timestamp</th>
                <th className="pb-2 px-3 font-medium">Overall</th>
                <th className="pb-2 px-3 font-medium">Confidence</th>
                {detectorNames.map(name => (
                  <th key={name} className="pb-2 px-3 font-medium text-center">
                    {name.replace('FrameDetector', '').replace('Detector', '')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {frameAnalyses.map((frame, index) => (
                <motion.tr
                  key={frame.frame_index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className={`border-b border-slate-800/50 hover:bg-slate-800/30 cursor-pointer transition-colors ${
                    selectedFrame === frame.frame_index ? 'bg-cyan-500/10' : ''
                  }`}
                  onClick={() => onFrameSelect(frame.frame_index)}
                >
                  <td className="py-3 px-3 font-mono text-cyan-300">{frame.frame_index}</td>
                  <td className="py-3 px-3 text-slate-300 font-mono">{formatDuration(frame.timestamp)}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(frame.overall_category)}`}>
                      {getCategoryLabel(frame.overall_category)}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-300">{frame.confidence.toFixed(1)}%</td>
                  {frame.detectors.map(detector => (
                    <td key={detector.name} className="py-3 px-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-mono ${getCategoryColor(detector.category)}`}>
                        {detector.confidence.toFixed(0)}%
                      </span>
                    </td>
                  ))}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}