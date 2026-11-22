import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import {
  Image,
  Video,
  Mic,
  FileText,
  ArrowRight,
  Shield,
  Zap,
  Eye,
  Brain,
  CheckCircle,
  FileImage,
  FileVideo,
  FileAudio,
  FileType,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface ServiceConfig {
  name: string;
  port: number;
  endpoint: string;
  key: string;
}

const services: ServiceConfig[] = [
  { name: 'Photo Backend', port: 8002, endpoint: '/api/health', key: 'photo' },
  { name: 'Video Backend', port: 8001, endpoint: '/api/v1/health', key: 'video' },
  { name: 'Audio Backend', port: 8000, endpoint: '/api/health', key: 'audio' },
  { name: 'Text Backend', port: 8003, endpoint: '/api/health', key: 'text' },
];

interface DetectorConfig {
  key: 'photo' | 'video' | 'audio' | 'text';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  fileIcon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  description: string;
  formats: string[];
  maxSize: string;
  detectors: string[];
  route: string;
}

const detectors: DetectorConfig[] = [
  {
    key: 'photo',
    label: 'PHOTO DETECTION',
    icon: Image,
    fileIcon: FileImage,
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-500/30',
    textColor: 'text-blue-600 dark:text-blue-400',
    description: 'Analyze images for AI generation using 6 forensic detectors including frequency analysis, noise patterns, compression artifacts, and EXIF metadata.',
    formats: ['JPG', 'PNG', 'WEBP', 'BMP', 'TIFF'],
    maxSize: '50MB',
    detectors: [
      'Synthetic Image Detection (EfficientNet-B0)',
      'Frequency Domain Analysis (DCT/FFT)',
      'Texture Consistency Analysis',
      'Noise Pattern Analysis (PRNU)',
      'Compression Artifact Detection',
      'EXIF Metadata Analysis',
    ],
    route: '/photo',
  },
  {
    key: 'video',
    label: 'VIDEO DETECTION',
    icon: Video,
    fileIcon: FileVideo,
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-500/30',
    textColor: 'text-purple-600 dark:text-purple-400',
    description: 'Frame-by-frame video analysis with temporal consistency checking. Detects deepfakes, synthetic frames, and manipulation across time.',
    formats: ['MP4', 'AVI', 'MOV', 'MKV', 'WEBM'],
    maxSize: '500MB',
    detectors: [
      'Synthetic Frame Detection',
      'Frequency Domain Frame Analysis',
      'Texture Consistency Per Frame',
      'Noise Pattern Analysis',
      'Compression Artifact Detection',
      'Temporal Consistency Checking',
    ],
    route: '/video',
  },
  {
    key: 'audio',
    label: 'AUDIO DETECTION',
    icon: Mic,
    fileIcon: FileAudio,
    color: 'from-green-500 to-teal-500',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-500/30',
    textColor: 'text-green-600 dark:text-green-400',
    description: 'Multi-detector audio forensics including spectral analysis, voice consistency, quality assessment, and statistical anomaly detection.',
    formats: ['WAV', 'MP3', 'FLAC', 'OGG', 'M4A'],
    maxSize: '100MB',
    detectors: [
      'Spectral Artifact Analysis',
      'Voice Consistency Analysis',
      'Audio Quality Assessment',
      'Statistical Anomaly Detection',
      'Synthetic Speech Detection',
    ],
    route: '/audio',
  },
  {
    key: 'text',
    label: 'TEXT DETECTION',
    icon: FileText,
    fileIcon: FileType,
    color: 'from-orange-500 to-red-500',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-500/30',
    textColor: 'text-orange-600 dark:text-orange-400',
    description: 'RoBERTa-based AI text detection with linguistic feature analysis. Identifies GPT, Claude, and other LLM-generated content.',
    formats: ['TXT', 'PDF', 'DOCX', 'Direct text input'],
    maxSize: '10MB',
    detectors: [
      'RoBERTa OpenAI Detector',
      'Perplexity Analysis',
      'Burstiness Detection',
      'N-gram Frequency Analysis',
      'Stylometric Features',
      'Syntactic Complexity',
    ],
    route: '/text',
  },
] as const;

const features = [
  { icon: Shield, title: 'Privacy First', desc: 'Files processed locally, never stored permanently' },
  { icon: Zap, title: 'Real-time Analysis', desc: 'Fast inference with progress tracking' },
  { icon: Eye, title: 'Visual Forensics', desc: 'Interactive 3D visualizations for each detector' },
  { icon: Brain, title: 'Multi-Model Ensemble', desc: 'Multiple detectors for higher accuracy' },
];

export default function Dashboard() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary-500/10 via-transparent to-purple-500/10" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-300 text-sm font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              All Systems Operational
            </div>

            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-6">
              <span className="gradient-text">AI vs Real</span> Detection System
            </h1>

            <p className="text-xl lg:text-2xl text-dark-600 dark:text-dark-300 mb-10 max-w-3xl mx-auto leading-relaxed">
              Unified platform for detecting AI-generated content across photos, videos, audio, and text.
              Powered by ensemble forensic analysis with interactive 3D visualizations.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link to="/photo" className="btn-primary group px-8 py-4 text-lg">
                Start Detection
                <ArrowRight className="w-5 h-5 ml-2 inline-block group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/about" className="btn-secondary px-8 py-4 text-lg">
                Learn More
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
              <StatCard value="4" label="Detection Modes" icon={CheckCircle} color="text-blue-500" delay={0.1} />
              <StatCard value="18+" label="Forensic Detectors" icon={Brain} color="text-purple-500" delay={0.2} />
              <StatCard value="<5s" label="Avg Analysis Time" icon={Zap} color="text-green-500" delay={0.3} />
              <StatCard value="100%" label="Local Processing" icon={Shield} color="text-orange-500" delay={0.4} />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Detection Cards */}
      <section className="py-20 lg:py-28 bg-white/50 dark:bg-dark-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Choose Detection Mode</h2>
            <p className="text-lg text-dark-600 dark:text-dark-400 max-w-2xl mx-auto">
              Each mode uses specialized forensic detectors tailored for that media type.
              Upload a file or paste content to begin analysis.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {detectors.map((detector, index) => (
              <DetectorCard key={detector.key} detector={detector} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Why Choose AI vs Real</h2>
            <p className="text-lg text-dark-600 dark:text-dark-400 max-w-2xl mx-auto">
              Built for accuracy, transparency, and ease of use.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="card card-hover text-center"
              >
                <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
                  <feature.icon className="w-7 h-7 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-dark-600 dark:text-dark-400">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* System Status */}
      <section className="py-20 bg-dark-50 dark:bg-dark-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl lg:text-4xl font-bold text-center mb-12">System Status</h2>
          <SystemStatusGrid />
        </div>
      </section>
    </div>
  );
}

function StatCard({ value, label, icon: Icon, color, delay }: { value: string; label: string; icon: React.ComponentType<any>; color: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay }}
      className="glass-strong rounded-2xl p-4"
    >
      <div className="flex items-center justify-center gap-2 mb-1">
        <Icon className={`w-5 h-5 ${color}`} />
        <span className="text-2xl lg:text-3xl font-bold gradient-text">{value}</span>
      </div>
      <p className="text-sm text-dark-600 dark:text-dark-400">{label}</p>
    </motion.div>
  );
}

function DetectorCard({ detector, index }: { detector: typeof detectors[0]; index: number }) {
  const { label, icon: Icon, fileIcon: FileIcon, color, bgColor, borderColor, textColor, description, formats, maxSize, detectors: detectorList, route } = detector;

  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className={`relative group card card-hover gradient-border overflow-hidden ${bgColor} ${borderColor}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${color}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold {textColor}">{label}</h3>
            <p className="text-xs text-dark-500 dark:text-dark-400 font-mono">v1.0.0</p>
          </div>
        </div>
        <FileIcon className="w-8 h-8 text-dark-300 dark:text-dark-600 group-hover:text-primary-500 transition-colors" />
      </div>

      {/* Description */}
      <p className="text-dark-600 dark:text-dark-400 mb-6 leading-relaxed">{description}</p>

      {/* Specs */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-dark-500 dark:text-dark-400 w-24">Formats:</span>
          <div className="flex flex-wrap gap-1">
            {formats.map(fmt => (
              <span key={fmt} className="px-2 py-0.5 text-xs rounded bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-300 font-mono">
                {fmt}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-dark-500 dark:text-dark-400 w-24">Max Size:</span>
          <span className="font-mono text-primary-600 dark:text-primary-400">{maxSize}</span>
        </div>
      </div>

      {/* Detectors List */}
      <details className="group mb-6">
        <summary className="flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400 cursor-pointer list-none">
          <span>Detectors ({detectorList.length})</span>
          <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <ul className="mt-3 space-y-1 pl-4 border-l-2 border-primary-200 dark:border-primary-800">
          {detectorList.map((d, i) => (
            <li key={i} className="text-sm text-dark-600 dark:text-dark-400 relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary-500" />
              {d}
            </li>
          ))}
        </ul>
      </details>

      {/* Action Button */}
      <Link
        to={route}
        className={`w-full btn-primary justify-center group relative overflow-hidden ${textColor.replace('text-', 'bg-').replace('dark:text-', 'dark:bg-').replace('-600', '-600').replace('-400', '-600')}`}
      >
        <span className="relative z-10 flex items-center gap-2">
          Open Detector
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </span>
      </Link>
    </motion.article>
  );
}

function SystemStatusGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {services.map((service, index) => (
        <ServiceStatusCard key={service.key} service={service} index={index} />
      ))}
    </div>
  );
}

function ServiceStatusCard({ service, index }: { service: ServiceConfig; index: number }) {
  const [status, setStatus] = useState<'checking' | 'healthy' | 'degraded' | 'down'>('checking');

  useEffect(() => {
    const check = async () => {
      try {
        const response = await fetch(`http://localhost:${service.port}${service.endpoint}`);
        if (response.ok) {
          const data = await response.json();
          setStatus(data.status === 'healthy' ? 'healthy' : data.status === 'degraded' ? 'degraded' : 'down');
        } else {
          setStatus('down');
        }
      } catch {
        setStatus('down');
      }
    };

    const timer = setTimeout(check, index * 500);
    const interval = setInterval(check, 30000);
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, [service.port, service.endpoint, index]);

  const statusConfig = {
    healthy: { label: 'Healthy', color: 'text-green-500', bg: 'bg-green-500/10', icon: CheckCircle },
    degraded: { label: 'Degraded', color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: AlertCircle },
    down: { label: 'Offline', color: 'text-red-500', bg: 'bg-red-500/10', icon: AlertCircle },
    checking: { label: 'Checking...', color: 'text-blue-500', bg: 'bg-blue-500/10', icon: Loader2 },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="card"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.bg}`}>
          {status === 'checking' ? (
            <Icon className="w-5 h-5 animate-spin" style={{ color: config.color }} />
          ) : (
            <Icon className="w-5 h-5" style={{ color: config.color }} />
          )}
        </div>
        <div>
          <h4 className="font-semibold">{service.name}</h4>
          <p className="text-sm text-dark-500 dark:text-dark-400 font-mono">Port {service.port}</p>
        </div>
      </div>
      <div className={`px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.color} inline-block`}>
        {config.label}
      </div>
    </motion.div>
  );
}

