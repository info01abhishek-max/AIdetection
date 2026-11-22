export type AssessmentCategory =
  | 'LIKELY_AI_GENERATED'
  | 'LIKELY_AUTHENTIC'
  | 'POSSIBLE_MANIPULATION'
  | 'INCONCLUSIVE';

export type AnalysisStatus =
  | 'idle'
  | 'uploading'
  | 'processing'
  | 'extracting_frames'
  | 'analyzing_frames'
  | 'aggregating'
  | 'complete'
  | 'error';

export interface DetectorResult {
  name: string;
  category: AssessmentCategory;
  confidence: number;
  details: Record<string, any>;
  processing_time: number;
}

export interface FrameAnalysis {
  frame_index: number;
  timestamp: number;
  thumbnail_path: string | null;
  detectors: DetectorResult[];
  overall_category: AssessmentCategory;
  confidence: number;
}

export interface VideoInfo {
  filename: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
  total_frames: number;
  codec: string;
  format: string;
  size: number;
  bitrate: number | null;
}

export interface TemporalAnalysis {
  consistency_score: number;
  frame_similarity_variance: number;
  scene_changes: number;
  flicker_detected: boolean;
  details: Record<string, any>;
}

export interface Evidence {
  synthetic_indicators: string[];
  manipulation_indicators: string[];
  authenticity_indicators: string[];
  temporal_indicators: string[];
  limitations: string[];
}

export interface TechnicalDetails {
  processing_time: number;
  models_used: string[];
  frames_analyzed: number;
  video_hash: string;
  temporal_analysis: TemporalAnalysis;
}

export interface AnalysisResult {
  id: string;
  timestamp: string;
  video_info: VideoInfo;
  overall_assessment: AssessmentCategory;
  ai_generated_probability: number | null;
  confidence: number;
  detector_agreement: number;
  frame_analyses: FrameAnalysis[];
  temporal_analysis: TemporalAnalysis;
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
  message?: string;
}

export interface HealthCheck {
  status: string;
  version: string;
  models_loaded: string[];
  uptime: number;
  gpu_available: boolean;
}

export interface ErrorResponse {
  success: boolean;
  error: string;
  message?: string;
}