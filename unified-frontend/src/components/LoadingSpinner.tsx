import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

export default function LoadingSpinner({ fullScreen = false, size = 'md', message = 'Loading...' }: LoadingSpinnerProps) {
  const spinnerClass = sizeClasses[size];

  if (fullScreen) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-dark-950/80 backdrop-blur-sm"
      >
        <div className="glass-strong rounded-2xl p-8 text-center max-w-sm mx-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className={`mx-auto mb-4 ${spinnerClass} text-primary-500`}
          >
            <Loader2 className="w-full h-full" />
          </motion.div>
          <p className="text-dark-600 dark:text-dark-400 font-medium">{message}</p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="mt-2 text-sm text-dark-400 dark:text-dark-500"
          >
            Analyzing content...
          </motion.p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className={`${spinnerClass} text-primary-500`}
      >
        <Loader2 className="w-full h-full" />
      </motion.div>
      {message && <p className="text-dark-600 dark:text-dark-400 text-sm font-medium">{message}</p>}
    </div>
  );
}