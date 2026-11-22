'use client'

import { motion } from 'framer-motion'
import { Shield, Brain, Search, Zap } from 'lucide-react'

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-slate-700/30 backdrop-blur-2xl">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center border border-cyan-500/30 shadow-lg shadow-cyan-500/20">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl md:text-2xl text-white bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                AI TEXT DETECTION
              </h1>
              <p className="text-xs font-mono text-slate-500 tracking-wider">Linguistic Forensics System</p>
            </div>
          </motion.div>

          <motion.nav
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="hidden md:flex items-center gap-1"
          >
            <NavItem icon={Search} label="ANALYZE" href="#analyze" />
            <NavItem icon={Brain} label="MODELS" href="#models" />
            <NavItem icon={Zap} label="FEATURES" href="#features" />
          </motion.nav>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center gap-3"
          >
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 glass rounded-lg border border-slate-700/50">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-mono text-slate-300">LIVE</span>
            </div>
            <div className="w-px h-6 bg-slate-700/50 hidden md:block" />
            <span className="text-xs font-mono text-slate-500 hidden sm:block">v1.0.0</span>
          </motion.div>
        </div>
      </div>
    </header>
  )
}

function NavItem({ icon: Icon, label, href }: { icon: React.ComponentType<{ className?: string }>; label: string; href: string }) {
  return (
    <a
      href={href}
      className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-100 transition-colors relative group"
    >
      <span className="flex items-center gap-2">
        <Icon className="w-4 h-4" />
        {label}
      </span>
      <motion.span
        layoutId="nav-underline"
        className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-violet-500 origin-center scale-x-0 group-hover:scale-x-100 transition-transform duration-300"
      />
    </a>
  )
}