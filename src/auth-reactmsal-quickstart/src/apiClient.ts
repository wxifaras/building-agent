import axios, { AxiosError, AxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiClient = {
  async callApi<T = any>(
    endpoint: string,
    accessToken: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<ApiResponse<T>> {
    try {
      const config: AxiosRequestConfig = {
        method,
        url: endpoint,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        data: body,
      };

      const response = await axiosInstance.request<T>(config);

      return {
        data: response.data,
        status: response.status,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<any>;
        return {
          error: axiosError.response?.data?.error || 
                 axiosError.response?.data?.message || 
                 axiosError.message || 
                 `Request failed with status ${axiosError.response?.status}`,
          status: axiosError.response?.status || 0,
        };
      }
      return {
        error: (error as Error).message || 'Network error',
        status: 0,
      };
    }
  },

  // Convenience methods
  async get<T = any>(endpoint: string, accessToken: string) {
    return this.callApi<T>(endpoint, accessToken, 'GET');
  },

  async post<T = any>(endpoint: string, accessToken: string, body: any) {
    return this.callApi<T>(endpoint, accessToken, 'POST', body);
  },

  async put<T = any>(endpoint: string, accessToken: string, body: any) {
    return this.callApi<T>(endpoint, accessToken, 'PUT', body);
  },

  async delete<T = any>(endpoint: string, accessToken: string) {
    return this.callApi<T>(endpoint, accessToken, 'DELETE');
  },
};
