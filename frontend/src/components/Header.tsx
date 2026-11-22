'use client'

import { Mic, Shield } from 'lucide-react'

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-slate-700/30 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/30 to-violet-500/30 flex items-center justify-center border border-cyan-500/30">
              <Mic className="w-6 h-6 text-cyan-300" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">AI AUDIO AUTHENTICITY</h1>
              <p className="text-xs text-slate-500 font-mono uppercase tracking-wider">FORENSIC ANALYSIS SYSTEM</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <a href="#analysis" className="text-sm text-slate-400 hover:text-cyan-300 transition-colors font-medium">
              ANALYSIS
            </a>
            <a href="#detectors" className="text-sm text-slate-400 hover:text-cyan-300 transition-colors font-medium">
              DETECTORS
            </a>
            <a href="#docs" className="text-sm text-slate-400 hover:text-cyan-300 transition-colors font-medium">
              DOCUMENTATION
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 glass rounded-full border border-slate-700/50">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-mono text-slate-300">LIVE</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-violet-500/20 flex items-center justify-center border border-cyan-500/30">
              <Shield className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}