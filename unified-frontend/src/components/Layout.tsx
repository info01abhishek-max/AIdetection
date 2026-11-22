import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import {
  Home,
  Image,
  Video,
  Mic,
  FileText,
  Info,
  Menu,
  X,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import api from '@/utils/api';
import type { HealthResponse, DetectionType } from '@/types';

const navItems = [
  { path: '/', label: 'Dashboard', icon: Home, key: 'dashboard' },
  { path: '/photo', label: 'Photo', icon: Image, key: 'photo' },
  { path: '/video', label: 'Video', icon: Video, key: 'video' },
  { path: '/audio', label: 'Audio', icon: Mic, key: 'audio' },
  { path: '/text', label: 'Text', icon: FileText, key: 'text' },
  { path: '/about', label: 'About', icon: Info, key: 'about' },
] as const;

export default function Layout() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [healthStatus, setHealthStatus] = useState<Partial<Record<DetectionType, HealthResponse>>>({});
  const [checkingHealth, setCheckingHealth] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      setCheckingHealth(true);
      try {
        const status = await api.checkAllHealth();
        setHealthStatus(status);
      } catch (error) {
        console.error('Health check failed:', error);
      } finally {
        setCheckingHealth(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (type: DetectionType) => {
    const status = healthStatus[type];
    if (!status) return <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />;
    if (status.status === 'healthy') return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status.status === 'degraded') return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    return <AlertCircle className="w-4 h-4 text-red-500" />;
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-dark-50 to-white dark:from-dark-950 dark:to-dark-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-dark-200 dark:border-dark-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 text-xl font-bold gradient-text" aria-label="AI vs Real Home">
              <svg className="w-8 h-8" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="48" stroke="url(#grad)" stroke-width="4"/>
                <path d="M30 50 L45 65 L70 30" stroke="url(#grad)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
                <defs>
                  <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0ea5e9"/>
                    <stop offset="100%" stopColor="#8b5cf6"/>
                  </linearGradient>
                </defs>
              </svg>
              <span className="hidden sm:block">AI vs Real</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map(item => (
                <Link
                  key={item.key}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive(item.path)
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 shadow-lg shadow-primary-500/20'
                      : 'text-dark-600 dark:text-dark-400 hover:text-dark-900 dark:hover:text-dark-100 hover:bg-dark-100 dark:hover:bg-dark-800'
                  }`}
                >
                  <item.icon className="w-5 h-5" aria-hidden="true" />
                  <span>{item.label}</span>
                  {['photo', 'video', 'audio', 'text'].includes(item.key) && (
                    <span className="ml-1">{getStatusIcon(item.key as DetectionType)}</span>
                  )}
                </Link>
              ))}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-lg text-dark-600 dark:text-dark-400 hover:bg-dark-100 dark:hover:bg-dark-800"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-expanded={isMobileMenuOpen}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden overflow-hidden bg-white dark:bg-dark-900 border-t border-dark-200 dark:border-dark-800"
            >
              <div className="px-4 py-4 space-y-1">
                {navItems.map(item => (
                  <Link
                    key={item.key}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium transition-all ${
                      isActive(item.path)
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                        : 'text-dark-600 dark:text-dark-400 hover:text-dark-900 dark:hover:text-dark-100 hover:bg-dark-100 dark:hover:bg-dark-800'
                    }`}
                  >
                    <item.icon className="w-5 h-5" aria-hidden="true" />
                    <span>{item.label}</span>
                    {['photo', 'video', 'audio', 'text'].includes(item.key) && (
                      <span className="ml-auto">{getStatusIcon(item.key as DetectionType)}</span>
                    )}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Health Check Indicator */}
        {checkingHealth && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 to-purple-500 animate-pulse" />
        )}
      </nav>

      {/* Main Content */}
      <main className="pt-16 min-h-screen">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-dark-200 dark:border-dark-800 bg-white/50 dark:bg-dark-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-dark-500 dark:text-dark-400">
            <p>AI vs Real Detection System v1.0.0</p>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                All systems operational
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}