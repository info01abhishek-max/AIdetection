'use client'

import { motion } from 'framer-motion'
import { Shield, Search, Zap, Layers } from 'lucide-react'

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-slate-700/30">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/30 to-violet-500/30 flex items-center justify-center border border-cyan-500/30">
              <Shield className="w-6 h-6 text-cyan-300" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-cyan-300 to-violet-300 bg-clip-text text-transparent">
                AI PHOTO DETECTION
              </h1>
              <p className="text-xs text-slate-500 font-mono tracking-wider">Advanced Forensic Image Analysis</p>
            </div>
          </motion.div>

          <motion.nav
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="hidden md:flex items-center gap-6"
          >
            <a href="/" className="text-slate-400 hover:text-cyan-300 transition-colors text-sm font-medium flex items-center gap-1">
              <Search className="w-4 h-4" />
              ANALYZE
            </a>
            <a href="/docs" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-violet-300 transition-colors text-sm font-medium flex items-center gap-1">
              <Layers className="w-4 h-4" />
              API DOCS
            </a>
            <span className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 px-3 py-1 glass rounded-full border border-cyan-500/30">
              <Zap className="w-3 h-3" />
              LIVE
            </span>
          </motion.nav>
        </div>
      </div>
    </header>
  )
}