export interface AudioFile {
  file: File
  preview: string
  duration: number
  sampleRate: number
  channels: number
  format: string
  size: number
}

export type AnalysisStatus = 'idle' | 'uploading' | 'scanning' | 'analyzing' | 'complete' | 'error'

export type AssessmentCategory =
  | 'LIKELY_SYNTHETIC'
  | 'LIKELY_HUMAN_RECORDED'
  | 'POSSIBLE_MANIPULATION'
  | 'INCONCLUSIVE'

export interface DetectorResult {
  name: string
  category: AssessmentCategory
  confidence: number
  details: Record<string, unknown>
  processingTime: number
}

export interface AnalysisResult {
  id: string
  timestamp: string
  audioInfo: {
    filename: string
    duration: number
    sampleRate: number
    channels: number
    format: string
    size: number
  }
  overallAssessment: AssessmentCategory
  aiGeneratedProbability: number | null
  confidence: number
  detectorAgreement: number
  detectors: DetectorResult[]
  evidence: {
    syntheticIndicators: string[]
    manipulationIndicators: string[]
    authenticityIndicators: string[]
    limitations: string[]
  }
  technicalDetails: {
    processingTime: number
    modelsUsed: string[]
    audioHash: string
  }
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface UploadResponse {
  analysisId: string
  status: AnalysisStatus
}

export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy'
  version: string
  modelsLoaded: string[]
  uptime: number
}