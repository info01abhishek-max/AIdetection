import { motion } from 'framer-motion';
import { Shield, Zap, Brain, Video } from 'lucide-react';

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 glass border-b border-cyan-500/10 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3"
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center">
                <Video className="w-6 h-6 text-white" />
              </div>
              <motion.div
                animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -inset-1 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500 opacity-20 blur-lg"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold gradient-text">AI Video Authenticity</h1>
              <p className="text-xs text-slate-400">Frame-level & Temporal Analysis</p>
            </div>
          </motion.div>

          <nav className="hidden md:flex items-center gap-6">
            <motion.a
              href="#upload"
              whileHover={{ scale: 1.05 }}
              className="text-slate-300 hover:text-cyan-300 transition-colors text-sm font-medium"
            >
              Analyze
            </motion.a>
            <motion.a
              href="#features"
              whileHover={{ scale: 1.05 }}
              className="text-slate-300 hover:text-cyan-300 transition-colors text-sm font-medium"
            >
              Features
            </motion.a>
            <motion.a
              href="#how-it-works"
              whileHover={{ scale: 1.05 }}
              className="text-slate-300 hover:text-cyan-300 transition-colors text-sm font-medium"
            >
              How It Works
            </motion.a>
          </nav>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex items-center gap-3"
          >
            <div className="hidden sm:flex items-center gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-cyan-400" />
                <span>Privacy First</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-violet-400" />
                <span>Real-time</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-pink-400" />
                <span>ML Powered</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </header>
  );
}