// Unified types for all 4 detection systems

export type DetectionType = 'photo' | 'video' | 'audio' | 'text';

export interface BaseDetectionResult {
  id: string;
  type: DetectionType;
  filename: string;
  created_at: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface DetectorResult {
  name: string;
  category: 'LIKELY_AI_GENERATED' | 'LIKELY_AUTHENTIC' | 'POSSIBLE_MANIPULATION' | 'UNKNOWN';
  confidence: number;
  details: Record<string, any>;
  processing_time_ms: number;
}

export interface UnifiedAnalysisResult extends BaseDetectionResult {
  ai_generated_probability: number;
  confidence: number;
  detectors: DetectorResult[];
  summary: string;
  technical_indicators: Record<string, any>;
  processing_time_total_ms: number;
}

// Photo-specific types
export interface PhotoUploadResponse {
  analysis_id: string;
  status: string;
  message: string;
}

export interface PhotoStatusResponse {
  analysis_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  current_step: string;
  estimated_time_remaining?: number;
}

export interface PhotoAnalysisResult extends UnifiedAnalysisResult {
  type: 'photo';
  detectors: DetectorResult[];
  image_info: {
    width: number;
    height: number;
    format: string;
    mode: string;
    file_size: number;
  };
}

// Video-specific types
export interface VideoUploadResponse {
  analysis_id: string;
  status: string;
  message: string;
}

export interface VideoStatusResponse {
  analysis_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  current_step: string;
  frames_processed: number;
  total_frames: number;
  estimated_time_remaining?: number;
}

export interface VideoFrameResult {
  frame_number: number;
  timestamp: number;
  ai_probability: number;
  detectors: DetectorResult[];
}

export interface VideoAnalysisResult extends UnifiedAnalysisResult {
  type: 'video';
  video_info: {
    duration: number;
    fps: number;
    width: number;
    height: number;
    total_frames: number;
    file_size: number;
  };
  frame_results: VideoFrameResult[];
  temporal_consistency: {
    score: number;
    description: string;
  };
}

// Audio-specific types
export interface AudioUploadResponse {
  analysis_id: string;
  status: string;
  message: string;
}

export interface AudioStatusResponse {
  analysis_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  current_step: string;
  estimated_time_remaining?: number;
}

export interface AudioAnalysisResult extends UnifiedAnalysisResult {
  type: 'audio';
  audio_info: {
    duration: number;
    sample_rate: number;
    channels: number;
    format: string;
    file_size: number;
  };
  segment_results?: Array<{
    start_time: number;
    end_time: number;
    ai_probability: number;
    detectors: DetectorResult[];
  }>;
}

// Text-specific types
export interface TextAnalyzeRequest {
  text: string;
}

export interface TextAnalyzeResponse {
  analysis_id: string;
  status: string;
  result: TextAnalysisResult;
}

export interface TextAnalysisResult extends UnifiedAnalysisResult {
  type: 'text';
  text_info: {
    character_count: number;
    word_count: number;
    sentence_count: number;
    paragraph_count: number;
  };
  linguistic_features: Record<string, any>;
}

// API Error
export interface ApiError {
  detail: string;
  status_code: number;
}

// Health check
export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  models_loaded?: string[];
  detectors_loaded?: number;
  uptime: number;
}

// History
export interface HistoryItem {
  id: string;
  type: DetectionType;
  filename: string;
  ai_probability: number;
  confidence: number;
  created_at: string;
  status: string;
}

export interface HistoryResponse {
  items: HistoryItem[];
  total: number;
  page: number;
  page_size: number;
}