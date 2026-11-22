import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  DetectionType,
  PhotoUploadResponse,
  PhotoStatusResponse,
  PhotoAnalysisResult,
  VideoUploadResponse,
  VideoStatusResponse,
  VideoAnalysisResult,
  AudioUploadResponse,
  AudioStatusResponse,
  AudioAnalysisResult,
  TextAnalyzeResponse,
  TextAnalysisResult,
  HealthResponse,
  HistoryResponse,
  ApiError,
} from '@/types';

const API_TIMEOUT = 300000; // 5 minutes for long-running analysis

class UnifiedApiService {
  private clients: Map<DetectionType, AxiosInstance> = new Map();
  private baseUrls: Record<DetectionType, string> = {
    photo: '/api/photo',
    video: '/api/video',
    audio: '/api/audio',
    text: '/api/text',
  };

  constructor() {
    this.initializeClients();
  }

  private initializeClients() {
    (['photo', 'video', 'audio', 'text'] as DetectionType[]).forEach(type => {
      const client = axios.create({
        baseURL: this.baseUrls[type],
        timeout: API_TIMEOUT,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      client.interceptors.response.use(
        response => response,
        (error: AxiosError<ApiError>) => {
          const message = error.response?.data?.detail || error.message || 'An error occurred';
          return Promise.reject(new Error(message));
        }
      );

      this.clients.set(type, client);
    });
  }

  private getClient(type: DetectionType): AxiosInstance {
    const client = this.clients.get(type);
    if (!client) throw new Error(`No client for type: ${type}`);
    return client;
  }

  // ============ HEALTH CHECKS ============
  async checkHealth(type: DetectionType): Promise<HealthResponse> {
    const client = this.getClient(type);
    const endpoint = type === 'video' ? '/health' : '/api/health';
    const response = await client.get<HealthResponse>(endpoint);
    return response.data;
  }

  async checkAllHealth(): Promise<Record<DetectionType, HealthResponse>> {
    const results = await Promise.allSettled(
      (['photo', 'video', 'audio', 'text'] as DetectionType[]).map(type =>
        this.checkHealth(type).then(data => ({ type, data, success: true as const }))
          .catch(error => ({ type, error, success: false as const }))
      )
    );

    const health: Partial<Record<DetectionType, HealthResponse>> = {};
    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value.success) {
        health[result.value.type] = result.value.data;
      }
    });

    return health as Record<DetectionType, HealthResponse>;
  }

  // ============ PHOTO API ============
  async uploadPhoto(file: File): Promise<PhotoUploadResponse> {
    const client = this.getClient('photo');
    const formData = new FormData();
    formData.append('file', file);
    const response = await client.post<PhotoUploadResponse>('/analyze/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async getPhotoStatus(analysisId: string): Promise<PhotoStatusResponse> {
    const client = this.getClient('photo');
    const response = await client.get<PhotoStatusResponse>(`/analyze/${analysisId}/status`);
    return response.data;
  }

  async getPhotoResult(analysisId: string): Promise<PhotoAnalysisResult> {
    const client = this.getClient('photo');
    const response = await client.get<PhotoAnalysisResult>(`/analyze/${analysisId}/result`);
    return this.normalizePhotoResult(response.data);
  }

  async getPhotoReport(analysisId: string): Promise<Blob> {
    const client = this.getClient('photo');
    const response = await client.get(`/analyze/${analysisId}/report`, {
      responseType: 'blob',
    });
    return response.data;
  }

  async deletePhotoAnalysis(analysisId: string): Promise<void> {
    const client = this.getClient('photo');
    await client.delete(`/analyze/${analysisId}`);
  }

  // ============ VIDEO API ============
  async uploadVideo(file: File): Promise<VideoUploadResponse> {
    const client = this.getClient('video');
    const formData = new FormData();
    formData.append('file', file);
    const response = await client.post<VideoUploadResponse>('/analyze/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async getVideoStatus(analysisId: string): Promise<VideoStatusResponse> {
    const client = this.getClient('video');
    const response = await client.get<VideoStatusResponse>(`/analyze/${analysisId}/status`);
    return response.data;
  }

  async getVideoResult(analysisId: string): Promise<VideoAnalysisResult> {
    const client = this.getClient('video');
    const response = await client.get<VideoAnalysisResult>(`/analyze/${analysisId}/result`);
    return this.normalizeVideoResult(response.data);
  }

  async getVideoReport(analysisId: string): Promise<Blob> {
    const client = this.getClient('video');
    const response = await client.get(`/analyze/${analysisId}/report`, {
      responseType: 'blob',
    });
    return response.data;
  }

  async getVideoFrames(analysisId: string): Promise<any> {
    const client = this.getClient('video');
    const response = await client.get(`/analyze/${analysisId}/frames`);
    return response.data;
  }

  async deleteVideoAnalysis(analysisId: string): Promise<void> {
    const client = this.getClient('video');
    await client.delete(`/analyze/${analysisId}`);
  }

  // ============ AUDIO API ============
  async uploadAudio(file: File): Promise<AudioUploadResponse> {
    const client = this.getClient('audio');
    const formData = new FormData();
    formData.append('file', file);
    const response = await client.post<AudioUploadResponse>('/analyze/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async getAudioStatus(analysisId: string): Promise<AudioStatusResponse> {
    const client = this.getClient('audio');
    const response = await client.get<AudioStatusResponse>(`/analyze/${analysisId}/status`);
    return response.data;
  }

  async getAudioResult(analysisId: string): Promise<AudioAnalysisResult> {
    const client = this.getClient('audio');
    const response = await client.get<AudioAnalysisResult>(`/analyze/${analysisId}/result`);
    return this.normalizeAudioResult(response.data);
  }

  async getAudioReport(analysisId: string): Promise<Blob> {
    const client = this.getClient('audio');
    const response = await client.get(`/analyze/${analysisId}/report`, {
      responseType: 'blob',
    });
    return response.data;
  }

  async deleteAudioAnalysis(analysisId: string): Promise<void> {
    const client = this.getClient('audio');
    await client.delete(`/analyze/${analysisId}`);
  }

  // ============ TEXT API ============
  async analyzeText(text: string): Promise<TextAnalysisResult> {
    const client = this.getClient('text');
    const response = await client.post<TextAnalyzeResponse>('/analyze/text', { text });
    return this.normalizeTextResult(response.data.result);
  }

  async analyzeTextFile(file: File): Promise<TextAnalysisResult> {
    const client = this.getClient('text');
    const formData = new FormData();
    formData.append('file', file);
    const response = await client.post<TextAnalyzeResponse>('/analyze/file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return this.normalizeTextResult(response.data.result);
  }

  async getTextResult(analysisId: string): Promise<TextAnalysisResult> {
    const client = this.getClient('text');
    const response = await client.get<TextAnalysisResult>(`/analysis/${analysisId}/result`);
    return this.normalizeTextResult(response.data);
  }

  async getTextReport(analysisId: string): Promise<Blob> {
    const client = this.getClient('text');
    const response = await client.get(`/analysis/${analysisId}/report`, {
      responseType: 'blob',
    });
    return response.data;
  }

  async getTextStats(): Promise<any> {
    const client = this.getClient('text');
    const response = await client.get('/stats');
    return response.data;
  }

  // ============ UNIFIED REPORT ============
  async getReport(type: DetectionType, analysisId: string): Promise<Blob> {
    switch (type) {
      case 'photo':
        return this.getPhotoReport(analysisId);
      case 'video':
        return this.getVideoReport(analysisId);
      case 'audio':
        return this.getAudioReport(analysisId);
      case 'text':
        return this.getTextReport(analysisId);
    }
  }

  // ============ HISTORY ============
  async getHistory(type?: DetectionType, page = 1, pageSize = 20): Promise<HistoryResponse> {
    // Try text backend first as it has stats/history endpoints
    const client = this.getClient('text');
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    params.append('page', page.toString());
    params.append('page_size', pageSize.toString());

    try {
      const response = await client.get<HistoryResponse>(`/history?${params.toString()}`);
      return response.data;
    } catch {
      // Fallback: return empty history
      return { items: [], total: 0, page, page_size: pageSize };
    }
  }

  // ============ NORMALIZATION ============
  private normalizePhotoResult(data: any): PhotoAnalysisResult {
    return {
      ...data,
      type: 'photo',
      ai_generated_probability: data.ai_generated_probability ?? data.ai_probability ?? 0.5,
      confidence: data.confidence ?? 0.5,
      detectors: (data.detectors || []).map(this.normalizeDetector),
      summary: data.summary || this.generateSummary(data),
      technical_indicators: data.technical_indicators || {},
      processing_time_total_ms: data.processing_time_total_ms || 0,
    };
  }

  private normalizeVideoResult(data: any): VideoAnalysisResult {
    return {
      ...data,
      type: 'video',
      ai_generated_probability: data.ai_generated_probability ?? data.overall_ai_probability ?? 0.5,
      confidence: data.confidence ?? 0.5,
      detectors: (data.detectors || []).map(this.normalizeDetector),
      summary: data.summary || this.generateSummary(data),
      technical_indicators: data.technical_indicators || {},
      processing_time_total_ms: data.processing_time_total_ms || 0,
      frame_results: data.frame_results || [],
      temporal_consistency: data.temporal_consistency || { score: 0, description: 'N/A' },
      video_info: data.video_info || {},
    };
  }

  private normalizeAudioResult(data: any): AudioAnalysisResult {
    return {
      ...data,
      type: 'audio',
      ai_generated_probability: data.ai_generated_probability ?? data.overall_score ?? 0.5,
      confidence: data.confidence ?? 0.5,
      detectors: (data.detectors || []).map(this.normalizeDetector),
      summary: data.summary || this.generateSummary(data),
      technical_indicators: data.technical_indicators || {},
      processing_time_total_ms: data.processing_time_total_ms || 0,
      segment_results: data.segment_results || [],
      audio_info: data.audio_info || {},
    };
  }

  private normalizeTextResult(data: any): TextAnalysisResult {
    return {
      ...data,
      type: 'text',
      ai_generated_probability: data.ai_generated_probability ?? data.ai_probability ?? data.roberta_score ?? 0.5,
      confidence: data.confidence ?? 0.5,
      detectors: (data.detectors || []).map(this.normalizeDetector),
      summary: data.summary || this.generateSummary(data),
      technical_indicators: data.technical_indicators || {},
      processing_time_total_ms: data.processing_time_total_ms || 0,
      linguistic_features: data.linguistic_features || {},
      text_info: data.text_info || {},
    };
  }

  private normalizeDetector(detector: any): any {
    return {
      name: detector.name || detector.detector_name || 'Unknown Detector',
      category: detector.category || detector.verdict || 'UNKNOWN',
      confidence: detector.confidence ?? detector.score ?? 0.5,
      details: detector.details || detector.features || {},
      processing_time_ms: detector.processing_time_ms || 0,
    };
  }

  private generateSummary(data: any): string {
    const prob = data.ai_generated_probability ?? data.ai_probability ?? data.overall_score ?? 0.5;
    if (prob > 0.7) return 'High probability of AI-generated content detected.';
    if (prob > 0.4) return 'Possible AI generation or manipulation detected.';
    return 'Content appears to be authentic/human-created.';
  }

  // ============ POLLING HELPERS ============
  async pollPhotoStatus(
    analysisId: string,
    onProgress: (status: PhotoStatusResponse) => void,
    intervalMs = 2000
  ): Promise<PhotoAnalysisResult> {
    return this.pollStatus(
      () => this.getPhotoStatus(analysisId),
      onProgress,
      intervalMs,
      (status) => status.status === 'completed' || status.status === 'failed'
    ).then(() => this.getPhotoResult(analysisId));
  }

  async pollVideoStatus(
    analysisId: string,
    onProgress: (status: VideoStatusResponse) => void,
    intervalMs = 3000
  ): Promise<VideoAnalysisResult> {
    return this.pollStatus(
      () => this.getVideoStatus(analysisId),
      onProgress,
      intervalMs,
      (status) => status.status === 'completed' || status.status === 'failed'
    ).then(() => this.getVideoResult(analysisId));
  }

  async pollAudioStatus(
    analysisId: string,
    onProgress: (status: AudioStatusResponse) => void,
    intervalMs = 2000
  ): Promise<AudioAnalysisResult> {
    return this.pollStatus(
      () => this.getAudioStatus(analysisId),
      onProgress,
      intervalMs,
      (status) => status.status === 'completed' || status.status === 'failed'
    ).then(() => this.getAudioResult(analysisId));
  }

  private async pollStatus<T extends { status: string }>(
    fetchStatus: () => Promise<T>,
    onProgress: (status: T) => void,
    intervalMs: number,
    isDone: (status: T) => boolean
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        try {
          const status = await fetchStatus();
          onProgress(status);

          if (isDone(status)) {
            clearInterval(interval);
            if (status.status === 'failed') {
              reject(new Error('Analysis failed'));
            } else {
              resolve(status);
            }
          }
        } catch (error) {
          clearInterval(interval);
          reject(error);
        }
      }, intervalMs);

      // Initial fetch
      fetchStatus().then(status => {
        onProgress(status);
        if (isDone(status)) {
          clearInterval(interval);
          if (status.status === 'failed') {
            reject(new Error('Analysis failed'));
          } else {
            resolve(status);
          }
        }
      }).catch(error => {
        clearInterval(interval);
        reject(error);
      });
    });
  }
}

export const api = new UnifiedApiService();
export default api;