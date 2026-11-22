import { useState, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileType,
  ChevronLeft,
  Edit3,
  Trash2,
  Clipboard,
  Copy,
} from 'lucide-react';
import api from '@/utils/api';
import type { TextAnalysisResult } from '@/types';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ['text/plain', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

export default function TextDetector() {
  const navigate = useNavigate();
  const [inputMode, setInputMode] = useState<'text' | 'file'>('text');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'completed' | 'error'>('idle');
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<{ cancel: () => void } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    } else if (e.dataTransfer.getData('text')) {
      setText(e.dataTransfer.getData('text'));
      setInputMode('text');
    }
  }, []);

  const handleFileSelect = useCallback((selectedFile: File) => {
    if (!ACCEPTED_TYPES.includes(selectedFile.type)) {
      setError('Invalid file type. Please select a text file (TXT, PDF, DOCX).');
      return;
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
      return;
    }
    setError(null);
    setFile(selectedFile);
    setInputMode('file');
    setText('');
  }, []);

  const handleRemoveFile = useCallback(() => {
    setFile(null);
    setStatus('idle');
    setError(null);
    if (pollingRef.current) {
      pollingRef.current.cancel();
      pollingRef.current = null;
    }
  }, []);

  const handlePaste = useCallback(async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      setText(clipboardText);
      setInputMode('text');
      setFile(null);
    } catch {
      setError('Failed to read clipboard. Please paste manually (Ctrl+V).');
    }
  }, []);

  const handleAnalyze = useCallback(async () => {
    const content = inputMode === 'text' ? text : file;
    if (!content || (inputMode === 'text' && text.trim().length < 50)) {
      setError('Please provide at least 50 characters of text for analysis.');
      return;
    }
    setError(null);
    setStatus('analyzing');
    setAnalysisProgress(0);

    try {
      let analysisResult: TextAnalysisResult;

      if (inputMode === 'text') {
        // Simulate progress for text analysis (it's synchronous on backend)
        const progressInterval = setInterval(() => {
          setAnalysisProgress(prev => Math.min(prev + 10, 90));
        }, 200);

        const response = await api.analyzeText(text);
        clearInterval(progressInterval);
        analysisResult = response;
      } else {
        const progressInterval = setInterval(() => {
          setAnalysisProgress(prev => Math.min(prev + 15, 90));
        }, 300);

        const response = await api.analyzeTextFile(file!);
        clearInterval(progressInterval);
        analysisResult = response;
      }

      setAnalysisProgress(100);
      setStatus('completed');

      // Generate a pseudo-analysis-id for navigation
      const analysisId = `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      navigate(`/results/text/${analysisId}`, { state: { result: analysisResult } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setStatus('error');
    } finally {
      pollingRef.current = null;
    }
  }, [inputMode, text, file, navigate]);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

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
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <FileType className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Text Detection</h1>
              <p className="text-dark-600 dark:text-dark-400 mt-1">
                RoBERTa-based AI text detection with linguistic feature analysis
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Input Panel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Mode Tabs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex gap-2 bg-dark-100 dark:bg-dark-800 rounded-xl p-1"
              role="tablist"
            >
              <button
                role="tab"
                aria-selected={inputMode === 'text'}
                onClick={() => { setInputMode('text'); setFile(null); }}
                className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                  inputMode === 'text'
                    ? 'bg-white dark:bg-dark-900 shadow-lg text-primary-600 dark:text-primary-400'
                    : 'text-dark-600 dark:text-dark-400 hover:text-dark-900 dark:hover:text-dark-100'
                }`}
              >
                <Edit3 className="w-4 h-4 inline mr-2" /> Direct Text
              </button>
              <button
                role="tab"
                aria-selected={inputMode === 'file'}
                onClick={() => { setInputMode('file'); setText(''); }}
                className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                  inputMode === 'file'
                    ? 'bg-white dark:bg-dark-900 shadow-lg text-primary-600 dark:text-primary-400'
                    : 'text-dark-600 dark:text-dark-400 hover:text-dark-900 dark:hover:text-dark-100'
                }`}
              >
                <FileText className="w-4 h-4 inline mr-2" /> Upload File
              </button>
            </motion.div>

            {/* Text Input */}
            <AnimatePresence mode="wait">
              {inputMode === 'text' && (
                <motion.div
                  key="text"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="relative"
                >
                  <div className={`relative rounded-2xl border-2 transition-all duration-300 bg-white dark:bg-dark-900 ${
                      dragActive ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-dark-200 dark:border-dark-700'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <div className="p-4 border-b border-dark-200 dark:border-dark-700 flex items-center justify-between">
                      <span className="text-sm font-medium text-dark-600 dark:text-dark-400">
                        Paste or type your text here (minimum 50 characters)
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handlePaste}
                          className="btn-ghost text-sm px-3 py-1"
                        >
                          <Clipboard className="w-4 h-4 mr-1" />
                          Paste
                        </button>
                        <button
                          onClick={() => navigator.clipboard.writeText(text)}
                          disabled={!text}
                          className="btn-ghost text-sm px-3 py-1"
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          Copy
                        </button>
                        <button
                          onClick={() => setText('')}
                          disabled={!text}
                          className="btn-ghost text-sm px-3 py-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Clear
                        </button>
                      </div>
                    </div>
                    <textarea
                      ref={textareaRef}
                      value={text}
                      onChange={e => setText(e.target.value)}
                      placeholder="Paste your text here for AI detection analysis..."
                      className="w-full min-h-[300px] p-4 resize-none bg-transparent focus:outline-none text-dark-900 dark:text-dark-100 placeholder-dark-400 dark:placeholder-dark-500 font-mono text-base leading-relaxed"
                      rows={15}
                      spellCheck={false}
                    />
                    <div className="p-4 border-t border-dark-200 dark:border-dark-700 flex items-center justify-between text-sm text-dark-500 dark:text-dark-400">
                      <span>{charCount.toLocaleString()} characters</span>
                      <span>{wordCount.toLocaleString()} words</span>
                      <span className={wordCount >= 50 ? 'text-green-500' : 'text-red-500'}>
                        {wordCount >= 50 ? '✓ Ready for analysis' : `${50 - wordCount} more words needed`}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* File Upload */}
              {inputMode === 'file' && (
                <motion.div
                  key="file"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className={`relative rounded-2xl border-2 border-dashed transition-all duration-300 ${
                    dragActive
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                      : 'border-dark-200 dark:border-dark-700 hover:border-orange-300 dark:hover:border-orange-700'
                  } ${file ? 'border-transparent bg-dark-50 dark:bg-dark-800' : ''}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    {file ? (
                      <div className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center flex-shrink-0">
                              <FileType className="w-10 h-10 text-white" />
                            </div>
                            <div>
                              <p className="font-medium truncate max-w-md">{file.name}</p>
                              <p className="text-sm text-dark-500 dark:text-dark-400 font-mono">
                                {(file.size / 1024).toFixed(1)} KB • {file.type}
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
                          className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center"
                        >
                          <Upload className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                        </motion.div>
                        <p className="text-lg font-medium mb-1">Drag & drop a text file here</p>
                        <p className="text-dark-500 dark:text-dark-400 mb-6">or click to browse</p>
                        <input
                          type="file"
                          accept={ACCEPTED_TYPES.join(',')}
                          onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                          className="hidden"
                          id="text-upload"
                        />
                        <label htmlFor="text-upload" className="btn-primary inline-flex items-center gap-2" style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)' }}>
                          <FileText className="w-4 h-4" />
                          Choose File
                        </label>
                        <p className="mt-4 text-sm text-dark-500 dark:text-dark-400">
                          Supports: TXT, PDF, DOCX • Max 10MB
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Analyze Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <button
                onClick={handleAnalyze}
                disabled={
                  status === 'analyzing' ||
                  (inputMode === 'text' && text.trim().length < 50) ||
                  (inputMode === 'file' && !file)
                }
                className="w-full btn-primary py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)' }}
              >
                {status === 'analyzing' && (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing... {analysisProgress}%
                  </>
                )}
                {status === 'idle' && 'Analyze Text'}
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
                  <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                )}
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-dark-600 dark:text-dark-400">Progress</span>
                  <span className="font-mono font-semibold text-orange-600 dark:text-orange-400">
                    {analysisProgress}%
                  </span>
                </div>
                <div className="h-3 bg-dark-100 dark:bg-dark-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${analysisProgress}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
              </div>

              {/* Detector Info */}
              <div className="space-y-3">
                {[
                  'RoBERTa OpenAI Detector',
                  'Perplexity Analysis',
                  'Burstiness Detection',
                  'N-gram Frequency Analysis',
                  'Stylometric Features',
                  'Syntactic Complexity',
                ].map((detector, index) => (
                  <motion.div
                    key={detector}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-dark-50 dark:bg-dark-800/50"
                  >
                    <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center">
                      <FileType className="w-5 h-5 text-orange-600 dark:text-orange-400" />
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

