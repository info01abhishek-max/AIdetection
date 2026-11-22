import axios, { AxiosError } from 'axios';
import type {
  AnalysisResult,
  AnalysisStatusResponse,
  HealthResponse,
  TextInputResponse,
  ApiError
} from '../types';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    const message = error.response?.data?.detail || error.response?.data?.error || error.message;
    return Promise.reject(new Error(message));
  }
);

export const apiService = {
  async checkHealth(): Promise<HealthResponse> {
    const response = await api.get<HealthResponse>('/health');
    return response.data;
  },

  async analyzeText(text: string): Promise<TextInputResponse> {
    const response = await api.post<TextInputResponse>('/analyze/text', { text });
    return response.data;
  },

  async analyzeFile(file: File): Promise<TextInputResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<TextInputResponse>('/analyze/file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async getAnalysisStatus(analysisId: string): Promise<AnalysisStatusResponse> {
    const response = await api.get<AnalysisStatusResponse>(`/analysis/${analysisId}/status`);
    return response.data;
  },

  async getAnalysisResult(analysisId: string): Promise<AnalysisResult> {
    const response = await api.get<AnalysisResult>(`/analysis/${analysisId}/result`);
    return response.data;
  },

  async downloadReport(analysisId: string, format: 'json' = 'json'): Promise<Blob> {
    const response = await api.get(`/analysis/${analysisId}/report`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  },

  async deleteAnalysis(analysisId: string): Promise<void> {
    await api.delete(`/analysis/${analysisId}`);
  },
};