import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Download,
  Share2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Brain,
  BarChart2,
  Zap,
  Eye,
  FileText,
  Image,
  Video,
  Mic,
} from 'lucide-react';
import api from '@/utils/api';
import type { UnifiedAnalysisResult, DetectionType, DetectorResult } from '@/types';
import LoadingSpinner from '@/components/LoadingSpinner';

const typeIcons: Record<DetectionType, React.ComponentType<any>> = {
  photo: Image,
  video: Video,
  audio: Mic,
  text: FileText,
};

const typeColors: Record<DetectionType, string> = {
  photo: 'from-blue-500 to-cyan-500',
  video: 'from-purple-500 to-pink-500',
  audio: 'from-green-500 to-teal-500',
  text: 'from-orange-500 to-red-500',
};

const typeLabels: Record<DetectionType, string> = {
  photo: 'Photo Analysis',
  video: 'Video Analysis',
  audio: 'Audio Analysis',
  text: 'Text Analysis',
};

export default function Results() {
  const { type, id } = useParams<{ type: DetectionType; id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [result, setResult] = useState<UnifiedAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'detectors' | 'technical' | 'visual'>('overview');

  // Check if result was passed via navigation state (for text)
  const stateResult = location.state?.result as UnifiedAnalysisResult | undefined;

  useEffect(() => {
    if (!type || !id) {
      navigate('/');
      return;
    }

    // If result is in state (text analysis), use it directly
    if (stateResult && stateResult.type === type) {
      setResult(stateResult);
      setLoading(false);
      return;
    }

    // Otherwise fetch from API
    const fetchResult = async () => {
      setLoading(true);
      setError(null);
      try {
        let data: UnifiedAnalysisResult;
        switch (type) {
          case 'photo':
            data = await api.getPhotoResult(id);
            break;
          case 'video':
            data = await api.getVideoResult(id);
            break;
          case 'audio':
            data = await api.getAudioResult(id);
            break;
          case 'text':
            data = await api.getTextResult(id);
            break;
        }
        setResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load results');
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [type, id, stateResult, navigate]);

  const handleDownloadReport = async () => {
    if (!type || !id) return;
    try {
      const blob = await api.getReport(type, id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-analysis-${id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download report:', err);
    }
  };

  const handleShare = async () => {
    if (!result) return;
    const shareData = {
      title: `AI vs Real - ${typeLabels[type!]} Results`,
      text: `Analysis Result: ${result.ai_generated_probability > 0.5 ? 'Likely AI-Generated' : 'Likely Authentic'} (${Math.round(result.ai_generated_probability * 100)}% AI probability)`,
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const handleReanalyze = () => {
    navigate(`/${type}`);
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading analysis results..." />;
  }

  if (error || !result) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Unable to Load Results</h2>
          <p className="text-dark-600 dark:text-dark-400 mb-6">{error || 'Analysis result not found'}</p>
          <button onClick={handleReanalyze} className="btn-primary">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </button>
        </motion.div>
      </div>
    );
  }

  const Icon = typeIcons[type!];
  const colorGradient = typeColors[type!];
  const isAI = result.ai_generated_probability > 0.5;
  const isWarning = result.ai_generated_probability > 0.3 && result.ai_generated_probability <= 0.5;

  return (
    <div className="min-h-screen pt-16 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <Link to={`/${type}`} className="btn-ghost">
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorGradient} flex items-center justify-center`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{typeLabels[type!]}</h1>
              <p className="text-dark-600 dark:text-dark-400 text-sm">Analysis ID: {id}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleReanalyze} className="btn-secondary">
              <RefreshCw className="w-4 h-4 mr-2" />
              Re-analyze
            </button>
            <button onClick={handleDownloadReport} className="btn-ghost">
              <Download className="w-4 h-4 mr-2" />
              Report
            </button>
            <button onClick={handleShare} className="btn-ghost">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </button>
          </div>
        </motion.div>

        {/* Main Result Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`mb-8 rounded-2xl p-8 relative overflow-hidden ${isAI ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' : isWarning ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800' : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'}`}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                className={`w-24 h-24 rounded-2xl flex items-center justify-center ${isAI ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-green-500'}`}
              >
                {isAI ? (
                  <Brain className="w-12 h-12 text-white" />
                ) : isWarning ? (
                  <HelpCircle className="w-12 h-12 text-white" />
                ) : (
                  <CheckCircle className="w-12 h-12 text-white" />
                )}
              </motion.div>
              <div>
                <p className={`text-2xl font-bold ${isAI ? 'text-red-700 dark:text-red-300' : isWarning ? 'text-yellow-700 dark:text-yellow-300' : 'text-green-700 dark:text-green-300'}`}>
                  {isAI ? 'Likely AI-Generated' : isWarning ? 'Possible Manipulation' : 'Likely Authentic'}
                </p>
                <p className="text-dark-600 dark:text-dark-400 mt-1">
                  {result.summary}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-8 text-center lg:text-right">
              <div>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '120px' }}
                  transition={{ delay: 0.3, duration: 1, ease: 'easeOut' }}
                  className="relative h-24 w-24 mx-auto"
                >
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      className={`text-dark-200 dark:text-dark-700 ${isAI ? 'text-red-500' : isWarning ? 'text-yellow-500' : 'text-green-500'}`}
                    />
                    <motion.circle
                      initial={{ strokeDashoffset: 314 }}
                      animate={{ strokeDashoffset: 314 - (314 * result.ai_generated_probability) }}
                      transition={{ delay: 0.5, duration: 1, ease: 'easeOut' }}
                      cx="60"
                      cy="60"
                      r="50"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      strokeLinecap="round"
                      className={` ${isAI ? 'text-red-500' : isWarning ? 'text-yellow-500' : 'text-green-500'}`}
                      style={{ strokeDasharray: 314 }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold text-dark-900 dark:text-dark-100">
                      {Math.round(result.ai_generated_probability * 100)}%
                    </span>
                  </div>
                </motion.div>
                <p className="text-sm text-dark-500 dark:text-dark-400 mt-2">AI Probability</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-dark-900 dark:text-dark-100">
                  {Math.round(result.confidence * 100)}%
                </div>
                <p className="text-sm text-dark-500 dark:text-dark-400 mt-2">Confidence</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-dark-900 dark:text-dark-100">
                  {result.detectors.length}
                </div>
                <p className="text-sm text-dark-500 dark:text-dark-400 mt-2">Detectors</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex gap-2 bg-dark-100 dark:bg-dark-800 rounded-xl p-1">
            {[
              { key: 'overview', label: 'Overview', icon: BarChart2 },
              { key: 'detectors', label: 'Detectors', icon: Brain },
              { key: 'technical', label: 'Technical', icon: Zap },
              { key: 'visual', label: '3D Visual', icon: Eye },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-white dark:bg-dark-900 shadow-lg text-primary-600 dark:text-primary-400'
                    : 'text-dark-600 dark:text-dark-400 hover:text-dark-900 dark:hover:text-dark-100'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              <OverviewTab result={result} />
            </motion.div>
          )}
          {activeTab === 'detectors' && (
            <motion.div key="detectors" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              <DetectorsTab detectors={result.detectors} />
            </motion.div>
          )}
          {activeTab === 'technical' && (
            <motion.div key="technical" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              <TechnicalTab indicators={result.technical_indicators} />
            </motion.div>
          )}
          {activeTab === 'visual' && (
            <motion.div key="visual" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <VisualTab type={type!} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function OverviewTab({ result }: { result: UnifiedAnalysisResult }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Key Findings */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary-500" />
          Key Findings
        </h3>
        <div className="space-y-4">
          <FindingItem
            label="AI Generation Probability"
            value={`${Math.round(result.ai_generated_probability * 100)}%`}
            status={result.ai_generated_probability > 0.7 ? 'high' : result.ai_generated_probability > 0.4 ? 'medium' : 'low'}
          />
          <FindingItem
            label="Overall Confidence"
            value={`${Math.round(result.confidence * 100)}%`}
            status={result.confidence > 0.7 ? 'high' : result.confidence > 0.4 ? 'medium' : 'low'}
          />
          <FindingItem
            label="Detectors Analyzed"
            value={result.detectors.length.toString()}
            status="info"
          />
          <FindingItem
            label="Processing Time"
            value={`${(result.processing_time_total_ms / 1000).toFixed(1)}s`}
            status="info"
          />
        </div>
      </div>

      {/* Summary */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary-500" />
          Analysis Summary
        </h3>
        <div className="prose dark:prose-invert max-w-none">
          <p className="text-dark-600 dark:text-dark-400 whitespace-pre-wrap">{result.summary}</p>
        </div>
      </div>

      {/* Detector Breakdown */}
      <div className="lg:col-span-2 card">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary-500" />
          Detector Breakdown
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-200 dark:border-dark-700 text-left text-sm text-dark-500 dark:text-dark-400">
                <th className="pb-3 font-medium">Detector</th>
                <th className="pb-3 font-medium text-center">Category</th>
                <th className="pb-3 font-medium text-center">Confidence</th>
                <th className="pb-3 font-medium text-right">Time (ms)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-100 dark:divide-dark-800">
              {result.detectors.map((detector, index) => (
                <tr key={index} className="hover:bg-dark-50 dark:hover:bg-dark-800/50">
                  <td className="py-3 font-medium text-dark-900 dark:text-dark-100">{detector.name}</td>
                  <td className="py-3 text-center">
                    <CategoryBadge category={detector.category} />
                  </td>
                  <td className="py-3 text-center">
                    <div className="w-24 mx-auto">
                      <div className="h-2 bg-dark-100 dark:bg-dark-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${detector.confidence * 100}%` }}
                          className="h-full bg-primary-500 rounded-full"
                          transition={{ delay: index * 0.05, duration: 0.5 }}
                        />
                      </div>
                      <span className="text-xs text-dark-500 dark:text-dark-400 mt-1 block text-center">
                        {Math.round(detector.confidence * 100)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 text-right font-mono text-dark-500 dark:text-dark-400">
                    {detector.processing_time_ms}ms
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FindingItem({ label, value, status }: { label: string; value: string; status: 'high' | 'medium' | 'low' | 'info' }) {
  const statusColors = {
    high: 'bg-red-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500',
    info: 'bg-blue-500',
  };
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-dark-50 dark:bg-dark-800/50">
      <span className="text-dark-600 dark:text-dark-400">{label}</span>
      <div className="flex items-center gap-3">
        <span className="font-mono font-semibold text-dark-900 dark:text-dark-100">{value}</span>
        <span className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
      </div>
    </div>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const configs: Record<string, { label: string; class: string }> = {
    'LIKELY_AI_GENERATED': { label: 'AI Generated', class: 'badge-ai' },
    'LIKELY_AUTHENTIC': { label: 'Authentic', class: 'badge-real' },
    'POSSIBLE_MANIPULATION': { label: 'Manipulation', class: 'badge-warning' },
    'UNKNOWN': { label: 'Unknown', class: 'badge-warning' },
  };
  const config = configs[category] || { label: category, class: 'badge-warning' };
  return <span className={config.class}>{config.label}</span>;
}

function DetectorsTab({ detectors }: { detectors: DetectorResult[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {detectors.map((detector, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className={`detector-card ${{
            'LIKELY_AI_GENERATED': 'detector-ai',
            'LIKELY_AUTHENTIC': 'detector-real',
            'POSSIBLE_MANIPULATION': 'detector-warning',
            'UNKNOWN': 'detector-warning',
          }[detector.category]}`}
        >
          <div className="flex items-start justify-between mb-3">
            <h4 className="font-semibold text-dark-900 dark:text-dark-100">{detector.name}</h4>
            <CategoryBadge category={detector.category} />
          </div>
          <div className="mb-3">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-dark-600 dark:text-dark-400">Confidence</span>
              <span className="font-mono font-semibold text-primary-600 dark:text-primary-400">
                {Math.round(detector.confidence * 100)}%
              </span>
            </div>
            <div className="h-2 bg-dark-100 dark:bg-dark-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${detector.confidence * 100}%` }}
                className="h-full bg-primary-500 rounded-full"
                transition={{ delay: index * 0.05, duration: 0.5 }}
              />
            </div>
          </div>
          <div className="text-sm text-dark-600 dark:text-dark-400">
            Processing time: {detector.processing_time_ms}ms
          </div>
          {Object.keys(detector.details).length > 0 && (
            <details className="mt-3 group">
              <summary className="text-xs font-medium text-primary-600 dark:text-primary-400 cursor-pointer flex items-center gap-1">
                View Details
                <ChevronDown className="w-3 h-3 transition-transform group-open:rotate-180" />
              </summary>
              <pre className="mt-2 p-3 bg-dark-100 dark:bg-dark-800 rounded-lg text-xs overflow-x-auto text-dark-600 dark:text-dark-400 max-h-40">
                {JSON.stringify(detector.details, null, 2)}
              </pre>
            </details>
          )}
        </motion.div>
      ))}
    </div>
  );
}

import { ChevronDown } from 'lucide-react';

function TechnicalTab({ indicators }: { indicators: Record<string, any> }) {
  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Zap className="w-5 h-5 text-primary-500" />
        Technical Indicators
      </h3>
      {Object.keys(indicators).length === 0 ? (
        <p className="text-dark-500 dark:text-dark-400 text-center py-8">No technical indicators available for this analysis.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(indicators).map(([key, value]) => (
            <div key={key} className="p-4 rounded-xl bg-dark-50 dark:bg-dark-800/50">
              <p className="text-xs font-medium text-dark-500 dark:text-dark-400 uppercase tracking-wider mb-1">
                {key.replace(/_/g, ' ')}
              </p>
              <p className="font-mono text-dark-900 dark:text-dark-100 text-sm">
                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VisualTab({ type }: { type: DetectionType }) {
  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Eye className="w-5 h-5 text-primary-500" />
        3D Forensic Visualization
      </h3>
      <div className="aspect-video rounded-xl bg-dark-100 dark:bg-dark-800 flex items-center justify-center">
        <div className="text-center text-dark-500 dark:text-dark-400">
          <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>3D visualization for {type} analysis</p>
          <p className="text-sm mt-2">Coming soon - Interactive Three.js forensic visualizers</p>
        </div>
      </div>
    </div>
  );
}

