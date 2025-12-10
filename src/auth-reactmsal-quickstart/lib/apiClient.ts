import axios, { AxiosError, AxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

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
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET',
    body?: any
  ): Promise<ApiResponse<T>> {
    try {
      const config: AxiosRequestConfig = {
        method,
        url: endpoint,
        data: body,
      };

      // Only add Authorization header if token is provided
      if (accessToken) {
        config.headers = {
          Authorization: `Bearer ${accessToken}`,
        };
      }

      const response = await axiosInstance.request<T>(config);

      return {
        data: response.data,
        status: response.status,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<any>;
        return {
          error: axiosError.response?.data?.error || axiosError.message,
          status: axiosError.response?.status || 500,
        };
      }
      
      return {
        error: 'Unknown error occurred',
        status: 500,
      };
    }
  },

  // Convenience methods
  get<T = any>(endpoint: string, accessToken: string): Promise<ApiResponse<T>> {
    return this.callApi<T>(endpoint, accessToken, 'GET');
  },

  post<T = any>(endpoint: string, accessToken: string, body: any): Promise<ApiResponse<T>> {
    return this.callApi<T>(endpoint, accessToken, 'POST', body);
  },

  put<T = any>(endpoint: string, accessToken: string, body: any): Promise<ApiResponse<T>> {
    return this.callApi<T>(endpoint, accessToken, 'PUT', body);
  },

  patch<T = any>(endpoint: string, accessToken: string, body: any): Promise<ApiResponse<T>> {
    return this.callApi<T>(endpoint, accessToken, 'PATCH', body);
  },

  delete<T = any>(endpoint: string, accessToken: string): Promise<ApiResponse<T>> {
    return this.callApi<T>(endpoint, accessToken, 'DELETE');
  },
};
