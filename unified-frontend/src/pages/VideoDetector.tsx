import { useState, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileVideo,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Video as VideoIcon,
  ChevronLeft,
  Film,
} from 'lucide-react';
import api from '@/utils/api';
import type { VideoAnalysisResult } from '@/types';

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const ACCEPTED_TYPES = ['video/mp4', 'video/x-msvideo', 'video/quicktime', 'video/x-matroska', 'video/webm'];

export default function VideoDetector() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'analyzing' | 'completed' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [framesProcessed, setFramesProcessed] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
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
      setError('Invalid file type. Please select a video file (MP4, AVI, MOV, MKV, WebM).');
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
    setFramesProcessed(0);
    setTotalFrames(0);
  }, []);

  const handleRemoveFile = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setStatus('idle');
    setError(null);
    setFramesProcessed(0);
    setTotalFrames(0);
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
      const uploadResponse = await api.uploadVideo(file);
      setStatus('analyzing');
      setUploadProgress(100);

      await new Promise<VideoAnalysisResult>((resolve, reject) => {
        let cancelled = false;
        pollingRef.current = { cancel: () => { cancelled = true; } };

        const poll = async () => {
          if (cancelled) return;
          try {
            const statusResponse = await api.getVideoStatus(uploadResponse.analysis_id);
            setAnalysisProgress(statusResponse.progress);
            setCurrentStep(statusResponse.current_step);
            setFramesProcessed(statusResponse.frames_processed);
            setTotalFrames(statusResponse.total_frames);

            if (statusResponse.status === 'completed') {
              const result = await api.getVideoResult(uploadResponse.analysis_id);
              resolve(result);
            } else if (statusResponse.status === 'failed') {
              reject(new Error('Analysis failed'));
            } else {
              setTimeout(poll, 3000);
            }
          } catch (err) {
            if (!cancelled) reject(err);
          }
        };

        poll();
      });

      setStatus('completed');
      setAnalysisProgress(100);
      navigate(`/results/video/${uploadResponse.analysis_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setStatus('error');
    } finally {
      pollingRef.current = null;
    }
  }, [file, navigate]);

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
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <VideoIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Video Detection</h1>
              <p className="text-dark-600 dark:text-dark-400 mt-1">
                Frame-by-frame video analysis with temporal consistency checking
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
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={`relative rounded-2xl border-2 border-dashed transition-all duration-300 ${
                dragActive
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-dark-200 dark:border-dark-700 hover:border-purple-300 dark:hover:border-purple-700'
              } ${file ? 'border-transparent bg-dark-50 dark:bg-dark-800' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {file ? (
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-dark-100 dark:bg-dark-700 flex-shrink-0 relative">
                        <video src={preview!} className="w-full h-full object-cover" muted />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <Film className="w-8 h-8 text-white" />
                        </div>
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
                <div className="p-12 text-center">
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center"
                  >
                    <Upload className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                  </motion.div>
                  <p className="text-lg font-medium mb-1">Drag & drop a video here</p>
                  <p className="text-dark-500 dark:text-dark-400 mb-6">or click to browse</p>
                  <input
                    type="file"
                    accept={ACCEPTED_TYPES.join(',')}
                    onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                    className="hidden"
                    id="video-upload"
                  />
                  <label htmlFor="video-upload" className="btn-primary inline-flex items-center gap-2" style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }}>
                    <FileVideo className="w-4 h-4" />
                    Choose File
                  </label>
                  <p className="mt-4 text-sm text-dark-500 dark:text-dark-400">
                    Supports: MP4, AVI, MOV, MKV, WebM • Max 500MB
                  </p>
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <button
                onClick={handleAnalyze}
                disabled={!file || status === 'uploading' || status === 'analyzing'}
                className="w-full btn-primary py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }}
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
                    Analyzing frames... {framesProcessed}/{totalFrames} ({analysisProgress}%)
                  </>
                )}
                {status === 'idle' && 'Start Frame Analysis'}
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
                  <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
                )}
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-dark-600 dark:text-dark-400">Overall Progress</span>
                  <span className="font-mono font-semibold text-purple-600 dark:text-purple-400">
                    {analysisProgress}%
                  </span>
                </div>
                <div className="h-3 bg-dark-100 dark:bg-dark-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
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

              {/* Frame Progress */}
              {status === 'analyzing' && totalFrames > 0 && (
                <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-dark-600 dark:text-dark-400">Frames Processed</span>
                    <span className="font-mono font-semibold text-purple-600 dark:text-purple-400">
                      {framesProcessed} / {totalFrames}
                    </span>
                  </div>
                  <div className="h-2 bg-dark-100 dark:bg-dark-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(framesProcessed / totalFrames) * 100}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              )}

              {/* Detector Info */}
              <div className="space-y-3">
                {[
                  'Synthetic Frame Detection',
                  'Frequency Domain Analysis',
                  'Texture Consistency',
                  'Noise Pattern Analysis',
                  'Compression Artifacts',
                  'Temporal Consistency',
                ].map((detector, index) => (
                  <motion.div
                    key={detector}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-dark-50 dark:bg-dark-800/50"
                  >
                    <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
                      <Film className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="text-sm font-medium text-dark-700 dark:text-dark-300">{detector}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

