import { motion } from 'framer-motion';
import {
  Shield,
  Zap,
  Eye,
  Brain,
  Code,
  Globe,
  BookOpen,
  Github,
  Twitter,
  Linkedin,
  Mail,
  CheckCircle,
  ArrowRight,
  Layers,
  Cpu,
  Database,
  Users,
  Award,
} from 'lucide-react';

const features = [
  {
    icon: Shield,
    title: 'Privacy First',
    desc: 'All analysis runs locally on your machine. No files are uploaded to external servers or stored permanently.',
  },
  {
    icon: Zap,
    title: 'Real-time Analysis',
    desc: 'Fast inference with live progress tracking. Photo analysis in ~3s, video frame-by-frame, audio in ~15s, text in ~4s.',
  },
  {
    icon: Eye,
    title: 'Visual Forensics',
    desc: 'Interactive 3D visualizations for each detector type. Explore frequency domains, noise patterns, and metadata graphs.',
  },
  {
    icon: Brain,
    title: 'Multi-Model Ensemble',
    desc: '18+ specialized detectors across 4 modalities. Deep learning + statistical analysis for higher accuracy.',
  },
  {
    icon: Code,
    title: 'Open Architecture',
    desc: 'Modular design with clean APIs. Easy to extend with new detectors or integrate into existing workflows.',
  },
  {
    icon: Globe,
    title: 'Cross-Platform',
    desc: 'Runs on Windows, Linux, macOS. Backends in Python/FastAPI, frontend in React/TypeScript with Vite.',
  },
];

const detectors = [
  {
    category: 'Photo (6 detectors)',
    items: [
      'Synthetic Image Detection (EfficientNet-B0)',
      'Frequency Domain Analysis (DCT/FFT)',
      'Texture Consistency (LBP/GLCM)',
      'Noise Pattern Analysis (PRNU)',
      'Compression Artifact Detection',
      'EXIF Metadata Analysis',
    ],
  },
  {
    category: 'Video (6 detectors)',
    items: [
      'Synthetic Frame Detection',
      'Frequency Domain Frame Analysis',
      'Texture Consistency Per Frame',
      'Noise Pattern Analysis',
      'Compression Artifact Detection',
      'Temporal Consistency Checking',
    ],
  },
  {
    category: 'Audio (5 detectors)',
    items: [
      'Spectral Artifact Analysis',
      'Voice Consistency Analysis',
      'Audio Quality Assessment',
      'Statistical Anomaly Detection',
      'Synthetic Speech Detection',
    ],
  },
  {
    category: 'Text (6 detectors)',
    items: [
      'RoBERTa OpenAI Detector',
      'Perplexity Analysis',
      'Burstiness Detection',
      'N-gram Frequency Analysis',
      'Stylometric Features',
      'Syntactic Complexity',
    ],
  },
];

const techStack = [
  { category: 'Backend', items: ['FastAPI', 'PyTorch', 'timm', 'transformers', 'OpenCV', 'librosa', 'torchaudio', 'scikit-learn', 'slowapi'] },
  { category: 'Frontend', items: ['React 18', 'TypeScript', 'Vite', 'Tailwind CSS', 'Framer Motion', 'Three.js/Fiber', 'React Router', 'Axios'] },
  { category: 'Infrastructure', items: ['Uvicorn', 'ThreadPoolExecutor', 'BackgroundTasks', 'Pydantic v2', 'NumPy', 'Pillow', 'soundfile'] },
];

export default function About() {
  return (
    <div className="min-h-screen pt-16 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-24 py-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-300 text-sm font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Version 1.0.0 • Production Ready
          </div>
          <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-6">
            About <span className="gradient-text">AI vs Real</span>
          </h1>
          <p className="text-xl lg:text-2xl text-dark-600 dark:text-dark-300 max-w-3xl mx-auto leading-relaxed">
            A unified, open-source platform for detecting AI-generated content across photos, videos, audio, and text.
            Built with transparency, privacy, and accuracy as core principles.
          </p>
        </motion.section>

        {/* Features */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-24"
        >
          <h2 className="text-3xl lg:text-4xl font-bold text-center mb-12">Core Principles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="card card-hover"
              >
                <div className="w-14 h-14 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center mb-4">
                  <feature.icon className="w-7 h-7 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-dark-600 dark:text-dark-400">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Detectors */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-24"
        >
          <h2 className="text-3xl lg:text-4xl font-bold text-center mb-12">Forensic Detectors</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {detectors.map((detector, index) => (
              <motion.div
                key={detector.category}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="card"
              >
                <h3 className="font-semibold mb-3 text-primary-600 dark:text-primary-400">{detector.category}</h3>
                <ul className="space-y-2">
                  {detector.items.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-dark-600 dark:text-dark-400">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Tech Stack */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-24"
        >
          <h2 className="text-3xl lg:text-4xl font-bold text-center mb-12">Technology Stack</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {techStack.map((stack, index) => (
              <motion.div
                key={stack.category}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="card"
              >
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary-500" />
                  {stack.category}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {stack.items.map(item => (
                    <span key={item} className="px-3 py-1 text-sm rounded-full bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-300 border border-dark-200 dark:border-dark-700">
                      {item}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Architecture */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-24"
        >
          <h2 className="text-3xl lg:text-4xl font-bold text-center mb-12">Architecture Overview</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <ArchitectureCard
              title="Frontend Layer"
              icon={Globe}
              items={[
                'React 18 + TypeScript SPA',
                'Vite for fast HMR & builds',
                'Tailwind CSS for styling',
                'Framer Motion animations',
                'Three.js/Fiber for 3D viz',
                'React Router v6 navigation',
              ]}
            />
            <ArchitectureCard
              title="API Gateway"
              icon={Cpu}
              items={[
                'Vite dev server proxy',
                'Unified /api/* routes',
                'Port mapping: 8001-8004',
                'CORS configured per service',
                'Rate limiting headers',
                'Request/response logging',
              ]}
            />
            <ArchitectureCard
              title="Backend Services"
              icon={Database}
              items={[
                '4 independent FastAPI services',
                'Async lifespan for model loading',
                'ThreadPoolExecutor for video',
                'Synchronous text analysis',
                'Pydantic v2 validation',
                'SlowAPI rate limiting',
              ]}
            />
          </div>
        </motion.section>

        {/* Stats */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-24 py-16 rounded-3xl bg-gradient-to-br from-primary-500 via-purple-500 to-pink-500"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <Stat number="4" label="Detection Modalities" />
            <Stat number="18+" label="Forensic Detectors" />
            <Stat number="100%" label="Local Processing" />
            <Stat number="Open Source" label="MIT License" />
          </div>
        </motion.section>

        {/* Links */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <h2 className="text-3xl lg:text-4xl font-bold text-center mb-12">Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ResourceCard
              icon={BookOpen}
              title="Documentation"
              desc="Complete API docs, setup guides, and architecture overview"
              href="#"
            />
            <ResourceCard
              icon={Github}
              title="GitHub Repository"
              desc="Source code, issues, and contributions"
              href="#"
            />
            <ResourceCard
              icon={Award}
              title="Benchmarks"
              desc="Accuracy metrics and performance benchmarks"
              href="#"
            />
            <ResourceCard
              icon={Users}
              title="Community"
              desc="Discord, discussions, and contributor guide"
              href="#"
            />
          </div>
        </motion.section>

        {/* Footer */}
        <footer className="border-t border-dark-200 dark:border-dark-800 pt-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2 text-xl font-bold gradient-text">
              <svg className="w-8 h-8" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="48" stroke="url(#grad2)" stroke-width="4"/>
                <path d="M30 50 L45 65 L70 30" stroke="url(#grad2)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
                <defs>
                  <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0ea5e9"/>
                    <stop offset="100%" stopColor="#8b5cf6"/>
                  </linearGradient>
                </defs>
              </svg>
              AI vs Real
            </div>
            <p className="text-dark-500 dark:text-dark-400 text-sm">
              Built with transparency and privacy in mind. © 2024 AI vs Real Team.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-dark-400 hover:text-primary-500 transition-colors" aria-label="GitHub">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="text-dark-400 hover:text-primary-500 transition-colors" aria-label="Twitter">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-dark-400 hover:text-primary-500 transition-colors" aria-label="LinkedIn">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="text-dark-400 hover:text-primary-500 transition-colors" aria-label="Email">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function ArchitectureCard({ title, icon: Icon, items }: { title: string; icon: React.ComponentType<any>; items: string[] }) {
  return (
    <div className="card">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Icon className="w-5 h-5 text-primary-500" />
        {title}
      </h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-dark-600 dark:text-dark-400">
            <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ number, label }: { number: string; label: string }) {
  return (
    <div>
      <div className="text-4xl lg:text-5xl font-bold text-white mb-2">{number}</div>
      <div className="text-white/80 text-lg">{label}</div>
    </div>
  );
}

function ResourceCard({ icon: Icon, title, desc, href }: { icon: React.ComponentType<any>; title: string; desc: string; href: string }) {
  return (
    <a href={href} className="card card-hover group">
      <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        <Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
      </div>
      <h3 className="font-semibold mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{title}</h3>
      <p className="text-sm text-dark-600 dark:text-dark-400">{desc}</p>
      <ArrowRight className="w-5 h-5 text-primary-500 mt-4 opacity-0 group-hover:opacity-100 transition-opacity" />
    </a>
  );
}