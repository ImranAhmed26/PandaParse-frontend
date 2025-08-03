import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";
import env from "@/lib/env";
import AuthStorage from "@/lib/auth/storage";
import { authEvents } from "@/lib/auth/authEvents";

// Extend Axios types to include our custom metadata
declare module "axios" {
  interface InternalAxiosRequestConfig {
    metadata?: {
      startTime?: number;
    };
    _retry?: boolean;
    _retryCount?: number;
  }
}

// API Configuration Types
interface ApiConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
  retries?: number;
  retryDelay?: number;
}

// API Response Types
interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
  success: boolean;
}

// Better Error Types
type ApiErrorCode =
  | "NETWORK_ERROR"
  | "TIMEOUT_ERROR"
  | "SERVER_ERROR"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "UNKNOWN_ERROR";

interface ApiError {
  code: ApiErrorCode;
  message: string;
  status: number;
  details?: Record<string, any>;
  timestamp?: string;
}

// Using AuthStorage directly - no need for additional wrapper

// Base API Class
class Api {
  private instance: AxiosInstance;
  private retries: number;
  private retryDelay: number;

  constructor(config: ApiConfig) {
    this.retries = config.retries || 3;
    this.retryDelay = config.retryDelay || 1000;

    this.instance = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      headers: {
        "Content-Type": "application/json",
        ...config.headers,
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request Interceptor
    this.instance.interceptors.request.use(
      async (config) => {
        // Check if token needs refresh before making request
        if (AuthStorage.needsTokenRefresh()) {
          console.log("🔄 [API] Token needs refresh, attempting proactive refresh");
          try {
            await this.refreshTokenProactively();
          } catch (error) {
            console.warn("🔄 [API] Proactive token refresh failed:", error);
            // Continue with request - let response interceptor handle it
          }
        }

        // Add auth token if available (SSR-safe)
        const token = AuthStorage.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Development logging
        if (env.isDevelopment) {
          const startTime = Date.now();
          config.metadata = { startTime };
          console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        }

        return config;
      },
      (error) => Promise.reject(this.handleError(error))
    );

    // Response Interceptor
    this.instance.interceptors.response.use(
      (response) => {
        // Development logging
        if (env.isDevelopment && response.config.metadata?.startTime) {
          const duration = Date.now() - response.config.metadata.startTime;
          console.log(
            `✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url} - ${duration}ms (${
              response.status
            })`
          );
        }
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Development error logging
        if (env.isDevelopment) {
          console.error(`❌ API Error: ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url}`, {
            status: error.response?.status,
            message: error.message,
            data: error.response?.data,
          });
        }

        // Handle token refresh for 401 errors
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = AuthStorage.getRefreshToken();
            if (refreshToken) {
              // Attempt to refresh token
              const response = await axios.post(`${this.instance.defaults.baseURL}/auth/refresh`, {
                refreshToken,
              });

              const { access_token } = response.data;
              AuthStorage.setAccessToken(access_token);

              // Retry original request
              originalRequest.headers.Authorization = `Bearer ${access_token}`;
              return this.instance.request(originalRequest);
            } else {
              // No refresh token available
              console.warn("🔄 No refresh token available");
              authEvents.emit("TOKEN_EXPIRED", "No refresh token available");
            }
          } catch (refreshError) {
            // Refresh failed, clear tokens and emit event
            AuthStorage.clearAuthData();
            console.warn("🔄 Token refresh failed, tokens cleared", refreshError);
            authEvents.emit("TOKEN_EXPIRED", "Token refresh failed");
          }
        }

        // Emit unauthorized event for 401 errors that couldn't be refreshed
        if (error.response?.status === 401) {
          authEvents.emit("UNAUTHORIZED", "Authentication required");
        }

        // Retry logic for network errors
        if (this.shouldRetry(error) && !originalRequest._retryCount) {
          originalRequest._retryCount = 0;
        }

        if (this.shouldRetry(error) && originalRequest._retryCount < this.retries) {
          originalRequest._retryCount += 1;

          if (env.isDevelopment) {
            console.log(
              `🔄 Retrying request (${originalRequest._retryCount}/${this.retries}): ${originalRequest.method?.toUpperCase()} ${
                originalRequest.url
              }`
            );
          }

          // Wait before retrying
          await this.delay(this.retryDelay * originalRequest._retryCount);
          return this.instance.request(originalRequest);
        }

        return Promise.reject(this.handleError(error));
      }
    );
  }

  private shouldRetry(error: AxiosError): boolean {
    // Retry on network errors, timeouts, and 5xx server errors
    return (
      !error.response || // Network error
      error.code === "ECONNABORTED" || // Timeout
      (error.response.status >= 500 && error.response.status < 600) // Server errors
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Proactive token refresh method
  private async refreshTokenProactively(): Promise<void> {
    const refreshToken = AuthStorage.getRefreshToken();
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    try {
      const response = await axios.post(`${this.instance.defaults.baseURL}/auth/refresh`, {
        refreshToken,
      });

      const { access_token, refresh_token } = response.data;
      AuthStorage.setAccessToken(access_token);

      // Update refresh token if provided
      if (refresh_token) {
        AuthStorage.setRefreshToken(refresh_token);
      }

      console.log("🔄 [API] Token refreshed proactively");
    } catch (error) {
      console.error("🔄 [API] Proactive token refresh failed:", error);
      throw error;
    }
  }

  private getErrorCode(error: AxiosError): ApiErrorCode {
    if (error.response) {
      switch (error.response.status) {
        case 400:
          return "VALIDATION_ERROR";
        case 401:
          return "UNAUTHORIZED";
        case 403:
          return "FORBIDDEN";
        case 404:
          return "NOT_FOUND";
        case 409:
          return "CONFLICT";
        case 429:
          return "RATE_LIMITED";
        case 500:
        case 502:
        case 503:
        case 504:
          return "SERVER_ERROR";
        default:
          return "SERVER_ERROR";
      }
    } else if (error.request) {
      return "NETWORK_ERROR";
    } else if (error.code === "ECONNABORTED") {
      return "TIMEOUT_ERROR";
    } else {
      return "UNKNOWN_ERROR";
    }
  }

  private handleError(error: AxiosError): ApiError {
    const code = this.getErrorCode(error);

    return {
      code,
      message: this.getErrorMessage(error, code),
      status: error.response?.status || 0,
      details: error.response?.data as Record<string, any>,
      timestamp: new Date().toISOString(),
    };
  }

  private getErrorMessage(error: AxiosError, code: ApiErrorCode): string {
    // Try to get message from response data first
    const responseMessage = (error.response?.data as { message?: string })?.message;
    if (responseMessage) return responseMessage;

    // Fallback to default messages based on error code
    switch (code) {
      case "NETWORK_ERROR":
        return "No response from server. Please check your connection.";
      case "TIMEOUT_ERROR":
        return "Request timeout. Please try again.";
      case "UNAUTHORIZED":
        return "Authentication required. Please log in.";
      case "FORBIDDEN":
        return "You do not have permission to perform this action.";
      case "NOT_FOUND":
        return "The requested resource was not found.";
      case "VALIDATION_ERROR":
        return "Please check your input and try again.";
      case "CONFLICT":
        return "This action conflicts with existing data.";
      case "RATE_LIMITED":
        return "Too many requests. Please wait and try again.";
      case "SERVER_ERROR":
        return "Server error. Please try again later.";
      default:
        return error.message || "An unexpected error occurred";
    }
  }

  // Generic GET request
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.get<T>(url, config);
    return {
      data: response.data,
      status: response.status,
      success: response.status >= 200 && response.status < 300,
      message: (response.data as any)?.message,
    };
  }

  // Generic POST request
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.post<T>(url, data, config);
    return {
      data: response.data,
      status: response.status,
      success: response.status >= 200 && response.status < 300,
      message: (response.data as any)?.message,
    };
  }

  // Generic PUT request
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.put<T>(url, data, config);
    return {
      data: response.data,
      status: response.status,
      success: response.status >= 200 && response.status < 300,
      message: (response.data as any)?.message,
    };
  }

  // Generic DELETE request
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.delete<T>(url, config);
    return {
      data: response.data,
      status: response.status,
      success: response.status >= 200 && response.status < 300,
      message: (response.data as any)?.message,
    };
  }

  // Generic PATCH request
  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.patch<T>(url, data, config);
    return {
      data: response.data,
      status: response.status,
      success: response.status >= 200 && response.status < 300,
      message: (response.data as any)?.message,
    };
  }

  // Query params helper
  buildQueryParams(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach((item) => searchParams.append(key, item.toString()));
        } else {
          searchParams.append(key, value.toString());
        }
      }
    });
    return searchParams.toString();
  }

  // Upload file helper
  async uploadFile<T>(url: string, file: File, onProgress?: (progress: number) => void): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append("file", file);

    const config: AxiosRequestConfig = {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    };

    return this.post<T>(url, formData, config);
  }

  // Batch requests helper
  async batch<T>(requests: Array<() => Promise<ApiResponse<T>>>): Promise<ApiResponse<T>[]> {
    return Promise.all(requests.map((request) => request()));
  }
}

// Create API instance with validated environment configuration
const api = new Api({
  baseURL: env.apiUrl,
  retries: 3,
  retryDelay: 1000, // 1 second base delay
});

// Export the API instance
export default api;
export type { ApiResponse, ApiError, ApiErrorCode, ApiConfig };

// Example usage with TanStack Query:
/*
import { useQuery, useMutation } from '@tanstack/react-query';

// Query hook example
export const useGetUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<User[]>('/users'),
  });
};

// Mutation hook example
export const useCreateUser = () => {
  return useMutation({
    mutationFn: (newUser: CreateUserDto) => api.post<User>('/users', newUser),
  });
};

// Parameterized query example
export const useGetUserById = (id: string) => {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => api.get<User>(`/users/${id}`),
    enabled: !!id,
  });
};

// Query with params example
export const useSearchUsers = (params: UserSearchParams) => {
  return useQuery({
    queryKey: ['users', 'search', params],
    queryFn: () => api.get<User[]>(`/users/search?${api.buildQueryParams(params)}`),
  });
};
*/
