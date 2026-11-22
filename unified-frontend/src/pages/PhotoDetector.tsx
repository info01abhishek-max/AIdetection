import { useState, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileImage,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  Info,
  ChevronLeft,
  Brain,
  Activity,
  Grid,
  Zap,
} from 'lucide-react';
import api from '@/utils/api';
import type { PhotoAnalysisResult } from '@/types';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/tiff'];

interface DetectorStep {
  name: string;
  icon: React.ReactNode;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: 'ai' | 'real' | 'warning';
}

const detectorSteps: Omit<DetectorStep, 'status'>[] = [
  { name: 'Synthetic Image', icon: <Brain className="w-5 h-5" /> },
  { name: 'Frequency Analysis', icon: <Activity className="w-5 h-5" /> },
  { name: 'Texture Analysis', icon: <Grid className="w-5 h-5" /> },
  { name: 'Noise Patterns', icon: <Zap className="w-5 h-5" /> },
  { name: 'Compression', icon: <FileImage className="w-5 h-5" /> },
  { name: 'EXIF Metadata', icon: <Info className="w-5 h-5" /> },
];

export default function PhotoDetector() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'analyzing' | 'completed' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [steps, setSteps] = useState<DetectorStep[]>(
    detectorSteps.map(s => ({ ...s, status: 'pending' as const }))
  );
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<{ cancel: () => void } | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = useCallback((selectedFile: File) => {
    if (!ACCEPTED_TYPES.includes(selectedFile.type)) {
      setError('Invalid file type. Please select an image file (JPG, PNG, WebP, BMP, TIFF).');
      return;
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
      return;
    }
    setError(null);
    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setStatus('idle');
    resetSteps();
  }, []);

  const resetSteps = () => {
    setSteps(detectorSteps.map(s => ({ ...s, status: 'pending' as const })));
    setAnalysisProgress(0);
    setCurrentStep('');
  };

  const handleRemoveFile = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setStatus('idle');
    setError(null);
    resetSteps();
    if (pollingRef.current) {
      pollingRef.current.cancel();
      pollingRef.current = null;
    }
  }, [preview]);

  const handleAnalyze = useCallback(async () => {
    if (!file) return;
    setError(null);
    setStatus('uploading');
    setUploadProgress(0);

    try {
      // Upload
      const uploadResponse = await api.uploadPhoto(file);
      setStatus('analyzing');
      setUploadProgress(100);

      // Poll for status
      await new Promise<PhotoAnalysisResult>((resolve, reject) => {
        let cancelled = false;
        pollingRef.current = { cancel: () => { cancelled = true; } };

        const poll = async () => {
          if (cancelled) return;
          try {
            const statusResponse = await api.getPhotoStatus(uploadResponse.analysis_id);
            setAnalysisProgress(statusResponse.progress);
            setCurrentStep(statusResponse.current_step);

            // Update detector steps based on progress
            updateStepsFromProgress(statusResponse.progress);

            if (statusResponse.status === 'completed') {
              const result = await api.getPhotoResult(uploadResponse.analysis_id);
              resolve(result);
            } else if (statusResponse.status === 'failed') {
              reject(new Error('Analysis failed'));
            } else {
              setTimeout(poll, 2000);
            }
          } catch (err) {
            if (!cancelled) reject(err);
          }
        };

        poll();
      });

      setStatus('completed');
      setAnalysisProgress(100);
      setSteps(prev => prev.map(s => ({ ...s, status: 'completed' as const })));

      // Navigate to results page
      navigate(`/results/photo/${uploadResponse.analysis_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setStatus('error');
    } finally {
      pollingRef.current = null;
    }
  }, [file, navigate]);

  const updateStepsFromProgress = (progress: number) => {
    setSteps(prev => prev.map((s, i) => {
      const stepProgress = ((i + 1) / detectorSteps.length) * 100;
      if (progress >= stepProgress) {
        return { ...s, status: 'completed' as const };
      } else if (progress > (i / detectorSteps.length) * 100) {
        return { ...s, status: 'running' as const };
      }
      return s;
    }));
  };

  const handleExampleClick = async () => {
    // Create a test image
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(512, 512);
    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i] = Math.random() * 255;
      imageData.data[i + 1] = Math.random() * 255;
      imageData.data[i + 2] = Math.random() * 255;
      imageData.data[i + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
    canvas.toBlob(blob => {
      if (blob) {
        const testFile = new File([blob], 'test-image.png', { type: 'image/png' });
        handleFileSelect(testFile);
      }
    }, 'image/png');
  };

  return (
    <div className="min-h-screen pt-16 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <Link to="/" className="btn-ghost mb-6 inline-flex items-center gap-2">
            <ChevronLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Photo Detection</h1>
              <p className="text-dark-600 dark:text-dark-400 mt-1">
                Upload an image to analyze for AI generation using 6 forensic detectors
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Upload Panel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Drop Zone */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={`relative rounded-2xl border-2 border-dashed transition-all duration-300 ${
                dragActive
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-dark-200 dark:border-dark-700 hover:border-primary-300 dark:hover:border-primary-700'
              } ${file ? 'border-transparent bg-dark-50 dark:bg-dark-800' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {file ? (
                // File Preview
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-dark-100 dark:bg-dark-700 flex-shrink-0">
                        <img src={preview!} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{file.name}</p>
                        <p className="text-sm text-dark-500 dark:text-dark-400 font-mono">
                          {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleRemoveFile}
                      className="p-2 rounded-lg text-dark-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      aria-label="Remove file"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ) : (
                // Drop Zone Content
                <div className="p-12 text-center">
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center"
                  >
                    <Upload className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                  </motion.div>
                  <p className="text-lg font-medium mb-1">Drag & drop an image here</p>
                  <p className="text-dark-500 dark:text-dark-400 mb-6">or click to browse</p>
                  <input
                    type="file"
                    accept={ACCEPTED_TYPES.join(',')}
                    onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                    className="hidden"
                    id="photo-upload"
                  />
                  <label htmlFor="photo-upload" className="btn-primary inline-flex items-center gap-2">
                    <FileImage className="w-4 h-4" />
                    Choose File
                  </label>
                  <p className="mt-4 text-sm text-dark-500 dark:text-dark-400">
                    Supports: JPG, PNG, WebP, BMP, TIFF • Max 50MB
                  </p>
                </div>
              )}
            </motion.div>

            {/* Analyze Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <button
                onClick={handleAnalyze}
                disabled={!file || status === 'uploading' || status === 'analyzing'}
                className="w-full btn-primary py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'uploading' && (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Uploading... {uploadProgress}%
                  </>
                )}
                {status === 'analyzing' && (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing... {analysisProgress}%
                  </>
                )}
                {status === 'idle' && 'Start Analysis'}
                {status === 'completed' && (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Analysis Complete
                  </>
                )}
                {status === 'error' && (
                  <>
                    <AlertCircle className="w-5 h-5" />
                    Retry Analysis
                  </>
                )}
              </button>
            </motion.div>

            {/* Error Display */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-red-700 dark:text-red-300">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Example Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <button
                onClick={handleExampleClick}
                disabled={status === 'uploading' || status === 'analyzing'}
                className="btn-ghost"
              >
                Try with a random test image
              </button>
            </motion.div>
          </motion.div>

          {/* Progress Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <div className="card h-full">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Analysis Progress</h3>
                {status === 'analyzing' && (
                  <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
                )}
              </div>

              {/* Overall Progress */}
              <div className="mb-6">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-dark-600 dark:text-dark-400">Overall Progress</span>
                  <span className="font-mono font-semibold text-primary-600 dark:text-primary-400">
                    {analysisProgress}%
                  </span>
                </div>
                <div className="h-3 bg-dark-100 dark:bg-dark-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary-500 to-cyan-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${analysisProgress}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
                {currentStep && (
                  <p className="mt-2 text-sm text-dark-500 dark:text-dark-400 font-mono">
                    {currentStep}
                  </p>
                )}
              </div>

              {/* Detector Steps */}
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <motion.div
                    key={step.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-dark-50 dark:bg-dark-800/50"
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${{
                      pending: 'bg-dark-100 dark:bg-dark-700 text-dark-400',
                      running: 'bg-primary-500/20 text-primary-500 animate-pulse',
                      completed: 'bg-green-500/20 text-green-500',
                      failed: 'bg-red-500/20 text-red-500',
                    }[step.status]}`}>
                      {step.status === 'completed' ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : step.status === 'failed' ? (
                        <AlertCircle className="w-5 h-5" />
                      ) : step.status === 'running' ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        step.icon
                      )}
                    </div>
                    <span className="text-sm font-medium text-dark-700 dark:text-dark-300">
                      {step.name}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Detectors Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {detectorSteps.map((detector, index) => (
            <motion.div
              key={detector.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="card p-4"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
                  {detector.icon}
                </div>
                <h4 className="font-semibold">{detector.name}</h4>
              </div>
              <p className="text-sm text-dark-600 dark:text-dark-400">
                {getDetectorDescription(detector.name)}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

function getDetectorDescription(name: string): string {
  const descriptions: Record<string, string> = {
    'Synthetic Image': 'Deep learning model (EfficientNet-B0) trained to detect AI-generated images',
    'Frequency Analysis': 'DCT/FFT analysis to detect frequency domain anomalies from generative models',
    'Texture Analysis': 'Local binary patterns and GLCM features to identify synthetic textures',
    'Noise Patterns': 'PRNU and sensor noise analysis to detect camera fingerprint inconsistencies',
    'Compression': 'JPEG quantization table and block artifact analysis for manipulation traces',
    'EXIF Metadata': 'Camera metadata, software tags, and timestamp analysis for authenticity',
  };
  return descriptions[name] || 'Forensic analysis detector';
}