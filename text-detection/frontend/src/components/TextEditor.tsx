'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle,
  Info,
  Search
} from 'lucide-react'
import { clsx } from 'clsx'
import { validateTextFile, readFileAsText, countWords, countSentences, countParagraphs, countCharacters } from '../utils/text'
import type { TextFile } from '../types'

interface TextEditorProps {
  onTextSelect: (textFile: TextFile | null) => void
  currentText: TextFile | null
  analysisState: 'idle' | 'uploading' | 'processing' | 'analyzing' | 'complete' | 'error'
  disabled?: boolean
}

const MIN_CHARS = 50
const MAX_CHARS = 50000

export function TextEditor({
  onTextSelect,
  currentText,
  analysisState,
  disabled
}: TextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [stats, setStats] = useState({ chars: 0, words: 0, sentences: 0, paragraphs: 0 })

  useEffect(() => {
    if (currentText) {
      setText(currentText.text)
      updateStats(currentText.text)
    } else {
      setText('')
      updateStats('')
    }
  }, [currentText])

  const updateStats = useCallback((value: string) => {
    setStats({
      chars: countCharacters(value),
      words: countWords(value),
      sentences: countSentences(value),
      paragraphs: countParagraphs(value),
    })
  }, [])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    if (value.length <= MAX_CHARS) {
      setText(value)
      updateStats(value)
      setError(null)
    }
  }, [updateStats])

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text')
    const newText = text + pastedText
    if (newText.length > MAX_CHARS) {
      e.preventDefault()
      setError(`Maximum ${formatNumber(MAX_CHARS)} characters allowed`)
      setTimeout(() => setError(null), 3000)
    }
  }, [text])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      await processFile(file)
    }
  }, [])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      await processFile(file)
    }
    e.target.value = ''
  }, [])

  const processFile = async (file: File) => {
    const validation = validateTextFile(file)
    if (!validation.valid) {
      setError(validation.error!)
      setTimeout(() => setError(null), 5000)
      return
    }

    try {
      const fileText = await readFileAsText(file)
      const textFile: TextFile = {
        file,
        text: fileText,
        name: file.name,
        size: file.size,
      }
      setText(fileText)
      updateStats(fileText)
      onTextSelect(textFile)
    } catch (err) {
      setError('Failed to read file')
      setTimeout(() => setError(null), 3000)
    }
  }

  const handleClear = useCallback(() => {
    setText('')
    updateStats('')
    onTextSelect(null)
    fileInputRef.current!.value = ''
  }, [onTextSelect, updateStats])

  const handleAnalyze = useCallback(() => {
    if (text.trim().length < MIN_CHARS) {
      setError(`Minimum ${MIN_CHARS} characters required for analysis`)
      setTimeout(() => setError(null), 3000)
      return
    }
    if (!currentText) {
      const textFile: TextFile = {
        file: new File([text], 'pasted-text.txt', { type: 'text/plain' }),
        text,
        name: 'pasted-text.txt',
        size: text.length,
      }
      onTextSelect(textFile)
    }
  }, [text, currentText, onTextSelect])

  const isAnalyzing = analysisState === 'uploading' || analysisState === 'processing' || analysisState === 'analyzing'
  const canAnalyze = text.trim().length >= MIN_CHARS && !isAnalyzing && !disabled

  return (
    <motion.div
      className="glass-strong rounded-2xl p-6 border border-slate-700/30"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">
          <FileText className="w-5 h-5 text-cyan-400" />
          TEXT INPUT
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzing || disabled}
            className="btn-ghost text-xs"
            aria-label="Upload file"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">UPLOAD</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.pdf,.docx"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isAnalyzing || disabled}
          />
          {text && (
            <button
              onClick={handleClear}
              disabled={isAnalyzing || disabled}
              className="btn-ghost text-xs text-red-400 hover:text-red-300"
              aria-label="Clear text"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">CLEAR</span>
            </button>
          )}
        </div>
      </div>

      <div className="relative">
        <AnimatePresence mode="wait">
          {dragActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-cyan-500/10 border-2 border-cyan-500/50 rounded-xl pointer-events-none flex items-center justify-center z-10"
            >
              <div className="text-center p-8">
                <FileText className="w-12 h-12 mx-auto mb-2 text-cyan-400" />
                <p className="text-cyan-300 font-medium">DROP FILE HERE</p>
                <p className="text-xs text-cyan-500/70">.txt, .pdf, .docx up to 10MB</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onPaste={handlePaste}
          placeholder={currentText
            ? `Editing: ${currentText.name} (${formatNumber(currentText.size)} bytes)`
            : 'Paste text here or upload a file...'}
          disabled={isAnalyzing || disabled}
          className={clsx(
            'textarea-field min-h-[200px]',
            dragActive && 'border-cyan-500/50 bg-cyan-500/5',
            error && 'border-red-500/50 bg-red-500/5'
          )}
          aria-label="Text input for AI detection analysis"
          spellCheck={false}
        />

        <div className="absolute bottom-2 right-2 flex items-center gap-4 text-xs font-mono text-slate-500">
          <div className="flex items-center gap-1">
            <Info className="w-3 h-3" />
            <span>{formatNumber(stats.chars)}/{formatNumber(MAX_CHARS)} chars</span>
          </div>
          <div className="flex items-center gap-1">
            <span>{formatNumber(stats.words)} words</span>
          </div>
          <div className="flex items-center gap-1">
            <span>{formatNumber(stats.sentences)} sent.</span>
          </div>
          <div className="flex items-center gap-1">
            <span>{formatNumber(stats.paragraphs)} para.</span>
          </div>
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 glass rounded-lg border border-red-500/30 bg-red-500/10 flex items-center gap-2 text-red-400 text-sm"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-green-500" />
            Min {MIN_CHARS} chars
          </span>
          <span className="flex items-center gap-1">
            <Info className="w-3 h-3" />
            Max {formatNumber(MAX_CHARS)} chars
          </span>
        </div>

        <button
          onClick={handleAnalyze}
          disabled={!canAnalyze}
          className="btn-primary px-8 py-3 text-lg flex items-center gap-2"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>ANALYZING...</span>
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              <span>START ANALYSIS</span>
            </>
          )}
        </button>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-700/30">
        <p className="text-xs text-slate-500 font-mono">
          Supported: Plain text (.txt), PDF (.pdf), Word documents (.docx) • Max 10MB • Processing is temporary, no data retained
        </p>
      </div>
    </motion.div>
  )
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}