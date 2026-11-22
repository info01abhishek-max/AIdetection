import { useState, useCallback, useRef, DragEvent, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Video as VideoIcon, FileVideo, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { validateVideoFile, createVideoPreview, extractVideoMetadata, formatFileSize, formatDuration } from '../utils/video';
import type { VideoMetadata } from '../utils/video';

interface UploadZoneProps {
  onUpload: (file: File) => Promise<void>;
  isAnalyzing: boolean;
  analysisId?: string;
}

export function UploadZone({ onUpload, isAnalyzing, analysisId }: UploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleDrag = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
      e.target.value = '';
    }
  }, []);

  const processFile = async (file: File) => {
    setError(null);
    const validation = validateVideoFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid video file');
      return;
    }

    try {
      const preview = await createVideoPreview(file);
      const meta = await extractVideoMetadata(file);
      setPreviewUrl(preview);
      setMetadata(meta);
    } catch {
      setError('Failed to load video preview');
    }
  };

  const handleUpload = async () => {
    if (!previewUrl || !metadata) return;

    const file = new File([await fetch(previewUrl).then(r => r.blob())], metadata.name, { type: metadata.type });
    setUploadProgress(0);
    try {
      await onUpload(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    setMetadata(null);
    setError(null);
    setUploadProgress(0);
  };

  if (isAnalyzing && analysisId) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl mx-auto"
      >
        <div className="text-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 mx-auto mb-6 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full"
          />
          <h2 className="text-2xl font-bold mb-2">Analyzing Video...</h2>
          <p className="text-slate-400 mb-6">Processing frames and running temporal analysis</p>
          <div className="w-64 mx-auto h-2 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              animate={{ width: ['0%', '100%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="h-full bg-gradient-to-r from-cyan-500 to-violet-500"
            />
          </div>
          <p className="mt-4 text-sm text-slate-500 font-mono">Analysis ID: {analysisId}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-4xl mx-auto"
    >
      <AnimatePresence mode="wait">
        {previewUrl && metadata ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-slate-700">
              <video
                ref={videoRef}
                src={previewUrl}
                controls
                className="w-full h-full"
                onLoadedData={() => URL.revokeObjectURL(previewUrl)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                <div className="w-full flex items-center justify-between text-sm">
                  <span className="text-slate-300">{metadata.name}</span>
                  <span className="text-cyan-300 font-mono">{formatDuration(metadata.duration)} • {metadata.width}×{metadata.height}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="glass rounded-xl p-4">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Duration</p>
                <p className="font-mono text-lg text-cyan-300">{formatDuration(metadata.duration)}</p>
              </div>
              <div className="glass rounded-xl p-4">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Resolution</p>
                <p className="font-mono text-lg text-cyan-300">{metadata.width} × {metadata.height}</p>
              </div>
              <div className="glass rounded-xl p-4">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">File Size</p>
                <p className="font-mono text-lg text-cyan-300">{formatFileSize(metadata.size)}</p>
              </div>
              <div className="glass rounded-xl p-4">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Format</p>
                <p className="font-mono text-lg text-cyan-300">{metadata.type.replace('video/', '').toUpperCase()}</p>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            <div className="flex items-center justify-center gap-4 pt-4">
              <button
                onClick={handleRemove}
                disabled={isAnalyzing}
                className="btn-secondary flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Remove
              </button>
              <button
                onClick={handleUpload}
                disabled={isAnalyzing || uploadProgress > 0}
                className="btn-primary flex items-center gap-2"
              >
                {uploadProgress > 0 ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading... {uploadProgress}%
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Analyze Video
                  </>
                )}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative"
          >
            <div
              className={`relative rounded-3xl p-12 sm:p-16 text-center border-2 transition-all duration-300 ${
                dragActive
                  ? 'border-cyan-500 bg-cyan-500/5'
                  : 'border-slate-700 hover:border-cyan-500/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/x-matroska,video/webm,.mp4,.mov,.mkv,.webm"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isAnalyzing}
              />

              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="mb-6"
              >
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 flex items-center justify-center border border-cyan-500/30">
                  <FileVideo className="w-10 h-10 text-cyan-400" />
                </div>
              </motion.div>

              <h2 className="text-2xl font-bold mb-2">Drop video file here</h2>
              <p className="text-slate-400 mb-6 max-w-md mx-auto">
                Supports MP4, MOV, MKV, WebM up to 500MB • Analyzes up to 50 frames with temporal consistency checking
              </p>

              <div className="flex items-center justify-center gap-4 text-sm text-slate-500">
                <span className="flex items-center gap-1.5">
                  <VideoIcon className="w-4 h-4" />
                  MP4, MOV, MKV, WebM
                </span>
                <span className="flex items-center gap-1.5">
                  <Upload className="w-4 h-4" />
                  Max 500MB
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  5 min max duration
                </span>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex items-center justify-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}