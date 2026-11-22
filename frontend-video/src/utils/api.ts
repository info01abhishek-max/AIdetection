import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  UploadResponse,
  StatusResponse,
  AnalysisResult,
  HealthCheck,
  ErrorResponse,
} from '../types';

const API_BASE_URL = '/api/v1';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 300000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ErrorResponse>) => {
        if (error.response?.data) {
          return Promise.reject(new Error(error.response.data.message || error.response.data.error));
        }
        if (error.code === 'ECONNABORTED') {
          return Promise.reject(new Error('Request timeout. The analysis may still be running.'));
        }
        return Promise.reject(new Error(error.message || 'An unknown error occurred'));
      }
    );
  }

  async healthCheck(): Promise<HealthCheck> {
    const response = await this.client.get<HealthCheck>('/health');
    return response.data;
  }

  async uploadVideo(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post<UploadResponse>('/analyze/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(`Upload progress: ${percent}%`);
        }
      },
    });
    return response.data;
  }

  async getStatus(analysisId: string): Promise<StatusResponse> {
    const response = await this.client.get<StatusResponse>(`/analyze/${analysisId}/status`);
    return response.data;
  }

  async getResult(analysisId: string): Promise<AnalysisResult> {
    const response = await this.client.get<AnalysisResult>(`/analyze/${analysisId}/result`);
    return response.data;
  }

  async downloadReport(analysisId: string): Promise<Blob> {
    const response = await this.client.get(`/analyze/${analysisId}/report`, {
      responseType: 'blob',
    });
    return response.data;
  }

  async getHistory(): Promise<string[]> {
    const response = await this.client.get<string[]>('/analyze/history');
    return response.data;
  }

  async deleteAnalysis(analysisId: string): Promise<{ success: boolean; message: string }> {
    const response = await this.client.delete(`/analyze/${analysisId}`);
    return response.data;
  }

  async getFrameThumbnail(analysisId: string, frameIndex: number): Promise<string> {
    const response = await this.client.get(`/analyze/${analysisId}/frames/${frameIndex}`, {
      responseType: 'blob',
    });
    return URL.createObjectURL(response.data);
  }
}

export const api = new ApiClient();