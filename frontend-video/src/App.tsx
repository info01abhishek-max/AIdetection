import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Header } from './components/Header';
import { UploadZone } from './components/UploadZone';
import { ResultsPanel } from './components/ResultsPanel';
import { api } from './utils/api';
import type { AnalysisResult, AnalysisStatus, UploadResponse, StatusResponse } from './types';

function App() {
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [health, setHealth] = useState<{ models_loaded: string[]; gpu_available: boolean } | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    api.healthCheck().then(setHealth).catch(console.error);
  }, []);

  const handleUpload = useCallback(async (file: File) => {
    setError(null);
    setResult(null);
    setVideoSrc(URL.createObjectURL(file));

    try {
      const uploadResponse: UploadResponse = await api.uploadVideo(file);
      setAnalysisId(uploadResponse.analysis_id);
      setStatus('processing');
      setProgress(5);
      startPolling(uploadResponse.analysis_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setStatus('idle');
    }
  }, []);

  const startPolling = (id: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const statusResponse: StatusResponse = await api.getStatus(id);
        setStatus(statusResponse.status);
        setProgress(statusResponse.progress);
        setMessage(statusResponse.message || '');

        if (statusResponse.status === 'complete') {
          clearInterval(pollIntervalRef.current!);
          const analysisResult = await api.getResult(id);
          setResult(analysisResult);
        } else if (statusResponse.status === 'error') {
          clearInterval(pollIntervalRef.current!);
          setError('Analysis failed');
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000);
  };

  const handleNewAnalysis = useCallback(() => {
    setStatus('idle');
    setProgress(0);
    setMessage('');
    setAnalysisId(null);
    setResult(null);
    setError(null);
    if (videoSrc) {
      URL.revokeObjectURL(videoSrc);
      setVideoSrc(null);
    }
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
  }, [videoSrc]);

  const handleDownloadReport = useCallback(async () => {
    if (!analysisId) return;
    try {
      const blob = await api.downloadReport(analysisId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `video_analysis_${analysisId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download report');
    }
  }, [analysisId]);

  return (
    <div className="min-h-screen bg-dark-950">
      <Header />

      <main className="pt-16 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <section id="upload" className="mb-12">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-10"
            >
              <h2 className="text-4xl sm:text-5xl font-bold mb-4 gradient-text">
                AI Video Authenticity Analysis
              </h2>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                Upload a video to analyze frame-by-frame for AI generation, manipulation, and temporal inconsistencies.
                Our multi-detector pipeline examines frequency patterns, texture statistics, noise profiles, and compression artifacts.
              </p>
            </motion.div>

            <UploadZone
              onUpload={handleUpload}
              isAnalyzing={status !== 'idle' && status !== 'complete' && status !== 'error'}
              analysisId={analysisId || undefined}
            />

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 flex items-center justify-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {error}
                </span>
              </motion.div>
            )}

            {status === 'processing' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-8"
              >
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Analysis Progress</h3>
                    <span className="font-mono text-cyan-300">{progress}%</span>
                  </div>
                  <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      animate={{ width: `${progress}%` }}
                      className="h-full bg-gradient-to-r from-cyan-500 to-violet-500"
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                  <p className="mt-3 text-sm text-slate-400 text-center">{message || 'Processing video...'}</p>
                  <p className="mt-2 text-xs text-slate-500 text-center font-mono">Analysis ID: {analysisId}</p>
                </div>
              </motion.div>
            )}
          </section>

          {result && (
            <motion.section
              id="results"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mt-12"
            >
              <ResultsPanel
                result={result}
                videoSrc={videoSrc || undefined}
                onDownloadReport={handleDownloadReport}
                onNewAnalysis={handleNewAnalysis}
              />
            </motion.section>
          )}

          <section id="features" className="mt-20">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold gradient-text mb-4">Detection Capabilities</h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                Five specialized detectors analyze each frame, with temporal consistency checking across the video sequence.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { title: 'Synthetic Detection', desc: 'Deep learning classifier (EfficientNet-B0) trained to distinguish AI-generated from real video frames', icon: '🧠' },
                { title: 'Frequency Analysis', desc: 'FFT and DCT domain analysis to detect spectral anomalies characteristic of generative models', icon: '📊' },
                { title: 'Texture Analysis', desc: 'LBP, GLCM, and Gabor filter responses to identify unnatural texture patterns', icon: '🔍' },
                { title: 'Noise Profiling', desc: 'PRNU estimation and noise residual analysis to detect synthetic noise patterns', icon: '📡' },
                { title: 'Compression Artifacts', desc: 'Block artifact detection, DCT coefficient statistics, and quantization table estimation', icon: '📦' },
                { title: 'Temporal Consistency', desc: 'Frame-to-frame similarity, scene change detection, and flicker analysis across the video', icon: '⏱️' },
              ].map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="card hover:border-cyan-500/30"
                >
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-slate-400">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </section>

          <section id="how-it-works" className="mt-20">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold gradient-text mb-4">How It Works</h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                A complete pipeline from upload to detailed report with full transparency about methods and limitations.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { step: '1', title: 'Upload', desc: 'Drag & drop or select a video file (MP4, MOV, MKV, WebM up to 500MB, 5 min max)' },
                { step: '2', title: 'Frame Sampling', desc: 'Uniform, adaptive, or keyframe-based sampling extracts up to 50 representative frames' },
                { step: '3', title: 'Per-Frame Analysis', desc: 'Each frame passes through 5 detectors: synthetic, frequency, texture, noise, compression' },
                { step: '4', title: 'Temporal Aggregation', desc: 'Frame results combined with temporal consistency scoring, scene change & flicker detection' },
              ].map((item, i) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="card relative"
                >
                  <div className="absolute -top-3 left-6 w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center text-white font-bold">
                    {item.step}
                  </div>
                  <div className="pt-8">
                    <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                    <p className="text-slate-400">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          <section className="mt-20 mb-12">
            <div className="card-elevated text-center py-12 px-6 gradient-border">
              <h3 className="text-2xl font-bold gradient-text mb-4">Limitations & Disclaimers</h3>
              <div className="max-w-3xl mx-auto text-left space-y-3 text-slate-300">
                <p>• This tool provides <strong>probabilistic assessments</strong>, not definitive determinations</p>
                <p>• Analysis is based on <strong>sampled frames</strong>, not the entire video</p>
                <p>• Deep learning models may produce <strong>false positives/negatives</strong></p>
                <p>• Compression artifacts and encoding can <strong>mimic manipulation signatures</strong></p>
                <p>• Results should be <strong>corroborated with other evidence</strong> for critical decisions</p>
                <p>• The system does not store uploaded videos after analysis completes</p>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-800 py-8 px-4">
        <div className="max-w-7xl mx-auto text-center text-slate-500 text-sm">
          <p>AI Video Authenticity Analysis System • Frame-level & Temporal Detection</p>
          <p className="mt-1">Built with React, Three.js, FastAPI, PyTorch, OpenCV & scikit-image</p>
        </div>
      </footer>

      {health && (
        <div className="fixed bottom-4 right-4 glass rounded-xl p-3 text-xs text-slate-400">
          <div>Models: {health.models_loaded.join(', ')}</div>
          <div>GPU: {health.gpu_available ? 'Available' : 'CPU Only'}</div>
        </div>
      )}
    </div>
  );
}

export default App;