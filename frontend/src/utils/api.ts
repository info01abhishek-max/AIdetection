import axios, { AxiosError } from 'axios'
import type { AnalysisResult, UploadResponse, HealthCheck, ApiResponse } from '../types'

const API_BASE = '/api'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 180000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const message = error.response?.data as ApiResponse<unknown> | undefined
    return Promise.reject(new Error(message?.error || error.message || 'Request failed'))
  }
)

export const apiService = {
  async healthCheck(): Promise<HealthCheck> {
    const response = await api.get<HealthCheck>('/health')
    return response.data
  },

  async uploadAudio(file: File): Promise<UploadResponse> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post<UploadResponse>('/analyze/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          console.log(`Upload progress: ${percent}%`)
        }
      },
    })
    return response.data
  },

  async getAnalysisStatus(analysisId: string): Promise<{ status: string; progress: number }> {
    const response = await api.get<{ status: string; progress: number }>(`/analyze/${analysisId}/status`)
    return response.data
  },

  async getAnalysisResult(analysisId: string): Promise<AnalysisResult> {
    const response = await api.get<AnalysisResult>(`/analyze/${analysisId}/result`)
    return response.data
  },

  async downloadReport(analysisId: string, format: 'json' | 'pdf' = 'json'): Promise<Blob> {
    const response = await api.get(`/analyze/${analysisId}/report`, {
      params: { format },
      responseType: 'blob',
    })
    return response.data
  },
}

export default apiService