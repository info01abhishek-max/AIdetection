export type AssessmentCategory =
  | 'LIKELY_AI_GENERATED'
  | 'POSSIBLE_MANIPULATION'
  | 'LIKELY_AUTHENTIC'
  | 'INCONCLUSIVE';

export type AnalysisStatus = 'idle' | 'uploading' | 'analyzing' | 'complete' | 'error';

export interface DetectorResult {
  name: string;
  category: AssessmentCategory;
  confidence: number;
  details: Record<string, any>;
  processing_time: number;
}

export interface Evidence {
  synthetic_indicators: string[];
  manipulation_indicators: string[];
  authenticity_indicators: string[];
  limitations: string[];
}

export interface TechnicalDetails {
  processing_time: number;
  models_used: string[];
  image_hash: string;
}

export interface PhotoInfo {
  filename: string;
  width: number;
  height: number;
  format: string;
  mode: string;
  size: number;
}

export interface AnalysisResult {
  id: string;
  timestamp: string;
  photo_info: PhotoInfo;
  overall_assessment: AssessmentCategory;
  ai_generated_probability: number | null;
  confidence: number;
  detector_agreement: number;
  detectors: DetectorResult[];
  evidence: Evidence;
  technical_details: TechnicalDetails;
}

export interface UploadResponse {
  analysis_id: string;
  status: AnalysisStatus;
}

export interface StatusResponse {
  status: AnalysisStatus;
  progress: number;
}

export interface HealthCheck {
  status: string;
  version: string;
  models_loaded: string[];
  uptime: number;
}

export interface PhotoFile {
  file: File;
  preview: string;
  name: string;
  size: number;
  width: number;
  height: number;
  type: string;
}