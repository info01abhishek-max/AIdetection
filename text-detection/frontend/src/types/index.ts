export type AssessmentCategory =
  | 'LIKELY_AI_GENERATED'
  | 'POSSIBLY_AI_ASSISTED'
  | 'LIKELY_HUMAN_WRITTEN'
  | 'MIXED_UNCERTAIN'
  | 'INCONCLUSIVE';

export type AnalysisStatus =
  | 'idle'
  | 'uploading'
  | 'processing'
  | 'analyzing'
  | 'complete'
  | 'error';

export interface DetectorResult {
  name: string;
  label: string;
  confidence: number;
  raw_scores: Record<string, number>;
  processing_time: number;
}

export interface TextStatistics {
  character_count: number;
  word_count: number;
  sentence_count: number;
  paragraph_count: number;
  avg_word_length: number;
  avg_sentence_length: number;
  type_token_ratio: number;
  hapax_legomena_ratio: number;
}

export interface LinguisticFeatures {
  statistics: TextStatistics;
  perplexity_scores: number[];
  burstiness_score: number;
  repetition_score: number;
  sentence_length_variance: number;
  pos_distribution: Record<string, number>;
  function_word_ratio: number;
  readability_scores: Record<string, number>;
  ngram_entropy: Record<number, number>;
}

export interface Evidence {
  ai_indicators: string[];
  human_indicators: string[];
  stylistic_observations: string[];
  limitations: string[];
}

export interface TechnicalDetails {
  processing_time: number;
  models_used: string[];
  text_hash: string;
}

export interface AnalysisResult {
  id: string;
  timestamp: number;
  text_hash: string;
  text_length: number;
  overall_assessment: AssessmentCategory;
  ai_generated_probability: number | null;
  confidence: number;
  detector_agreement: number;
  detectors: DetectorResult[];
  linguistic_features: LinguisticFeatures;
  evidence: Evidence;
  technical_details: TechnicalDetails;
}

export interface TextFile {
  file: File;
  text: string;
  name: string;
  size: number;
}

export interface AnalysisStatusResponse {
  analysis_id: string;
  status: AnalysisStatus;
  progress: number;
  message?: string;
}

export interface TextInputResponse {
  analysis_id: string;
  status: AnalysisStatus;
  message: string;
}

export interface HealthResponse {
  status: string;
  version: string;
  detectors_loaded: number;
  models: string[];
}

export interface ApiError {
  error: string;
  detail?: string;
}